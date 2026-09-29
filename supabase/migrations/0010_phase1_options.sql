-- Vote Đi — 0010: Phase 1 options (place/link), reopen, member options toggle.
-- Run after 0009_close_room.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. add_options — support item_type place | link
-- ---------------------------------------------------------------------------

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
  v_place jsonb;
  v_link jsonb;
  v_lat double precision;
  v_lng double precision;
  v_url text;
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
    if v_type not in ('text', 'image', 'place', 'link') then
      raise exception 'OPTION_TYPE';
    end if;

    v_title := nullif(btrim(coalesce(v_opt ->> 'title', '')), '');
    v_desc := nullif(btrim(coalesce(v_opt ->> 'description', '')), '');
    v_emoji := nullif(btrim(coalesce(v_opt ->> 'emoji', '')), '');
    v_price := nullif(btrim(coalesce(v_opt ->> 'price_text', '')), '');
    v_place := null;
    v_link := null;
    v_img := null;

    if (v_title is not null and char_length(v_title) > 80)
       or (v_desc is not null and char_length(v_desc) > 200)
       or (v_emoji is not null and char_length(v_emoji) > 16)
       or (v_price is not null and char_length(v_price) > 40) then
      raise exception 'INVALID';
    end if;

    if v_type = 'text' then
      if v_title is null then
        raise exception 'INVALID';
      end if;
    elsif v_type = 'image' then
      v_img := v_opt ->> 'image_url';
      if v_img is null
         or position(('/storage/v1/object/public/items/' || p_room_id::text || '/') in v_img) = 0 then
        raise exception 'BAD_IMAGE';
      end if;
    elsif v_type = 'place' then
      v_place := coalesce(v_opt -> 'place', '{}'::jsonb);
      v_lat := nullif(v_place ->> 'lat', '')::double precision;
      v_lng := nullif(v_place ->> 'lng', '')::double precision;
      if v_title is null then
        v_title := nullif(btrim(coalesce(v_place ->> 'name', '')), '');
      end if;
      if v_title is null then
        raise exception 'INVALID';
      end if;
      v_place := jsonb_strip_nulls(jsonb_build_object(
        'name', coalesce(nullif(btrim(coalesce(v_place ->> 'name', '')), ''), v_title),
        'address', nullif(btrim(coalesce(v_place ->> 'address', '')), ''),
        'lat', v_lat,
        'lng', v_lng,
        'maps_url', nullif(btrim(coalesce(v_place ->> 'maps_url', '')), '')
      ));
      if v_opt ? 'image_url' and nullif(v_opt ->> 'image_url', '') is not null then
        v_img := v_opt ->> 'image_url';
        if position(('/storage/v1/object/public/items/' || p_room_id::text || '/') in v_img) = 0
           and position(('/storage/v1/object/public/items/avatars/') in v_img) = 0 then
          raise exception 'BAD_IMAGE';
        end if;
      end if;
    elsif v_type = 'link' then
      v_link := coalesce(v_opt -> 'link', '{}'::jsonb);
      v_url := nullif(btrim(coalesce(v_link ->> 'url', v_opt ->> 'url', '')), '');
      if v_url is null or char_length(v_url) > 2048
         or (v_url not like 'http://%' and v_url not like 'https://%') then
        raise exception 'INVALID';
      end if;
      if v_title is null then
        v_title := nullif(btrim(coalesce(v_link ->> 'title', '')), '');
      end if;
      if v_title is null then
        begin
          v_title := split_part(regexp_replace(v_url, '^https?://(www\.)?', ''), '/', 1);
        exception when others then
          v_title := 'Link';
        end;
      end if;
      v_img := nullif(v_link ->> 'image_url', '');
      if v_img is not null
         and position(('/storage/v1/object/public/items/' || p_room_id::text || '/') in v_img) = 0
         and position(('/storage/v1/object/public/items/avatars/') in v_img) = 0 then
        -- allow room path or avatars staging; otherwise drop hotlink
        v_img := null;
      end if;
      v_link := jsonb_strip_nulls(jsonb_build_object(
        'url', v_url,
        'title', coalesce(nullif(btrim(coalesce(v_link ->> 'title', '')), ''), v_title),
        'image_url', v_img,
        'site_name', nullif(btrim(coalesce(v_link ->> 'site_name', '')), '')
      ));
      -- also mirror preview on items.image_url for OptionMedia
      if v_img is not null then
        null; -- keep v_img
      end if;
    end if;

    v_count := v_count + 1;
    insert into public.items (
      room_id, uploader_member_id, created_by_member_id, item_type, image_url, is_transparent,
      title, description, emoji, price_text, place, link, position
    ) values (
      p_room_id,
      v_member.id,
      v_member.id,
      v_type,
      case when v_type = 'image' then v_img
           when v_type = 'link' then v_img
           when v_type = 'place' then v_img
           else null end,
      coalesce((v_opt ->> 'is_transparent')::boolean, false),
      coalesce(v_title, 'Lựa chọn ' || v_count),
      v_desc,
      v_emoji,
      v_price,
      v_place,
      v_link,
      v_count
    );
    v_added := v_added + 1;
  end loop;

  return v_added;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. reopen_room — host unlocks a closed non-bracket room
-- ---------------------------------------------------------------------------

create or replace function public.reopen_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
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
  if r.status <> 'closed' then
    raise exception 'BAD_STATUS';
  end if;

  update public.rooms ro
  set status = 'open',
      result = null,
      closed_at = null,
      champion_item_id = null
  where ro.id = p_room_id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. host_set_member_options
-- ---------------------------------------------------------------------------

create or replace function public.host_set_member_options(p_room_id uuid, p_allow boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  perform public._require_host(p_room_id);
  select * into r from public.rooms ro where ro.id = p_room_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if r.format = 'bracket' then
    raise exception 'BAD_STATUS';
  end if;
  update public.rooms ro
  set allow_member_options = coalesce(p_allow, false)
  where ro.id = p_room_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. remove_option — host or creator, open non-bracket rooms
-- ---------------------------------------------------------------------------

create or replace function public.remove_option(p_item_id uuid)
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
  v_path text := null;
  v_pos int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_item from public.items it where it.id = p_item_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  select * into r from public.rooms ro where ro.id = v_item.room_id for update;
  if r.format = 'bracket' then
    raise exception 'BAD_STATUS';
  end if;
  if r.status <> 'open' then
    raise exception 'ROOM_CLOSED';
  end if;

  select * into v_member
  from public.members m
  where m.room_id = r.id and m.user_id = auth.uid() and m.kicked_at is null;
  if not found then
    raise exception 'NOT_MEMBER';
  end if;
  if not v_member.is_host
     and v_item.created_by_member_id is distinct from v_member.id
     and v_item.uploader_member_id is distinct from v_member.id then
    raise exception 'NOT_HOST';
  end if;

  if v_item.image_url is not null and position(v_marker in v_item.image_url) > 0 then
    v_path := substring(v_item.image_url from length(v_marker) + 1);
  end if;

  v_pos := v_item.position;
  delete from public.items it where it.id = p_item_id;

  if v_pos is not null then
    update public.items it
    set position = it.position - 1
    where it.room_id = r.id and it.position is not null and it.position > v_pos;
  end if;

  return v_path;
end;
$$;

grant execute on function public.add_options(uuid, jsonb) to authenticated;
grant execute on function public.reopen_room(uuid) to authenticated;
grant execute on function public.host_set_member_options(uuid, boolean) to authenticated;
grant execute on function public.remove_option(uuid) to authenticated;

notify pgrst, 'reload schema';
