-- Vote Đi — initial schema, RLS, RPCs, storage, realtime.
-- Run this entire file in the Supabase SQL editor.
-- Also enable Anonymous sign-ins in Authentication → Providers.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  password_hash text not null,
  mode text not null check (mode in ('qualify_knockout', 'knockout')),
  host_id uuid not null,
  votes_per_member int not null default 3 check (votes_per_member between 1 and 20),
  qualify_deadline timestamptz,
  -- Minutes until qualify ends, counted from the moment the host presses start.
  qualify_duration_minutes int check (qualify_duration_minutes between 1 and 10080),
  knockout_size int not null check (knockout_size in (4, 8, 16)),
  match_duration_minutes int not null default 30 check (match_duration_minutes between 1 and 1440),
  tie_rule text not null default 'random' check (tie_rule in ('random', 'host')),
  allow_member_upload boolean not null default false,
  status text not null default 'lobby' check (status in ('lobby', 'qualify', 'knockout', 'done')),
  champion_item_id uuid,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  avatar_emoji text,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  uploader_member_id uuid references public.members (id) on delete set null,
  image_url text not null,
  is_transparent boolean not null default false,
  title text,
  created_at timestamptz not null default now()
);

alter table public.rooms
  add constraint rooms_champion_item_fk
  foreign key (champion_item_id) references public.items (id) on delete set null;

create table public.qualify_votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  unique (item_id, member_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  round int not null check (round >= 1),
  position int not null check (position >= 0),
  item_a uuid references public.items (id) on delete set null,
  item_b uuid references public.items (id) on delete set null,
  winner_item_id uuid references public.items (id) on delete set null,
  deadline timestamptz,
  status text not null default 'pending' check (status in ('pending', 'live', 'done')),
  unique (room_id, round, position)
);

create table public.match_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  unique (match_id, member_id)
);

