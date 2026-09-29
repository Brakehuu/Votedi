-- Vote Đi — 0009: host can close non-bracket rooms (Phase 0 follow-up).
-- Run after 0008_formats_foundation.sql. Safe to re-run.

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

grant execute on function public.close_room(uuid) to authenticated;

notify pgrst, 'reload schema';
