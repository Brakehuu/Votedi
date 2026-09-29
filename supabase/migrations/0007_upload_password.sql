-- Vote Đi — 0007: uploads via RPC, optional room password, bracket-builder fix.
-- Run after 0006_fixes.sql. Safe to re-run (create or replace / drop ... if exists).
--
-- 1. _build_bracket / host_set_bracket: 0005 declared a plpgsql variable `id` that collided
--    with table columns ("column reference id is ambiguous").
-- 2. Items are written only through add_item / host_delete_item (SECURITY DEFINER). The old
--    items_insert policy allowed status 'lobby' only, so direct-knockout rooms (auto-drawn to
--    'drawn' after the 2nd item) failed with 42501.
-- 3. Storage bucket "items": members upload to {room_id}/..., avatars to avatars/{uid}/...
-- 4. Room password is optional (password_hash nullable) + host_set_password.

-- ---------------------------------------------------------------------------
-- 1. Bracket builders
-- ---------------------------------------------------------------------------

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
  v_item uuid;
begin
  size := coalesce(array_length(p_slots, 1), 0);
  if size not in (2, 4, 8, 16) then
    raise exception 'BAD_SIZE';
  end if;

  foreach v_item in array p_slots loop
    if v_item is not null then
      filled := filled + 1;
      if not exists (select 1 from public.items it where it.id = v_item and it.room_id = p_room_id) then
        raise exception 'BAD_ITEM';
      end if;
    end if;
  end loop;
  if filled < 2 then
    raise exception 'NOT_ENOUGH_ITEMS';
  end if;

  delete from public.match_votes mv
  where mv.match_id in (select m.id from public.matches m where m.room_id = p_room_id);
  delete from public.matches m where m.room_id = p_room_id;

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

  update public.rooms ro
  set knockout_size = size,
      status = 'drawn',
      champion_item_id = null,
      draw_version = coalesce(ro.draw_version, 0) + 1
  where ro.id = p_room_id;

  perform public._advance_byes(p_room_id);
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
  v_item uuid;
  seen uuid[] := array[]::uuid[];
  room_ids uuid[];
  filled int := 0;
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms ro where ro.id = p_room_id for update;
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

  select coalesce(array_agg(it.id), array[]::uuid[]) into room_ids
  from public.items it where it.room_id = p_room_id;

  foreach v_item in array p_item_ids loop
    if v_item is not null then
      filled := filled + 1;
      if v_item = any (seen) then
        raise exception 'INVALID';
      end if;
      if not (v_item = any (room_ids)) then
        raise exception 'BAD_ITEM';
      end if;
      seen := seen || v_item;
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

-- ---------------------------------------------------------------------------
-- 2. Optional password
-- ---------------------------------------------------------------------------

alter table public.rooms alter column password_hash drop not null;
alter table public.rooms
  add column if not exists has_password boolean generated always as (password_hash is not null) stored;

drop function if exists public.preview_room(text);
create function public.preview_room(p_slug text)
returns table (id uuid, slug text, name text, status text, locked boolean, has_password boolean)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.slug, r.name, r.status, r.locked, r.password_hash is not null
  from public.rooms r
  where r.slug = p_slug;
$$;

create or replace function public._hash_room_password(p_password text)
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
begin
  if p_password is null or p_password = '' then
    return null;
  end if;
  if char_length(p_password) < 4 or char_length(p_password) > 72 then
    raise exception 'BAD_PASSWORD_FORMAT';
  end if;
  return crypt(p_password, gen_salt('bf'));
end;
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
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_name is null or char_length(btrim(p_name)) < 1 or char_length(btrim(p_name)) > 80 then
    raise exception 'INVALID';
  end if;
  v_hash := public._hash_room_password(p_password);
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
  if p_display_name is null or char_length(btrim(p_display_name)) < 1 or char_length(btrim(p_display_name)) > 40 then
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
        v_hash,
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

  select * into r from public.rooms ro where ro.slug = p_slug;
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  select * into existing
  from public.members m
  where m.room_id = r.id and m.user_id = auth.uid();

  if found then
    if existing.kicked_at is not null then
      raise exception 'KICKED';
    end if;
    return existing.id;
  end if;

  if r.locked then
    raise exception 'ROOM_LOCKED';
  end if;

  if r.password_hash is not null then
    if p_password is null or p_password = '' then
      raise exception 'PASSWORD_REQUIRED';
    end if;
    if r.password_hash is distinct from crypt(p_password, r.password_hash) then
      raise exception 'BAD_PASSWORD';
    end if;
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

-- p_password null/'' removes the password; otherwise sets or replaces it.
create or replace function public.host_set_password(p_room_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_host(p_room_id);
  update public.rooms ro
  set password_hash = public._hash_room_password(p_password)
  where ro.id = p_room_id;
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
  from public.members m
  where m.room_id = p_room_id and m.user_id = auth.uid() and m.kicked_at is null;
  if not found then
    raise exception 'NOT_MEMBER';
  end if;

  select * into r from public.rooms ro where ro.id = p_room_id;
  if not found then
    raise exception 'NOT_FOUND';
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
        'lobby',
        false,
        coalesce(r.seeding_mode, 'random')
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
  values (new_id, auth.uid(), v_member.display_name, v_member.avatar_url, v_member.avatar_emoji, true);

  return new_slug;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Items via RPC
-- ---------------------------------------------------------------------------

-- Non-kicked member who may add items right now (host, or allow_member_upload).
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
      and (m.is_host or r.allow_member_upload)
      and (r.status = 'lobby' or (r.status = 'drawn' and r.mode = 'knockout'))
  );
