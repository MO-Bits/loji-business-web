-- Role-aware operational dashboard and timezone-correct property reporting.
--
-- `public.payments` is the canonical payment ledger. `booking_payments` was
-- introduced by an early operations migration but is not written by the live
-- booking and payment RPCs, so it must not be used for dashboard or report
-- totals.

begin;

-- ---------------------------------------------------------------------------
-- 1. Role-aware property dashboard
-- ---------------------------------------------------------------------------

create or replace function public.get_property_dashboard(p_property_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_timezone text;
  v_business_date date;
  v_can_view_finance boolean := false;
  v_can_create_booking boolean := false;
  v_can_update_booking boolean := false;
  v_can_checkout boolean := false;
  v_can_manage_rooms boolean := false;
  v_can_record_payment boolean := false;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  -- Read the caller's membership and property context together. This is the
  -- authorization boundary for this SECURITY DEFINER function: callers never
  -- choose a role or a timezone in the RPC payload.
  select
    lower(btrim(pu.role)),
    coalesce(nullif(btrim(p.timezone), ''), 'UTC')
  into v_role, v_timezone
  from public.property_users pu
  join public.properties p on p.id = pu.property_id
  where pu.property_id = p_property_id
    and pu.user_id = v_user_id
    and lower(coalesce(pu.status, '')) = 'active';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Property access denied';
  end if;

  -- A malformed legacy timezone must not break the home screen. Property
  -- setup stores IANA names; UTC is the conservative fallback for old rows.
  if not exists (
    select 1
    from pg_catalog.pg_timezone_names tz
    where tz.name = v_timezone
  ) then
    v_timezone := 'UTC';
  end if;

  v_business_date := (clock_timestamp() at time zone v_timezone)::date;

  -- Capabilities are derived from the membership role and the authoritative
  -- permission table, not from client-provided role claims. Finance remains a
  -- deliberate owner-only capability even if a future permission row changes.
  select
    coalesce(bool_or(
      lower(rp.resource) = 'bookings' and lower(rp.action) = 'create'
    ), false),
    coalesce(bool_or(
      lower(rp.resource) = 'bookings' and lower(rp.action) = 'update'
    ), false),
    coalesce(bool_or(
      lower(rp.resource) = 'bookings' and lower(rp.action) = 'checkout'
    ), false),
    coalesce(bool_or(
      lower(rp.resource) = 'rooms' and lower(rp.action) in ('create', 'update')
    ), false),
    coalesce(bool_or(
      lower(rp.resource) = 'payments' and lower(rp.action) = 'create'
    ), false)
  into
    v_can_create_booking,
    v_can_update_booking,
    v_can_checkout,
    v_can_manage_rooms,
    v_can_record_payment
  from public.role_permissions rp
  where lower(btrim(rp.role)) = v_role;

  v_can_view_finance := v_role = 'owner';
  v_can_record_payment := v_can_view_finance and v_can_record_payment;

  with payment_rollup as (
    select
      b.id as booking_id,
      coalesce(sum(p.amount) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
      ), 0)::numeric as amount_paid
    from public.bookings b
    left join public.payments p on p.booking_id = b.id
    where b.property_id = p_property_id
    group by b.id
  ),
  booking_context as (
    select
      b.id,
      b.booking_number,
      b.room_id,
      b.check_in,
      b.check_out,
      b.adults,
      b.children,
      lower(b.status) as status,
      lower(b.payment_status) as payment_status,
      b.created_at,
      b.total_price,
      r.name as room_name,
      r.room_type,
      coalesce(
        nullif(btrim(concat_ws(' ', g.first_name, g.last_name)), ''),
        'Guest'
      ) as guest_name,
      coalesce(pr.amount_paid, 0)::numeric as amount_paid,
      greatest(b.total_price - coalesce(pr.amount_paid, 0), 0)::numeric as balance_due
    from public.bookings b
    join public.rooms r on r.id = b.room_id
    left join public.guests g on g.id = b.guest_id
    left join payment_rollup pr on pr.booking_id = b.id
    where b.property_id = p_property_id
  ),
  room_context as (
    select
      r.id,
      r.name,
      r.room_type,
      lower(coalesce(r.operational_status, 'available')) as operational_status,
      lower(coalesce(r.housekeeping_status, 'ready')) as housekeeping_status,
      nullif(btrim(coalesce(r.housekeeping_notes, '')), '') as housekeeping_notes,
      r.housekeeping_updated_at,
      r.updated_at,
      exists (
        select 1
        from booking_context b
        where b.room_id = r.id
          and b.status = 'checked_in'
      ) as is_occupied
    from public.rooms r
    where r.property_id = p_property_id
      and coalesce(r.is_active, false)
  ),
  room_summary as (
    select
      count(*)::integer as total_active_rooms,
      count(*) filter (where r.is_occupied)::integer as occupied_rooms,
      count(*) filter (
        where not r.is_occupied
          and r.operational_status = 'available'
          and r.housekeeping_status = 'ready'
      )::integer as ready_rooms,
      count(*) filter (
        where not r.is_occupied
          and (
            r.operational_status <> 'available'
            or r.housekeeping_status <> 'ready'
          )
      )::integer as attention_rooms
    from room_context r
  ),
  task_summary as (
    select
      count(*) filter (
        where b.status in ('pending', 'confirmed', 'reserved')
          and b.check_in <= v_business_date
      )::integer as arrivals_due,
      count(*) filter (
        where b.status = 'checked_in'
          and b.check_out <= v_business_date
      )::integer as departures_due,
      count(*) filter (
        where b.status in ('pending', 'confirmed', 'reserved')
          and b.check_in < v_business_date
      )::integer as overdue_arrivals,
      count(*) filter (
        where b.status = 'checked_in'
          and b.check_out < v_business_date
      )::integer as overdue_departures
    from booking_context b
  ),
  finance_summary as (
    select
      coalesce(sum(p.amount) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
          and coalesce(p.paid_at, p.created_at) >= (
            v_business_date::timestamp at time zone v_timezone
          )
          and coalesce(p.paid_at, p.created_at) < (
            (v_business_date + 1)::timestamp at time zone v_timezone
          )
      ), 0)::numeric as today_collected,
      count(*) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
          and coalesce(p.paid_at, p.created_at) >= (
            v_business_date::timestamp at time zone v_timezone
          )
          and coalesce(p.paid_at, p.created_at) < (
            (v_business_date + 1)::timestamp at time zone v_timezone
          )
      )::integer as today_payment_count
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    where b.property_id = p_property_id
  ),
  outstanding_summary as (
    select
      coalesce(sum(b.balance_due) filter (
        where b.status not in ('cancelled', 'no_show')
          and b.balance_due > 0
      ), 0)::numeric as outstanding_balance,
      count(*) filter (
        where b.status not in ('cancelled', 'no_show')
          and b.balance_due > 0
      )::integer as open_balance_count
    from booking_context b
  )
  select jsonb_strip_nulls(
    jsonb_build_object(
      'property', jsonb_build_object(
        'id', p_property_id,
        'timezone', v_timezone,
        'business_date', v_business_date
      ),
      'role', v_role,
      'capabilities', jsonb_build_object(
        'view_finance', v_can_view_finance,
        'create_booking', v_can_create_booking,
        'update_booking', v_can_update_booking,
        'check_out', v_can_checkout,
        'manage_rooms', v_can_manage_rooms,
        'record_payment', v_can_record_payment
      ),
      'summary', jsonb_build_object(
        'total_active_rooms', rs.total_active_rooms,
        'occupied_rooms', rs.occupied_rooms,
        'ready_rooms', rs.ready_rooms,
        'attention_rooms', rs.attention_rooms,
        'arrivals_due', ts.arrivals_due,
        'departures_due', ts.departures_due,
        'overdue_arrivals', ts.overdue_arrivals,
        'overdue_departures', ts.overdue_departures
      ),
      'queues', jsonb_build_object(
        'limit', 20,
        'arrivals', coalesce((
          select jsonb_agg(q.item order by q.check_in, q.created_at)
          from (
            select
              b.check_in,
              b.created_at,
              jsonb_strip_nulls(jsonb_build_object(
                'booking_id', b.id,
                'booking_number', b.booking_number,
                'room_id', b.room_id,
                'room_name', b.room_name,
                'room_type', b.room_type,
                'guest_name', b.guest_name,
                'guests', b.adults + b.children,
                'check_in', b.check_in,
                'check_out', b.check_out,
                'status', b.status,
                'is_overdue', b.check_in < v_business_date,
                'amount_paid', case when v_can_view_finance then b.amount_paid end,
                'balance_due', case when v_can_view_finance then b.balance_due end,
                'payment_status', case when v_can_view_finance then b.payment_status end
              )) as item
            from booking_context b
            where b.status in ('pending', 'confirmed', 'reserved')
              and b.check_in <= v_business_date
            order by b.check_in, b.created_at
            limit 20
          ) q
        ), '[]'::jsonb),
        'departures', coalesce((
          select jsonb_agg(q.item order by q.check_out, q.created_at)
          from (
            select
              b.check_out,
              b.created_at,
              jsonb_strip_nulls(jsonb_build_object(
                'booking_id', b.id,
                'booking_number', b.booking_number,
                'room_id', b.room_id,
                'room_name', b.room_name,
                'room_type', b.room_type,
                'guest_name', b.guest_name,
                'guests', b.adults + b.children,
                'check_in', b.check_in,
                'check_out', b.check_out,
                'status', b.status,
                'is_overdue', b.check_out < v_business_date,
                'amount_paid', case when v_can_view_finance then b.amount_paid end,
                'balance_due', case when v_can_view_finance then b.balance_due end,
                'payment_status', case when v_can_view_finance then b.payment_status end
              )) as item
            from booking_context b
            where b.status = 'checked_in'
              and b.check_out <= v_business_date
            order by b.check_out, b.created_at
            limit 20
          ) q
        ), '[]'::jsonb),
        'housekeeping', coalesce((
          select jsonb_agg(q.item order by q.attention_since nulls last, q.room_name)
          from (
            select
              coalesce(r.housekeeping_updated_at, r.updated_at) as attention_since,
              r.name as room_name,
              jsonb_strip_nulls(jsonb_build_object(
                'room_id', r.id,
                'room_name', r.name,
                'room_type', r.room_type,
                'operational_status', r.operational_status,
                'housekeeping_status', r.housekeeping_status,
                'notes', r.housekeeping_notes,
                'updated_at', r.housekeeping_updated_at
              )) as item
            from room_context r
            where not r.is_occupied
              and (
                r.operational_status <> 'available'
                or r.housekeeping_status <> 'ready'
              )
            order by coalesce(r.housekeeping_updated_at, r.updated_at) nulls last, r.name
            limit 20
          ) q
        ), '[]'::jsonb)
      ),
      -- This object, and per-booking monetary fields above, are deliberately
      -- omitted for every non-owner role.
      'finance', case when v_can_view_finance then jsonb_build_object(
        'today_collected', fs.today_collected,
        'today_payment_count', fs.today_payment_count,
        'outstanding_balance', os.outstanding_balance,
        'open_balance_count', os.open_balance_count
      ) end
    )
  )
  into v_result
  from room_summary rs
  cross join task_summary ts
  cross join finance_summary fs
  cross join outstanding_summary os;

  return v_result;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 2. Atomic, timezone-correct check-in
