-- =============================================================================
-- Sales reps only read their own families.
--
-- Until now every rep could read every other rep's trial bookings (parent
-- phone and email, child's name and notes), every sale and every WhatsApp
-- message, and every unassigned lead whatever its status. The dashboard only
-- *showed* a rep their own, but the rows still reached the browser.
--
--   trial_bookings     admins, the trial's tutor, the rep credited with it
--   sales              admins, the rep credited with it
--   whatsapp_messages  admins, the rep whose booking or parent it is about
--   leads              admins, the assigned tutor, the rep working the parent,
--                      and any rep while the parent is new and unassigned
--
-- Double-booking is still impossible: book_trial() and the other SECURITY
-- DEFINER actions see every row, and a booked slot stops being a 'Free Slot'.
--
-- The team-wide numbers a rep needs (their rank, the top weekly count for the
-- "Top closer" badge) come from sales_rep_standing(), which returns counts
-- only: no names, families or revenue of other reps.
--
-- sales_add_lead() no longer names another rep's parent (or the rep) when a
-- phone number is already taken, so it can't be used to look up who a number
-- belongs to.
--
-- dashboard_sales_metrics() is SECURITY INVOKER, so it follows these rules: a
-- rep's call now only counts their own rows.
-- =============================================================================


-- trial bookings ---------------------------------------------------------------

drop policy if exists "trial bookings: sales, admins and the tutor read" on public.trial_bookings;
drop policy if exists "trial bookings: admins, the tutor and the rep read" on public.trial_bookings;
create policy "trial bookings: admins, the tutor and the rep read"
  on public.trial_bookings for select to authenticated
  using (
    public.classroom_is_admin()
    or mentor_id = auth.uid()
    or (public.is_marketer() and marketer_id = auth.uid())
  );


-- sales ------------------------------------------------------------------------

drop policy if exists "sales: sales team and admins read" on public.sales;
drop policy if exists "sales: admins and the rep read" on public.sales;
create policy "sales: admins and the rep read"
  on public.sales for select to authenticated
  using (
    public.classroom_is_admin()
    or (public.is_marketer() and marketer_id = auth.uid())
  );


-- WhatsApp messages --------------------------------------------------------------

drop policy if exists "whatsapp: sales team and admins read" on public.whatsapp_messages;
drop policy if exists "whatsapp: admins and the rep read" on public.whatsapp_messages;
create policy "whatsapp: admins and the rep read"
  on public.whatsapp_messages for select to authenticated
  using (
    public.classroom_is_admin()
    or (
      public.is_marketer()
      and (
        exists (
          select 1 from public.trial_bookings b
          where b.id = whatsapp_messages.trial_booking_id
            and b.marketer_id = auth.uid()
        )
        or exists (
          select 1 from public.leads l
          where l.id = whatsapp_messages.lead_id
            and l.marketer_id = auth.uid()
        )
      )
    )
  );


-- leads ------------------------------------------------------------------------

-- The shared pool is only parents nobody has spoken to yet ('New', as
-- sales_add_lead() saves it, or blank from older rows), matching what the
-- Parents page offers a rep.
drop policy if exists "leads: staff read" on public.leads;
create policy "leads: staff read"
  on public.leads for select to authenticated
  using (
    public.classroom_is_admin()
    or assigned_tutor_id = auth.uid()
    or (
      public.is_marketer()
      and (
        marketer_id = auth.uid()
        or (
          marketer_id is null
          and coalesce(lower(btrim(status)), '') in ('', 'new')
        )
      )
    )
  );


-- adding a parent ---------------------------------------------------------------

create or replace function public.sales_add_lead(
  p_parent_name text,
  p_phone text,
  p_email text default null,
  p_source text default 'sales_call',
  p_notes text default null
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(btrim(p_parent_name), '');
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_existing public.leads;
  v_lead public.leads;
begin
  if not (public.classroom_is_admin() or public.is_marketer()) then
    raise exception 'Only the sales team and admins can add parents.'
      using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'Add the parent''s name.';
  end if;
  if length(v_digits) < 9 then
    raise exception 'Add the parent''s full phone number.';
  end if;
  if p_source not in ('website', 'sales_call', 'whatsapp', 'privyr') then
    raise exception 'Choose where the parent came from.';
  end if;

  select * into v_existing from public.leads
  where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_digits
  order by created_at desc
  limit 1;
  if found then
    -- Admins and the rep working the parent may see who it is; anyone else
    -- only learns that the number is taken.
    if public.classroom_is_admin() or v_existing.marketer_id = auth.uid() then
      raise exception '% already has this number. Find them in the parents list instead.',
        coalesce(nullif(btrim(v_existing.parent_name), ''), 'Another parent');
    end if;
    if v_existing.marketer_id is null then
      raise exception 'This number is already in the parents list. Find them under "To contact", or ask an admin.';
    end if;
    raise exception 'Another sales rep is already working with this number.';
  end if;

  insert into public.leads (parent_name, phone, email, lead_source, status, marketer_id, notes)
  values (
    v_name,
    '+' || v_digits,
    nullif(lower(btrim(p_email)), ''),
    p_source,
    'New',
    case when public.is_marketer() then auth.uid() end,
    nullif(btrim(p_notes), '')
  )
  returning * into v_lead;

  return v_lead;
end;
$$;

revoke all on function public.sales_add_lead(text, text, text, text, text) from public, anon;
grant execute on function public.sales_add_lead(text, text, text, text, text) to authenticated;


-- a rep's place on the team -------------------------------------------------------

-- For the signed-in rep: their rank by sales closed in [p_from, p_to) among
-- active reps (1 = most; ties share a rank), how many reps there are, and
-- sales in the 7 days before p_to, theirs and the team's best. Counts only.
create or replace function public.sales_rep_standing(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  v_result jsonb;
begin
  if not public.is_marketer() then
    raise exception 'Only sales reps have a team standing.' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > interval '32 days' then
    raise exception 'Invalid sales period.' using errcode = '22023';
  end if;

  with reps as (
    select id from public.users
    where role = 'marketer' and is_active is distinct from false
  ), period as (
    select r.id, count(s.id) as n
    from reps r
    left join public.sales s
      on s.marketer_id = r.id and s.closed_at >= p_from and s.closed_at < p_to
    group by r.id
  ), week as (
    select r.id, count(s.id) as n
    from reps r
    left join public.sales s
      on s.marketer_id = r.id
      and s.closed_at >= p_to - interval '7 days' and s.closed_at < p_to
    group by r.id
  ), mine as (
    select
      coalesce((select n from period where id = v_me), 0) as period_n,
      coalesce((select n from week where id = v_me), 0) as week_n
  )
  select jsonb_build_object(
    'rank', 1 + (select count(*) from period, mine where period.n > mine.period_n),
    'reps', greatest((select count(*) from reps), 1),
    'weekMine', (select week_n from mine),
    'weekTop', coalesce((select max(n) from week), 0)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.sales_rep_standing(timestamptz, timestamptz) from public, anon;
grant execute on function public.sales_rep_standing(timestamptz, timestamptz) to authenticated;
