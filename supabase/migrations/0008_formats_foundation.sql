-- Vote Đi — 0008: Phase 0 foundation (vote formats, richer options, generic votes).
-- Run after 0007_upload_password.sql. Safe to re-run (add ... if not exists / create or replace).
--
-- 1. rooms: format + per-format settings; non-bracket rooms use status 'open' → 'closed'.
--    bracket_mode mirrors the legacy mode column (null for non-bracket rooms).
-- 2. items: item_type (image | text | place | link) + text/price/emoji fields.
-- 3. votes: one row per (item, member) for quick / swipe / ranking / rating / group stage.
-- 4. RPCs: create_room_v2, add_options, cast_vote, remove_vote, clear_my_votes, close_room_if_due.

-- ---------------------------------------------------------------------------
-- 1. rooms
-- ---------------------------------------------------------------------------

alter table public.rooms add column if not exists format text not null default 'bracket';
alter table public.rooms add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.rooms add column if not exists description text;
alter table public.rooms add column if not exists anonymous boolean not null default false;
alter table public.rooms add column if not exists results_visibility text not null default 'live';
alter table public.rooms add column if not exists comments_enabled boolean not null default true;
alter table public.rooms add column if not exists reactions_enabled boolean not null default true;
alter table public.rooms add column if not exists allow_member_options boolean not null default false;
alter table public.rooms add column if not exists template_slug text;
alter table public.rooms add column if not exists deadline timestamptz;
alter table public.rooms add column if not exists result jsonb;
alter table public.rooms add column if not exists closed_at timestamptz;

alter table public.rooms alter column mode drop not null;
alter table public.rooms alter column knockout_size set default 8;
alter table public.rooms
  add column if not exists bracket_mode text generated always as (mode) stored;

alter table public.rooms drop constraint if exists rooms_format_check;
alter table public.rooms
  add constraint rooms_format_check
  check (format in ('bracket', 'quick', 'schedule', 'swipe', 'ranking', 'rating'));

alter table public.rooms drop constraint if exists rooms_format_mode_check;
alter table public.rooms
  add constraint rooms_format_mode_check
  check ((format = 'bracket') = (mode is not null));

alter table public.rooms drop constraint if exists rooms_results_visibility_check;
alter table public.rooms
  add constraint rooms_results_visibility_check
  check (results_visibility in ('live', 'after_vote', 'after_close'));

alter table public.rooms drop constraint if exists rooms_description_check;
alter table public.rooms
  add constraint rooms_description_check
  check (description is null or char_length(description) <= 300);

alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms
  add constraint rooms_status_check
  check (status in ('lobby', 'qualify', 'drawn', 'knockout', 'done', 'open', 'closed'));

-- ---------------------------------------------------------------------------
-- 2. items
-- ---------------------------------------------------------------------------

alter table public.items alter column image_url drop not null;
alter table public.items add column if not exists item_type text not null default 'image';
alter table public.items add column if not exists description text;
alter table public.items add column if not exists emoji text;
alter table public.items add column if not exists price_text text;
alter table public.items add column if not exists place jsonb;
alter table public.items add column if not exists link jsonb;
alter table public.items
  add column if not exists created_by_member_id uuid references public.members (id) on delete set null;
alter table public.items add column if not exists position int;
alter table public.items add column if not exists group_label text;

alter table public.items drop constraint if exists items_item_type_check;
alter table public.items
  add constraint items_item_type_check
  check (item_type in ('image', 'text', 'place', 'link'));

alter table public.items drop constraint if exists items_image_url_check;
alter table public.items
  add constraint items_image_url_check
  check (item_type <> 'image' or image_url is not null);

create index if not exists items_room_position_idx on public.items (room_id, position);

-- ---------------------------------------------------------------------------
-- 3. votes
-- ---------------------------------------------------------------------------

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  value numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, member_id)
);

create index if not exists votes_room_id_idx on public.votes (room_id);
create index if not exists votes_item_id_idx on public.votes (item_id);
create index if not exists votes_member_id_idx on public.votes (member_id);

