-- Vote Đi — 0016: Phase 6 my-rooms RPCs, rate limits, stale cleanup.
-- Run after 0015_feedback.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- list_my_rooms — rooms the current user belongs to (newest first)
-- ---------------------------------------------------------------------------

create or replace function public.list_my_rooms()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.joined_at desc), '[]'::jsonb)
  into v_out
  from (
    select
      r.id,
      r.slug,
      r.name,
      r.format,
      r.mode,
      r.status,
      r.deadline,
      r.qualify_deadline,
      r.closed_at,
      r.result,
      r.champion_item_id,
      m.is_host,
      m.joined_at,
      (select count(*)::int from public.members m2
       where m2.room_id = r.id and m2.kicked_at is null) as member_count,
      (select i.title from public.items i where i.id = r.champion_item_id) as champion_title,
      (select i.image_url from public.items i where i.id = r.champion_item_id) as champion_image_url,
      (select i.emoji from public.items i where i.id = r.champion_item_id) as champion_emoji,
      (select (r.result ->> 'winner_item_id')) as winner_item_id,
      (select it.title from public.items it
       where it.id = nullif(r.result ->> 'winner_item_id', '')::uuid) as winner_title,
      (select it.image_url from public.items it
       where it.id = nullif(r.result ->> 'winner_item_id', '')::uuid) as winner_image_url,
      (select it.emoji from public.items it
       where it.id = nullif(r.result ->> 'winner_item_id', '')::uuid) as winner_emoji
    from public.members m
    join public.rooms r on r.id = m.room_id
    where m.user_id = v_uid and m.kicked_at is null
  ) t;

  return v_out;
end;
$$;

grant execute on function public.list_my_rooms() to authenticated;

-- ---------------------------------------------------------------------------
-- duplicate_room — host clones settings + items (new slug, lobby/open)
-- ---------------------------------------------------------------------------

