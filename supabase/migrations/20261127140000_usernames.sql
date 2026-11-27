-- Usernames: an optional sign-in name on each account (brief item 1.5).
--
-- * users.username: 3–24 characters, lowercase letters, numbers, dots and
--   underscores, starting with a letter or number. Unique. Nothing shows it
--   on screen instead of the full name; it's only for signing in.
-- * set_my_username(): the signed-in person sets or clears their own.
--   Admins can also set one when creating an account (server/routes/adminUsers.ts).
-- * Signing in with a username goes through the server
--   (POST /api/auth/username-login), which looks the account up with the
--   service role, so nobody's email address is ever sent to the browser.

alter table public.users add column if not exists username text;

alter table public.users drop constraint if exists users_username_format;
alter table public.users
  add constraint users_username_format
  check (username is null or username ~ '^[a-z0-9][a-z0-9._]{2,23}$');

create unique index if not exists users_username_key
  on public.users (username);

create or replace function public.set_my_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := nullif(lower(btrim(p_username)), '');
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  if v_username is not null
     and v_username !~ '^[a-z0-9][a-z0-9._]{2,23}$' then
    raise exception
      'Use 3 to 24 lowercase letters, numbers, dots or underscores, starting with a letter or number.'
      using errcode = '22023';
  end if;

  if v_username is not null and exists (
    select 1 from public.users
    where username = v_username and id <> auth.uid()
  ) then
    raise exception 'That username is taken. Try another.' using errcode = '23505';
  end if;

  update public.users set username = v_username where id = auth.uid();
  if not found then
    raise exception 'Your profile wasn''t found.' using errcode = 'P0002';
  end if;

  return v_username;
end;
$$;

revoke all on function public.set_my_username(text) from public;
grant execute on function public.set_my_username(text) to authenticated;
