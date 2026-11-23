-- Sales can read the event times already associated with visible trial bookings
-- and the open tutor slots they can book.
create policy dashboard_sales_calendar_read on public.calendar_events
  for select to authenticated using (
    public.is_marketer() and (
      (title = 'Free Slot' and class_id is null and booking_status is distinct from 'cancelled')
      or exists (select 1 from public.trial_bookings b where b.calendar_event_id = calendar_events.id)
    )
  );
create function public.assign_dashboard_trial(p_lead uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_lead public.leads;
  v_slot public.calendar_events;
  v_booking uuid;
  v_category text;
  v_student text;
begin
  if not public.classroom_is_admin() then
    raise exception 'Only administrators can assign trials from the schedule.' using errcode = '42501';
  end if;
  select * into v_lead from public.leads where id = p_lead for update;
  if not found or v_lead.assigned_tutor_id is not null or exists (
    select 1 from public.trial_bookings where lead_id = p_lead and removed_at is null and status = 'scheduled'
  ) then
    raise exception 'This trial is no longer unassigned.' using errcode = '40001';
  end if;

  select e.* into v_slot from public.calendar_events e
  join public.users u on u.id = e.tutor_id and u.role = 'tutor' and u.is_active is distinct from false
  where e.title = 'Free Slot' and e.class_id is null and e.booking_status is distinct from 'cancelled'
    and e.start_time > now() and (
       v_lead.class_date is null or v_lead.class_time is null
       or (e.start_time at time zone 'Africa/Nairobi')::date = v_lead.class_date
          and (e.start_time at time zone 'Africa/Nairobi')::time = v_lead.class_time
    )
    and not exists (select 1 from public.trial_bookings b where b.calendar_event_id = e.id
      and b.removed_at is null and b.status <> 'cancelled')
  order by e.start_time, e.id
  limit 1 for update of e skip locked;
  if not found then raise exception 'No tutor slot is available at the requested time.' using errcode = '40001'; end if;

  select id into v_category from public.grade_categories
    where v_lead.grade = any(grades) order by sort_order, id limit 1;
  if v_category is null then
    select category_id into v_category from public.mentor_grade_categories
      where mentor_id = v_slot.tutor_id order by category_id limit 1;
  end if;
  v_student := coalesce(nullif(trim(v_lead.student_name), ''), 'Trial student');

  insert into public.trial_bookings (calendar_event_id, lead_id, mentor_id, marketer_id, booked_by,
    category_id, parent_name, parent_phone, parent_email, student_name, student_grade, source)
  values (v_slot.id, v_lead.id, v_slot.tutor_id, v_lead.marketer_id, auth.uid(),
    coalesce(v_category, 'junior-coders'), coalesce(nullif(trim(v_lead.parent_name), ''), 'Parent'),
    coalesce(v_lead.phone, ''), nullif(trim(v_lead.email), ''), v_student, coalesce(v_lead.grade, ''),
    case when v_lead.lead_source in ('website', 'sales_call', 'whatsapp', 'privyr') then v_lead.lead_source else 'website' end)
  returning id into v_booking;

  update public.calendar_events set title = 'Trial: ' || v_student, class_type = 'trial',
    booking_status = 'confirmed', session_status = 'scheduled',
    meet_link = coalesce(nullif(trim(v_lead.personal_meet_link), ''), v_slot.meet_link)
    where id = v_slot.id;
  update public.leads set assigned_tutor_id = v_slot.tutor_id, status = 'Trial Scheduled',
    class_date = (v_slot.start_time at time zone 'Africa/Nairobi')::date,
    class_time = (v_slot.start_time at time zone 'Africa/Nairobi')::time where id = v_lead.id;
  if v_lead.student_user_id is not null then
    insert into public.event_attendance (event_id, student_id) values (v_slot.id, v_lead.student_user_id)
      on conflict (event_id, student_id) do nothing;
  end if;
  return v_booking;
end;
$$;
create function public.dashboard_admin_metrics(
  p_previous timestamptz, p_start timestamptz, p_end timestamptz, p_buckets integer
)
returns jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare
  v_report jsonb;
begin
  if not public.classroom_is_admin() then
    raise exception 'Only administrators can view this report.' using errcode = '42501';
  end if;
  if p_previous is null or p_start is null or p_end is null or p_buckets is null or
     p_previous >= p_start or p_start >= p_end or p_end - p_previous > interval '181 days' or p_buckets not between 1 and 12 then
    raise exception 'Invalid reporting period.' using errcode = '22023';
  end if;

  with sale_totals as (
    select coalesce(sum(amount_kes) filter (where closed_at >= p_start), 0) as current,
           coalesce(sum(amount_kes) filter (where closed_at < p_start), 0) as previous,
           count(*) filter (where closed_at >= p_start) as count
    from public.sales where closed_at between p_previous and p_end
  ), sale_buckets as (
    select least(floor(extract(epoch from closed_at - p_start) * p_buckets / extract(epoch from p_end - p_start))::integer,
                 p_buckets - 1) as bucket, sum(amount_kes) as amount
    from public.sales where closed_at between p_start and p_end group by 1
  ), student_totals as (
    select count(*) filter (where is_active is distinct from false) as active,
           count(*) filter (where created_at between p_start and p_end) as current,
           count(*) filter (where created_at >= p_previous and created_at < p_start) as previous
    from public.users where role = 'student'
  ), trial_totals as (
    select count(*) filter (where created_at >= p_start) as current,
           count(*) filter (where created_at < p_start) as previous,
           count(*) filter (where created_at >= p_start and status = 'converted') as current_converted,
           count(*) filter (where created_at < p_start and status = 'converted') as previous_converted
    from public.trial_bookings
    where removed_at is null and status <> 'cancelled' and created_at between p_previous and p_end
  ), lead_totals as (
    select count(*) filter (where created_at >= p_start) as current,
           count(*) filter (where created_at < p_start) as previous
    from public.leads where created_at between p_previous and p_end
  ), sources as (
    select coalesce(nullif(trim(lead_source), ''), 'Unknown') as source, count(*) as count
    from public.leads where created_at between p_start and p_end group by 1
  )
  select jsonb_build_object('sales', to_jsonb(sale_totals), 'students', to_jsonb(student_totals),
    'trials', to_jsonb(trial_totals), 'leads', to_jsonb(lead_totals),
    'revenueBuckets', (select coalesce(jsonb_agg(to_jsonb(sale_buckets)), '[]'::jsonb) from sale_buckets),
    'leadSources', (select coalesce(jsonb_agg(to_jsonb(sources)), '[]'::jsonb) from sources))
    into v_report from sale_totals, student_totals, trial_totals, lead_totals;
  return v_report;
end;
$$;
revoke all on function public.assign_dashboard_trial(uuid), public.dashboard_admin_metrics(timestamptz, timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.assign_dashboard_trial(uuid), public.dashboard_admin_metrics(timestamptz, timestamptz, timestamptz, integer) to authenticated;
create function public.dashboard_sales_metrics(
  p_from timestamptz, p_to timestamptz, p_chart_end timestamptz
)
returns jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare
  v_result jsonb;
begin
  if not (public.classroom_is_admin() or public.is_marketer()) then
    raise exception 'Sales access is required.' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_chart_end is null or p_from > p_to
    or p_to - p_from > interval '32 days' or abs(extract(epoch from p_chart_end - p_to)) > 86400 then
    raise exception 'Invalid sales period.' using errcode = '22023';
  end if;

  with booking_stats as (
    select case when grouping(b.marketer_id) = 1 then 'team' else coalesce(b.marketer_id::text, 'unassigned') end as scope,
      count(*) filter (where b.created_at >= p_from and b.created_at < p_to) as booked,
      count(*) filter (where e.start_time >= p_from and e.start_time < p_to and b.status in ('attended','converted','lost')) as held,
      count(*) filter (where e.start_time >= p_from and e.start_time < p_to and b.status = 'converted') as converted,
      count(*) filter (where e.start_time >= p_from and e.start_time < p_to and b.status = 'no_show') as "noShows",
      count(*) filter (where b.source = 'website' and b.created_at >= p_from and b.created_at < p_to) as website
    from public.trial_bookings b join public.calendar_events e on e.id = b.calendar_event_id
    where b.removed_at is null and ((b.created_at >= p_from and b.created_at < p_to)
      or (e.start_time >= p_from and e.start_time < p_to))
    group by grouping sets ((), (b.marketer_id))
  ), sale_stats as (
    select case when grouping(s.marketer_id) = 1 then 'team' else coalesce(s.marketer_id::text, 'unassigned') end as scope,
      count(*) as sales, coalesce(sum(s.amount_kes), 0) as revenue
    from public.sales s where s.closed_at >= p_from and s.closed_at < p_to
    group by grouping sets ((), (s.marketer_id))
  ), combined as (
    select coalesce(b.scope, s.scope) as scope, coalesce(b.booked, 0) as booked,
      coalesce(b.held, 0) as held, coalesce(b."noShows", 0) as "noShows", coalesce(s.sales, 0) as sales,
      coalesce(s.revenue, 0) as revenue, b.converted::numeric / nullif(b.held, 0) as conversion,
      b.held::numeric / nullif(b.held + b."noShows", 0) as "showUp", coalesce(b.website, 0) as website
    from booking_stats b full join sale_stats s using (scope)
  ), wk_source as (
    select s.marketer_id, 6 - ceil(extract(epoch from p_chart_end - s.closed_at) / 604800)::integer as bucket,
      s.amount_kes from public.sales s where s.closed_at >= p_chart_end - interval '1008 hours' and s.closed_at < p_chart_end
  ), weeks as (
    select case when grouping(marketer_id) = 1 then 'team' else coalesce(marketer_id::text, 'unassigned') end as scope,
      bucket, count(*) as sales, sum(amount_kes) as revenue
    from wk_source where bucket between 0 and 5 group by grouping sets ((bucket), (bucket, marketer_id))
  ), mentor_outcomes as (
    select b.mentor_id::text as id,
      count(*) filter (where b.status in ('attended','converted','lost')) as held,
      count(*) filter (where b.status = 'converted') as converted
    from public.trial_bookings b join public.calendar_events e on e.id = b.calendar_event_id
    where b.removed_at is null and b.mentor_id is not null and e.start_time >= p_from and e.start_time < p_to
    group by b.mentor_id
  ), mentor_availability as (
    select e.tutor_id::text as id,
      count(*) filter (where e.title = 'Free Slot' and e.class_id is null
        and e.booking_status is distinct from 'cancelled' and b.id is null) as open,
      count(*) filter (where b.id is not null) as booked
    from public.calendar_events e
    left join public.trial_bookings b on b.calendar_event_id = e.id and b.removed_at is null and b.status <> 'cancelled'
    where e.tutor_id is not null and e.start_time >= p_to and e.start_time < p_to + interval '336 hours'
    group by e.tutor_id
  ), mentors as (
    select coalesce(o.id, a.id) as id, coalesce(o.held, 0) as held,
      coalesce(o.converted, 0) as converted, coalesce(a.open, 0) as open, coalesce(a.booked, 0) as booked
    from mentor_outcomes o full join mentor_availability a using (id)
  )
  select jsonb_build_object(
    'stats', (select coalesce(jsonb_object_agg(scope, to_jsonb(combined) - 'scope'), '{}'::jsonb) from combined),
    'weeks', (select coalesce(jsonb_agg(to_jsonb(weeks)), '[]'::jsonb) from weeks),
    'mentors', (select coalesce(jsonb_object_agg(id, to_jsonb(mentors) - 'id'), '{}'::jsonb) from mentors)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.dashboard_sales_metrics(timestamptz, timestamptz, timestamptz) from public, anon;
grant execute on function public.dashboard_sales_metrics(timestamptz, timestamptz, timestamptz) to authenticated;
