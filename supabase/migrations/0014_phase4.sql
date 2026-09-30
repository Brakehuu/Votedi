-- Vote Đi — 0014: Phase 4 swipe / ranking / rating / group_knockout.
-- Run after 0013_schedule.sql. Safe to re-run.

-- Allow group_knockout on rooms.mode
do $$
begin
  alter table public.rooms drop constraint if exists rooms_mode_check;
exception when undefined_object then null;
end $$;

alter table public.rooms drop constraint if exists rooms_mode_check;
alter table public.rooms
  add constraint rooms_mode_check
  check (mode is null or mode in ('qualify_knockout', 'knockout', 'group_knockout'));

-- Judges for rating
create table if not exists public.room_judges (
  room_id uuid not null references public.rooms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  weight numeric not null default 0.5 check (weight > 0 and weight <= 1),
  primary key (room_id, member_id)
);

alter table public.room_judges enable row level security;
drop policy if exists room_judges_select on public.room_judges;
create policy room_judges_select on public.room_judges
for select to authenticated
using (public.is_room_member(room_id));
revoke insert, update, delete on table public.room_judges from anon, authenticated;
grant select on table public.room_judges to authenticated;

-- ---------------------------------------------------------------------------
-- create_room_v2 — allow swipe, ranking, rating
-- ---------------------------------------------------------------------------

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
      -- group: 2 phiếu/bảng × số bảng ≈ knockout_size (nhất+nhì mỗi bảng)
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

  -- quick / swipe / ranking / rating
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

-- ---------------------------------------------------------------------------
-- cast_vote — quick / swipe / rating
-- swipe: value 0 skip, 1 like, 2 superlike (max 3 supers)
-- rating: value 1..5
-- ---------------------------------------------------------------------------

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
  v_supers int;
begin
  select * into v_item from public.items it where it.id = p_item_id;
  if not found then raise exception 'BAD_ITEM'; end if;
  v_member := public._vote_context(v_item.room_id);
  select * into r from public.rooms ro where ro.id = v_item.room_id;

  if r.format = 'quick' then
    if coalesce(p_value, 1) <> 1 then raise exception 'INVALID'; end if;
    if exists (select 1 from public.votes v where v.item_id = p_item_id and v.member_id = v_member.id) then
      return;
    end if;
    v_max := greatest(1, coalesce((r.settings ->> 'max_choices')::int, 1));
    if v_max = 1 then
      delete from public.votes v where v.room_id = r.id and v.member_id = v_member.id;
    else
      select count(*)::int into v_used from public.votes v where v.room_id = r.id and v.member_id = v_member.id;
      if v_used >= v_max then raise exception 'VOTE_LIMIT'; end if;
    end if;
    insert into public.votes (room_id, item_id, member_id, value)
    values (r.id, p_item_id, v_member.id, 1);
    return;
  end if;

  if r.format = 'swipe' then
    if p_value is null or p_value not in (0, 1, 2) then raise exception 'INVALID'; end if;
    if p_value = 2 then
      select count(*)::int into v_supers
      from public.votes v
      where v.room_id = r.id and v.member_id = v_member.id and v.value = 2
        and v.item_id <> p_item_id;
      if v_supers >= 3 then raise exception 'VOTE_LIMIT'; end if;
    end if;
    insert into public.votes (room_id, item_id, member_id, value)
    values (r.id, p_item_id, v_member.id, p_value)
    on conflict (item_id, member_id) do update set value = excluded.value;
    return;
  end if;

  if r.format = 'rating' then
    if p_value is null or p_value < 1 or p_value > 5 or p_value <> floor(p_value) then
      raise exception 'INVALID';
    end if;
    insert into public.votes (room_id, item_id, member_id, value)
    values (r.id, p_item_id, v_member.id, p_value)
    on conflict (item_id, member_id) do update set value = excluded.value;
    return;
  end if;

  raise exception 'FORMAT_UNAVAILABLE';
end;
$$;

-- ---------------------------------------------------------------------------
-- set_ranking — ordered item ids → Borda values (N .. 1)
-- ---------------------------------------------------------------------------