create index members_room_id_idx on public.members (room_id);
create index members_user_id_idx on public.members (user_id);
create index items_room_id_idx on public.items (room_id);
create index qualify_votes_room_id_idx on public.qualify_votes (room_id);
create index qualify_votes_member_id_idx on public.qualify_votes (member_id);
create index matches_room_id_idx on public.matches (room_id);
create index match_votes_match_id_idx on public.match_votes (match_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.try_uuid(p text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p::uuid;
exception
  when others then
    return null;
end;
$$;

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
  );
$$;

create or replace function public.generate_slug(len int default 8)
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  result text := '';
  bytes bytea;
  i int;
begin
  bytes := gen_random_bytes(len);
  for i in 0..(len - 1) loop
    result := result || substr(chars, (get_byte(bytes, i) % length(chars)) + 1, 1);
  end loop;
  return result;
end;
$$;

-- World Cup fold: 1 vs last, halves split so 1 and 2 sit on opposite sides.
create or replace function public._seed_slots(n int)
returns int[]
language plpgsql
immutable
set search_path = public
as $$
declare
  positions int[] := array[1, 2];
  next_positions int[] := array[]::int[];
  p int;
  sum_to int;
begin
  if n < 2 or (n & (n - 1)) <> 0 then
    raise exception 'BAD_SIZE';
  end if;

  while coalesce(array_length(positions, 1), 0) < n loop
    next_positions := array[]::int[];
    sum_to := coalesce(array_length(positions, 1), 0) * 2 + 1;
    foreach p in array positions loop
      next_positions := next_positions || p || (sum_to - p);
    end loop;
    positions := next_positions;
  end loop;

  return positions;
end;
$$;

create or replace function public._begin_knockout(p_room_id uuid, p_item_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  slots int[];
  i int;
  pos int;
  dur int;
begin
  if exists (select 1 from public.matches where room_id = p_room_id) then
    update public.rooms set status = 'knockout' where id = p_room_id and status <> 'done';
    return;
  end if;

  n := coalesce(array_length(p_item_ids, 1), 0);
  if n not in (4, 8, 16) then
    raise exception 'ITEM_COUNT';
  end if;

  select match_duration_minutes into dur from public.rooms where id = p_room_id;
  slots := public._seed_slots(n);

  i := 1;
  pos := 0;
  while i <= n loop
    insert into public.matches (room_id, round, position, item_a, item_b, deadline, status)
    values (
      p_room_id,
      1,
      pos,
      p_item_ids[slots[i]],
      p_item_ids[slots[i + 1]],
      now() + make_interval(mins => dur),
      'live'
    );
    i := i + 2;
    pos := pos + 1;
  end loop;

  update public.rooms
  set status = 'knockout',
      knockout_size = n
  where id = p_room_id;
end;
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

  -- random: tied items are shuffled. host: the host's uploads win ties, then earlier uploads.
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

  select count(*) into member_count from public.members where room_id = p_room_id;
  final_round := log(2, r.knockout_size::numeric)::int;

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
        where mv.match_id = m.id and mem.is_host
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

  insert into public.matches (room_id, round, position, item_a, item_b, deadline, status)
  select
    p_room_id,
    d.round + 1,
    d.next_pos,
    d.item_a,
    d.item_b,
    now() + make_interval(mins => r.match_duration_minutes),
    'live'
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
       and max(winner_item_id) filter (where position % 2 = 0) is not null
       and max(winner_item_id) filter (where position % 2 = 1) is not null
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

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

create or replace function public.preview_room(p_slug text)
returns table (id uuid, slug text, name text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.slug, r.name, r.status
  from public.rooms r
  where r.slug = p_slug;
$$;

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
  if p_password is null or char_length(p_password) < 4 or char_length(p_password) > 72 then
    raise exception 'INVALID';
  end if;
  if p_mode not in ('qualify_knockout', 'knockout') then
    raise exception 'INVALID';
  end if;
  if p_knockout_size not in (4, 8, 16) then
    raise exception 'INVALID';
  end if;
  if p_tie_rule not in ('random', 'host') then
    raise exception 'INVALID';
  end if;
  if p_votes_per_member < 1 or p_votes_per_member > 20 then
    raise exception 'INVALID';
  end if;
  if p_match_duration_minutes < 1 or p_match_duration_minutes > 1440 then
    raise exception 'INVALID';
  end if;
  if p_mode = 'qualify_knockout' and (p_qualify_duration_minutes < 1 or p_qualify_duration_minutes > 10080) then
    raise exception 'INVALID';
  end if;
  if p_display_name is null or char_length(btrim(p_display_name)) < 1 or char_length(btrim(p_display_name)) > 40 then
    raise exception 'INVALID';
  end if;

  for attempt in 1..8 loop
    new_slug := public.generate_slug(8);
    begin
      insert into public.rooms (
        slug, name, password_hash, mode, host_id, votes_per_member,
        qualify_duration_minutes, knockout_size, match_duration_minutes,
        tie_rule, allow_member_upload, status
      ) values (
        new_slug,
        btrim(p_name),
        crypt(p_password, gen_salt('bf')),
        p_mode,
        auth.uid(),
        p_votes_per_member,
        p_qualify_duration_minutes,
        p_knockout_size,
        p_match_duration_minutes,
        p_tie_rule,
        coalesce(p_allow_member_upload, false),
        'lobby'
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
  existing_id uuid;
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

  select id into existing_id
  from public.members
  where room_id = r.id and user_id = auth.uid();

  if existing_id is not null then
    return existing_id;
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

create or replace function public.cast_qualify_vote(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  v_room public.rooms%rowtype;
  v_member public.members%rowtype;
  v_used int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_item from public.items where id = p_item_id;
  if not found then
    raise exception 'BAD_ITEM';
  end if;

  select * into v_room from public.rooms where id = v_item.room_id;
  if v_room.status <> 'qualify' then
    raise exception 'BAD_STATUS';
  end if;
  if v_room.qualify_deadline is null or now() >= v_room.qualify_deadline then
    raise exception 'DEADLINE';
  end if;

  select * into v_member
  from public.members
  where room_id = v_room.id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'NOT_MEMBER';
  end if;

  if exists (
    select 1 from public.qualify_votes
    where item_id = p_item_id and member_id = v_member.id
  ) then
    raise exception 'ALREADY_VOTED';
  end if;

  select count(*) into v_used
  from public.qualify_votes
  where room_id = v_room.id and member_id = v_member.id;

  if v_used >= v_room.votes_per_member then
    raise exception 'VOTE_LIMIT';
  end if;

  insert into public.qualify_votes (room_id, item_id, member_id)
  values (v_room.id, p_item_id, v_member.id);
end;
$$;

create or replace function public.remove_qualify_vote(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  v_room public.rooms%rowtype;
  v_member public.members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_item from public.items where id = p_item_id;
  if not found then
    raise exception 'BAD_ITEM';
  end if;

  select * into v_room from public.rooms where id = v_item.room_id;
  if v_room.status <> 'qualify' then
    raise exception 'BAD_STATUS';
  end if;
  if v_room.qualify_deadline is null or now() >= v_room.qualify_deadline then
    raise exception 'DEADLINE';
  end if;

  select * into v_member
  from public.members
  where room_id = v_room.id and user_id = auth.uid();

  if not found then
    raise exception 'NOT_MEMBER';
  end if;

  delete from public.qualify_votes
  where item_id = p_item_id and member_id = v_member.id;
end;
$$;

create or replace function public.cast_match_vote(p_match_id uuid, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_member public.members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'BAD_ITEM';
  end if;
  if v_match.status <> 'live' then
    raise exception 'BAD_STATUS';
  end if;
  if v_match.deadline is not null and now() >= v_match.deadline then
    raise exception 'DEADLINE';
  end if;
  if p_item_id is distinct from v_match.item_a and p_item_id is distinct from v_match.item_b then
    raise exception 'BAD_ITEM';
  end if;

  select * into v_member
  from public.members
  where room_id = v_match.room_id and user_id = auth.uid();

  if not found then
    raise exception 'NOT_MEMBER';
  end if;

  insert into public.match_votes (match_id, member_id, item_id)
  values (p_match_id, v_member.id, p_item_id)
  on conflict (match_id, member_id)
  do update set item_id = excluded.item_id;
end;
$$;

-- Idempotent progression.
-- p_host_start = true only from the host "Bắt đầu" button.
-- Page load, countdown, and post-vote calls use false so a lobby never auto-starts.
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
  ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_member
  from public.members
  where room_id = p_room_id and user_id = auth.uid();

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
      if v_count < r.knockout_size then
        raise exception 'NOT_ENOUGH_ITEMS';
      end if;
      update public.rooms
      set status = 'qualify',
          qualify_deadline = now() + make_interval(mins => coalesce(r.qualify_duration_minutes, 60))
      where id = p_room_id;
      return;
    end if;

    if v_count <> r.knockout_size or v_count not in (4, 8, 16) then
      raise exception 'ITEM_COUNT';
    end if;

    select coalesce(array_agg(id order by created_at asc, id asc), array[]::uuid[])
    into ids
    from public.items
    where room_id = p_room_id;

    perform public._begin_knockout(p_room_id, ids);
    return;
  end if;

  if r.status = 'qualify' then
    if r.qualify_deadline is not null and now() >= r.qualify_deadline then
      perform public._begin_knockout(p_room_id, public._qualify_ids(p_room_id));
    end if;
    return;
  end if;

  if r.status = 'knockout' then
    perform public._resolve_knockout(p_room_id);
  end if;
end;
$$;

create or replace function public.rematch_room(p_room_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  new_slug text;
  new_id uuid;
  attempt int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_member
  from public.members
  where room_id = p_room_id and user_id = auth.uid();

  if not found then
    raise exception 'NOT_MEMBER';
  end if;

  select * into r from public.rooms where id = p_room_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  for attempt in 1..8 loop
    new_slug := public.generate_slug(8);
    begin
      insert into public.rooms (
        slug, name, password_hash, mode, host_id, votes_per_member,
        qualify_duration_minutes, knockout_size, match_duration_minutes,
        tie_rule, allow_member_upload, status
      ) values (
        new_slug,
        r.name,
        r.password_hash,
        r.mode,
        auth.uid(),
        r.votes_per_member,
        r.qualify_duration_minutes,
        r.knockout_size,
        r.match_duration_minutes,
        r.tie_rule,
        r.allow_member_upload,
        'lobby'
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
    v_member.display_name,
    v_member.avatar_url,
    v_member.avatar_emoji,
    true
  );

  return new_slug;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.rooms enable row level security;
alter table public.members enable row level security;
alter table public.items enable row level security;
alter table public.qualify_votes enable row level security;
alter table public.matches enable row level security;
alter table public.match_votes enable row level security;

create policy rooms_select on public.rooms
for select to authenticated
using (public.is_room_member(id));

create policy members_select on public.members
for select to authenticated
using (public.is_room_member(room_id));

create policy items_select on public.items
for select to authenticated
using (public.is_room_member(room_id));

create policy items_insert on public.items
for insert to authenticated
with check (
  exists (
    select 1
    from public.members m
    join public.rooms r on r.id = m.room_id
    where m.id = uploader_member_id
      and m.user_id = auth.uid()
      and m.room_id = items.room_id
      and r.status = 'lobby'
      and (m.is_host or r.allow_member_upload)
  )
);

create policy items_delete on public.items
for delete to authenticated
using (
  exists (
    select 1
    from public.members m
    join public.rooms r on r.id = m.room_id
    where m.room_id = items.room_id
      and m.user_id = auth.uid()
      and r.status = 'lobby'
      and (m.is_host or m.id = items.uploader_member_id)
  )
);

create policy qualify_votes_select on public.qualify_votes
for select to authenticated
using (public.is_room_member(room_id));

create policy matches_select on public.matches
for select to authenticated
using (public.is_room_member(room_id));

create policy match_votes_select on public.match_votes
for select to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_votes.match_id
      and public.is_room_member(m.room_id)
  )
);

revoke all on table public.rooms from anon, authenticated;
grant select (
  id,
  slug,
  name,
  mode,
  host_id,
  votes_per_member,
  qualify_deadline,
  qualify_duration_minutes,
  knockout_size,
  match_duration_minutes,
  tie_rule,
  allow_member_upload,
  status,
  champion_item_id,
  created_at
) on public.rooms to authenticated;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant execute on function public.try_uuid(text) to authenticated;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.preview_room(text) to authenticated;
grant execute on function public.create_room(text, text, text, int, int, int, int, text, boolean, text, text, text) to authenticated;
grant execute on function public.join_room(text, text, text, text, text) to authenticated;
grant execute on function public.cast_qualify_vote(uuid) to authenticated;
grant execute on function public.remove_qualify_vote(uuid) to authenticated;
grant execute on function public.cast_match_vote(uuid, uuid) to authenticated;
grant execute on function public.advance_room(uuid, boolean) to authenticated;
grant execute on function public.rematch_room(uuid) to authenticated;

revoke all on function public.generate_slug(int) from public, anon, authenticated;
revoke all on function public._seed_slots(int) from public, anon, authenticated;
revoke all on function public._begin_knockout(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public._qualify_ids(uuid) from public, anon, authenticated;
revoke all on function public._resolve_knockout(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket "items" (public read)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'items',
  'items',
  true,
  10485760,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists items_public_read on storage.objects;
create policy items_public_read on storage.objects
for select to public
using (bucket_id = 'items');

drop policy if exists items_auth_insert on storage.objects;
create policy items_auth_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'items'
  and (
    (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    or public.is_room_member(public.try_uuid((storage.foldername(name))[1]))
  )
);

drop policy if exists items_auth_update on storage.objects;
create policy items_auth_update on storage.objects
for update to authenticated
using (
  bucket_id = 'items'
  and (
    (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    or public.is_room_member(public.try_uuid((storage.foldername(name))[1]))
  )
);

drop policy if exists items_auth_delete on storage.objects;
create policy items_auth_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'items'
  and (
    (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    or public.is_room_member(public.try_uuid((storage.foldername(name))[1]))
  )
);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter table public.rooms replica identity full;
alter table public.members replica identity full;
alter table public.items replica identity full;
alter table public.qualify_votes replica identity full;
alter table public.matches replica identity full;
alter table public.match_votes replica identity full;

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['rooms', 'members', 'items', 'qualify_votes', 'matches', 'match_votes']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