alter table public.votes enable row level security;

drop policy if exists votes_select on public.votes;
create policy votes_select on public.votes
for select to authenticated
using (public.is_room_member(room_id));

revoke insert, update, delete on table public.votes from anon, authenticated;
grant select on table public.votes to authenticated;

alter table public.votes replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes'
     ) then
    alter publication supabase_realtime add table public.votes;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Storage + default titles know about non-bracket rooms
-- ---------------------------------------------------------------------------

create or replace function public._can_upload(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    join public.rooms r on r.id = m.room_id
    where m.room_id = p_room_id
      and m.user_id = auth.uid()
      and m.kicked_at is null
      and (
        (
          r.format = 'bracket'
          and (m.is_host or r.allow_member_upload)
          and (r.status = 'lobby' or (r.status = 'drawn' and r.mode = 'knockout'))
        )
        or (
          r.format <> 'bracket'
          and r.status = 'open'
          and (m.is_host or r.allow_member_options)
        )
      )
  );
$$;

create or replace function public.trg_items_default_title()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  v_format text;
begin
  if NEW.title is null
     or btrim(NEW.title) = ''
     or (
       coalesce(NEW.item_type, 'image') = 'image'
       and (NEW.title ~* '\.(jpe?g|png|webp|gif|heic|bmp|tiff?)$' or NEW.title ~ '[\\/]')
     )
  then
    select ro.format into v_format from public.rooms ro where ro.id = NEW.room_id;
    select count(*)::int into n from public.items it where it.room_id = NEW.room_id;
    NEW.title := case when coalesce(v_format, 'bracket') = 'bracket' then 'Mẫu ' else 'Lựa chọn ' end || (n + 1);
  end if;
  return NEW;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Helpers
-- ---------------------------------------------------------------------------

create or replace function public._option_limit(p_format text)
returns int
language sql
immutable
as $$
  select case p_format
    when 'quick' then 30
    when 'swipe' then 50
    when 'ranking' then 20
    when 'rating' then 50
    else 32
  end;
$$;

-- Scoreboard + winner. Ties: tie_rule 'host' prefers the host's pick, otherwise random.
create or replace function public._room_result(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_board jsonb;
  v_top numeric;
  v_tied uuid[];
  v_winner uuid;
begin
  select * into r from public.rooms ro where ro.id = p_room_id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object('item_id', s.item_id, 'score', s.score, 'votes', s.votes)
             order by s.score desc, s.pos asc, s.created_at asc, s.item_id asc
           ),
           '[]'::jsonb
         )
  into v_board
  from (
    select it.id as item_id,
           coalesce(sum(v.value), 0) as score,
           count(v.id)::int as votes,
           coalesce(it.position, 0) as pos,
           it.created_at
    from public.items it
    left join public.votes v on v.item_id = it.id
    where it.room_id = p_room_id
    group by it.id, it.position, it.created_at
  ) s;

  select coalesce(max((e ->> 'score')::numeric), 0) into v_top
  from jsonb_array_elements(v_board) e;

  if v_top > 0 then
    select array_agg((e ->> 'item_id')::uuid) into v_tied
    from jsonb_array_elements(v_board) e
    where (e ->> 'score')::numeric = v_top;

    if coalesce(array_length(v_tied, 1), 0) = 1 then
      v_winner := v_tied[1];
    else
      if r.tie_rule = 'host' then
        select v.item_id into v_winner
        from public.votes v
        join public.members m on m.id = v.member_id
        where v.room_id = p_room_id and m.is_host and v.item_id = any (v_tied)
        order by v.created_at asc
        limit 1;
      end if;
      if v_winner is null then
        v_winner := v_tied[1 + floor(random() * array_length(v_tied, 1))::int];
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'format', r.format,
    'winner_item_id', v_winner,
    'tied', coalesce(array_length(v_tied, 1), 0) > 1,
    'board', v_board,
    'closed_at', now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. create_room_v2
-- ---------------------------------------------------------------------------

