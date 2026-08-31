-- Role-scoped payment collection and append-only financial reversals.
--
-- Receptionists may collect and inspect payments for an individual booking.
-- Managers may also inspect property finance and issue audited full refunds or
-- same-business-day voids. Completed entries are never rewritten by the app;
-- reversals are linked negative entries so the ledger remains reconstructable.

alter table public.payments
  add column if not exists entry_type text not null default 'payment',
  add column if not exists reverses_payment_id uuid,
  add column if not exists approved_by uuid,
  add column if not exists reversal_reason text;

do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    where c.conrelid = 'public.payments'::regclass
      and c.conname = 'payments_reverses_payment_id_fkey'
  ) then
    alter table public.payments
      add constraint payments_reverses_payment_id_fkey
      foreign key (reverses_payment_id) references public.payments(id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    where c.conrelid = 'public.payments'::regclass
      and c.conname = 'payments_approved_by_fkey'
  ) then
    alter table public.payments
      add constraint payments_approved_by_fkey
      foreign key (approved_by) references auth.users(id)
      on delete restrict;
  end if;
end;
$migration$;

alter table public.payments drop constraint if exists payment_amount_check;
alter table public.payments drop constraint if exists payments_entry_shape_check;
alter table public.payments
  add constraint payments_entry_shape_check check (
    (
      entry_type = 'payment'
      and amount > 0
      and reverses_payment_id is null
      and approved_by is null
      and reversal_reason is null
    )
    or
    (
      entry_type in ('refund', 'void')
      and amount < 0
      and reverses_payment_id is not null
      and approved_by is not null
      and char_length(btrim(reversal_reason)) >= 3
    )
  ) not valid;
alter table public.payments validate constraint payments_entry_shape_check;

create unique index if not exists payments_one_reversal_per_payment_unique
  on public.payments(reverses_payment_id)
  where reverses_payment_id is not null;
create index if not exists payments_entry_type_paid_at_idx
  on public.payments(entry_type, paid_at desc, id desc);

comment on column public.payments.entry_type is
  'Append-only ledger entry: payment, refund, or void.';
comment on column public.payments.reverses_payment_id is
  'Original completed payment reversed by this entry.';
comment on column public.payments.approved_by is
  'Authenticated manager or owner who approved the reversal.';
comment on column public.payments.reversal_reason is
  'Required operational reason for a refund or void.';

insert into public.role_permissions(role, resource, action)
values
  ('owner', 'payments', 'view_booking'),
  ('owner', 'payments', 'refund'),
  ('owner', 'payments', 'void'),
  ('manager', 'payments', 'view_booking'),
  ('manager', 'payments', 'view'),
  ('manager', 'payments', 'create'),
  ('manager', 'payments', 'refund'),
  ('manager', 'payments', 'void'),
  ('receptionist', 'payments', 'view_booking'),
  ('receptionist', 'payments', 'create')
on conflict (role, resource, action) do nothing;

