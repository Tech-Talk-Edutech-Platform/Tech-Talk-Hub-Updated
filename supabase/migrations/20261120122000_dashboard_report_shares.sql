-- Existing slugs still work for signed-in students and authorized staff.
-- Anonymous access requires a randomly generated, expiring share capability.
create table public.dashboard_report_shares (
  report_id uuid primary key references public.student_results(id) on delete cascade,
  share_token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '30 days')
);
alter table public.dashboard_report_shares enable row level security;
revoke all on public.dashboard_report_shares from public, anon, authenticated;

alter table public.student_results enable row level security;
revoke all on public.student_results from public, anon;

create function public.dashboard_can_manage_report(p_student uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.classroom_is_admin() or (
    public.classroom_is_staff() and exists (
      select 1 from public.users where id = p_student and assigned_tutor_id = auth.uid()
    )
  )
$$;
revoke all on function public.dashboard_can_manage_report(uuid) from public, anon;
grant execute on function public.dashboard_can_manage_report(uuid) to authenticated;

create policy dashboard_report_read on public.student_results for select to authenticated
  using (student_id = auth.uid() or public.dashboard_can_manage_report(student_id));
create policy dashboard_report_read_scope on public.student_results as restrictive for select to authenticated
  using (student_id = auth.uid() or public.dashboard_can_manage_report(student_id));
create policy dashboard_report_manage on public.student_results for all to authenticated
  using (public.dashboard_can_manage_report(student_id)) with check (public.dashboard_can_manage_report(student_id));
create policy dashboard_report_insert_scope on public.student_results as restrictive for insert to authenticated
  with check (public.dashboard_can_manage_report(student_id));
create policy dashboard_report_update_scope on public.student_results as restrictive for update to authenticated
  using (public.dashboard_can_manage_report(student_id)) with check (public.dashboard_can_manage_report(student_id));
create policy dashboard_report_delete_scope on public.student_results as restrictive for delete to authenticated
  using (public.dashboard_can_manage_report(student_id));

create function public.share_dashboard_report(p_report uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_token uuid;
begin
  if not exists (select 1 from public.student_results where id = p_report and public.dashboard_can_manage_report(student_id)) then
    raise exception 'You cannot share this report.' using errcode = '42501';
  end if;
  insert into public.dashboard_report_shares (report_id) values (p_report)
    on conflict (report_id) do update set share_token = gen_random_uuid(), expires_at = now() + interval '30 days'
    returning share_token into v_token;
  return v_token;
end;
$$;

create function public.revoke_dashboard_report_share(p_report uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.student_results where id = p_report and public.dashboard_can_manage_report(student_id)) then
    raise exception 'You cannot revoke this report link.' using errcode = '42501';
  end if;
  delete from public.dashboard_report_shares where report_id = p_report;
end;
$$;

create function public.read_dashboard_report(p_reference text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', r.id, 'student_name', r.student_name, 'course_name', r.course_name,
    'grade_level', r.grade_level, 'overall_score', r.overall_score, 'theory_score', r.theory_score,
    'practical_score', r.practical_score, 'problem_solving_score', r.problem_solving_score,
    'creativity_score', r.creativity_score, 'performance_label', r.performance_label,
    'project_url', case when r.project_url ~* '^https?://' then r.project_url end,
    'exam_title', r.exam_title, 'exam_date', r.exam_date, 'tutor_feedback', r.tutor_feedback,
    'total_classes_allocated', (to_jsonb(r)->'total_classes_allocated'),
    'classes_attended', (to_jsonb(r)->'classes_attended'),
    'today_summary', (to_jsonb(r)->'today_summary'),
    'is_share_link', coalesce(s.share_token::text = lower(p_reference) and s.expires_at > now(), false),
    'can_share', public.dashboard_can_manage_report(r.student_id)
  )
  from public.student_results r
  left join public.dashboard_report_shares s on s.report_id = r.id
  where (s.share_token = case when p_reference ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
           then p_reference::uuid end and s.expires_at > now())
     or (r.slug = p_reference and public.dashboard_actor_active() and
         (r.student_id = auth.uid() or public.dashboard_can_manage_report(r.student_id)))
  order by r.created_at desc, r.id limit 1
$$;

revoke all on function public.share_dashboard_report(uuid), public.revoke_dashboard_report_share(uuid),
  public.read_dashboard_report(text) from public, anon, authenticated;
grant execute on function public.share_dashboard_report(uuid), public.revoke_dashboard_report_share(uuid) to authenticated;
grant execute on function public.read_dashboard_report(text) to anon, authenticated;

-- Only the retired public report upload used this bucket in the application.
update storage.buckets set public = false where id = 'student-assets';
create policy dashboard_no_browser_report_asset_insert on storage.objects as restrictive
  for insert to anon, authenticated with check (bucket_id <> 'student-assets');
create policy dashboard_no_browser_report_asset_update on storage.objects as restrictive
  for update to anon, authenticated using (bucket_id <> 'student-assets') with check (bucket_id <> 'student-assets');
create policy dashboard_no_browser_report_asset_read on storage.objects as restrictive
  for select to anon, authenticated using (bucket_id <> 'student-assets');