-- Bracket keeps the legacy create_room path (p_settings carries its rules).
-- Other formats start 'open'; options are added right after with add_options.
create or replace function public.create_room_v2(
  p_format text,
  p_name text,
  p_description text,
  p_password text,
  p_settings jsonb,
  p_deadline timestamptz,
  p_display_name text,
  p_avatar_url text,
  p_avatar_emoji text,
  p_template_slug text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s jsonb := coalesce(p_settings, '{}'::jsonb);
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_template text := nullif(btrim(coalesce(p_template_slug, '')), '');
  v_hash text;
  v_max int;
  v_tie text;
  new_slug text;
  new_id uuid;
  attempt int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_format is null or p_format not in ('bracket', 'quick') then
    raise exception 'FORMAT_UNAVAILABLE';
  end if;
  if v_desc is not null and char_length(v_desc) > 300 then
    raise exception 'INVALID';
  end if;
  if v_template is not null and char_length(v_template) > 80 then
    raise exception 'INVALID';
  end if;

  if p_format = 'bracket' then
    new_slug := public.create_room(
      p_name,
      p_password,
      s ->> 'mode',
      coalesce((s ->> 'votes_per_member')::int, 3),
      coalesce((s ->> 'qualify_duration_minutes')::int, 60),
      coalesce((s ->> 'knockout_size')::int, 8),
      coalesce((s ->> 'match_duration_minutes')::int, 30),
      coalesce(s ->> 'tie_rule', 'random'),
      coalesce((s ->> 'allow_member_upload')::boolean, false),
      p_display_name,
      p_avatar_url,
      p_avatar_emoji,
      coalesce(s ->> 'seeding_mode', 'random')
    );
    update public.rooms ro
    set description = v_desc,
        template_slug = v_template
    where ro.slug = new_slug
    returning ro.id into new_id;
    return jsonb_build_object('id', new_id, 'slug', new_slug);
  end if;

  if p_name is null or char_length(btrim(p_name)) < 1 or char_length(btrim(p_name)) > 80 then
    raise exception 'INVALID';
  end if;
  if p_display_name is null or char_length(btrim(p_display_name)) < 1 or char_length(btrim(p_display_name)) > 40 then
    raise exception 'INVALID';
  end if;
  v_hash := public._hash_room_password(p_password);

  v_max := coalesce((s ->> 'max_choices')::int, 1);
  if v_max < 1 or v_max > public._option_limit(p_format) then
    raise exception 'INVALID';
  end if;
  v_tie := coalesce(s ->> 'tie_rule', 'random');
  if v_tie not in ('random', 'host') then
    raise exception 'INVALID';
  end if;
  if p_deadline is not null and (p_deadline <= now() or p_deadline > now() + interval '30 days') then
    raise exception 'END_TIME_RANGE';
  end if;

  for attempt in 1..8 loop
    new_slug := public.generate_slug(8);
    begin
      insert into public.rooms (
        slug, name, password_hash, format, mode, host_id, tie_rule, status, locked,
        settings, description, template_slug, deadline, allow_member_options
      ) values (
        new_slug,
        btrim(p_name),
        v_hash,
        p_format,
        null,
        auth.uid(),
        v_tie,
        'open',
        false,
        jsonb_build_object('max_choices', v_max),
        v_desc,
        v_template,
        p_deadline,
        p_format in ('quick', 'swipe')
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
      return jsonb_build_object('id', new_id, 'slug', new_slug);
    exception when unique_violation then
      null;
    end;
  end loop;
  raise exception 'INVALID';
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Options
-- ---------------------------------------------------------------------------

-- p_options: [{ item_type: 'text' | 'image', title, description?, emoji?, price_text?,
--              image_url? (items bucket, {room_id}/...), is_transparent? }]
create or replace function public.add_options(p_room_id uuid, p_options jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_count int;
  v_added int := 0;
  v_opt jsonb;
  v_type text;
  v_title text;
  v_desc text;
  v_emoji text;
  v_price text;
  v_img text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into r from public.rooms ro where ro.id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_member
  from public.members m
  where m.room_id = p_room_id and m.user_id = auth.uid() and m.kicked_at is null;
  if not found then
    raise exception 'NOT_MEMBER';
  end if;
  if r.format = 'bracket' then
    raise exception 'BAD_STATUS';
  end if;
  if not v_member.is_host and not r.allow_member_options then
    raise exception 'UPLOAD_DISABLED';
  end if;
  if r.status <> 'open' then
    raise exception 'ROOM_CLOSED';
  end if;
  if p_options is null or jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) = 0 then
    raise exception 'INVALID';
  end if;

  select count(*)::int into v_count from public.items it where it.room_id = p_room_id;
  if v_count + jsonb_array_length(p_options) > public._option_limit(r.format) then
    raise exception 'TOO_MANY_OPTIONS';
  end if;

  for v_opt in select value from jsonb_array_elements(p_options) loop
    v_type := coalesce(v_opt ->> 'item_type', 'text');
    if v_type not in ('text', 'image') then
      raise exception 'OPTION_TYPE';
    end if;

    v_title := nullif(btrim(coalesce(v_opt ->> 'title', '')), '');
    v_desc := nullif(btrim(coalesce(v_opt ->> 'description', '')), '');
    v_emoji := nullif(btrim(coalesce(v_opt ->> 'emoji', '')), '');
    v_price := nullif(btrim(coalesce(v_opt ->> 'price_text', '')), '');

    if v_type = 'text' and v_title is null then
      raise exception 'INVALID';
    end if;
    if (v_title is not null and char_length(v_title) > 80)
       or (v_desc is not null and char_length(v_desc) > 200)
       or (v_emoji is not null and char_length(v_emoji) > 16)
       or (v_price is not null and char_length(v_price) > 40) then
      raise exception 'INVALID';
    end if;

    v_img := null;
    if v_type = 'image' then
      v_img := v_opt ->> 'image_url';
      if v_img is null
         or position(('/storage/v1/object/public/items/' || p_room_id::text || '/') in v_img) = 0 then
        raise exception 'BAD_IMAGE';
      end if;
    end if;

    v_count := v_count + 1;
    insert into public.items (
      room_id, uploader_member_id, created_by_member_id, item_type, image_url, is_transparent,
      title, description, emoji, price_text, position
    ) values (
      p_room_id,
      v_member.id,
      v_member.id,
      v_type,
      v_img,
      coalesce((v_opt ->> 'is_transparent')::boolean, false),
      coalesce(v_title, 'Lựa chọn ' || v_count),
      v_desc,
      v_emoji,
      v_price,
      v_count
    );
    v_added := v_added + 1;
  end loop;

  return v_added;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Votes
-- ---------------------------------------------------------------------------

-- Non-kicked member of an open, not-yet-due non-bracket room. Locks the room row.
create or replace function public._vote_context(p_room_id uuid)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  select * into r from public.rooms ro where ro.id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  select * into v_member
  from public.members m
  where m.room_id = p_room_id and m.user_id = auth.uid() and m.kicked_at is null;
  if not found then
    raise exception 'NOT_MEMBER';
  end if;
  if r.format = 'bracket' then
    raise exception 'BAD_STATUS';
  end if;
  if r.status <> 'open' then
    raise exception 'ROOM_CLOSED';
  end if;
  if r.deadline is not null and now() >= r.deadline then
    raise exception 'DEADLINE';
  end if;
  return v_member;
end;
$$;

-- quick: value 1. max_choices = 1 switches the pick; otherwise capped at max_choices.
create or replace function public.cast_vote(p_item_id uuid, p_value numeric default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_max int;
  v_used int;
begin
  select * into v_item from public.items it where it.id = p_item_id;
  if not found then
    raise exception 'BAD_ITEM';
  end if;

  v_member := public._vote_context(v_item.room_id);
  select * into r from public.rooms ro where ro.id = v_item.room_id;

  if r.format <> 'quick' then
    raise exception 'FORMAT_UNAVAILABLE';
  end if;
  if coalesce(p_value, 1) <> 1 then
    raise exception 'INVALID';
  end if;

  if exists (
    select 1 from public.votes v where v.item_id = p_item_id and v.member_id = v_member.id
  ) then
    return;
  end if;

  v_max := greatest(1, coalesce((r.settings ->> 'max_choices')::int, 1));
  if v_max = 1 then
    delete from public.votes v where v.room_id = r.id and v.member_id = v_member.id;
  else
    select count(*)::int into v_used
    from public.votes v
    where v.room_id = r.id and v.member_id = v_member.id;
    if v_used >= v_max then
      raise exception 'VOTE_LIMIT';
    end if;
  end if;

  insert into public.votes (room_id, item_id, member_id, value)
  values (r.id, p_item_id, v_member.id, 1);
end;
$$;

create or replace function public.remove_vote(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  v_member public.members%rowtype;
begin
  select * into v_item from public.items it where it.id = p_item_id;
  if not found then
    raise exception 'BAD_ITEM';
  end if;
  v_member := public._vote_context(v_item.room_id);
  delete from public.votes v where v.item_id = p_item_id and v.member_id = v_member.id;
end;
$$;

create or replace function public.clear_my_votes(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members%rowtype;
begin
  v_member := public._vote_context(p_room_id);
  delete from public.votes v where v.room_id = p_room_id and v.member_id = v_member.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. close_room_if_due — idempotent; call on load, when the countdown hits 0, after votes.
-- ---------------------------------------------------------------------------

create or replace function public.close_room_if_due(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if not public.is_room_member(p_room_id) then
    raise exception 'NOT_MEMBER';
  end if;

  select * into r from public.rooms ro where ro.id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if r.format = 'bracket' then
    return false;
  end if;
  if r.status = 'closed' then
    return true;
  end if;
  if r.status <> 'open' or r.deadline is null or now() < r.deadline then
    return false;
  end if;

  v_result := public._room_result(p_room_id);
  update public.rooms ro
  set status = 'closed',
      result = v_result,
      closed_at = now(),
      champion_item_id = (v_result ->> 'winner_item_id')::uuid
  where ro.id = p_room_id;
  return true;
end;
$$;

-- Host closes an open non-bracket room now (no deadline required).
create or replace function public.close_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  perform public._require_host(p_room_id);

  select * into r from public.rooms ro where ro.id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if r.format = 'bracket' then
    raise exception 'BAD_STATUS';
  end if;
  if r.status = 'closed' then
    return true;
  end if;
  if r.status <> 'open' then
    raise exception 'BAD_STATUS';
  end if;

  v_result := public._room_result(p_room_id);
  update public.rooms ro
  set status = 'closed',
      result = v_result,
      closed_at = now(),
      champion_item_id = (v_result ->> 'winner_item_id')::uuid
  where ro.id = p_room_id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select (
  id, slug, name, mode, host_id, votes_per_member, qualify_deadline,
  qualify_duration_minutes, knockout_size, match_duration_minutes, tie_rule,
  allow_member_upload, status, champion_item_id, created_at, locked, draw_version,
  seeding_mode, has_password,
  format, bracket_mode, settings, description, anonymous, results_visibility,
  comments_enabled, reactions_enabled, allow_member_options, template_slug,
  deadline, result, closed_at
) on table public.rooms to authenticated;

grant execute on function public.create_room_v2(text, text, text, text, jsonb, timestamptz, text, text, text, text) to authenticated;
grant execute on function public.add_options(uuid, jsonb) to authenticated;
grant execute on function public.cast_vote(uuid, numeric) to authenticated;
grant execute on function public.remove_vote(uuid) to authenticated;
grant execute on function public.clear_my_votes(uuid) to authenticated;
grant execute on function public.close_room_if_due(uuid) to authenticated;
grant execute on function public.close_room(uuid) to authenticated;
grant execute on function public._can_upload(uuid) to authenticated;

revoke all on function public._room_result(uuid) from public, anon, authenticated;
revoke all on function public._vote_context(uuid) from public, anon, authenticated;
revoke all on function public._option_limit(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