-- ---------------------------------------------------------------------------

create or replace function public.check_in_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings%rowtype;
  v_room public.rooms%rowtype;
  v_updated_booking public.bookings%rowtype;
  v_updated_room public.rooms%rowtype;
  v_timezone text;
  v_business_date date;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  -- Keep the same lock order as checkout: booking first, then room. This
  -- prevents two concurrent front-desk actions from interleaving state.
  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Booking not found';
  end if;
  if not public.has_permission(v_booking.property_id, 'bookings', 'update') then
    raise exception using
      errcode = '42501',
      message = 'Check-in permission denied';
  end if;

  select coalesce(nullif(btrim(p.timezone), ''), 'UTC')
  into v_timezone
  from public.properties p
  where p.id = v_booking.property_id;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names tz
    where tz.name = v_timezone
  ) then
    v_timezone := 'UTC';
  end if;
  v_business_date := (v_now at time zone v_timezone)::date;

  if lower(v_booking.status) not in ('confirmed', 'reserved') then
    raise exception using
      errcode = '22023',
      message = 'Only confirmed or reserved bookings can be checked in';
  end if;
  if v_business_date < v_booking.check_in then
    raise exception using
      errcode = '22023',
      message = 'Cannot check in before the property check-in date';
  end if;
  if v_business_date >= v_booking.check_out then
    raise exception using
      errcode = '22023',
      message = 'Cannot check in on or after the property check-out date';
  end if;

  select r.*
  into v_room
  from public.rooms r
  where r.id = v_booking.room_id
    and r.property_id = v_booking.property_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Room not found for this booking';
  end if;
  if not coalesce(v_room.is_active, false)
     or lower(coalesce(v_room.operational_status, '')) <> 'available'
     or lower(coalesce(v_room.housekeeping_status, '')) <> 'ready' then
    raise exception using
      errcode = '22023',
      message = 'Room is not ready for check-in';
  end if;

  update public.bookings
  set status = 'checked_in',
      checked_in_at = v_now,
      checked_in_by = v_user_id,
      updated_at = v_now
  where id = v_booking.id
  returning * into v_updated_booking;

  update public.rooms
  set operational_status = 'occupied',
      updated_at = v_now
  where id = v_room.id
    and property_id = v_booking.property_id
  returning * into v_updated_room;

  insert into public.audit_log(
    property_id,
    actor_id,
    entity_type,
    entity_id,
    event_type,
    old_data,
    new_data
  ) values (
    v_booking.property_id,
    v_user_id,
    'booking',
    v_booking.id::text,
    'booking_checked_in',
    jsonb_build_object(
      'booking', to_jsonb(v_booking),
      'room', to_jsonb(v_room)
    ),
    jsonb_build_object(
      'booking', to_jsonb(v_updated_booking),
      'room', to_jsonb(v_updated_room),
      'business_date', v_business_date
    )
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', v_updated_booking.id,
    'status', v_updated_booking.status,
    'checked_in_at', v_updated_booking.checked_in_at,
    'room_id', v_updated_room.id,
    'room_status', v_updated_room.operational_status,
    'business_date', v_business_date
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 3. Timezone-correct report using the canonical payment ledger
-- ---------------------------------------------------------------------------

create or replace function public.get_property_operations_report(
  p_property_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_timezone text;
  v_from_at timestamptz;
  v_to_at timestamptz;
  v_can_view_finance boolean := false;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception using
      errcode = '22023',
      message = 'Invalid report date range';
  end if;

  select
    lower(btrim(pu.role)),
    coalesce(nullif(btrim(p.timezone), ''), 'UTC')
  into v_role, v_timezone
  from public.property_users pu
  join public.properties p on p.id = pu.property_id
  where pu.property_id = p_property_id
    and pu.user_id = v_user_id
    and lower(coalesce(pu.status, '')) = 'active';

  if not found or v_role not in ('owner', 'manager') then
    raise exception using
      errcode = '42501',
      message = 'Property reporting access denied';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names tz
    where tz.name = v_timezone
  ) then
    v_timezone := 'UTC';
  end if;

  v_from_at := p_from::timestamp at time zone v_timezone;
  v_to_at := (p_to + 1)::timestamp at time zone v_timezone;
  v_can_view_finance := v_role = 'owner';

  with booking_report as (
    select
      count(*)::integer as bookings,
      coalesce(sum(
        greatest(
          0,
          least(b.check_out, p_to + 1) - greatest(b.check_in, p_from)
        )
      ), 0)::bigint as room_nights
    from public.bookings b
    where b.property_id = p_property_id
      and b.check_in <= p_to
      and b.check_out > p_from
      and lower(coalesce(b.status, '')) not in ('cancelled', 'no_show')
  ),
  payment_report as (
    select
      coalesce(sum(p.amount), 0)::numeric as payments,
      count(*)::integer as payment_count
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    where b.property_id = p_property_id
      and coalesce(p.payment_status, p.status) = 'completed'
      and coalesce(p.paid_at, p.created_at) >= v_from_at
      and coalesce(p.paid_at, p.created_at) < v_to_at
  )
  select jsonb_strip_nulls(
    jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'timezone', v_timezone,
      'role', v_role,
      'finance_available', v_can_view_finance,
      'bookings', br.bookings,
      'room_nights', br.room_nights,
      -- Manager reports retain operational counts but intentionally omit
      -- financial figures. Owners receive canonical `public.payments` totals.
      'payments', case when v_can_view_finance then pr.payments end,
      'payment_count', case when v_can_view_finance then pr.payment_count end
    )
  )
  into v_result
  from booking_report br
  cross join payment_report pr;

  return v_result;
end;
$fn$;

-- Function execution is explicit. New functions otherwise inherit PUBLIC
-- execute in Postgres, which would expose this SECURITY DEFINER endpoint.
revoke all on function public.get_property_dashboard(uuid) from public, anon;
grant execute on function public.get_property_dashboard(uuid) to authenticated;

revoke all on function public.check_in_booking(uuid) from public, anon;
grant execute on function public.check_in_booking(uuid) to authenticated;

revoke all on function public.get_property_operations_report(uuid,date,date)
from public, anon;
grant execute on function public.get_property_operations_report(uuid,date,date)
to authenticated;

commit;
