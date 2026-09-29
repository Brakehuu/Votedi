-- Vote Đi — 0005: seeding_mode + instant bracket (no animation / no wait).
-- Run after 0004_fix_uuid_autodraw.sql. Does not modify older files.

alter table public.rooms
  add column if not exists seeding_mode text not null default 'random';

alter table public.rooms drop constraint if exists rooms_seeding_mode_check;
alter table public.rooms
  add constraint rooms_seeding_mode_check
  check (seeding_mode in ('random', 'manual'));

-- ---------------------------------------------------------------------------
-- Seed helpers
-- ---------------------------------------------------------------------------

-- size=8 → {1,8,4,5,2,7,3,6}
create or replace function public._standard_seed_order(p_size int)
returns int[]
language plpgsql
immutable
as $$
declare
  seeds int[] := array[1];
  r int := 0;
  s int;
  nxt int[];
  lim int;
begin
  if p_size not in (2, 4, 8, 16) then
    raise exception 'BAD_SIZE';
  end if;
  while (1 << r) < p_size loop
    r := r + 1;
    lim := 1 << r;
    nxt := array[]::int[];
    foreach s in array seeds loop
      nxt := nxt || s || (lim + 1 - s);
    end loop;
    seeds := nxt;
  end loop;
  return seeds;
end;
$$;