create or replace function public.set_ranking(p_room_id uuid, p_item_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_n int;
  v_i int;
  v_id uuid;
  v_expected uuid[];
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into r from public.rooms where id = p_room_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.format <> 'ranking' then raise exception 'BAD_STATUS'; end if;
  if r.status <> 'open' then raise exception 'ROOM_CLOSED'; end if;
  if r.deadline is not null and r.deadline <= now() then
    perform public.close_room_if_due(p_room_id);
    raise exception 'DEADLINE';
  end if;
  select * into v_member from public.members
  where room_id = p_room_id and user_id = auth.uid() and kicked_at is null;
  if not found then raise exception 'NOT_MEMBER'; end if;

  select array_agg(it.id order by coalesce(it.position, 0), it.created_at, it.id)
  into v_expected
  from public.items it where it.room_id = p_room_id;
  v_n := coalesce(array_length(v_expected, 1), 0);
  if v_n < 2 then raise exception 'INVALID'; end if;
  if p_item_ids is null or array_length(p_item_ids, 1) <> v_n then raise exception 'INVALID'; end if;

  -- same set
  if (
    select count(*) from unnest(p_item_ids) x
    where x = any (v_expected)
  ) <> v_n then raise exception 'BAD_ITEM'; end if;

  delete from public.votes where room_id = p_room_id and member_id = v_member.id;
  for v_i in 1..v_n loop
    v_id := p_item_ids[v_i];
    insert into public.votes (room_id, item_id, member_id, value)
    values (p_room_id, v_id, v_member.id, (v_n - v_i + 1)::numeric);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_judges — host sets judge members + weight (0..1 share for judges total)
-- ---------------------------------------------------------------------------

create or replace function public.set_judges(
  p_room_id uuid,
  p_judge_member_ids uuid[],
  p_judge_weight numeric default 0.5
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.format <> 'rating' then raise exception 'BAD_STATUS'; end if;
  if p_judge_weight is null or p_judge_weight < 0 or p_judge_weight > 1 then
    raise exception 'INVALID';
  end if;

  delete from public.room_judges where room_id = p_room_id;
  if p_judge_member_ids is not null then
    foreach v_id in array p_judge_member_ids loop
      if not exists (
        select 1 from public.members m
        where m.id = v_id and m.room_id = p_room_id and m.kicked_at is null
      ) then raise exception 'NOT_MEMBER'; end if;
      insert into public.room_judges (room_id, member_id, weight)
      values (p_room_id, v_id, p_judge_weight)
      on conflict (room_id, member_id) do update set weight = excluded.weight;
    end loop;
  end if;

  update public.rooms
  set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
    'judge_weight', p_judge_weight,
    'has_judges', coalesce(array_length(p_judge_member_ids, 1), 0) > 0
  )
  where id = p_room_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- _room_result — rating with judges; ranking avg rank; swipe sum
-- (schedule branch kept from 0013 by inlining schedule check first)
-- ---------------------------------------------------------------------------

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
  v_jw numeric;
  v_has_judges boolean;
begin
  select * into r from public.rooms ro where ro.id = p_room_id;

  if r.format = 'schedule' then
    -- delegate: re-use logic by calling simplified days path only for safety —
    -- full schedule result already defined in 0013; keep schedule branch by
    -- raising through existing function body from 0013 is duplicated below as stub:
    return (
      select public._room_result_schedule(p_room_id)
    );
  end if;

  if r.format = 'rating' then
    select coalesce((r.settings ->> 'judge_weight')::numeric, 0.5),
           coalesce((r.settings ->> 'has_judges')::boolean, false)
    into v_jw, v_has_judges;
    if not exists (select 1 from public.room_judges j where j.room_id = p_room_id) then
      v_has_judges := false;
    end if;

    select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.score desc, t.votes desc, t.pos asc), '[]'::jsonb)
    into v_board
    from (
      select it.id as item_id,
             coalesce(it.position, 0) as pos,
             count(v.id)::int as votes,
             case when not v_has_judges then
               round(coalesce(avg(v.value), 0)::numeric, 1)
             else
               round((
                 coalesce(
                   (select avg(v2.value) from public.votes v2
                    join public.room_judges j on j.member_id = v2.member_id and j.room_id = p_room_id
                    where v2.item_id = it.id), 0
                 ) * v_jw
                 + coalesce(
                   (select avg(v3.value) from public.votes v3
                    where v3.item_id = it.id
                      and not exists (
                        select 1 from public.room_judges j2
                        where j2.room_id = p_room_id and j2.member_id = v3.member_id
                      )), 0
                 ) * (1 - v_jw)
               )::numeric, 1)
             end as score,
             case when v_has_judges then
               round(coalesce((
                 select avg(v2.value) from public.votes v2
                 join public.room_judges j on j.member_id = v2.member_id and j.room_id = p_room_id
                 where v2.item_id = it.id
               ), 0)::numeric, 1)
             else null end as judge_score,
             case when v_has_judges then
               round(coalesce((
                 select avg(v3.value) from public.votes v3
                 where v3.item_id = it.id
                   and not exists (
                     select 1 from public.room_judges j2
                     where j2.room_id = p_room_id and j2.member_id = v3.member_id
                   )
               ), 0)::numeric, 1)
             else null end as audience_score
      from public.items it
      left join public.votes v on v.item_id = it.id
      where it.room_id = p_room_id
      group by it.id, it.position
    ) t;
  elsif r.format = 'ranking' then
    select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.score desc, t.avg_rank asc, t.pos asc), '[]'::jsonb)
    into v_board
    from (
      select it.id as item_id,
             coalesce(it.position, 0) as pos,
             coalesce(sum(v.value), 0) as score,
             count(v.id)::int as votes,
             case when count(v.id) > 0 then
               -- Borda value N..1 → rank = N - value + 1
               round(avg(
                 (select count(*) from public.items i2 where i2.room_id = p_room_id) - v.value + 1
               )::numeric, 2)
             else null end as avg_rank
      from public.items it
      left join public.votes v on v.item_id = it.id
      where it.room_id = p_room_id
      group by it.id, it.position
    ) t;
  else
    -- quick / swipe
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
             count(v.id) filter (where v.value > 0)::int as votes,
             coalesce(it.position, 0) as pos,
             it.created_at
      from public.items it
      left join public.votes v on v.item_id = it.id
      where it.room_id = p_room_id
      group by it.id, it.position, it.created_at
    ) s;
  end if;

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
    'board', coalesce(v_board, '[]'::jsonb),
    'closed_at', now()
  );
