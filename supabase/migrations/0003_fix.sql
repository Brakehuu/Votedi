-- Vote Đi — 0003 fix: start_knockout + bye cascade + schema reload.
-- Run after 0002_update.sql. Does not modify 0001 or 0002.

-- Ensure status check allows 'drawn'
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms
  add constraint rooms_status_check
  check (status in ('lobby', 'qualify', 'drawn', 'knockout', 'done'));

alter table public.rooms drop constraint if exists rooms_knockout_size_check;
alter table public.rooms
  add constraint rooms_knockout_size_check
  check (knockout_size between 2 and 16);

alter table public.rooms add column if not exists locked boolean not null default false;
alter table public.rooms add column if not exists draw_version int not null default 0;
alter table public.members add column if not exists kicked_at timestamptz;

create or replace function public._next_pow2(n int)
returns int
language plpgsql
immutable
as $$
begin
  if n is null or n < 2 then
    raise exception 'BAD_SIZE';
  end if;
  if n <= 2 then return 2; end if;
  if n <= 4 then return 4; end if;
  if n <= 8 then return 8; end if;
  if n <= 16 then return 16; end if;
  raise exception 'BAD_SIZE';
end;
$$;

create or replace function public._shuffle_uuids(p_ids uuid[])
returns uuid[]
language sql
volatile
set search_path = public
as $$
  select coalesce(array_agg(x order by random()), array[]::uuid[])
  from unnest(p_ids) as x;
$$;

-- Advance bye winners into later rounds until no more auto-advances.
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
        max(winner_item_id) filter (where position % 2 = 0) as item_a,
        max(winner_item_id) filter (where position % 2 = 1) as item_b
      from public.matches
      where room_id = p_room_id
        and status = 'done'
      group by round, position / 2
      having count(*) = 2
         and (
           max(winner_item_id) filter (where position % 2 = 0) is not null
           or max(winner_item_id) filter (where position % 2 = 1) is not null
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
            then now() + make_interval(mins => r.match_duration_minutes)
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

create or replace function public._place_bracket(p_room_id uuid, p_item_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  size int;
  shuffled uuid[];
  slots uuid[];
  i int;
  pos int;
  a uuid;
  b uuid;
  win uuid;
  st text;
begin
  delete from public.match_votes
  where match_id in (select id from public.matches where room_id = p_room_id);
  delete from public.matches where room_id = p_room_id;

  n := coalesce(array_length(p_item_ids, 1), 0);
  if n < 2 or n > 16 then
    raise exception 'ITEM_COUNT';
  end if;

  size := public._next_pow2(n);
  shuffled := public._shuffle_uuids(p_item_ids);
  slots := shuffled;
  while coalesce(array_length(slots, 1), 0) < size loop
    slots := slots || array[null::uuid];
  end loop;
  slots := (
    select coalesce(array_agg(x order by random()), array[]::uuid[])
    from unnest(slots) as x
  );

  i := 1;
  pos := 0;
  while i <= size loop
    a := slots[i];
    b := slots[i + 1];
    win := null;
    st := 'pending';
    if a is not null and b is null then
      win := a;
      st := 'done';
    elsif b is not null and a is null then
      win := b;
      st := 'done';
    end if;

    insert into public.matches (room_id, round, position, item_a, item_b, winner_item_id, deadline, status)
    values (p_room_id, 1, pos, a, b, win, null, st);

    i := i + 2;
    pos := pos + 1;
  end loop;

  update public.rooms
  set knockout_size = size,
      status = 'drawn',
      draw_version = coalesce(draw_version, 0) + 1
  where id = p_room_id;

  -- Prefill later rounds from bye winners while still in 'drawn' (pending, not live).
  perform public._advance_byes(p_room_id);
end;
$$;

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

  -- Auto-complete bye matches that somehow became live.
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

create or replace function public.start_knockout(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  dur int;
  live_count int;
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if r.status = 'knockout' then
    -- Idempotent: already started.
    perform public._resolve_knockout(p_room_id);
    return;
  end if;

  if r.status <> 'drawn' then
    raise exception 'BAD_STATUS';
  end if;

  if not exists (select 1 from public.matches where room_id = p_room_id) then
    raise exception 'BAD_STATUS';
  end if;

  dur := coalesce(r.match_duration_minutes, 30);

  -- Ensure bye chain is filled while still drawn (pending next rounds).
  perform public._advance_byes(p_room_id);

  update public.rooms set status = 'knockout' where id = p_room_id;

  -- Open every pending 2-item match (round 1 and any bye-advanced rounds).
  update public.matches
  set status = 'live',
      deadline = now() + make_interval(mins => dur)
  where room_id = p_room_id
    and status = 'pending'
    and item_a is not null
    and item_b is not null;

  -- Bye singles must stay done.
  update public.matches
  set status = 'done',
      winner_item_id = coalesce(winner_item_id, item_a, item_b),
      deadline = null
  where room_id = p_room_id
    and (
      (item_a is not null and item_b is null)
      or (item_b is not null and item_a is null)
    )
    and status <> 'done';

  select count(*) into live_count
  from public.matches
  where room_id = p_room_id and status = 'live';

  -- If everything was byes, resolve to champion immediately.
  perform public._resolve_knockout(p_room_id);

  if live_count = 0 then
    perform public._resolve_knockout(p_room_id);
  end if;
end;
$$;

create or replace function public.draw_bracket(p_room_id uuid)
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
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if r.status = 'lobby' then
    if r.mode <> 'knockout' then
      raise exception 'BAD_STATUS';
    end if;
    select coalesce(array_agg(id), array[]::uuid[]) into ids
    from public.items
    where room_id = p_room_id;
    v_count := coalesce(array_length(ids, 1), 0);
    if v_count < 2 or v_count > 16 then
      raise exception 'ITEM_COUNT';
    end if;
    perform public._place_bracket(p_room_id, ids);
    return;
  end if;

  if r.status = 'qualify' then
    if r.qualify_deadline is null or now() < r.qualify_deadline then
      raise exception 'BAD_STATUS';
    end if;
    ids := public._shuffle_uuids(public._qualify_ids(p_room_id));
    v_count := coalesce(array_length(ids, 1), 0);
    if v_count < 2 then
      raise exception 'NOT_ENOUGH_ITEMS';
    end if;
    perform public._place_bracket(p_room_id, ids);
    return;
  end if;

  if r.status = 'drawn' then
    if r.mode = 'knockout' then
      select coalesce(array_agg(id), array[]::uuid[]) into ids
      from public.items
      where room_id = p_room_id;
    else
      ids := public._shuffle_uuids(public._qualify_ids(p_room_id));
    end if;
    v_count := coalesce(array_length(ids, 1), 0);
    if v_count < 2 then
      raise exception 'NOT_ENOUGH_ITEMS';
    end if;
    perform public._place_bracket(p_room_id, ids);
    return;
  end if;

  raise exception 'BAD_STATUS';
end;
$$;

grant execute on function public.draw_bracket(uuid) to authenticated;
grant execute on function public.start_knockout(uuid) to authenticated;
revoke all on function public._advance_byes(uuid) from public, anon, authenticated;
revoke all on function public._place_bracket(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public._resolve_knockout(uuid) from public, anon, authenticated;

grant select (
  id, slug, name, mode, host_id, votes_per_member, qualify_deadline,
  qualify_duration_minutes, knockout_size, match_duration_minutes, tie_rule,
  allow_member_upload, status, champion_item_id, created_at, locked, draw_version
) on table public.rooms to authenticated;

notify pgrst, 'reload schema';
