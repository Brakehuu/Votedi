-- Vote Đi — 0017: ensure list_my_rooms (+ grants) for /phong-cua-toi
-- Idempotent. Safe to re-run in Supabase SQL Editor.

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

revoke all on function public.list_my_rooms() from public;
grant execute on function public.list_my_rooms() to anon;
grant execute on function public.list_my_rooms() to authenticated;

notify pgrst, 'reload schema';