end;
$$;

-- Extract schedule result into helper so 0014 can replace _room_result safely
create or replace function public._room_result_schedule(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_board jsonb;
  v_top numeric;
  v_mode text;
  v_trip int;
  v_dates date[];
  v_len int;
  v_i int;
  v_j int;
  v_s date;
  v_e date;
  v_full int;
  v_part int;
  v_sc numeric;
  v_best_sc numeric := -1;
  v_best_s date;
  v_best_e date;
  v_best_full int := 0;
  v_windows jsonb := '[]'::jsonb;
  v_label text;
  v_slot_id uuid;
  v_members uuid[];
  v_mid uuid;
  v_ok boolean;
  v_maybe boolean;
  v_ans text;
begin
  select * into r from public.rooms ro where ro.id = p_room_id;
  v_mode := coalesce(r.settings ->> 'schedule_mode', 'day_parts');
  if v_mode = 'trip' then
    v_trip := greatest(1, least(14, coalesce((r.settings ->> 'trip_length')::int, 3)));
    select array_agg(d order by d) into v_dates
    from (select distinct s.slot_date as d from public.schedule_slots s where s.room_id = p_room_id) q;
    v_len := coalesce(array_length(v_dates, 1), 0);
    select array_agg(m.id) into v_members
    from public.members m where m.room_id = p_room_id and m.kicked_at is null;
    if v_len >= v_trip then
      for v_i in 1..(v_len - v_trip + 1) loop
        v_s := v_dates[v_i];
        v_e := v_dates[v_i + v_trip - 1];
        if v_e <> v_s + (v_trip - 1) then continue; end if;
        v_full := 0; v_part := 0;
        if v_members is not null then
          foreach v_mid in array v_members loop
            v_ok := true; v_maybe := false;
            for v_j in 0..(v_trip - 1) loop
              select a.answer into v_ans
              from public.schedule_slots s
              left join public.schedule_answers a on a.slot_id = s.id and a.member_id = v_mid
              where s.room_id = p_room_id and s.slot_date = v_s + v_j
              limit 1;
              if v_ans is distinct from 'yes' and v_ans is distinct from 'maybe' then
                v_ok := false; exit;
              end if;
              if v_ans = 'maybe' then v_maybe := true; end if;
            end loop;
            if v_ok then
              if v_maybe then v_part := v_part + 1; else v_full := v_full + 1; end if;
            end if;
          end loop;
        end if;
        v_sc := v_full + v_part * 0.5;
        v_windows := v_windows || jsonb_build_array(jsonb_build_object(
          'start', v_s, 'end', v_e, 'score', v_sc, 'yes', v_full, 'maybe', v_part
        ));
        if v_sc > v_best_sc or (v_sc = v_best_sc and v_full > v_best_full) then
          v_best_sc := v_sc; v_best_s := v_s; v_best_e := v_e; v_best_full := v_full;
        end if;
      end loop;
    end if;
    return jsonb_build_object(
      'format', 'schedule', 'winner_item_id', null, 'winner_slot_id', null,
      'winner_start', v_best_s, 'winner_end', v_best_e,
      'winner_label', case when v_best_s is null then null
        else to_char(v_best_s, 'DD/MM') || ' → ' || to_char(v_best_e, 'DD/MM') end,
      'tied', false, 'board', coalesce(v_windows, '[]'::jsonb), 'closed_at', now()
    );
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.score desc, t.yes_count desc, t.position asc), '[]'::jsonb)
  into v_board
  from (
    select s.id as slot_id, s.position,
           (count(*) filter (where a.answer = 'yes')::numeric
            + 0.5 * count(*) filter (where a.answer = 'maybe')::numeric) as score,
           count(*) filter (where a.answer = 'yes')::int as yes_count,
           count(*) filter (where a.answer = 'maybe')::int as maybe_count,
           s.slot_date::text as start, s.slot_date::text as end, s.part,
           s.start_time::text as start_time, s.end_time::text as end_time
    from public.schedule_slots s
    left join public.schedule_answers a on a.slot_id = s.id
    where s.room_id = p_room_id
    group by s.id, s.position, s.slot_date, s.part, s.start_time, s.end_time
  ) t;

  select coalesce(max((e ->> 'score')::numeric), 0) into v_top from jsonb_array_elements(v_board) e;
  if v_top > 0 then
    select (e ->> 'slot_id')::uuid into v_slot_id
    from jsonb_array_elements(v_board) e
    where (e ->> 'score')::numeric = v_top
    order by (e ->> 'yes_count')::int desc, (e ->> 'position')::int asc
    limit 1;
  end if;
  select case
    when s.part = 'morning' then 'Sáng ' || to_char(s.slot_date, 'DD/MM')
    when s.part = 'afternoon' then 'Chiều ' || to_char(s.slot_date, 'DD/MM')
    when s.part = 'evening' then 'Tối ' || to_char(s.slot_date, 'DD/MM')
    when s.start_time is not null then to_char(s.slot_date, 'DD/MM') || ' ' || to_char(s.start_time, 'HH24:MI')
    else to_char(s.slot_date, 'DD/MM')
  end into v_label from public.schedule_slots s where s.id = v_slot_id;

  return jsonb_build_object(
    'format', 'schedule', 'winner_item_id', null, 'winner_slot_id', v_slot_id,
    'winner_start', (select slot_date from public.schedule_slots where id = v_slot_id),
    'winner_end', (select slot_date from public.schedule_slots where id = v_slot_id),
    'winner_label', v_label,
    'tied', (select count(*) > 1 from jsonb_array_elements(v_board) e
             where (e ->> 'score')::numeric = v_top and v_top > 0),
    'board', coalesce(v_board, '[]'::jsonb), 'closed_at', now()
  );
