-- Vote Đi — 0006: host_end_round qualify fix + default item titles.
-- Run after 0005_seeding.sql. Does not modify older files.

-- ---------------------------------------------------------------------------
-- host_end_round: qualify → seeded bracket (drawn); knockout → resolve live
-- ---------------------------------------------------------------------------

create or replace function public.host_end_round(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  ranked uuid[];
  n int;
begin
  perform public._require_host(p_room_id);
  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if r.status = 'qualify' then
    -- Chốt vòng loại ngay, xếp hạt giống theo thứ hạng (tie_rule trong _qualify_ids)
    update public.rooms
    set qualify_deadline = least(coalesce(qualify_deadline, now()), now())
    where id = p_room_id;

    ranked := public._qualify_ids(p_room_id);
    n := coalesce(array_length(ranked, 1), 0);
    if n < 2 then
      raise exception 'NOT_ENOUGH_ITEMS';
    end if;

    perform public._build_bracket(p_room_id, public._slots_seeded(ranked));
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

grant execute on function public.host_end_round(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Default title on insert: "Mẫu N" (upload order). Ignore client filename.
-- ---------------------------------------------------------------------------

create or replace function public.trg_items_default_title()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if NEW.title is null
     or btrim(NEW.title) = ''
     or NEW.title ~* '\.(jpe?g|png|webp|gif|heic|bmp|tiff?)$'
     or NEW.title ~ '[\\/]'
  then
    select count(*)::int into n
    from public.items
    where room_id = NEW.room_id;
    NEW.title := 'Mẫu ' || (n + 1);
  end if;
  return NEW;
end;
$$;

drop trigger if exists items_default_title on public.items;
create trigger items_default_title
before insert on public.items
for each row
execute function public.trg_items_default_title();

-- Rename existing file-named / empty titles → Mẫu N by upload order in room
update public.items i
set title = 'Mẫu ' || sub.rn::text
from (
  select
    id,
    row_number() over (partition by room_id order by created_at asc, id asc) as rn
  from public.items
) sub
where i.id = sub.id
  and (
    i.title is null
    or btrim(i.title) = ''
    or i.title ~* '\.(jpe?g|png|webp|gif|heic|bmp|tiff?)$'
    or i.title ~ '[\\/]'
  );

notify pgrst, 'reload schema';
