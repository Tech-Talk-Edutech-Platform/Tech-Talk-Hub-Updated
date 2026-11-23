-- The ledger records the payment. Delivery state and the immutable email
-- payload are available only to the server.
create table public.dashboard_receipt_deliveries (
  receipt_id uuid primary key references public.receipts(id) on delete cascade,
  receipt_number text not null unique,
  payload jsonb not null,
  issued_by uuid references public.users(id) on delete set null,
  first_attempt_at timestamptz,
  sent_at timestamptz
);
alter table public.dashboard_receipt_deliveries enable row level security;
revoke all on public.dashboard_receipt_deliveries from public, anon, authenticated;
grant select, insert, update on public.dashboard_receipt_deliveries to service_role;
revoke all on public.receipts from public, anon, authenticated;
grant select, insert on public.receipts to service_role;
create function public.reserve_dashboard_receipt(p_actor uuid, p_payload jsonb)
returns public.dashboard_receipt_deliveries
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_number text := p_payload->>'receiptNumber';
  v_id uuid;
  v_delivery public.dashboard_receipt_deliveries;
  v_role text;
begin
  select role into v_role from public.users where id = p_actor and is_active is distinct from false;
  if v_role is null or v_role not in ('owner', 'tech_admin', 'tutor') then
    raise exception 'Receipt access denied.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_number, 82133));
  select * into v_delivery from public.dashboard_receipt_deliveries
    where receipt_number = v_number;
  if found then
    if v_role = 'tutor' and v_delivery.issued_by is distinct from p_actor then
      raise exception 'Receipt access denied.' using errcode = '42501';
    end if;
    if v_delivery.payload is distinct from p_payload then
      raise exception 'Receipt number already belongs to a different payment.' using errcode = '23505';
    end if;
    return v_delivery;
  end if;

  if exists (select 1 from public.receipts where receipt_number = v_number) then
    raise exception 'This receipt number already exists.' using errcode = '23505';
  end if;

  insert into public.receipts (receipt_number, customer_name, amount, total_paid, payment_method, transaction_code)
  values (v_number, p_payload->>'studentName', (p_payload->>'amountPaid')::numeric,
    (p_payload->>'amountPaid')::numeric, p_payload->>'gatewayMethod', p_payload->>'transactionId')
  returning id into v_id;

  insert into public.dashboard_receipt_deliveries (receipt_id, receipt_number, payload, issued_by)
  values (v_id, v_number, p_payload, p_actor) returning * into v_delivery;
  return v_delivery;
end;
$$;
revoke all on function public.reserve_dashboard_receipt(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_dashboard_receipt(uuid, jsonb) to service_role;