end;
$$;

-- Allow create_room to accept group_knockout (wrap by updating create_room mode check in app path)
-- Host create uses create_room for bracket — update create_room mode validation via replace in next section.

grant execute on function public.create_room_v2(text, text, text, text, jsonb, timestamptz, text, text, text, text) to authenticated;
grant execute on function public.cast_vote(uuid, numeric) to authenticated;
grant execute on function public.set_ranking(uuid, uuid[]) to authenticated;
grant execute on function public.set_judges(uuid, uuid[], numeric) to authenticated;

-- Allow create_room (legacy bracket) to accept group_knockout
create or replace function public._accept_bracket_mode(p_mode text)
returns boolean
language sql
immutable
as $$
  select p_mode in ('qualify_knockout', 'knockout', 'group_knockout');
$$;

-- ---------------------------------------------------------------------------
-- group_knockout: top 2 per group of 4, cross-seed (1A–2B, 1B–2A, …)
-- ---------------------------------------------------------------------------

create or replace function public._group_knockout_slots(p_room_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tie text;
  item_ids uuid[];
  n int;
  g int;
  groups int;
  winners uuid[];
  runners uuid[];
  slots uuid[] := array[]::uuid[];
  size int;
  i int;
  g_start int;
  g_end int;
  ranked uuid[];
begin
  select tie_rule into v_tie from public.rooms where id = p_room_id;

  select coalesce(array_agg(i.id order by coalesce(i.position, 0), i.created_at, i.id), array[]::uuid[])
  into item_ids
  from public.items i
  where i.room_id = p_room_id;

  n := coalesce(array_length(item_ids, 1), 0);
  if n < 8 then raise exception 'NOT_ENOUGH_ITEMS'; end if;
  groups := n / 4;
  if groups < 2 then raise exception 'NOT_ENOUGH_ITEMS'; end if;

  winners := array[]::uuid[];
  runners := array[]::uuid[];

  for g in 0..groups - 1 loop
    g_start := g * 4 + 1;
    g_end := least(g_start + 3, n);
    select coalesce(array_agg(x.id order by x.rn), array[]::uuid[])
    into ranked
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
        where i.id = any (item_ids[g_start:g_end])
        group by i.id, i.created_at, m.is_host
      ) scored
    ) x
    where x.rn <= 2;

    winners := winners || ranked[1];
    runners := runners || ranked[2];
  end loop;

  i := 1;
  while i <= groups loop
    if i + 1 <= groups then
      -- 1A vs 2B, 1B vs 2A
      slots := slots || winners[i] || runners[i + 1] || winners[i + 1] || runners[i];
      i := i + 2;
    else
      slots := slots || winners[i] || runners[i];
      i := i + 1;
    end if;
  end loop;

  size := public._next_pow2(coalesce(array_length(slots, 1), 0));
  while coalesce(array_length(slots, 1), 0) < size loop
    slots := slots || array[null::uuid];
  end loop;

  update public.rooms
  set knockout_size = size,
      votes_per_member = greatest(votes_per_member, groups * 2)
  where id = p_room_id;

  return slots;
