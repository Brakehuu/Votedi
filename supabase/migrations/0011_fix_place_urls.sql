-- Vote Đi — 0011: fix URL-as-text items + place booking fields + update_option.
-- Run after 0010_phase1_options.sql. Safe to re-run.

-- 1. Repair items mistakenly saved as text with a URL title
update public.items
set
  item_type = case
    when title ~* 'maps\.app\.goo\.gl|goo\.gl/maps|google\.[^[:space:]]*/maps|maps\.google\.'
      then 'place'
    else 'link'
  end,
  place = case
    when title ~* 'maps\.app\.goo\.gl|goo\.gl/maps|google\.[^[:space:]]*/maps|maps\.google\.'
      then jsonb_build_object(
        'name', null,
        'maps_url', title,
        'lat', null,
        'lng', null
      )
    else place
  end,
  link = case
    when title ~* 'maps\.app\.goo\.gl|goo\.gl/maps|google\.[^[:space:]]*/maps|maps\.google\.'
      then null
    else jsonb_build_object(
      'url', title,
      'title', split_part(regexp_replace(title, '^https?://(www\.)?', ''), '/', 1),
      'site_name', split_part(regexp_replace(title, '^https?://(www\.)?', ''), '/', 1)
    )
  end,
  title = case
    when title ~* 'maps\.app\.goo\.gl|goo\.gl/maps|google\.[^[:space:]]*/maps|maps\.google\.'
      then 'Địa điểm chưa rõ tên'
    else split_part(regexp_replace(title, '^https?://(www\.)?', ''), '/', 1)
  end
where item_type = 'text'
  and title ~* '^https?://';

-- 2. update_option — host/creator can patch place/link fields (incl. after re-resolve)
create or replace function public.update_option(
  p_item_id uuid,
  p_patch jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_title text;
  v_desc text;
  v_price text;
  v_place jsonb;
  v_link jsonb;
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

  v_title := coalesce(nullif(btrim(coalesce(p_patch ->> 'title', '')), ''), v_item.title);
  v_desc := case when p_patch ? 'description'
    then nullif(btrim(coalesce(p_patch ->> 'description', '')), '')
    else v_item.description end;
  v_price := case when p_patch ? 'price_text'
    then nullif(btrim(coalesce(p_patch ->> 'price_text', '')), '')
    else v_item.price_text end;

  if char_length(coalesce(v_title, '')) > 80
     or (v_desc is not null and char_length(v_desc) > 200)
     or (v_price is not null and char_length(v_price) > 40) then
    raise exception 'INVALID';
  end if;

  v_place := v_item.place;
  if p_patch ? 'place' and jsonb_typeof(p_patch -> 'place') = 'object' then
    v_place := coalesce(v_item.place, '{}'::jsonb) || (p_patch -> 'place');
  end if;
  v_link := v_item.link;
  if p_patch ? 'link' and jsonb_typeof(p_patch -> 'link') = 'object' then
    v_link := coalesce(v_item.link, '{}'::jsonb) || (p_patch -> 'link');
  end if;

  update public.items it
  set title = v_title,
      description = v_desc,
      price_text = v_price,
      place = v_place,
      link = v_link,
      item_type = coalesce(nullif(p_patch ->> 'item_type', ''), it.item_type)
  where it.id = p_item_id;
end;
$$;

grant execute on function public.update_option(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
