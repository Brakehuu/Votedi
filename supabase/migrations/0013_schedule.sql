-- Vote Đi — 0013: Phase 3 schedule (slots, answers, notes).
-- Run after 0012_phase2_social.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  slot_date date not null,
  part text check (part is null or part in ('morning', 'afternoon', 'evening')),
  start_time time,
  end_time time,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (room_id, slot_date, part, start_time, end_time)
);

create index if not exists schedule_slots_room_id_idx on public.schedule_slots (room_id);

create table if not exists public.schedule_answers (
  slot_id uuid not null references public.schedule_slots (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  answer text not null check (answer in ('yes', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key (slot_id, member_id)
);

create index if not exists schedule_answers_slot_id_idx on public.schedule_answers (slot_id);
create index if not exists schedule_answers_member_id_idx on public.schedule_answers (member_id);

create table if not exists public.schedule_notes (
  room_id uuid not null references public.rooms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  note text not null check (char_length(note) <= 120),
  updated_at timestamptz not null default now(),
  primary key (room_id, member_id)
);

alter table public.schedule_slots enable row level security;
alter table public.schedule_answers enable row level security;
alter table public.schedule_notes enable row level security;

drop policy if exists schedule_slots_select on public.schedule_slots;
create policy schedule_slots_select on public.schedule_slots
for select to authenticated
using (public.is_room_member(room_id));

drop policy if exists schedule_answers_select on public.schedule_answers;
create policy schedule_answers_select on public.schedule_answers
for select to authenticated
using (
  exists (
    select 1 from public.schedule_slots s
    where s.id = schedule_answers.slot_id
      and public.is_room_member(s.room_id)
      and (
        not exists (select 1 from public.rooms r where r.id = s.room_id and r.anonymous = true)
        or exists (
          select 1 from public.members m
          where m.room_id = s.room_id
            and m.user_id = auth.uid()
            and m.kicked_at is null
            and m.id = schedule_answers.member_id
        )
      )
  )
);

drop policy if exists schedule_notes_select on public.schedule_notes;
create policy schedule_notes_select on public.schedule_notes
for select to authenticated
using (public.is_room_member(room_id));

revoke insert, update, delete on table public.schedule_slots from anon, authenticated;
revoke insert, update, delete on table public.schedule_answers from anon, authenticated;
revoke insert, update, delete on table public.schedule_notes from anon, authenticated;
grant select on table public.schedule_slots to authenticated;
grant select on table public.schedule_answers to authenticated;
grant select on table public.schedule_notes to authenticated;

alter table public.schedule_slots replica identity full;
alter table public.schedule_answers replica identity full;
alter table public.schedule_notes replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule_answers'
    ) then
      alter publication supabase_realtime add table public.schedule_answers;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule_notes'
    ) then
      alter publication supabase_realtime add table public.schedule_notes;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule_slots'
    ) then
      alter publication supabase_realtime add table public.schedule_slots;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. create_room_v2 — allow schedule
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
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_format is null or p_format not in ('bracket', 'quick', 'schedule') then
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

  if p_format = 'schedule' then
    v_mode := coalesce(s ->> 'schedule_mode', 'day_parts');
    if v_mode not in ('days', 'day_parts', 'time_slots', 'trip') then
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
          'schedule',
          null,
          auth.uid(),
          'random',
          'open',
          false,
          s,
          v_desc,
          v_template,
          p_deadline,
          false
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
  end if;

  -- quick (and future non-bracket)
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
        jsonb_build_object('max_choices', v_max) || coalesce(s - 'max_choices' - 'tie_rule', '{}'::jsonb),
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
-- 3. set_schedule_slots — host replaces slot list (on create / edit)
-- ---------------------------------------------------------------------------

create or replace function public.set_schedule_slots(p_room_id uuid, p_slots jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_slot jsonb;
  v_count int := 0;
  v_pos int := 0;
  v_date date;
  v_part text;
  v_start time;
  v_end time;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.format <> 'schedule' then raise exception 'BAD_STATUS'; end if;
  if r.status <> 'open' then raise exception 'ROOM_CLOSED'; end if;
  if p_slots is null or jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) < 1 then
    raise exception 'INVALID';
  end if;
  if jsonb_array_length(p_slots) > 120 then
    raise exception 'TOO_MANY_OPTIONS';
  end if;

  delete from public.schedule_slots where room_id = p_room_id;

  for v_slot in select value from jsonb_array_elements(p_slots) loop
    v_pos := v_pos + 1;
    begin
      v_date := (v_slot ->> 'date')::date;
    exception when others then
      raise exception 'INVALID';
    end;
    v_part := nullif(v_slot ->> 'part', '');
    if v_part is not null and v_part not in ('morning', 'afternoon', 'evening') then
      raise exception 'INVALID';
    end if;
    v_start := nullif(v_slot ->> 'start_time', '')::time;
    v_end := nullif(v_slot ->> 'end_time', '')::time;
    insert into public.schedule_slots (room_id, slot_date, part, start_time, end_time, position)
    values (p_room_id, v_date, v_part, v_start, v_end, v_pos);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. set_schedule_answers — upsert my answers (+ optional note)
