-- Vote Đi — 0012: Phase 2 social (anonymous RLS, tallies, reactions, comments).
-- Run after 0011_fix_place_urls.sql. Safe to re-run.

alter table public.rooms add column if not exists anonymous_comments boolean not null default false;

-- ---------------------------------------------------------------------------
-- 1. Anonymous-aware RLS on vote tables
-- ---------------------------------------------------------------------------

drop policy if exists votes_select on public.votes;
create policy votes_select on public.votes
for select to authenticated
using (
  public.is_room_member(room_id)
  and (
    not exists (select 1 from public.rooms r where r.id = votes.room_id and r.anonymous = true)
    or exists (
      select 1 from public.members m
      where m.room_id = votes.room_id
        and m.user_id = auth.uid()
        and m.kicked_at is null
        and m.id = votes.member_id
    )
  )
);

drop policy if exists qualify_votes_select on public.qualify_votes;
create policy qualify_votes_select on public.qualify_votes
for select to authenticated
using (
  public.is_room_member(room_id)
  and (
    not exists (select 1 from public.rooms r where r.id = qualify_votes.room_id and r.anonymous = true)
    or exists (
      select 1 from public.members m
      where m.room_id = qualify_votes.room_id
        and m.user_id = auth.uid()
        and m.kicked_at is null
        and m.id = qualify_votes.member_id
    )
  )
);

drop policy if exists match_votes_select on public.match_votes;
create policy match_votes_select on public.match_votes
for select to authenticated
using (
  exists (
    select 1
    from public.matches mt
    where mt.id = match_votes.match_id
      and public.is_room_member(mt.room_id)
      and (
        not exists (select 1 from public.rooms r where r.id = mt.room_id and r.anonymous = true)
        or exists (
          select 1 from public.members m
          where m.room_id = mt.room_id
            and m.user_id = auth.uid()
            and m.kicked_at is null
            and m.id = match_votes.member_id
        )
      )
  )
);

-- ---------------------------------------------------------------------------
-- 2. host_set_anonymous / host_set_results_visibility
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
  -- Once votes exist, only allow turning ON (false → true), never off.
  if r.anonymous and not coalesce(p_anonymous, false) then
    if exists (select 1 from public.votes v where v.room_id = p_room_id)
       or exists (select 1 from public.qualify_votes q where q.room_id = p_room_id)
       or exists (
         select 1 from public.match_votes mv
         join public.matches mt on mt.id = mv.match_id
         where mt.room_id = p_room_id
       ) then
      raise exception 'ANON_LOCKED';
    end if;
  end if;
  update public.rooms set anonymous = coalesce(p_anonymous, false) where id = p_room_id;
end;
$$;

create or replace function public.host_set_results_visibility(p_room_id uuid, p_visibility text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  perform public._require_host(p_room_id);
  if p_visibility is null or p_visibility not in ('live', 'after_vote', 'after_close') then
    raise exception 'INVALID';
  end if;
  update public.rooms set results_visibility = p_visibility where id = p_room_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. get_room_tallies — respects anonymous + results_visibility
-- ---------------------------------------------------------------------------

create or replace function public.get_room_tallies(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_has_voted boolean := false;
  v_board jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_MEMBER'; end if;

  select * into r from public.rooms where id = p_room_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_member
  from public.members m
  where m.room_id = p_room_id and m.user_id = auth.uid() and m.kicked_at is null;

  if r.format = 'bracket' then
    -- Qualify tallies
    select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.votes desc), '[]'::jsonb)
    into v_board
    from (
      select i.id as item_id,
             count(qv.id)::int as votes,
             count(qv.id)::numeric as score,
             case when r.anonymous then '[]'::jsonb
                  else coalesce(jsonb_agg(qv.member_id) filter (where qv.member_id is not null), '[]'::jsonb)
             end as voter_ids
      from public.items i
      left join public.qualify_votes qv on qv.item_id = i.id
      where i.room_id = p_room_id
      group by i.id
    ) t;
  else
    select exists(
      select 1 from public.votes v where v.room_id = p_room_id and v.member_id = v_member.id
    ) into v_has_voted;

    if r.results_visibility = 'after_close' and r.status <> 'closed' and not v_member.is_host then
      return jsonb_build_object('visible', false, 'reason', 'after_close', 'board', '[]'::jsonb);
    end if;
    if r.results_visibility = 'after_vote' and not v_has_voted and not v_member.is_host and r.status <> 'closed' then
      return jsonb_build_object('visible', false, 'reason', 'after_vote', 'board', '[]'::jsonb);
    end if;

    select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.score desc), '[]'::jsonb)
    into v_board
    from (
      select i.id as item_id,
             coalesce(sum(v.value), 0)::numeric as score,
             count(v.id)::int as votes,
             case when r.anonymous then '[]'::jsonb
                  else coalesce(jsonb_agg(v.member_id) filter (where v.member_id is not null), '[]'::jsonb)
             end as voter_ids
      from public.items i
      left join public.votes v on v.item_id = i.id
      where i.room_id = p_room_id
      group by i.id
    ) t;
  end if;

  return jsonb_build_object(
    'visible', true,
    'anonymous', r.anonymous,
    'board', coalesce(v_board, '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. reactions
-- ---------------------------------------------------------------------------

create table if not exists public.reactions (
  item_id uuid not null references public.items (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '😍', '🔥', '😂', '👎')),
  created_at timestamptz not null default now(),
  primary key (item_id, member_id, emoji)
);

create index if not exists reactions_item_id_idx on public.reactions (item_id);

alter table public.reactions enable row level security;

drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions
for select to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = reactions.item_id and public.is_room_member(i.room_id)
  )
);

