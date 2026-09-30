-- Vote Đi — 0015: Phase 5 feedback (liên hệ / góp ý).
-- Run after 0014_phase4.sql. Safe to re-run.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text not null check (char_length(btrim(email)) between 3 and 120),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  page text null check (page is null or char_length(page) <= 200),
  user_agent text null check (user_agent is null or char_length(user_agent) <= 400),
  ip_hash text null check (ip_hash is null or char_length(ip_hash) <= 64),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists feedback_ip_hash_created_idx on public.feedback (ip_hash, created_at desc);

alter table public.feedback enable row level security;
drop policy if exists feedback_no_select on public.feedback;
-- Không cho client đọc góp ý; chỉ RPC ghi.
revoke all on table public.feedback from anon, authenticated;
grant select on table public.feedback to service_role;

create or replace function public.submit_feedback(
  p_name text,
  p_email text,
  p_message text,
  p_page text default null,
  p_honeypot text default null,
  p_ip_hash text default null,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Honeypot: bot điền → bỏ qua im lặng
  if nullif(btrim(coalesce(p_honeypot, '')), '') is not null then
    return;
  end if;

  if p_name is null or char_length(btrim(p_name)) < 1 or char_length(btrim(p_name)) > 80 then
    raise exception 'INVALID';
  end if;
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(btrim(p_email)) > 120 then
    raise exception 'INVALID';
  end if;
  if p_message is null or char_length(btrim(p_message)) < 1 or char_length(btrim(p_message)) > 2000 then
    raise exception 'INVALID';
  end if;

  if p_ip_hash is not null and char_length(p_ip_hash) > 0 then
    select count(*)::int into v_count
    from public.feedback
    where ip_hash = p_ip_hash
      and created_at > now() - interval '1 hour';
    if v_count >= 3 then
      raise exception 'RATE_LIMIT';
    end if;
  end if;

  insert into public.feedback (name, email, message, page, user_agent, ip_hash)
  values (
    btrim(p_name),
    lower(btrim(p_email)),
    btrim(p_message),
    nullif(btrim(coalesce(p_page, '')), ''),
    nullif(left(coalesce(p_user_agent, ''), 400), ''),
    nullif(btrim(coalesce(p_ip_hash, '')), '')
  );
end;
$$;

grant execute on function public.submit_feedback(text, text, text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