create or replace function app_private.can_view_property_finance(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select app_private.current_property_role(p_property_id) in ('owner', 'manager')
    and app_private.has_property_permission(p_property_id, 'payments', 'view');
$fn$;

create or replace function app_private.can_view_booking_settlement(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select app_private.has_property_permission(
      p_property_id, 'payments', 'view_booking'
    )
    or app_private.can_view_property_finance(p_property_id);
$fn$;

revoke all on function app_private.can_view_booking_settlement(uuid)
  from public, anon, authenticated;

create or replace function public.get_booking_settlement(
  p_property_id uuid,
  p_booking_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_booking public.bookings%rowtype;
  v_paid numeric;
  v_balance numeric;
  v_can_refund boolean;
  v_can_void boolean;
  v_business_date date;
  v_timezone text;
  v_result jsonb;
begin
  perform app_private.require_property_permission(
    p_property_id, 'bookings', 'view'
  );
  if not app_private.can_view_booking_settlement(p_property_id) then
    raise exception using errcode = '42501', message = 'Payment access denied';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id and b.property_id = p_property_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;

  v_can_refund := app_private.has_property_permission(
    p_property_id, 'payments', 'refund'
  );
  v_can_void := app_private.has_property_permission(
    p_property_id, 'payments', 'void'
  );
  v_business_date := app_private.property_business_date(p_property_id);
  v_timezone := app_private.property_timezone(p_property_id);

  select coalesce(sum(p.amount) filter (
    where coalesce(p.payment_status, p.status) = 'completed'
  ), 0)
  into v_paid
  from public.payments p
  where p.booking_id = p_booking_id;
  v_balance := greatest(v_booking.total_price - v_paid, 0);

  select jsonb_build_object(
    'success', true,
    'capabilities', jsonb_build_object(
      'view_settlement', true,
      'record_payment', app_private.has_property_permission(
        p_property_id, 'payments', 'create'
      ),
      'refund_payment', v_can_refund,
      'void_payment', v_can_void
    ),
    'settlement', jsonb_build_object(
      'total', v_booking.total_price,
      'paid', v_paid,
      'balance', v_balance,
      'status', v_booking.payment_status,
      'payment_count', (
        select count(*)::integer
        from public.payments p
        where p.booking_id = p_booking_id
          and coalesce(p.entry_type, 'payment') = 'payment'
          and coalesce(p.payment_status, p.status) = 'completed'
      )
    ),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'amount', p.amount,
        'currency', p.currency,
        'method', coalesce(p.payment_method, p.method),
        'status', case
          when coalesce(p.entry_type, 'payment') = 'payment'
            and reversal.entry_type = 'refund' then 'refunded'
          when coalesce(p.entry_type, 'payment') = 'payment'
            and reversal.entry_type = 'void' then 'voided'
          when p.entry_type = 'refund' then 'refund'
          when p.entry_type = 'void' then 'void'
          else coalesce(p.payment_status, p.status)
        end,
        'entry_type', coalesce(p.entry_type, 'payment'),
        'reference', coalesce(p.transaction_reference, p.transaction_ref),
        'notes', p.notes,
        'paid_at', coalesce(p.paid_at, p.created_at),
        'received_by', p.received_by,
        'received_by_name', coalesce(receiver.display_name, 'System'),
        'reverses_payment_id', p.reverses_payment_id,
        'reversal_reason', p.reversal_reason,
        'approved_by', p.approved_by,
        'approved_by_name', approver.display_name,
        'can_refund', v_can_refund
          and coalesce(p.entry_type, 'payment') = 'payment'
          and coalesce(p.payment_status, p.status) = 'completed'
          and reversal.id is null,
        'can_void', v_can_void
          and coalesce(p.entry_type, 'payment') = 'payment'
          and coalesce(p.payment_status, p.status) = 'completed'
          and reversal.id is null
          and (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date
            = v_business_date
      ) order by coalesce(p.paid_at, p.created_at) desc, p.id desc)
      from public.payments p
      left join public.payments reversal
        on reversal.reverses_payment_id = p.id
       and coalesce(reversal.payment_status, reversal.status) = 'completed'
      left join public.user_profiles receiver on receiver.user_id = p.received_by
      left join public.user_profiles approver on approver.user_id = p.approved_by
      where p.booking_id = p_booking_id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$fn$;

create or replace function public.get_property_finance_dashboard(
  p_property_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_role text;
  v_timezone text;
  v_business_date date;
  v_days integer;
  v_rooms integer;
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(
    p_property_id, 'payments', 'view'
  );
  if v_role not in ('owner', 'manager') then
    raise exception using errcode = '42501', message = 'Finance access denied';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception using errcode = '22023', message = 'Invalid finance range';
  end if;

  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  v_days := p_to - p_from + 1;
  select count(*)::integer into v_rooms
  from public.rooms r
  where r.property_id = p_property_id and coalesce(r.is_active, false);

  with dates as (
    select d::date as day
    from generate_series(p_from, p_to, interval '1 day') d
  ),
  daily as (
    select
      d.day,
      coalesce((
        select sum(p.amount)
        from public.payments p
        join public.bookings b on b.id = p.booking_id
        where b.property_id = p_property_id
          and coalesce(p.entry_type, 'payment') = 'payment'
          and coalesce(p.payment_status, p.status) = 'completed'
          and (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date
            = d.day
      ), 0)::numeric as collected,
      (select count(*) from public.bookings b
        where b.property_id = p_property_id and b.check_in = d.day
          and b.status not in ('cancelled', 'no_show'))::integer as bookings,
      (select count(*) from public.bookings b
        where b.property_id = p_property_id
          and b.status not in ('cancelled', 'no_show')
          and b.check_in <= d.day and b.check_out > d.day)::integer
        as occupied_rooms
    from dates d
  ),
  booking_totals as (
    select
      coalesce(sum(greatest(
        least(b.check_out, p_to + 1) - greatest(b.check_in, p_from), 0
      )) filter (
        where b.status not in ('cancelled', 'no_show')
          and b.check_in <= p_to and b.check_out > p_from
      ), 0)::numeric as room_nights,
      coalesce(sum(
        (b.total_price / greatest(b.check_out - b.check_in, 1))
        * greatest(
          least(b.check_out, p_to + 1) - greatest(b.check_in, p_from), 0
        )
      ) filter (
        where b.status not in ('cancelled', 'no_show')
          and b.check_in <= p_to and b.check_out > p_from
      ), 0)::numeric as room_revenue,
      coalesce(sum(greatest(b.total_price - coalesce(pr.amount_paid, 0), 0))
        filter (where b.status not in ('cancelled', 'no_show')), 0)::numeric
        as outstanding
    from public.bookings b
    left join lateral (
      select sum(p.amount) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
      ) as amount_paid
      from public.payments p where p.booking_id = b.id
    ) pr on true
    where b.property_id = p_property_id
  ),
  payment_totals as (
    select
      coalesce(sum(p.amount) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
      ), 0)::numeric as collected,
      coalesce(sum(p.amount) filter (
        where coalesce(p.entry_type, 'payment') = 'payment'
          and coalesce(p.payment_status, p.status) = 'completed'
      ), 0)::numeric as gross_collected,
      coalesce(abs(sum(p.amount) filter (
        where p.entry_type = 'refund'
          and coalesce(p.payment_status, p.status) = 'completed'
      )), 0)::numeric as refunds,
      coalesce(abs(sum(p.amount) filter (
        where p.entry_type = 'void'
          and coalesce(p.payment_status, p.status) = 'completed'
      )), 0)::numeric as voids,
      count(*) filter (
        where coalesce(p.entry_type, 'payment') = 'payment'
          and coalesce(p.payment_status, p.status) = 'completed'
      )::integer as transactions
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    where b.property_id = p_property_id
      and (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date
        between p_from and p_to
  )
  select jsonb_build_object(
    'property', jsonb_build_object(
      'business_date', v_business_date,
      'timezone', v_timezone
    ),
    'summary', jsonb_build_object(
      'collected', pt.collected,
      'gross_collected', pt.gross_collected,
      'outstanding', bt.outstanding,
      'refunds', pt.refunds,
      'voids', pt.voids,
      'transactions', pt.transactions,
      'occupancy_rate', case when v_rooms * v_days > 0
        then round(bt.room_nights * 100.0 / (v_rooms * v_days), 2) else 0 end,
      'average_daily_rate', case when bt.room_nights > 0
        then round(bt.room_revenue / bt.room_nights, 2) else 0 end
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', d.day,
        'collected', d.collected,
        'bookings', d.bookings,
        'occupancy_rate', case when v_rooms > 0
          then round(d.occupied_rooms * 100.0 / v_rooms, 2) else 0 end
      ) order by d.day)
      from daily d
    ), '[]'::jsonb),
    'methods', coalesce((
      select jsonb_agg(jsonb_build_object(
        'method', m.method,
        'amount', m.amount,
        'count', m.count
      ) order by m.amount desc, m.method)
      from (
        select
          coalesce(
            p.payment_method,
            initcap(replace(p.method, '_', ' ')),
            'Other'
          ) as method,
          sum(p.amount)::numeric as amount,
          count(*)::integer as count
        from public.payments p
        join public.bookings b on b.id = p.booking_id
        where b.property_id = p_property_id
          and coalesce(p.entry_type, 'payment') = 'payment'
          and coalesce(p.payment_status, p.status) = 'completed'
          and (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date
            between p_from and p_to
        group by 1
      ) m
    ), '[]'::jsonb)
  ) into v_result
  from booking_totals bt cross join payment_totals pt;

  return v_result;
end;
$fn$;

-- Backward-compatible name retained while callers migrate to the role-neutral
-- finance RPC.
create or replace function public.get_owner_finance_dashboard(
  p_property_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.get_property_finance_dashboard(
    p_property_id, p_from, p_to
  );
$fn$;

create or replace function public.list_property_finance_entries(
  p_property_id uuid,
  p_from date default null,
  p_to date default null,
  p_status text default null,
  p_search text default null,
  p_method text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_role text;
  v_timezone text;
  v_business_date date;
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_method text := nullif(
    lower(replace(btrim(coalesce(p_method, '')), ' ', '_')), ''
  );
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_can_refund boolean;
  v_can_void boolean;
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(
    p_property_id, 'payments', 'view'
  );
  if v_role not in ('owner', 'manager') then
    raise exception using errcode = '42501', message = 'Finance access denied';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception using errcode = '22023', message = 'Invalid payment range';
  end if;

  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  v_can_refund := app_private.has_property_permission(
    p_property_id, 'payments', 'refund'
  );
  v_can_void := app_private.has_property_permission(
    p_property_id, 'payments', 'void'
  );

  with entries as (
    select
      p.*,
      b.booking_number,
      concat_ws(' ', g.first_name, g.last_name) as guest_name,
      coalesce(receiver.display_name, 'System') as receiver_name,
      approver.display_name as approver_name,
      reversal.id as reversal_id,
      reversal.entry_type as reversal_type,
      case
        when coalesce(p.entry_type, 'payment') = 'payment'
          and reversal.entry_type = 'refund' then 'refunded'
        when coalesce(p.entry_type, 'payment') = 'payment'
          and reversal.entry_type = 'void' then 'voided'
        when p.entry_type = 'refund' then 'refund'
        when p.entry_type = 'void' then 'void'
        else lower(coalesce(p.payment_status, p.status))
      end as effective_status
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    left join public.guests g on g.id = b.guest_id
    left join public.user_profiles receiver on receiver.user_id = p.received_by
    left join public.user_profiles approver on approver.user_id = p.approved_by
    left join public.payments reversal
      on reversal.reverses_payment_id = p.id
     and coalesce(reversal.payment_status, reversal.status) = 'completed'
    where b.property_id = p_property_id
      and (p_from is null or
        (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date
          >= p_from)
      and (p_to is null or
        (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date
          <= p_to)
  ),
  filtered as (
    select *
    from entries p
    where (v_status is null or p.effective_status = v_status)
      and (
        v_method is null
        or lower(replace(btrim(coalesce(
          p.method, p.payment_method, ''
        )), ' ', '_')) = v_method
      )
      and (
        v_search is null
        or p.booking_number ilike '%' || v_search || '%'
        or p.guest_name ilike '%' || v_search || '%'
        or coalesce(p.transaction_reference, p.transaction_ref, '')
          ilike '%' || v_search || '%'
      )
  ),
  page_rows as (
    select * from filtered
    order by coalesce(paid_at, created_at) desc, id desc
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'booking_id', p.booking_id,
        'booking_number', p.booking_number,
        'guest_name', nullif(btrim(p.guest_name), ''),
        'amount', p.amount,
        'currency', p.currency,
        'method', coalesce(p.payment_method, p.method),
        'status', p.effective_status,
        'entry_type', coalesce(p.entry_type, 'payment'),
        'paid_at', coalesce(p.paid_at, p.created_at),
        'receiver_name', p.receiver_name,
        'reference', coalesce(p.transaction_reference, p.transaction_ref),
        'reverses_payment_id', p.reverses_payment_id,
        'reversal_id', p.reversal_id,
        'reversal_reason', p.reversal_reason,
        'approved_by', p.approved_by,
        'approver_name', p.approver_name,
        'can_refund', v_can_refund
          and coalesce(p.entry_type, 'payment') = 'payment'
          and coalesce(p.payment_status, p.status) = 'completed'
          and p.reversal_id is null,
        'can_void', v_can_void
          and coalesce(p.entry_type, 'payment') = 'payment'
          and coalesce(p.payment_status, p.status) = 'completed'
          and p.reversal_id is null
          and (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date
            = v_business_date
      ) order by coalesce(p.paid_at, p.created_at) desc, p.id desc)
      from page_rows p
    ), '[]'::jsonb),
    'total', (select count(*)::integer from filtered)
  ) into v_result;

  return v_result;
end;
$fn$;

create or replace function public.list_property_payments(
  p_property_id uuid,
  p_from date default null,
  p_to date default null,
  p_status text default null,
  p_search text default null,
  p_method text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.list_property_finance_entries(
    p_property_id, p_from, p_to, p_status, p_search, p_method,
    p_limit, p_offset
  );
$fn$;

create or replace function public.reverse_booking_payment(
  p_property_id uuid,
  p_payment_id uuid,
  p_action text,
  p_reason text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_original public.payments%rowtype;
  v_existing public.payments%rowtype;
  v_reversal public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_fingerprint text;
  v_reference text;
  v_timezone text;
  v_business_date date;
  v_paid numeric;
  v_status text;
begin
  if v_action not in ('refund', 'void') then
    raise exception using errcode = '22023', message = 'Unsupported reversal action';
  end if;
  perform app_private.require_property_permission(
    p_property_id, 'payments', v_action
  );
  if p_payment_id is null or p_idempotency_key is null then
    raise exception using
      errcode = '22023',
      message = 'Payment and idempotency keys are required';
  end if;
  if v_reason is null or char_length(v_reason) < 3 then
    raise exception using errcode = '22023', message = 'A reversal reason is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_property_id::text || ':payment-reversal:' || p_idempotency_key::text,
      0
    )
  );

  select p.* into v_original
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  where p.id = p_payment_id and b.property_id = p_property_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Payment not found';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = v_original.booking_id and b.property_id = p_property_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;

  select p.* into v_original
  from public.payments p
  where p.id = p_payment_id and p.booking_id = v_booking.id
  for update;

  v_fingerprint := md5(jsonb_build_object(
    'payment_id', p_payment_id,
    'action', v_action,
    'reason', v_reason
  )::text);

  select p.* into v_existing
  from public.payments p
  where p.booking_id = v_booking.id
    and p.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.idempotency_fingerprint is distinct from v_fingerprint
       or v_existing.entry_type is distinct from v_action
       or v_existing.reverses_payment_id is distinct from p_payment_id then
      raise exception using
        errcode = '22023',
        message = 'Idempotency key was reused with different reversal details';
    end if;
    select coalesce(sum(p.amount) filter (
      where coalesce(p.payment_status, p.status) = 'completed'
    ), 0)
    into v_paid
    from public.payments p
    where p.booking_id = v_booking.id;
    return jsonb_build_object(
      'success', true,
      'replayed', true,
      'payment_id', v_existing.id,
      'reverses_payment_id', p_payment_id,
      'action', v_action,
      'amount_paid', v_paid,
      'balance_due', greatest(v_booking.total_price - v_paid, 0),
      'payment_status', v_booking.payment_status
    );
  end if;

  if coalesce(v_original.entry_type, 'payment') <> 'payment'
     or v_original.amount <= 0
     or coalesce(v_original.payment_status, v_original.status) <> 'completed' then
    raise exception using
      errcode = '22023',
      message = 'Only a completed original payment can be reversed';
  end if;
  if exists (
    select 1
    from public.payments p
    where p.reverses_payment_id = p_payment_id
      and coalesce(p.payment_status, p.status) = 'completed'
  ) then
    raise exception using errcode = '22023', message = 'Payment is already reversed';
  end if;

  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  if v_action = 'void'
     and (coalesce(v_original.paid_at, v_original.created_at)
       at time zone v_timezone)::date <> v_business_date then
    raise exception using
      errcode = '22023',
      message = 'Only a same-business-day payment can be voided; use refund instead';
  end if;

  v_reference := upper(v_action) || '-'
    || substr(replace(p_payment_id::text, '-', ''), 1, 8) || '-'
    || substr(replace(p_idempotency_key::text, '-', ''), 1, 8);

  insert into public.payments(
    booking_id,
    amount,
    currency,
    payment_method,
    payment_status,
    transaction_reference,
    received_by,
    paid_at,
    notes,
    method,
    status,
    transaction_ref,
    idempotency_key,
    idempotency_fingerprint,
    entry_type,
    reverses_payment_id,
    approved_by,
    reversal_reason
  ) values (
    v_booking.id,
    -round(v_original.amount, 2),
    coalesce(v_original.currency, 'TZS'),
    v_original.payment_method,
    'completed',
    v_reference,
    v_user_id,
    clock_timestamp(),
    v_reason,
    v_original.method,
    'completed',
    v_reference,
    p_idempotency_key,
    v_fingerprint,
    v_action,
    p_payment_id,
    v_user_id,
    v_reason
  ) returning * into v_reversal;

  select coalesce(sum(p.amount) filter (
    where coalesce(p.payment_status, p.status) = 'completed'
  ), 0)
  into v_paid
  from public.payments p
  where p.booking_id = v_booking.id;
  v_status := case
    when v_paid >= v_booking.total_price then 'paid'
    when v_paid > 0 then 'partial'
    else 'unpaid'
  end;

  update public.bookings
  set payment_status = v_status, updated_at = clock_timestamp()
  where id = v_booking.id;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id,
    v_user_id,
    'booking',
    v_booking.id::text,
    case when v_action = 'refund' then 'payment_refunded'
      else 'payment_voided' end,
    jsonb_build_object(
      'payment_id', v_reversal.id,
      'reverses_payment_id', p_payment_id,
      'amount', abs(v_reversal.amount),
      'reason', v_reason,
      'approved_by', v_user_id,
      'total_paid', v_paid,
      'balance_due', greatest(v_booking.total_price - v_paid, 0),
      'payment_status', v_status
    )
  );

  return jsonb_build_object(
    'success', true,
    'replayed', false,
    'payment_id', v_reversal.id,
    'reverses_payment_id', p_payment_id,
    'action', v_action,
    'amount', abs(v_reversal.amount),
    'amount_paid', v_paid,
    'balance_due', greatest(v_booking.total_price - v_paid, 0),
    'payment_status', v_status
  );
end;
$fn$;

revoke all on function public.get_booking_settlement(uuid,uuid)
  from public, anon;
revoke all on function public.get_property_finance_dashboard(uuid,date,date)
  from public, anon;
revoke all on function public.list_property_finance_entries(
  uuid,date,date,text,text,text,integer,integer
) from public, anon;
revoke all on function public.reverse_booking_payment(uuid,uuid,text,text,uuid)
  from public, anon;

grant execute on function public.get_booking_settlement(uuid,uuid)
  to authenticated;
grant execute on function public.get_property_finance_dashboard(uuid,date,date)
  to authenticated;
grant execute on function public.list_property_finance_entries(
  uuid,date,date,text,text,text,integer,integer
) to authenticated;
grant execute on function public.reverse_booking_payment(uuid,uuid,text,text,uuid)
  to authenticated;
