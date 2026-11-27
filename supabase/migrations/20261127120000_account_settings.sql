-- Account settings that stick.
--
-- 1. Dark mode follows the account: users.theme ('light' | 'dark'). The
--    browser also keeps a copy (src/lib/theme.ts) so it paints at once.
-- 2. update_my_profile() saves the signed-in person's own name, theme and
--    avatar. It runs as definer so a legacy policy on public.users can't
--    quietly drop the change (an UPDATE blocked by RLS reports success with
--    zero rows), and it returns the saved row so the app can confirm it.
-- 3. The 'profiles' storage bucket that Settings → Change Avatar uploads to.
--    It never existed, so every avatar upload failed. Public read (avatars
--    are shown everywhere); each person writes only avatars/<their id>/….
--
-- Safe to re-run.

-- PART 1 ── theme ---------------------------------------------------------------

alter table public.users add column if not exists theme text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_theme_check'
  ) then
    alter table public.users
      add constraint users_theme_check check (theme in ('light', 'dark'));
  end if;
end;
$$;

comment on column public.users.theme is
  'Dashboard colour mode chosen in Settings: light or dark. Null: light.';

-- PART 2 ── update_my_profile ----------------------------------------------------

create or replace function public.update_my_profile(
  p_full_name text default null,
  p_theme text default null,
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(btrim(p_full_name), '');
  v_row public.users;
begin
  if v_uid is null then
    raise exception 'Sign in to change your profile.' using errcode = '42501';
  end if;
  if p_full_name is not null and v_name is null then
    raise exception 'Your name can''t be empty.' using errcode = '22023';
  end if;
  if char_length(v_name) > 120 then
    raise exception 'Keep your name under 120 characters.' using errcode = '22023';
  end if;
  if p_theme is not null and p_theme not in ('light', 'dark') then
    raise exception 'Unknown theme.' using errcode = '22023';
  end if;
  -- Only an avatar this person uploaded to their own folder.
  if p_avatar_url is not null
     and position(('/storage/v1/object/public/profiles/avatars/' || v_uid || '/') in p_avatar_url) = 0 then
    raise exception 'That picture isn''t one of your uploads.' using errcode = '42501';
  end if;

  update public.users
  set full_name = coalesce(v_name, full_name),
      theme = coalesce(p_theme, theme),
      avatar_url = coalesce(p_avatar_url, avatar_url)
  where id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'Your profile couldn''t be found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'full_name', v_row.full_name,
    'theme', v_row.theme,
    'avatar_url', v_row.avatar_url
  );
end;
$$;

revoke all on function public.update_my_profile(text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text) to authenticated;

-- PART 3 ── avatar bucket --------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profiles', 'profiles', true, 2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profiles: read avatars" on storage.objects;
create policy "profiles: read avatars" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'profiles');

drop policy if exists "profiles: upload own avatar" on storage.objects;
create policy "profiles: upload own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "profiles: replace own avatar" on storage.objects;
create policy "profiles: replace own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "profiles: delete own avatar" on storage.objects;
create policy "profiles: delete own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
