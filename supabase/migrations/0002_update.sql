-- Vote Đi — 0002 update: bracket draw/bye, host tools, lock/kick.
-- Run after 0001_init.sql. Do not re-run 0001.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.rooms
  drop constraint if exists rooms_knockout_size_check;

alter table public.rooms
  add constraint rooms_knockout_size_check
  check (knockout_size between 2 and 16);

alter table public.rooms
  drop constraint if exists rooms_status_check;

alter table public.rooms
  add constraint rooms_status_check
  check (status in ('lobby', 'qualify', 'drawn', 'knockout', 'done'));

alter table public.rooms
  add column if not exists locked boolean not null default false;

alter table public.rooms
  add column if not exists draw_version int not null default 0;

alter table public.members
  add column if not exists kicked_at timestamptz;

create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where room_id = p_room_id
      and user_id = auth.uid()
      and kicked_at is null
  );
$$;

create or replace function public._require_host(p_room_id uuid)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  select * into v_member
  from public.members
  where room_id = p_room_id
    and user_id = auth.uid()
    and kicked_at is null;
  if not found then
    raise exception 'NOT_MEMBER';
  end if;
  if not v_member.is_host then
    raise exception 'NOT_HOST';
  end if;
  return v_member;
end;
$$;

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

-- Random shuffle of uuid array (Fisher–Yates via order by random).
create or replace function public._shuffle_uuids(p_ids uuid[])
returns uuid[]
language sql
volatile
set search_path = public
as $$
  select coalesce(array_agg(x order by random()), array[]::uuid[])
  from unnest(p_ids) as x;
$$;