-- Ranked ids (index 1 = seed #1) → full slot array; missing seeds = bye (null).
create or replace function public._slots_seeded(p_ranked uuid[])
returns uuid[]
language plpgsql
immutable
as $$
declare
  n int;
  size int;
  order_seeds int[];
  slots uuid[];
  i int;
  seed_no int;
begin
  n := coalesce(array_length(p_ranked, 1), 0);
  if n < 2 then
    raise exception 'NOT_ENOUGH_ITEMS';
  end if;
  if n > 16 then
    raise exception 'ITEM_COUNT';
  end if;
  size := public._next_pow2(n);
  order_seeds := public._standard_seed_order(size);
  slots := array_fill(null::uuid, array[size]);
  for i in 1..size loop
    seed_no := order_seeds[i];
    if seed_no <= n then
      slots[i] := p_ranked[seed_no];
    end if;
  end loop;
  return slots;
end;
$$;

create or replace function public._slots_random(p_ids uuid[])
returns uuid[]
language plpgsql
volatile
as $$
declare
  n int;
  size int;
  shuffled uuid[];
  slots uuid[];
begin
  n := coalesce(array_length(p_ids, 1), 0);
  if n < 2 or n > 16 then
    raise exception 'ITEM_COUNT';
  end if;
  size := public._next_pow2(n);
  shuffled := public._shuffle_uuids(p_ids);
  slots := shuffled;
  while coalesce(array_length(slots, 1), 0) < size loop
    slots := slots || array[null::uuid];
  end loop;
  select coalesce(array_agg(x order by random()), array[]::uuid[])
  into slots
  from unnest(slots) as x;
  return slots;
end;
$$;

create or replace function public._read_round1_slots(p_room_id uuid)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  slots uuid[] := array[]::uuid[];
  rec record;
begin
  for rec in
    select item_a, item_b
    from public.matches
    where room_id = p_room_id and round = 1
    order by position
  loop
    slots := slots || rec.item_a || rec.item_b;
  end loop;
  return slots;
end;
$$;

-- Instant bracket from ordered slots (null = bye). No max/min on uuid.
create or replace function public._build_bracket(p_room_id uuid, p_slots uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  size int;
  i int;
  pos int;
  a uuid;
  b uuid;
  win uuid;
  st text;
  filled int := 0;
  id uuid;
begin
  size := coalesce(array_length(p_slots, 1), 0);
  if size not in (2, 4, 8, 16) then
    raise exception 'BAD_SIZE';
  end if;

  foreach id in array p_slots loop
    if id is not null then
      filled := filled + 1;
      if not exists (select 1 from public.items where id = id and room_id = p_room_id) then
        raise exception 'BAD_ITEM';
      end if;
    end if;
  end loop;
  if filled < 2 then
    raise exception 'NOT_ENOUGH_ITEMS';
  end if;

  delete from public.match_votes
  where match_id in (select id from public.matches where room_id = p_room_id);
  delete from public.matches where room_id = p_room_id;

  i := 1;
  pos := 0;
  while i <= size loop
    a := p_slots[i];
    b := p_slots[i + 1];
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
      champion_item_id = null,
      draw_version = coalesce(draw_version, 0) + 1
  where id = p_room_id;

  perform public._advance_byes(p_room_id);
end;
$$;

create or replace function public._place_bracket(p_room_id uuid, p_item_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._build_bracket(p_room_id, public._slots_random(p_item_ids));
end;
$$;

create or replace function public._clear_bracket_to_lobby(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.match_votes
  where match_id in (select id from public.matches where room_id = p_room_id);
  delete from public.matches where room_id = p_room_id;
  update public.rooms
  set status = 'lobby',
      champion_item_id = null,
      draw_version = coalesce(draw_version, 0) + 1
  where id = p_room_id;
end;
$$;

-- Preserve slot positions; put p_new in first null. Grow/shrink to next pow2.
-- Also backfill any room items missing from slots (e.g. first item when crossing 2).
create or replace function public._manual_slots_with_new(p_room_id uuid, p_new_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  size int;
  old uuid[];
  slots uuid[];
  i int;
  s uuid;
  kept uuid[] := array[]::uuid[];
  miss uuid;
begin
  select count(*) into v_count from public.items where room_id = p_room_id;
  size := public._next_pow2(greatest(v_count, 2));
  old := public._read_round1_slots(p_room_id);

  foreach s in array coalesce(old, array[]::uuid[]) loop
    if s is not null and exists (select 1 from public.items where id = s and room_id = p_room_id) then
      kept := kept || s;
    end if;
  end loop;

  if coalesce(array_length(old, 1), 0) = size then
    slots := array_fill(null::uuid, array[size]);
    for i in 1..size loop
      s := old[i];
      if s is not null and exists (select 1 from public.items where id = s and room_id = p_room_id) then
        slots[i] := s;
      end if;
    end loop;
  else
    slots := array_fill(null::uuid, array[size]);
    for i in 1..least(coalesce(array_length(kept, 1), 0), size) loop
      slots[i] := kept[i];
    end loop;
  end if;

  -- Prefer p_new into first empty, then any other missing room items.
  if not (p_new_id = any (coalesce(slots, array[]::uuid[]))) then
    for i in 1..size loop
      if slots[i] is null then
        slots[i] := p_new_id;
        exit;
      end if;
    end loop;
  end if;

  for miss in
    select id from public.items
    where room_id = p_room_id
      and not (id = any (coalesce(slots, array[]::uuid[])))
    order by created_at asc, id asc
  loop
    for i in 1..size loop
      if slots[i] is null then
        slots[i] := miss;
        exit;
      end if;
    end loop;
  end loop;

  return slots;
end;
$$;

create or replace function public._manual_slots_without(p_room_id uuid, p_removed uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  size int;
  old uuid[];
  slots uuid[];
  i int;
  s uuid;
  kept uuid[] := array[]::uuid[];
begin
  select count(*) into v_count from public.items where room_id = p_room_id;
  if v_count < 2 then
    return null;
  end if;
  size := public._next_pow2(v_count);
  old := public._read_round1_slots(p_room_id);

  if coalesce(array_length(old, 1), 0) = size then
    slots := array_fill(null::uuid, array[size]);
    for i in 1..size loop
      s := old[i];
      if s is not null
         and s is distinct from p_removed
         and exists (select 1 from public.items where id = s and room_id = p_room_id) then
        slots[i] := s;
      end if;
    end loop;
    return slots;
  end if;

  foreach s in array coalesce(old, array[]::uuid[]) loop
    if s is not null
       and s is distinct from p_removed
       and exists (select 1 from public.items where id = s and room_id = p_room_id) then
      kept := kept || s;
    end if;
  end loop;

  slots := array_fill(null::uuid, array[size]);
  for i in 1..least(coalesce(array_length(kept, 1), 0), size) loop
    slots[i] := kept[i];
  end loop;
  return slots;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: instant update on item insert/delete for direct knockout
-- ---------------------------------------------------------------------------

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
  ids uuid[];
  slots uuid[];
begin
  rid := coalesce(NEW.room_id, OLD.room_id);
  select * into r from public.rooms where id = rid for update;
  if not found then
    return coalesce(NEW, OLD);
  end if;

  if r.mode <> 'knockout' or r.status not in ('lobby', 'drawn') then
    return coalesce(NEW, OLD);
  end if;

  select count(*) into v_count from public.items where room_id = rid;

  if TG_OP = 'INSERT' and v_count > 16 then
    raise exception 'KNOCKOUT_MAX_ITEMS';
  end if;

  if v_count < 2 then
    perform public._clear_bracket_to_lobby(rid);
    return coalesce(NEW, OLD);
  end if;

  if coalesce(r.seeding_mode, 'random') = 'random' then
    select coalesce(array_agg(id order by created_at asc, id asc), array[]::uuid[])
    into ids
    from public.items
    where room_id = rid;
    perform public._build_bracket(rid, public._slots_random(ids));
  else
    if TG_OP = 'INSERT' then
      slots := public._manual_slots_with_new(rid, NEW.id);
    else
      slots := public._manual_slots_without(rid, OLD.id);
      if slots is null then
        perform public._clear_bracket_to_lobby(rid);
        return coalesce(NEW, OLD);
      end if;
    end if;
    perform public._build_bracket(rid, slots);
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists items_knockout_autodraw on public.items;
create trigger items_knockout_autodraw
after insert or delete on public.items
for each row
execute function public.trg_items_knockout_autodraw();

-- Keep name for 0004 callers; random path only.
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
  if not found or r.mode <> 'knockout' or r.status not in ('lobby', 'drawn') then
    return;
  end if;
  select coalesce(array_agg(id order by created_at asc, id asc), array[]::uuid[])
  into ids from public.items where room_id = p_room_id;
  v_count := coalesce(array_length(ids, 1), 0);
  if v_count < 2 then
    perform public._clear_bracket_to_lobby(p_room_id);
    return;
  end if;
  if coalesce(r.seeding_mode, 'random') = 'random' then
    perform public._build_bracket(p_room_id, public._slots_random(ids));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Qualify → knockout: ALWAYS seeded by rank (never random)
-- ---------------------------------------------------------------------------

create or replace function public.advance_room(p_room_id uuid, p_host_start boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  mem public.members%rowtype;
  v_count int;
  ranked uuid[];
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into mem
  from public.members
  where room_id = p_room_id and user_id = auth.uid() and kicked_at is null;
  if not found then
    raise exception 'NOT_MEMBER';
  end if;

  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if r.status = 'lobby' then
    if not coalesce(p_host_start, false) then
      return;
    end if;
    if not mem.is_host then
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
    -- Direct knockout: host should use start_knockout after auto-draw.
    raise exception 'NEED_DRAW';
  end if;

  if r.status = 'qualify' then
    if r.qualify_deadline is not null and now() < r.qualify_deadline and not coalesce(p_host_start, false) then
      return;
    end if;
    if coalesce(p_host_start, false) and not mem.is_host then
      raise exception 'NOT_HOST';
    end if;
    ranked := public._qualify_ids(p_room_id);
    if coalesce(array_length(ranked, 1), 0) < 2 then
      raise exception 'NOT_ENOUGH_ITEMS';
    end if;
    perform public._build_bracket(p_room_id, public._slots_seeded(ranked));
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

create or replace function public.host_end_round(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  ranked uuid[];
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if r.status = 'qualify' then
    update public.rooms set qualify_deadline = now() where id = p_room_id;
    ranked := public._qualify_ids(p_room_id);
    if coalesce(array_length(ranked, 1), 0) < 2 then
      raise exception 'NOT_ENOUGH_ITEMS';
    end if;
    perform public._build_bracket(p_room_id, public._slots_seeded(ranked));
    return;
  end if;
  if r.status = 'knockout' then
    update public.matches
    set deadline = now()
    where room_id = p_room_id and status = 'live';
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
  ranked uuid[];
  v_count int;
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if r.status = 'lobby' and r.mode = 'knockout' then
    select coalesce(array_agg(id order by created_at, id), array[]::uuid[]) into ids
    from public.items where room_id = p_room_id;
    v_count := coalesce(array_length(ids, 1), 0);
    if v_count < 2 or v_count > 16 then
      raise exception 'ITEM_COUNT';
    end if;
    if coalesce(r.seeding_mode, 'random') = 'manual' then
      -- Fill slots in upload order; trailing nulls = bye
      while coalesce(array_length(ids, 1), 0) < public._next_pow2(v_count) loop
        ids := ids || array[null::uuid];
      end loop;
      perform public._build_bracket(p_room_id, ids);
    else
      perform public._build_bracket(p_room_id, public._slots_random(ids));
    end if;
    return;
  end if;

  if r.status = 'qualify' then
    if r.qualify_deadline is null or now() < r.qualify_deadline then
      raise exception 'BAD_STATUS';
    end if;
    ranked := public._qualify_ids(p_room_id);
    if coalesce(array_length(ranked, 1), 0) < 2 then
      raise exception 'NOT_ENOUGH_ITEMS';
    end if;
    perform public._build_bracket(p_room_id, public._slots_seeded(ranked));
    return;
  end if;

  if r.status = 'drawn' then
    if r.mode = 'knockout' then
      select coalesce(array_agg(id order by created_at, id), array[]::uuid[]) into ids
      from public.items where room_id = p_room_id;
    else
      ids := public._qualify_ids(p_room_id);
    end if;
    v_count := coalesce(array_length(ids, 1), 0);
    if v_count < 2 then
      raise exception 'NOT_ENOUGH_ITEMS';
    end if;
    if r.mode = 'qualify_knockout' then
      perform public._build_bracket(p_room_id, public._slots_seeded(ids));
    elsif coalesce(r.seeding_mode, 'random') = 'manual' then
      perform public._build_bracket(p_room_id, public._read_round1_slots(p_room_id));
    else
      perform public._build_bracket(p_room_id, public._slots_random(ids));
    end if;
    return;
  end if;

  raise exception 'BAD_STATUS';
end;
$$;

-- ---------------------------------------------------------------------------
-- Host RPCs
-- ---------------------------------------------------------------------------

create or replace function public.host_shuffle_bracket(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  ids uuid[];
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if r.mode <> 'knockout' or r.status not in ('lobby', 'drawn') then
    raise exception 'BAD_STATUS';
  end if;
  select coalesce(array_agg(id order by created_at, id), array[]::uuid[])
  into ids from public.items where room_id = p_room_id;
  if coalesce(array_length(ids, 1), 0) < 2 then
    raise exception 'NOT_ENOUGH_ITEMS';
  end if;
  perform public._build_bracket(p_room_id, public._slots_random(ids));
end;
$$;

create or replace function public.host_set_seeding_mode(p_room_id uuid, p_mode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  ids uuid[];
begin
  perform public._require_host(p_room_id);
  if p_mode not in ('random', 'manual') then
    raise exception 'INVALID';
  end if;
  select * into r from public.rooms where id = p_room_id for update;
  if r.status not in ('lobby', 'drawn') then
    raise exception 'BAD_STATUS';
  end if;

  update public.rooms set seeding_mode = p_mode where id = p_room_id;

  if r.mode = 'knockout' then
    select coalesce(array_agg(id order by created_at, id), array[]::uuid[])
    into ids from public.items where room_id = p_room_id;
    if coalesce(array_length(ids, 1), 0) >= 2 then
      if p_mode = 'random' then
        perform public._build_bracket(p_room_id, public._slots_random(ids));
      else
        -- keep current layout if present; else seed by upload order
        if exists (select 1 from public.matches where room_id = p_room_id) then
          perform public._build_bracket(p_room_id, public._read_round1_slots(p_room_id));
        else
          perform public._build_bracket(p_room_id, public._slots_seeded(ids));
        end if;
      end if;
    end if;
  end if;
end;
$$;

create or replace function public.host_set_bracket(p_room_id uuid, p_item_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  size int;
  id uuid;
  seen uuid[] := array[]::uuid[];
  room_ids uuid[];
  filled int := 0;
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if r.status not in ('lobby', 'drawn') then
    raise exception 'BAD_STATUS';
  end if;
  if coalesce(r.seeding_mode, 'random') <> 'manual' then
    raise exception 'BAD_STATUS';
  end if;

  size := coalesce(array_length(p_item_ids, 1), 0);
  if size not in (2, 4, 8, 16) then
    raise exception 'BAD_SIZE';
  end if;

  select coalesce(array_agg(id), array[]::uuid[]) into room_ids
  from public.items where room_id = p_room_id;

  foreach id in array p_item_ids loop
    if id is not null then
      filled := filled + 1;
      if id = any (seen) then
        raise exception 'INVALID';
      end if;
      if not (id = any (room_ids)) then
        raise exception 'BAD_ITEM';
      end if;
      seen := seen || id;
    end if;
  end loop;

  if filled <> coalesce(array_length(room_ids, 1), 0) then
    raise exception 'INVALID';
  end if;
  if filled < 2 then
    raise exception 'NOT_ENOUGH_ITEMS';
  end if;

  perform public._build_bracket(p_room_id, p_item_ids);
end;
$$;

-- create_room: add seeding_mode (new signature)
drop function if exists public.create_room(text, text, text, int, int, int, int, text, boolean, text, text, text);

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
  p_avatar_emoji text,
  p_seeding_mode text default 'random'
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_slug text;
  new_id uuid;
  attempt int;
  v_seed text;
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
  v_seed := coalesce(nullif(p_seeding_mode, ''), 'random');
  if v_seed not in ('random', 'manual') then
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
        tie_rule, allow_member_upload, status, locked, seeding_mode
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
        false,
        v_seed
      )
      returning id into new_id;

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
    exception when unique_violation then
      null;
    end;
  end loop;
  raise exception 'INVALID';
end;
$$;

grant execute on function public.create_room(text, text, text, int, int, int, int, text, boolean, text, text, text, text) to authenticated;
grant execute on function public.host_shuffle_bracket(uuid) to authenticated;
grant execute on function public.host_set_seeding_mode(uuid, text) to authenticated;
grant execute on function public.host_set_bracket(uuid, uuid[]) to authenticated;
grant execute on function public.draw_bracket(uuid) to authenticated;
grant execute on function public.advance_room(uuid, boolean) to authenticated;
grant execute on function public.host_end_round(uuid) to authenticated;

grant select (
  id, slug, name, mode, host_id, votes_per_member, qualify_deadline,
  qualify_duration_minutes, knockout_size, match_duration_minutes, tie_rule,
  allow_member_upload, status, champion_item_id, created_at, locked, draw_version,
  seeding_mode
) on table public.rooms to authenticated;

revoke all on function public._build_bracket(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public._slots_seeded(uuid[]) from public, anon, authenticated;
revoke all on function public._slots_random(uuid[]) from public, anon, authenticated;
revoke all on function public._standard_seed_order(int) from public, anon, authenticated;
revoke all on function public._read_round1_slots(uuid) from public, anon, authenticated;
revoke all on function public._manual_slots_with_new(uuid, uuid) from public, anon, authenticated;
revoke all on function public._manual_slots_without(uuid, uuid) from public, anon, authenticated;
revoke all on function public._clear_bracket_to_lobby(uuid) from public, anon, authenticated;
revoke all on function public._place_bracket(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public._autodraw_knockout_from_items(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