revoke insert, update, delete on table public.reactions from anon, authenticated;
grant select on table public.reactions to authenticated;

alter table public.reactions replica identity full;

create or replace function public.toggle_reaction(p_item_id uuid, p_emoji text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  r public.rooms%rowtype;
  v_member public.members%rowtype;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_emoji is null or p_emoji not in ('❤️', '😍', '🔥', '😂', '👎') then
    raise exception 'INVALID';
  end if;
  select * into v_item from public.items where id = p_item_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into r from public.rooms where id = v_item.room_id;
  if not r.reactions_enabled then raise exception 'DISABLED'; end if;
  select * into v_member from public.members
  where room_id = r.id and user_id = auth.uid() and kicked_at is null;
  if not found then raise exception 'NOT_MEMBER'; end if;

  if exists (
    select 1 from public.reactions x
    where x.item_id = p_item_id and x.member_id = v_member.id and x.emoji = p_emoji
  ) then
    delete from public.reactions x
    where x.item_id = p_item_id and x.member_id = v_member.id and x.emoji = p_emoji;
    return false;
  end if;
  insert into public.reactions (item_id, member_id, emoji) values (p_item_id, v_member.id, p_emoji);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. comments
-- ---------------------------------------------------------------------------

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  item_id uuid references public.items (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 500),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.members (id) on delete set null
);

create index if not exists comments_room_id_created_idx on public.comments (room_id, created_at);
create index if not exists comments_item_id_idx on public.comments (item_id);

alter table public.comments enable row level security;

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
for select to authenticated
using (public.is_room_member(room_id));

revoke insert, update, delete on table public.comments from anon, authenticated;
grant select on table public.comments to authenticated;

alter table public.comments replica identity full;

create or replace function public.add_comment(p_room_id uuid, p_body text, p_item_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_member public.members%rowtype;
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into r from public.rooms where id = p_room_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not r.comments_enabled then raise exception 'DISABLED'; end if;
  select * into v_member from public.members
  where room_id = p_room_id and user_id = auth.uid() and kicked_at is null;
  if not found then raise exception 'NOT_MEMBER'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 500 then raise exception 'INVALID'; end if;
  if exists (
    select 1 from public.comments c
    where c.member_id = v_member.id and c.created_at > now() - interval '3 seconds'
  ) then
    raise exception 'RATE_LIMIT';
  end if;
  if p_item_id is not null and not exists (
    select 1 from public.items i where i.id = p_item_id and i.room_id = p_room_id
  ) then
    raise exception 'BAD_ITEM';
  end if;
  insert into public.comments (room_id, item_id, member_id, body)
  values (p_room_id, p_item_id, v_member.id, v_body)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.comments%rowtype;
  v_member public.members%rowtype;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into c from public.comments where id = p_comment_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into v_member from public.members
  where room_id = c.room_id and user_id = auth.uid() and kicked_at is null;
  if not found then raise exception 'NOT_MEMBER'; end if;
  if not v_member.is_host and c.member_id <> v_member.id then
    raise exception 'NOT_HOST';
  end if;
  update public.comments
  set deleted_at = now(), deleted_by = v_member.id, body = ''
  where id = p_comment_id and deleted_at is null;
end;
$$;

-- Safe OG preview (callable with secret key / service role; also authenticated members)
create or replace function public.og_room_preview(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  v_count int;
  v_members int;
  v_images jsonb;
begin
  select * into r from public.rooms where slug = p_slug;
  if not found then return null; end if;
  select count(*)::int into v_count from public.items where room_id = r.id;
  select count(*)::int into v_members from public.members where room_id = r.id and kicked_at is null;
  if r.has_password then
    v_images := '[]'::jsonb;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', coalesce(i.title, ''),
      'emoji', i.emoji,
      'image_url', i.image_url,
      'item_type', i.item_type
    ) order by i.position nulls last, i.created_at) filter (where true), '[]'::jsonb)
    into v_images
    from (
      select * from public.items where room_id = r.id order by position nulls last, created_at limit 4
    ) i;
  end if;
  return jsonb_build_object(
    'id', r.id,
    'slug', r.slug,
    'name', r.name,
    'format', r.format,
    'status', r.status,
    'has_password', r.has_password,
    'item_count', v_count,
    'member_count', v_members,
    'closed', r.status in ('closed', 'done'),
    'items', coalesce(v_images, '[]'::jsonb)
  );
end;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reactions'
    ) then
      alter publication supabase_realtime add table public.reactions;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
    ) then
      alter publication supabase_realtime add table public.comments;
    end if;
  end if;
end $$;

grant execute on function public.host_set_anonymous(uuid, boolean) to authenticated;
grant execute on function public.host_set_results_visibility(uuid, text) to authenticated;
grant execute on function public.get_room_tallies(uuid) to authenticated;
grant execute on function public.toggle_reaction(uuid, text) to authenticated;
grant execute on function public.add_comment(uuid, text, uuid) to authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;
grant execute on function public.og_room_preview(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