create or replace function public._qualify_ids(p_room_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tie text;
  v_size int;
  ids uuid[];
begin
  select tie_rule, knockout_size into v_tie, v_size
  from public.rooms
  where id = p_room_id;

  select coalesce(array_agg(id order by rn), array[]::uuid[])
  into ids
  from (
    select id,
           row_number() over (
             order by votes desc,
               case when v_tie = 'host' and host_upload then 1 else 0 end desc,
               case when v_tie = 'random' then random() else 0::double precision end,
               created_at asc
           ) as rn
    from (
      select i.id,
             count(qv.id)::int as votes,
             i.created_at,
             coalesce(m.is_host, false) as host_upload
      from public.items i
      left join public.qualify_votes qv on qv.item_id = i.id
      left join public.members m on m.id = i.uploader_member_id
      where i.room_id = p_room_id
      group by i.id, i.created_at, m.is_host
    ) scored
  ) ranked
  where rn <= v_size;

  return ids;
end;
$$;

-- Build round-1 matches from shuffled ids + bye pads. Remaining rounds created on resolve.
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
  -- Shuffle again so byes land randomly among slots.
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
    elsif a is null and b is null then
      -- Should not happen with >= 1 real item; treat as empty pending.
      st := 'pending';
    end if;

    insert into public.matches (room_id, round, position, item_a, item_b, winner_item_id, deadline, status)
    values (p_room_id, 1, pos, a, b, win, null, st);

    i := i + 2;
    pos := pos + 1;
  end loop;

  update public.rooms
  set knockout_size = size,
      status = 'drawn',
      draw_version = draw_version + 1
  where id = p_room_id;
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
    ids := public._qualify_ids(p_room_id);
    v_count := coalesce(array_length(ids, 1), 0);
    if v_count < 2 then
      raise exception 'NOT_ENOUGH_ITEMS';
    end if;
    -- Randomize seeding (ignore vote rank for bracket placement).
    ids := public._shuffle_uuids(ids);
    perform public._place_bracket(p_room_id, ids);
    return;
  end if;

  if r.status = 'drawn' then
    -- Redraw before start.
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

  final_round := log(2, r.knockout_size::numeric)::int;

  for m in
    select * from public.matches
    where room_id = p_room_id and status = 'live'
    order by round, position
    for update
  loop
    -- Bye already resolved at draw; skip incomplete live votes until deadline/all voted.
    if m.item_a is null and m.item_b is not null then
      update public.matches
      set status = 'done', winner_item_id = m.item_b
      where id = m.id and status = 'live';
      continue;
    end if;
    if m.item_b is null and m.item_a is not null then
      update public.matches
      set status = 'done', winner_item_id = m.item_a
      where id = m.id and status = 'live';
      continue;
    end if;

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

  -- Create next-round matches from completed pairs (supports bye winners).
  insert into public.matches (room_id, round, position, item_a, item_b, winner_item_id, deadline, status)
  select
    p_room_id,
    d.round + 1,
    d.next_pos,
    d.item_a,
    d.item_b,
    case
      when d.item_a is not null and d.item_b is null then d.item_a
      when d.item_b is not null and d.item_a is null then d.item_b
      else null
    end,
    case
      when d.item_a is not null and d.item_b is not null
        then now() + make_interval(mins => r.match_duration_minutes)
      else null
    end,
    case
      when d.item_a is not null and d.item_b is not null then 'live'
      when d.item_a is not null or d.item_b is not null then 'done'
      else 'pending'
    end
  from (
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
  ) d
  where not exists (
    select 1
    from public.matches x
    where x.room_id = p_room_id
      and x.round = d.round + 1
      and x.position = d.next_pos
  );

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
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if r.status <> 'drawn' then
    raise exception 'BAD_STATUS';
  end if;
  if not exists (select 1 from public.matches where room_id = p_room_id) then
    raise exception 'BAD_STATUS';
  end if;

  dur := r.match_duration_minutes;

  update public.matches
  set status = 'live',
      deadline = now() + make_interval(mins => dur)
  where room_id = p_room_id
    and round = 1
    and status = 'pending'
    and item_a is not null
    and item_b is not null;

  update public.rooms set status = 'knockout' where id = p_room_id;
  perform public._resolve_knockout(p_room_id);
end;
$$;

create or replace function public.advance_room(p_room_id uuid, p_host_start boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_member
  from public.members
  where room_id = p_room_id and user_id = auth.uid() and kicked_at is null;

  if not found then
    raise exception 'NOT_MEMBER';
  end if;

  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if r.status = 'done' then
    return;
  end if;

  if r.status = 'lobby' then
    if not coalesce(p_host_start, false) then
      return;
    end if;
    if not v_member.is_host then
      raise exception 'NOT_HOST';
    end if;

    select count(*) into v_count from public.items where room_id = p_room_id;

    if r.mode = 'qualify_knockout' then
      if v_count < greatest(2, least(r.knockout_size, 16)) then
        raise exception 'NOT_ENOUGH_ITEMS';
      end if;
      update public.rooms
      set status = 'qualify',
          qualify_deadline = now() + make_interval(mins => coalesce(r.qualify_duration_minutes, 60))
      where id = p_room_id;
      return;
    end if;

    -- Knockout trực tiếp: host phải bốc thăm rồi start_knockout.
    raise exception 'NEED_DRAW';
  end if;

  if r.status = 'qualify' then
    if r.qualify_deadline is not null and now() >= r.qualify_deadline then
      -- Auto-draw when qualify ends (host can redraw while status=drawn).
      perform public._place_bracket(p_room_id, public._shuffle_uuids(public._qualify_ids(p_room_id)));
    end if;
    return;
  end if;

  if r.status = 'drawn' then
    return;
  end if;

  if r.status = 'knockout' then
    perform public._resolve_knockout(p_room_id);
  end if;
end;
$$;

-- Allow advance_room → _place_bracket without host when auto-drawing qualify.
-- _place_bracket is security definer; qualify auto path already verified member.

create or replace function public.create_room(
  p_name text,
  p_password text,
  p_mode text,
  p_votes_per_member int,
  p_qualify_duration_minutes int,
  p_knockout_size int,
  p_match_duration_minutes int,
  p_tie_rule text,
  p_allow_member_upload boolean,
  p_display_name text,
  p_avatar_url text,
  p_avatar_emoji text
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_slug text;
  new_id uuid;
  attempt int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_name is null or char_length(btrim(p_name)) < 1 or char_length(btrim(p_name)) > 80 then
    raise exception 'INVALID';
  end if;
  if p_password is null or char_length(p_password) < 4 then
    raise exception 'INVALID';
  end if;
  if p_mode not in ('qualify_knockout', 'knockout') then
    raise exception 'INVALID';
  end if;
  if p_votes_per_member < 1 or p_votes_per_member > 20 then
    raise exception 'INVALID';
  end if;
  if p_knockout_size < 2 or p_knockout_size > 16 then
    raise exception 'BAD_SIZE';
  end if;
  if p_match_duration_minutes < 1 or p_match_duration_minutes > 1440 then
    raise exception 'INVALID';
  end if;
  if p_tie_rule not in ('random', 'host') then
    raise exception 'INVALID';
  end if;
  if p_display_name is null or char_length(btrim(p_display_name)) < 1 then
    raise exception 'INVALID';
  end if;

  for attempt in 1..8 loop
    new_slug := public.generate_slug(8);
    begin
      insert into public.rooms (
        slug, name, password_hash, mode, host_id, votes_per_member,
        qualify_duration_minutes, knockout_size, match_duration_minutes,
        tie_rule, allow_member_upload, status, locked
      ) values (
        new_slug,
        btrim(p_name),
        crypt(p_password, gen_salt('bf')),
        p_mode,
        auth.uid(),
        p_votes_per_member,
        case when p_mode = 'qualify_knockout' then p_qualify_duration_minutes else null end,
        p_knockout_size,
        p_match_duration_minutes,
        p_tie_rule,
        coalesce(p_allow_member_upload, false),
        'lobby',
        false
      )
      returning id into new_id;
      exit;
    exception
      when unique_violation then
        new_id := null;
    end;
  end loop;

  if new_id is null then
    raise exception 'INVALID';
  end if;

  insert into public.members (room_id, user_id, display_name, avatar_url, avatar_emoji, is_host)
  values (
    new_id,
    auth.uid(),
    btrim(p_display_name),
    nullif(p_avatar_url, ''),
    coalesce(nullif(p_avatar_emoji, ''), '🙂'),
    true
  );

  return new_slug;
end;
$$;

create or replace function public.join_room(
  p_slug text,
  p_password text,
  p_display_name text,
  p_avatar_url text,
  p_avatar_emoji text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.rooms%rowtype;
  existing public.members%rowtype;
  new_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_display_name is null or char_length(btrim(p_display_name)) < 1 or char_length(btrim(p_display_name)) > 40 then
    raise exception 'INVALID';
  end if;

  select * into r from public.rooms where slug = p_slug;
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  select * into existing
  from public.members
  where room_id = r.id and user_id = auth.uid();

  if found then
    if existing.kicked_at is not null then
      raise exception 'KICKED';
    end if;
    return existing.id;
  end if;

  if r.locked then
    raise exception 'ROOM_LOCKED';
  end if;

  if r.password_hash is distinct from crypt(p_password, r.password_hash) then
    raise exception 'BAD_PASSWORD';
  end if;

  insert into public.members (room_id, user_id, display_name, avatar_url, avatar_emoji, is_host)
  values (
    r.id,
    auth.uid(),
    btrim(p_display_name),
    nullif(p_avatar_url, ''),
    coalesce(nullif(p_avatar_emoji, ''), '🙂'),
    false
  )
  returning id into new_member_id;

  return new_member_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Host tools
-- ---------------------------------------------------------------------------

create or replace function public.host_extend_deadline(p_room_id uuid, p_minutes int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
begin
  perform public._require_host(p_room_id);
  if p_minutes not in (5, 15) then
    raise exception 'INVALID';
  end if;
  select * into r from public.rooms where id = p_room_id for update;
  if r.status = 'qualify' and r.qualify_deadline is not null then
    update public.rooms
    set qualify_deadline = greatest(now(), qualify_deadline) + make_interval(mins => p_minutes)
    where id = p_room_id;
    return;
  end if;
  if r.status = 'knockout' then
    update public.matches
    set deadline = greatest(now(), coalesce(deadline, now())) + make_interval(mins => p_minutes)
    where room_id = p_room_id and status = 'live';
    return;
  end if;
  raise exception 'BAD_STATUS';
end;
$$;

create or replace function public.host_end_round(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if r.status = 'qualify' then
    update public.rooms set qualify_deadline = now() where id = p_room_id;
    perform public._place_bracket(p_room_id, public._shuffle_uuids(public._qualify_ids(p_room_id)));
    return;
  end if;
  if r.status = 'knockout' then
    update public.matches
    set deadline = now()
    where room_id = p_room_id and status = 'live';
    perform public._resolve_knockout(p_room_id);
    return;
  end if;
  raise exception 'BAD_STATUS';
end;
$$;

create or replace function public.host_rename_item(p_item_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
begin
  select * into v_item from public.items where id = p_item_id;
  if not found then
    raise exception 'BAD_ITEM';
  end if;
  perform public._require_host(v_item.room_id);
  update public.items
  set title = nullif(btrim(coalesce(p_title, '')), '')
  where id = p_item_id;
end;
$$;

create or replace function public.host_delete_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  r public.rooms%rowtype;
begin
  select * into v_item from public.items where id = p_item_id;
  if not found then
    raise exception 'BAD_ITEM';
  end if;
  perform public._require_host(v_item.room_id);
  select * into r from public.rooms where id = v_item.room_id;
  if r.status <> 'lobby' then
    raise exception 'BAD_STATUS';
  end if;
  delete from public.items where id = p_item_id;
end;
$$;

create or replace function public.host_kick_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.members%rowtype;
begin
  select * into target from public.members where id = p_member_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  perform public._require_host(target.room_id);
  if target.is_host then
    raise exception 'INVALID';
  end if;
  update public.members
  set kicked_at = now()
  where id = p_member_id;
end;
$$;

create or replace function public.host_set_locked(p_room_id uuid, p_locked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_host(p_room_id);
  update public.rooms set locked = coalesce(p_locked, true) where id = p_room_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant execute on function public.draw_bracket(uuid) to authenticated;
grant execute on function public.start_knockout(uuid) to authenticated;
grant execute on function public.host_extend_deadline(uuid, int) to authenticated;
grant execute on function public.host_end_round(uuid) to authenticated;
grant execute on function public.host_rename_item(uuid, text) to authenticated;
grant execute on function public.host_delete_item(uuid) to authenticated;
grant execute on function public.host_kick_member(uuid) to authenticated;
grant execute on function public.host_set_locked(uuid, boolean) to authenticated;

revoke all on function public._require_host(uuid) from public, anon, authenticated;
revoke all on function public._next_pow2(int) from public, anon, authenticated;
revoke all on function public._shuffle_uuids(uuid[]) from public, anon, authenticated;
revoke all on function public._place_bracket(uuid, uuid[]) from public, anon, authenticated;

-- Column grants for new fields (rooms uses explicit column grants in 0001).
grant select (
  id, slug, name, mode, host_id, votes_per_member, qualify_deadline,
  qualify_duration_minutes, knockout_size, match_duration_minutes, tie_rule,
  allow_member_upload, status, champion_item_id, created_at, locked, draw_version
) on table public.rooms to authenticated;
grant select (kicked_at) on table public.members to authenticated;

-- Re-bind execute after replace
grant execute on function public.create_room(text, text, text, int, int, int, int, text, boolean, text, text, text) to authenticated;
grant execute on function public.join_room(text, text, text, text, text) to authenticated;
grant execute on function public.advance_room(uuid, boolean) to authenticated;