$$;

create or replace function public.add_item(p_room_id uuid, p_image_url text, p_is_transparent boolean default false)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_count int;
  v_next int;
  v_limit int;
  v_row public.items%rowtype;
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
  if not v_member.is_host and not r.allow_member_upload then
    raise exception 'UPLOAD_DISABLED';
  end if;
  if not (r.status = 'lobby' or (r.status = 'drawn' and r.mode = 'knockout')) then
    raise exception 'BAD_STATUS';
  end if;

  if p_image_url is null
     or position(('/storage/v1/object/public/items/' || p_room_id::text || '/') in p_image_url) = 0 then
    raise exception 'BAD_IMAGE';
  end if;

  select count(*)::int into v_count from public.items it where it.room_id = p_room_id;
  v_limit := case when r.mode = 'knockout' then 16 else 32 end;
  if v_count >= v_limit then
    raise exception '%', case when r.mode = 'knockout' then 'KNOCKOUT_MAX_ITEMS' else 'TOO_MANY_ITEMS' end;
  end if;

  select greatest(
           v_count,
           coalesce(max(nullif(substring(it.title from '^Mẫu (\d+)$'), '')::int), 0)
         ) + 1
  into v_next
  from public.items it
  where it.room_id = p_room_id;

  insert into public.items (room_id, uploader_member_id, image_url, is_transparent, title)
  values (p_room_id, v_member.id, p_image_url, coalesce(p_is_transparent, false), 'Mẫu ' || v_next)
  returning * into v_row;

  return v_row;
end;
$$;

-- Host, or the uploader, while items are still editable. Returns the storage path
-- ({room_id}/file.webp) so the client can remove the file through the Storage API
-- (Supabase blocks direct deletes on storage.objects from SQL).
drop function if exists public.host_delete_item(uuid);
create function public.host_delete_item(p_item_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_marker text := '/storage/v1/object/public/items/';
  v_path text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_item from public.items it where it.id = p_item_id;
  if not found then
    raise exception 'BAD_ITEM';
  end if;

  select * into r from public.rooms ro where ro.id = v_item.room_id for update;

  select * into v_member
  from public.members m
  where m.room_id = v_item.room_id and m.user_id = auth.uid() and m.kicked_at is null;
  if not found then
    raise exception 'NOT_MEMBER';
  end if;
  if not v_member.is_host and v_member.id is distinct from v_item.uploader_member_id then
    raise exception 'NOT_HOST';
  end if;
  if not (r.status = 'lobby' or (r.status = 'drawn' and r.mode = 'knockout')) then
    raise exception 'BAD_STATUS';
  end if;

  delete from public.items it where it.id = p_item_id;

  if position(v_marker in v_item.image_url) > 0 then
    v_path := split_part(substring(v_item.image_url from position(v_marker in v_item.image_url) + char_length(v_marker)), '?', 1);
  end if;
  return v_path;
end;
$$;

create or replace function public.host_set_member_upload(p_room_id uuid, p_allow boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_host(p_room_id);
  update public.rooms ro set allow_member_upload = coalesce(p_allow, false) where ro.id = p_room_id;
end;
$$;

-- No direct client writes on items.
drop policy if exists items_insert on public.items;
drop policy if exists items_delete on public.items;
revoke insert, update, delete on table public.items from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Storage bucket "items"
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('items', 'items', true, 10485760, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public._is_room_host(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.room_id = p_room_id and m.user_id = auth.uid() and m.kicked_at is null and m.is_host
  );
$$;

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
    or public._can_upload(public.try_uuid((storage.foldername(name))[1]))
  )
);

drop policy if exists items_auth_update on storage.objects;
create policy items_auth_update on storage.objects
for update to authenticated
using (
  bucket_id = 'items'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
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
    or (
      public.is_room_member(public.try_uuid((storage.foldername(name))[1]))
      and (owner_id = auth.uid()::text or public._is_room_host(public.try_uuid((storage.foldername(name))[1])))
    )
  )
);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select (
  id, slug, name, mode, host_id, votes_per_member, qualify_deadline,
  qualify_duration_minutes, knockout_size, match_duration_minutes, tie_rule,
  allow_member_upload, status, champion_item_id, created_at, locked, draw_version,
  seeding_mode, has_password
) on table public.rooms to authenticated;

grant execute on function public.preview_room(text) to anon, authenticated;
grant execute on function public.create_room(text, text, text, int, int, int, int, text, boolean, text, text, text, text) to authenticated;
grant execute on function public.join_room(text, text, text, text, text) to authenticated;
grant execute on function public.host_set_password(uuid, text) to authenticated;
grant execute on function public.rematch_room(uuid) to authenticated;
grant execute on function public.add_item(uuid, text, boolean) to authenticated;
grant execute on function public.host_set_member_upload(uuid, boolean) to authenticated;
grant execute on function public.host_delete_item(uuid) to authenticated;
grant execute on function public.host_set_bracket(uuid, uuid[]) to authenticated;
grant execute on function public._can_upload(uuid) to authenticated;
grant execute on function public._is_room_host(uuid) to authenticated;

revoke all on function public._build_bracket(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public._hash_room_password(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