create or replace function public.duplicate_room(p_room_id uuid, p_display_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.rooms%rowtype;
  v_new_id uuid;
  v_new_slug text;
  v_attempt int;
  v_name text;
  v_host public.members%rowtype;
  rec record;
  v_map jsonb := '{}'::jsonb;
  v_old uuid;
  v_new_item uuid;
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_host from public.members
  where room_id = p_room_id and user_id = auth.uid() and kicked_at is null;

  v_name := left(btrim(r.name) || ' (bản sao)', 80);

  for v_attempt in 1..8 loop
    v_new_slug := public.generate_slug(8);
    begin
      insert into public.rooms (
        slug, name, password_hash, format, mode, host_id,
        votes_per_member, qualify_duration_minutes, knockout_size, match_duration_minutes,
        tie_rule, status, locked, allow_member_upload, seeding_mode,
        settings, description, anonymous, results_visibility, comments_enabled,
        reactions_enabled, allow_member_options, template_slug, deadline
      ) values (
        v_new_slug, v_name, r.password_hash, r.format, r.mode, auth.uid(),
        r.votes_per_member, r.qualify_duration_minutes, r.knockout_size, r.match_duration_minutes,
        r.tie_rule,
        case when r.format = 'bracket' then 'lobby' else 'open' end,
        false, r.allow_member_upload, coalesce(r.seeding_mode, 'random'),
        coalesce(r.settings, '{}'::jsonb), r.description, false,
        coalesce(r.results_visibility, 'live'), coalesce(r.comments_enabled, true),
        coalesce(r.reactions_enabled, true), coalesce(r.allow_member_options, false),
        r.template_slug, null
      ) returning id into v_new_id;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  if v_new_id is null then raise exception 'INVALID'; end if;

  insert into public.members (room_id, user_id, display_name, avatar_url, avatar_emoji, is_host)
  values (
    v_new_id, auth.uid(),
    coalesce(nullif(btrim(coalesce(p_display_name, '')), ''), v_host.display_name),
    v_host.avatar_url, coalesce(v_host.avatar_emoji, '🙂'), true
  );

  for rec in
    select * from public.items where room_id = p_room_id order by coalesce(position, 0), created_at
  loop
    insert into public.items (
      room_id, uploader_member_id, item_type, image_url, is_transparent,
      title, description, emoji, price_text, place, link, position
    ) values (
      v_new_id, null, rec.item_type, rec.image_url, coalesce(rec.is_transparent, false),
      rec.title, rec.description, rec.emoji, rec.price_text, rec.place, rec.link, rec.position
    ) returning id into v_new_item;
    v_map := v_map || jsonb_build_object(rec.id::text, v_new_item::text);
  end loop;

  -- schedule slots (no answers)
  if r.format = 'schedule' then
    insert into public.schedule_slots (room_id, slot_date, part, start_time, end_time, position)
    select v_new_id, s.slot_date, s.part, s.start_time, s.end_time, s.position
    from public.schedule_slots s where s.room_id = p_room_id;
  end if;

  return jsonb_build_object('id', v_new_id, 'slug', v_new_slug);
end;
$$;

grant execute on function public.duplicate_room(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_room — host only; returns storage paths for client cleanup
-- ---------------------------------------------------------------------------

create or replace function public.delete_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paths text[] := array[]::text[];
  v_url text;
  v_path text;
begin
  perform public._require_host(p_room_id);

  for v_url in
    select image_url from public.items where room_id = p_room_id and image_url is not null
    union
    select avatar_url from public.members where room_id = p_room_id and avatar_url is not null
  loop
    -- public URL …/storage/v1/object/public/items/<path>
    v_path := substring(v_url from '/object/public/items/(.+)$');
    if v_path is not null then
      v_paths := array_append(v_paths, v_path);
    end if;
  end loop;

  delete from public.rooms where id = p_room_id;
  return jsonb_build_object('ok', true, 'storage_paths', to_jsonb(v_paths));
end;
$$;

grant execute on function public.delete_room(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Rate limit: create_room_v2 ≤ 10 / hour / user
-- ---------------------------------------------------------------------------

create or replace function public._assert_create_room_rate()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select count(*)::int into v_count
  from public.rooms
  where host_id = auth.uid()
    and created_at > now() - interval '1 hour';
  if v_count >= 10 then
    raise exception 'RATE_LIMIT';
  end if;
end;
$$;

-- Patch create_room_v2 to call rate check at start (replace body preamble via wrapper)
-- We re-declare by fetching: call at beginning of create_room_v2 — use create or replace
-- with rate check inserted. Load current signature from 0014 and add one line.

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
  v_mode text;
  new_slug text;
  new_id uuid;
  attempt int;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  perform public._assert_create_room_rate();

  if p_format is null or p_format not in ('bracket', 'quick', 'schedule', 'swipe', 'ranking', 'rating') then
    raise exception 'FORMAT_UNAVAILABLE';
  end if;
  if v_desc is not null and char_length(v_desc) > 300 then raise exception 'INVALID'; end if;
  if v_template is not null and char_length(v_template) > 80 then raise exception 'INVALID'; end if;

  if p_format = 'bracket' then
    v_mode := coalesce(s ->> 'mode', 'qualify_knockout');
    new_slug := public.create_room(
      p_name,
      p_password,
      case when v_mode = 'group_knockout' then 'qualify_knockout' else v_mode end,
      case when v_mode = 'group_knockout' then coalesce((s ->> 'knockout_size')::int, 8)
           else coalesce((s ->> 'votes_per_member')::int, 3) end,
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
        template_slug = v_template,
        mode = case when v_mode = 'group_knockout' then 'group_knockout' else ro.mode end,
        settings = coalesce(ro.settings, '{}'::jsonb) || case
          when v_mode = 'group_knockout' then jsonb_build_object('bracket_mode', 'group_knockout')
          else '{}'::jsonb
        end
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

  if p_format = 'schedule' then
    v_mode := coalesce(s ->> 'schedule_mode', 'day_parts');
    if v_mode not in ('days', 'day_parts', 'time_slots', 'trip') then raise exception 'INVALID'; end if;
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
          new_slug, btrim(p_name), v_hash, 'schedule', null, auth.uid(), 'random', 'open', false,
          s, v_desc, v_template, p_deadline, false
        ) returning id into new_id;
        insert into public.members (room_id, user_id, display_name, avatar_url, avatar_emoji, is_host)
        values (new_id, auth.uid(), btrim(p_display_name), nullif(p_avatar_url, ''),
                coalesce(nullif(p_avatar_emoji, ''), '🙂'), true);
        return jsonb_build_object('id', new_id, 'slug', new_slug);
      exception when unique_violation then null;
      end;
    end loop;
    raise exception 'INVALID';
  end if;

  v_max := coalesce((s ->> 'max_choices')::int, 1);
  if p_format = 'ranking' then v_max := 1; end if;
  if p_format = 'rating' then v_max := 1; end if;
  if p_format = 'swipe' then v_max := greatest(1, least(50, v_max)); end if;
  if v_max < 1 or v_max > public._option_limit(p_format) then raise exception 'INVALID'; end if;
  v_tie := coalesce(s ->> 'tie_rule', 'random');
  if v_tie not in ('random', 'host') then raise exception 'INVALID'; end if;
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
        new_slug, btrim(p_name), v_hash, p_format, null, auth.uid(), v_tie, 'open', false,
        case
          when p_format = 'quick' then jsonb_build_object('max_choices', v_max) || coalesce(s - 'max_choices' - 'tie_rule', '{}'::jsonb)
          else s
        end,
        v_desc, v_template, p_deadline,
        p_format in ('quick', 'swipe')
      ) returning id into new_id;

      insert into public.members (room_id, user_id, display_name, avatar_url, avatar_emoji, is_host)
      values (new_id, auth.uid(), btrim(p_display_name), nullif(p_avatar_url, ''),
              coalesce(nullif(p_avatar_emoji, ''), '🙂'), true);
      return jsonb_build_object('id', new_id, 'slug', new_slug);
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'INVALID';
end;
$$;

grant execute on function public.create_room_v2(text, text, text, text, jsonb, timestamptz, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Daily cleanup: rooms idle > 90 days (no member activity / closed long ago)
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_stale_rooms()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int := 0;
  rid uuid;
begin
  for rid in
    select r.id
    from public.rooms r
    where (
        r.status in ('done', 'closed')
        and coalesce(r.closed_at, r.created_at) < now() - interval '90 days'
      )
      or (
        r.status in ('lobby', 'open')
        and r.created_at < now() - interval '90 days'
        and not exists (
          select 1 from public.votes v where v.room_id = r.id
          union all
          select 1 from public.qualify_votes q where q.room_id = r.id
          union all
          select 1 from public.schedule_answers sa
          join public.schedule_slots ss on ss.id = sa.slot_id
          where ss.room_id = r.id
        )
      )
  loop
    delete from public.rooms where id = rid;
    v_deleted := v_deleted + 1;
  end loop;
  return v_deleted;
end;
$$;

revoke all on function public.cleanup_stale_rooms() from public, anon, authenticated;
-- schedule via pg_cron if extension available
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('votedi_cleanup_stale_rooms');
    exception when others then null;
    end;
    perform cron.schedule(
      'votedi_cleanup_stale_rooms',
      '15 3 * * *',
      'select public.cleanup_stale_rooms()'
    );
  end if;
exception when others then
  null;
end $$;

notify pgrst, 'reload schema';