-- p_answers: [{ slot_id, answer: 'yes'|'maybe'|'no'|null }]  null = clear
-- ---------------------------------------------------------------------------

create or replace function public.set_schedule_answers(
  p_room_id uuid,
  p_answers jsonb,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_row jsonb;
  v_slot uuid;
  v_ans text;
  v_note text;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into r from public.rooms where id = p_room_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.format <> 'schedule' then raise exception 'BAD_STATUS'; end if;
  if r.status <> 'open' then raise exception 'ROOM_CLOSED'; end if;
  if r.deadline is not null and r.deadline <= now() then
    perform public.close_room_if_due(p_room_id);
    raise exception 'DEADLINE';
  end if;

  select * into v_member from public.members
  where room_id = p_room_id and user_id = auth.uid() and kicked_at is null;
  if not found then raise exception 'NOT_MEMBER'; end if;

  if p_answers is not null and jsonb_typeof(p_answers) = 'array' then
    for v_row in select value from jsonb_array_elements(p_answers) loop
      begin
        v_slot := (v_row ->> 'slot_id')::uuid;
      exception when others then
        raise exception 'INVALID';
      end;
      if not exists (select 1 from public.schedule_slots s where s.id = v_slot and s.room_id = p_room_id) then
        raise exception 'BAD_ITEM';
      end if;
      v_ans := nullif(v_row ->> 'answer', '');
      if v_ans is null then
        delete from public.schedule_answers
        where slot_id = v_slot and member_id = v_member.id;
      else
        if v_ans not in ('yes', 'maybe', 'no') then raise exception 'INVALID'; end if;
        insert into public.schedule_answers (slot_id, member_id, answer, updated_at)
        values (v_slot, v_member.id, v_ans, now())
        on conflict (slot_id, member_id) do update
          set answer = excluded.answer, updated_at = now();
      end if;
    end loop;
  end if;

  if p_note is not null then
    v_note := btrim(p_note);
    if char_length(v_note) > 120 then raise exception 'INVALID'; end if;
    if v_note = '' then
      delete from public.schedule_notes where room_id = p_room_id and member_id = v_member.id;
    else
      insert into public.schedule_notes (room_id, member_id, note, updated_at)
      values (p_room_id, v_member.id, v_note, now())
      on conflict (room_id, member_id) do update
        set note = excluded.note, updated_at = now();
    end if;
  end if;
end;
$$;

grant execute on function public.create_room_v2(text, text, text, text, jsonb, timestamptz, text, text, text, text) to authenticated;
grant execute on function public.set_schedule_slots(uuid, jsonb) to authenticated;
grant execute on function public.set_schedule_answers(uuid, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. get_schedule_tallies — counts only; hide voter ids when anonymous
-- ---------------------------------------------------------------------------

create or replace function public.get_schedule_tallies(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_answered boolean := false;
  v_slots jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_MEMBER'; end if;

  select * into r from public.rooms where id = p_room_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.format <> 'schedule' then raise exception 'BAD_STATUS'; end if;

  select * into v_member
  from public.members m
  where m.room_id = p_room_id and m.user_id = auth.uid() and m.kicked_at is null;

  select exists(
    select 1
    from public.schedule_answers a
    join public.schedule_slots s on s.id = a.slot_id
    where s.room_id = p_room_id and a.member_id = v_member.id
  ) into v_answered;

  if r.results_visibility = 'after_close' and r.status <> 'closed' and not v_member.is_host then
    return jsonb_build_object('visible', false, 'reason', 'after_close', 'slots', '[]'::jsonb);
  end if;
  if r.results_visibility = 'after_vote' and not v_answered and not v_member.is_host and r.status <> 'closed' then
    return jsonb_build_object('visible', false, 'reason', 'after_vote', 'slots', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.position asc), '[]'::jsonb)
  into v_slots
  from (
    select s.id as slot_id,
           s.slot_date,
           s.part,
           s.start_time,
           s.end_time,
           s.position,
           count(*) filter (where a.answer = 'yes')::int as yes_count,
           count(*) filter (where a.answer = 'maybe')::int as maybe_count,
           count(*) filter (where a.answer = 'no')::int as no_count,
           (
             count(*) filter (where a.answer = 'yes')::numeric
             + 0.5 * count(*) filter (where a.answer = 'maybe')::numeric
           ) as score,
           case when r.anonymous then '[]'::jsonb
                else coalesce(jsonb_agg(a.member_id) filter (where a.answer = 'yes'), '[]'::jsonb)
           end as yes_ids,
           case when r.anonymous then '[]'::jsonb
                else coalesce(jsonb_agg(a.member_id) filter (where a.answer = 'maybe'), '[]'::jsonb)
           end as maybe_ids,
           case when r.anonymous then '[]'::jsonb
                else coalesce(jsonb_agg(a.member_id) filter (where a.answer = 'no'), '[]'::jsonb)
           end as no_ids
    from public.schedule_slots s
    left join public.schedule_answers a on a.slot_id = s.id
    where s.room_id = p_room_id
    group by s.id, s.slot_date, s.part, s.start_time, s.end_time, s.position
  ) t;

  return jsonb_build_object(
    'visible', true,
    'anonymous', r.anonymous,
    'slots', coalesce(v_slots, '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. _room_result — schedule winner (slot or trip window)
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

  if r.format = 'schedule' then
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
          if v_e <> v_s + (v_trip - 1) then
            continue;
          end if;
          v_full := 0;
          v_part := 0;
          if v_members is not null then
            foreach v_mid in array v_members loop
              v_ok := true;
              v_maybe := false;
              for v_j in 0..(v_trip - 1) loop
                select a.answer into v_ans
                from public.schedule_slots s
                left join public.schedule_answers a on a.slot_id = s.id and a.member_id = v_mid
                where s.room_id = p_room_id and s.slot_date = v_s + v_j
                limit 1;
                if v_ans is distinct from 'yes' and v_ans is distinct from 'maybe' then
                  v_ok := false;
                  exit;
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
            'start', v_s,
            'end', v_e,
            'score', v_sc,
            'yes', v_full,
            'maybe', v_part
          ));
          if v_sc > v_best_sc or (v_sc = v_best_sc and v_full > v_best_full) then
            v_best_sc := v_sc;
            v_best_s := v_s;
            v_best_e := v_e;
            v_best_full := v_full;
          end if;
        end loop;
      end if;

      return jsonb_build_object(
        'format', 'schedule',
        'winner_item_id', null,
        'winner_slot_id', null,
        'winner_start', v_best_s,
        'winner_end', v_best_e,
        'winner_label', case when v_best_s is null then null
          else to_char(v_best_s, 'DD/MM') || ' → ' || to_char(v_best_e, 'DD/MM') end,
        'tied', false,
        'board', coalesce(v_windows, '[]'::jsonb),
        'closed_at', now()
      );
    end if;

    select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.score desc, t.yes_count desc, t.position asc), '[]'::jsonb)
    into v_board
    from (
      select s.id as slot_id,
             s.position,
             (
               count(*) filter (where a.answer = 'yes')::numeric
               + 0.5 * count(*) filter (where a.answer = 'maybe')::numeric
             ) as score,
             count(*) filter (where a.answer = 'yes')::int as yes_count,
             count(*) filter (where a.answer = 'maybe')::int as maybe_count,
             s.slot_date::text as start,
             s.slot_date::text as end,
             s.part,
             s.start_time::text as start_time,
             s.end_time::text as end_time
      from public.schedule_slots s
      left join public.schedule_answers a on a.slot_id = s.id
      where s.room_id = p_room_id
      group by s.id, s.position, s.slot_date, s.part, s.start_time, s.end_time
    ) t;

    select coalesce(max((e ->> 'score')::numeric), 0) into v_top
    from jsonb_array_elements(v_board) e;

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
    end into v_label
    from public.schedule_slots s where s.id = v_slot_id;

    return jsonb_build_object(
      'format', 'schedule',
      'winner_item_id', null,
      'winner_slot_id', v_slot_id,
      'winner_start', (select slot_date from public.schedule_slots where id = v_slot_id),
      'winner_end', (select slot_date from public.schedule_slots where id = v_slot_id),
      'winner_label', v_label,
      'tied', (
        select count(*) > 1 from jsonb_array_elements(v_board) e
        where (e ->> 'score')::numeric = v_top and v_top > 0
      ),
      'board', coalesce(v_board, '[]'::jsonb),
      'closed_at', now()
    );
  end if;

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
-- 7. host_set_anonymous — also lock when schedule answers exist
-- ---------------------------------------------------------------------------

