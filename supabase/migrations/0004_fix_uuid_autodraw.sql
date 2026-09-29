-- Vote Đi — 0004: fix max(uuid) + auto-draw knockout on item insert/delete.
-- Run after 0003_fix.sql. Does not modify 0001–0003.

-- ---------------------------------------------------------------------------
-- 1) Fix: PostgreSQL has no max(uuid). Use array_agg(...)[1] instead.
-- Root cause lived in public._advance_byes (also historically in _resolve_knockout
-- pairing CTEs in 0001/0002). Called from _place_bracket / start_knockout /
-- advance_room when bye winners fill the next round.
-- ---------------------------------------------------------------------------

create or replace function public._advance_byes(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  created int;
  guard int := 0;
begin
  select * into r from public.rooms where id = p_room_id;
  if not found then
    return;
  end if;

  loop
    guard := guard + 1;
    if guard > 16 then
      exit;
    end if;

    with ready as (
      select
        round,
        position / 2 as next_pos,
        (array_agg(winner_item_id) filter (where position % 2 = 0))[1] as item_a,
        (array_agg(winner_item_id) filter (where position % 2 = 1))[1] as item_b
      from public.matches
      where room_id = p_room_id
        and status = 'done'
      group by round, position / 2
      having count(*) = 2
         and (
           bool_or(position % 2 = 0 and winner_item_id is not null)
           or bool_or(position % 2 = 1 and winner_item_id is not null)
         )
    ),
    ins as (
      insert into public.matches (room_id, round, position, item_a, item_b, winner_item_id, deadline, status)
      select
        p_room_id,
        ready.round + 1,
        ready.next_pos,
        ready.item_a,
        ready.item_b,
        case
          when ready.item_a is not null and ready.item_b is null then ready.item_a
          when ready.item_b is not null and ready.item_a is null then ready.item_b
          else null
        end,
        case
          when ready.item_a is not null and ready.item_b is not null
            and r.status = 'knockout'
            then now() + make_interval(mins => coalesce(r.match_duration_minutes, 30))
          else null
        end,
        case
          when ready.item_a is not null and ready.item_b is not null then
            case when r.status = 'knockout' then 'live' else 'pending' end
          when ready.item_a is not null or ready.item_b is not null then 'done'
          else 'pending'
        end
      from ready
      where not exists (
        select 1
        from public.matches x
        where x.room_id = p_room_id
          and x.round = ready.round + 1
          and x.position = ready.next_pos
      )
      returning 1
    )
    select count(*) into created from ins;

    if coalesce(created, 0) = 0 then
      exit;
    end if;
  end loop;
end;
$$;

-- Keep _resolve_knockout from 0003 (no max(uuid)); re-assert so caches stay consistent.
create or replace function public._resolve_knockout(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  m public.matches%rowtype;
  member_count int;
  vote_count int;
  votes_a int;
  votes_b int;
  winner uuid;
  final_round int;
  champ uuid;
begin
  select * into r from public.rooms where id = p_room_id for update;
  if r.status <> 'knockout' then
    return;
  end if;

  select count(*) into member_count
  from public.members
  where room_id = p_room_id and kicked_at is null;
  member_count := greatest(member_count, 1);

  final_round := log(2, greatest(r.knockout_size, 2)::numeric)::int;

  update public.matches
  set status = 'done',
      winner_item_id = coalesce(item_a, item_b),
      deadline = null
  where room_id = p_room_id
    and status = 'live'
    and (
      (item_a is not null and item_b is null)
      or (item_b is not null and item_a is null)
    );

  for m in
    select * from public.matches
    where room_id = p_room_id and status = 'live'
    order by round, position
    for update
  loop
    select count(*) into vote_count from public.match_votes where match_id = m.id;
    if vote_count < member_count and (m.deadline is null or now() < m.deadline) then
      continue;
    end if;

    select
      count(*) filter (where item_id = m.item_a),
      count(*) filter (where item_id = m.item_b)
    into votes_a, votes_b
    from public.match_votes
    where match_id = m.id;

    winner := null;
    if votes_a > votes_b then
      winner := m.item_a;
    elsif votes_b > votes_a then
      winner := m.item_b;
    else
      if r.tie_rule = 'host' then
        select mv.item_id into winner
        from public.match_votes mv
        join public.members mem on mem.id = mv.member_id
        where mv.match_id = m.id and mem.is_host and mem.kicked_at is null
        limit 1;
      end if;
      if winner is null then
        if random() < 0.5 then
          winner := m.item_a;
        else
          winner := m.item_b;
        end if;
      end if;
    end if;

    winner := coalesce(winner, m.item_a, m.item_b);

    update public.matches
    set status = 'done',
        winner_item_id = winner
    where id = m.id
      and status = 'live';
  end loop;

  perform public._advance_byes(p_room_id);

  select winner_item_id into champ
  from public.matches
  where room_id = p_room_id
    and round = final_round
    and status = 'done'
  limit 1;

  if champ is not null then
    update public.rooms
    set status = 'done',
        champion_item_id = champ
    where id = p_room_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Auto-draw for direct knockout when items change (lobby / drawn only).
-- ---------------------------------------------------------------------------

create or replace function public._autodraw_knockout_from_items(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  ids uuid[];
  v_count int;
begin
  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    return;
  end if;

  if r.mode <> 'knockout' then
    return;
  end if;

  if r.status not in ('lobby', 'drawn') then
    return;
  end if;

  select coalesce(array_agg(id order by created_at asc, id asc), array[]::uuid[])
  into ids
  from public.items
  where room_id = p_room_id;

  v_count := coalesce(array_length(ids, 1), 0);

  if v_count < 2 then
    delete from public.match_votes
    where match_id in (select id from public.matches where room_id = p_room_id);
    delete from public.matches where room_id = p_room_id;
    update public.rooms
    set status = 'lobby',
        champion_item_id = null,
        draw_version = coalesce(draw_version, 0) + 1
    where id = p_room_id;
    return;
  end if;

  if v_count > 16 then
    raise exception 'KNOCKOUT_MAX_ITEMS';
  end if;

  perform public._place_bracket(p_room_id, ids);
end;
$$;

create or replace function public.trg_items_knockout_autodraw()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  r public.rooms%rowtype;
  v_count int;
begin
  rid := coalesce(NEW.room_id, OLD.room_id);

  select * into r from public.rooms where id = rid;
  if not found then
    return coalesce(NEW, OLD);
  end if;

  if r.mode <> 'knockout' or r.status not in ('lobby', 'drawn') then
    return coalesce(NEW, OLD);
  end if;

  if TG_OP = 'INSERT' then
    select count(*) into v_count from public.items where room_id = rid;
    -- count already includes NEW
    if v_count > 16 then
      raise exception 'KNOCKOUT_MAX_ITEMS';
    end if;
  end if;

  perform public._autodraw_knockout_from_items(rid);
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists items_knockout_autodraw on public.items;
create trigger items_knockout_autodraw
after insert or delete on public.items
for each row
execute function public.trg_items_knockout_autodraw();

revoke all on function public._advance_byes(uuid) from public, anon, authenticated;
revoke all on function public._resolve_knockout(uuid) from public, anon, authenticated;
revoke all on function public._autodraw_knockout_from_items(uuid) from public, anon, authenticated;
revoke all on function public.trg_items_knockout_autodraw() from public, anon, authenticated;

notify pgrst, 'reload schema';