end;
$$;

revoke all on function public._group_knockout_slots(uuid) from public, anon, authenticated;

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
  slots uuid[];
  groups int;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into mem
  from public.members
  where room_id = p_room_id and user_id = auth.uid() and kicked_at is null;
  if not found then raise exception 'NOT_MEMBER'; end if;

  select * into r from public.rooms where id = p_room_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  if r.status = 'lobby' then
    if not coalesce(p_host_start, false) then return; end if;
    if not mem.is_host then raise exception 'NOT_HOST'; end if;
    select count(*) into v_count from public.items where room_id = p_room_id;

    if r.mode in ('qualify_knockout', 'group_knockout') then
      if r.mode = 'group_knockout' then
        if v_count < 8 or v_count > 32 then raise exception 'NOT_ENOUGH_ITEMS'; end if;
        groups := v_count / 4;
        update public.rooms
        set status = 'qualify',
            qualify_deadline = now() + make_interval(mins => coalesce(r.qualify_duration_minutes, 60)),
            votes_per_member = greatest(2, groups * 2),
            knockout_size = public._next_pow2(greatest(2, groups * 2))
        where id = p_room_id;
      else
        if v_count < greatest(2, least(r.knockout_size, 16)) then
          raise exception 'NOT_ENOUGH_ITEMS';
        end if;
        update public.rooms
        set status = 'qualify',
            qualify_deadline = now() + make_interval(mins => coalesce(r.qualify_duration_minutes, 60))
        where id = p_room_id;
      end if;
      return;
    end if;
    raise exception 'NEED_DRAW';
  end if;

  if r.status = 'qualify' then
    if r.qualify_deadline is not null and now() < r.qualify_deadline and not coalesce(p_host_start, false) then
      return;
    end if;
    if coalesce(p_host_start, false) and not mem.is_host then
      raise exception 'NOT_HOST';
    end if;

    if r.mode = 'group_knockout' then
      slots := public._group_knockout_slots(p_room_id);
      perform public._build_bracket(p_room_id, slots);
    else
      ranked := public._qualify_ids(p_room_id);
      if coalesce(array_length(ranked, 1), 0) < 2 then
        raise exception 'NOT_ENOUGH_ITEMS';
      end if;
      perform public._build_bracket(p_room_id, public._slots_seeded(ranked));
    end if;
    return;
  end if;

  if r.status = 'drawn' then return; end if;

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
  slots uuid[];
  n int;
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  if r.status = 'qualify' then
    update public.rooms
    set qualify_deadline = least(coalesce(qualify_deadline, now()), now())
    where id = p_room_id;

    if r.mode = 'group_knockout' then
      slots := public._group_knockout_slots(p_room_id);
      perform public._build_bracket(p_room_id, slots);
    else
      ranked := public._qualify_ids(p_room_id);
      n := coalesce(array_length(ranked, 1), 0);
      if n < 2 then raise exception 'NOT_ENOUGH_ITEMS'; end if;
      perform public._build_bracket(p_room_id, public._slots_seeded(ranked));
    end if;
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

grant execute on function public.advance_room(uuid, boolean) to authenticated;
grant execute on function public.host_end_round(uuid) to authenticated;

notify pgrst, 'reload schema';