create or replace function public.host_set_anonymous(p_room_id uuid, p_anonymous boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.anonymous and not coalesce(p_anonymous, false) then
    if exists (select 1 from public.votes v where v.room_id = p_room_id)
       or exists (select 1 from public.qualify_votes q where q.room_id = p_room_id)
       or exists (
         select 1 from public.match_votes mv
         join public.matches mt on mt.id = mv.match_id
         where mt.room_id = p_room_id
       )
       or exists (
         select 1 from public.schedule_answers a
         join public.schedule_slots s on s.id = a.slot_id
         where s.room_id = p_room_id
       ) then
      raise exception 'ANON_LOCKED';
    end if;
  end if;
  update public.rooms set anonymous = coalesce(p_anonymous, false) where id = p_room_id;
end;
$$;

grant execute on function public.get_schedule_tallies(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. get_schedule_trip_windows — top windows without exposing voter ids
-- ---------------------------------------------------------------------------

create or replace function public.get_schedule_trip_windows(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_answered boolean := false;
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
  v_windows jsonb := '[]'::jsonb;
  v_members uuid[];
  v_mid uuid;
  v_ok boolean;
  v_maybe boolean;
  v_ans text;
  v_sorted jsonb;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_MEMBER'; end if;
  select * into r from public.rooms where id = p_room_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.format <> 'schedule' then raise exception 'BAD_STATUS'; end if;
  if coalesce(r.settings ->> 'schedule_mode', '') <> 'trip' then
    return jsonb_build_object('visible', true, 'windows', '[]'::jsonb);
  end if;

  select * into v_member
  from public.members m
  where m.room_id = p_room_id and m.user_id = auth.uid() and m.kicked_at is null;

  select exists(
    select 1 from public.schedule_answers a
    join public.schedule_slots s on s.id = a.slot_id
    where s.room_id = p_room_id and a.member_id = v_member.id
  ) into v_answered;

  if r.results_visibility = 'after_close' and r.status <> 'closed' and not v_member.is_host then
    return jsonb_build_object('visible', false, 'reason', 'after_close', 'windows', '[]'::jsonb);
  end if;
  if r.results_visibility = 'after_vote' and not v_answered and not v_member.is_host and r.status <> 'closed' then
    return jsonb_build_object('visible', false, 'reason', 'after_vote', 'windows', '[]'::jsonb);
  end if;

  v_trip := greatest(1, least(14, coalesce((r.settings ->> 'trip_length')::int, 3)));
  select array_agg(d order by d) into v_dates
  from (select distinct s.slot_date as d from public.schedule_slots s where s.room_id = p_room_id) q;
  v_len := coalesce(array_length(v_dates, 1), 0);
  select array_agg(m.id) into v_members
  from public.members m where m.room_id = p_room_id and m.kicked_at is null;

  if v_len >= v_trip and v_members is not null then
    for v_i in 1..(v_len - v_trip + 1) loop
      v_s := v_dates[v_i];
      v_e := v_dates[v_i + v_trip - 1];
      if v_e <> v_s + (v_trip - 1) then continue; end if;
      v_full := 0;
      v_part := 0;
      foreach v_mid in array v_members loop
        v_ok := true;
        v_maybe := false;
        for v_j in 0..(v_trip - 1) loop
          select a.answer into v_ans
          from public.schedule_slots s
          left join public.schedule_answers a on a.slot_id = s.id and a.member_id = v_mid
          where s.room_id = p_room_id and s.slot_date = v_s + v_j
          limit 1;
          if v_ans is distinct from 'yes' and v_ans is distinct from 'maybe' then
            v_ok := false;
            exit;
          end if;
          if v_ans = 'maybe' then v_maybe := true; end if;
        end loop;
        if v_ok then
          if v_maybe then v_part := v_part + 1; else v_full := v_full + 1; end if;
        end if;
      end loop;
      v_sc := v_full + v_part * 0.5;
      v_windows := v_windows || jsonb_build_array(jsonb_build_object(
        'start', v_s,
        'end', v_e,
        'score', v_sc,
        'full', v_full,
        'part', v_part,
        'out', (coalesce(array_length(v_members, 1), 0) - v_full - v_part)
      ));
    end loop;
  end if;

  select coalesce(jsonb_agg(e order by (e ->> 'score')::numeric desc, (e ->> 'full')::int desc, (e ->> 'start')), '[]'::jsonb)
  into v_sorted
  from jsonb_array_elements(v_windows) e;

  return jsonb_build_object('visible', true, 'anonymous', r.anonymous, 'windows', coalesce(v_sorted, '[]'::jsonb));
end;
$$;

grant execute on function public.get_schedule_trip_windows(uuid) to authenticated;

notify pgrst, 'reload schema';
