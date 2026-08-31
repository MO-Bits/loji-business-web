-- Canonical Loji Business workspace backend.
--
-- This migration is intentionally additive and compatibility-conscious. It
-- leaves legacy tables/functions in place, but makes the new workspace RPCs
-- the authoritative, permission-checked surface for business.loji.co.tz.

begin;

-- ---------------------------------------------------------------------------
-- 1. Stop automatic departures. Overdue stays are surfaced as tasks instead.
-- ---------------------------------------------------------------------------

do $block$
declare
  v_job record;
begin
  if to_regclass('cron.job') is not null then
    for v_job in execute
      'select jobid from cron.job where command ilike ''%auto_checkout_bookings%'''
    loop
      execute 'select cron.unschedule($1)' using v_job.jobid;
    end loop;
  end if;
exception
  when invalid_schema_name or undefined_table or undefined_function then
    null;
end;
$block$;

-- ---------------------------------------------------------------------------
-- 2. Canonical authorization and context helpers.
-- ---------------------------------------------------------------------------

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create or replace function app_private.current_property_role(p_property_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select case
    when lower(btrim(pu.role)) in ('owner', 'manager', 'receptionist')
      then lower(btrim(pu.role))
    else null
  end
  from public.property_users pu
  where pu.property_id = p_property_id
    and pu.user_id = (select auth.uid())
    and lower(coalesce(pu.status, '')) = 'active'
  limit 1;
$fn$;

create or replace function app_private.has_property_permission(
  p_property_id uuid,
  p_resource text,
  p_action text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  with caller as (
    select app_private.current_property_role(p_property_id) as role
  )
  select caller.role is not null
    and exists (
      select 1
      from public.role_permissions rp
      where lower(btrim(rp.role)) = caller.role
        and lower(btrim(rp.resource)) = lower(btrim(p_resource))
        and lower(btrim(rp.action)) = lower(btrim(p_action))
    )
  from caller;
$fn$;

create or replace function app_private.can_view_property_finance(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select app_private.current_property_role(p_property_id) = 'owner'
    and app_private.has_property_permission(p_property_id, 'payments', 'view');
$fn$;

create or replace function app_private.property_timezone(p_property_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_timezone text;
begin
  select coalesce(nullif(btrim(p.timezone), ''), 'UTC')
  into v_timezone
  from public.properties p
  where p.id = p_property_id;

  if v_timezone is null or not exists (
    select 1
    from pg_catalog.pg_timezone_names tz
    where tz.name = v_timezone
  ) then
    return 'UTC';
  end if;

  return v_timezone;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 6. Room board, room workspace and operations board.
-- ---------------------------------------------------------------------------

create or replace function app_private.property_business_date(p_property_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $fn$
  select (clock_timestamp() at time zone
    app_private.property_timezone(p_property_id))::date;
$fn$;

create or replace function app_private.require_property_permission(
  p_property_id uuid,
  p_resource text,
  p_action text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_role text;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  v_role := app_private.current_property_role(p_property_id);
  if v_role is null then
    raise exception using errcode = '42501', message = 'Property access denied';
  end if;
  if not app_private.has_property_permission(p_property_id, p_resource, p_action) then
    raise exception using errcode = '42501', message = 'Permission denied';
  end if;
  return v_role;
end;
$fn$;

create or replace function app_private.room_workspace_item(
  p_property_id uuid,
  p_room_id uuid,
  p_business_date date
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  with room_row as (
    select r.*
    from public.rooms r
    where r.id = p_room_id and r.property_id = p_property_id
  ),
  current_stay as (
    select jsonb_build_object(
      'id', b.id,
      'booking_number', b.booking_number,
      'guest_name', coalesce(
        nullif(btrim(concat_ws(' ', g.first_name, g.last_name)), ''),
        'Guest'
      ),
      'guest_phone', g.phone,
      'status', b.status,
      'check_in', b.check_in,
      'check_out', b.check_out,
      'adults', b.adults,
      'children', b.children,
      'total_guests', coalesce(b.total_guests, b.adults + b.children)
    ) as item,
    b.check_out
    from public.bookings b
    left join public.guests g on g.id = b.guest_id
    where b.property_id = p_property_id
      and b.room_id = p_room_id
      and b.status = 'checked_in'
    order by b.checked_in_at desc nulls last, b.created_at desc, b.id desc
    limit 1
  ),
  next_stay as (
    select jsonb_build_object(
      'id', b.id,
      'booking_number', b.booking_number,
      'guest_name', coalesce(
        nullif(btrim(concat_ws(' ', g.first_name, g.last_name)), ''),
        'Guest'
      ),
      'guest_phone', g.phone,
      'status', b.status,
      'check_in', b.check_in,
      'check_out', b.check_out,
      'adults', b.adults,
      'children', b.children,
      'total_guests', coalesce(b.total_guests, b.adults + b.children)
    ) as item
    from public.bookings b
    left join public.guests g on g.id = b.guest_id
    where b.property_id = p_property_id
      and b.room_id = p_room_id
      and b.status in ('confirmed', 'reserved')
      and b.check_in >= p_business_date
    order by b.check_in, b.created_at, b.id
    limit 1
  )
  select jsonb_build_object(
    'id', r.id,
    'property_id', r.property_id,
    'name', r.name,
    'room_type', r.room_type,
    'capacity', r.capacity,
    'bed_count', r.bed_count,
    'price_per_night', r.price_per_night,
    'description', r.description,
    'amenities', coalesce(r.amenities, '[]'::jsonb),
    'images', coalesce(r.images, '[]'::jsonb),
    'is_active', coalesce(r.is_active, false),
    'housekeeping_status', r.housekeeping_status,
    'housekeeping_notes', r.housekeeping_notes,
    'housekeeping_updated_at', r.housekeeping_updated_at,
    'notes', r.housekeeping_notes,
    'updated_at', r.housekeeping_updated_at,
    'operational_status', case
      when not coalesce(r.is_active, false) then 'inactive'
      when cs.item is not null and cs.check_out = p_business_date
        then 'checking_out_today'
      when cs.item is not null then 'occupied'
      when lower(coalesce(r.operational_status, '')) in (
        'maintenance', 'out_of_order', 'out_of_service'
      ) then 'out_of_service'
      else coalesce(r.housekeeping_status, 'ready')
    end,
    'current_stay', cs.item,
    'next_stay', ns.item
  )
  from room_row r
  left join current_stay cs on true
  left join next_stay ns on true;
$fn$;

revoke all on function app_private.room_workspace_item(uuid,uuid,date)
  from public, anon, authenticated;

create or replace function public.get_room_board(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_timezone text;
  v_business_date date;
  v_result jsonb;
begin
  perform app_private.require_property_permission(p_property_id, 'rooms', 'view');
  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);

  with room_items as (
    select
      r.id,
      r.name,
      app_private.room_workspace_item(
        p_property_id, r.id, v_business_date
      ) as item
    from public.rooms r
    where r.property_id = p_property_id
  ),
  summary as (
    select
      count(*)::integer as total_rooms,
      count(*) filter (where (item->>'is_active')::boolean)::integer as active_rooms,
      count(*) filter (where item->>'operational_status' = 'ready')::integer as ready_rooms,
      count(*) filter (where item->>'operational_status' = 'occupied')::integer as occupied_rooms,
      count(*) filter (where item->>'operational_status' = 'checking_out_today')::integer
        as checking_out_today_rooms,
      count(*) filter (where item->>'operational_status' = 'needs_cleaning')::integer
        as needs_cleaning_rooms,
      count(*) filter (where item->>'operational_status' = 'cleaning')::integer as cleaning_rooms,
      count(*) filter (where item->>'operational_status' = 'out_of_service')::integer
        as out_of_service_rooms,
      count(*) filter (where item->>'operational_status' = 'inactive')::integer as inactive_rooms
    from room_items
  )
  select jsonb_build_object(
    'success', true,
    'property', jsonb_build_object(
      'id', p_property_id,
      'timezone', v_timezone,
      'business_date', v_business_date
    ),
    'capabilities', jsonb_build_object(
      'manage_rooms', app_private.has_property_permission(
        p_property_id, 'rooms', 'update'
      ),
      'create_booking', app_private.has_property_permission(
        p_property_id, 'bookings', 'create'
      )
    ),
    'summary', jsonb_build_object(
      'total_rooms', s.total_rooms,
      'active_rooms', s.active_rooms,
      'ready_rooms', s.ready_rooms,
      'occupied_rooms', s.occupied_rooms,
      'checking_out_today_rooms', s.checking_out_today_rooms,
      'needs_cleaning_rooms', s.needs_cleaning_rooms,
      'cleaning_rooms', s.cleaning_rooms,
      'out_of_service_rooms', s.out_of_service_rooms,
      'inactive_rooms', s.inactive_rooms
    ),
    'rooms', coalesce((
      select jsonb_agg(ri.item order by lower(ri.name), ri.id)
      from room_items ri
    ), '[]'::jsonb)
  ) into v_result
  from summary s;

  return v_result;
end;
$fn$;

create or replace function public.get_room_workspace(
  p_property_id uuid,
  p_room_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_timezone text;
  v_business_date date;
  v_room jsonb;
begin
  perform app_private.require_property_permission(p_property_id, 'rooms', 'view');
  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  v_room := app_private.room_workspace_item(
    p_property_id, p_room_id, v_business_date
  );
  if v_room is null then
    raise exception using errcode = 'P0002', message = 'Room not found';
  end if;

  return jsonb_build_object(
    'success', true,
    'property', jsonb_build_object(
      'id', p_property_id,
      'timezone', v_timezone,
      'business_date', v_business_date
    ),
    'capabilities', jsonb_build_object(
      'manage_rooms', app_private.has_property_permission(
        p_property_id, 'rooms', 'update'
      ),
      'create_booking', app_private.has_property_permission(
        p_property_id, 'bookings', 'create'
      )
    ),
    'room', v_room,
    'upcoming_stays', coalesce((
      select jsonb_agg(q.item order by q.check_in, q.created_at, q.id)
      from (
        select
          b.id,
          b.check_in,
          b.created_at,
          jsonb_build_object(
            'id', b.id,
            'booking_number', b.booking_number,
            'guest_name', coalesce(
              nullif(btrim(concat_ws(' ', g.first_name, g.last_name)), ''),
              'Guest'
            ),
            'guest_phone', g.phone,
            'status', b.status,
            'check_in', b.check_in,
            'check_out', b.check_out,
            'adults', b.adults,
            'children', b.children,
            'total_guests', coalesce(b.total_guests, b.adults + b.children)
          ) as item
        from public.bookings b
        left join public.guests g on g.id = b.guest_id
        where b.property_id = p_property_id
          and b.room_id = p_room_id
          and b.status in ('confirmed', 'reserved')
          and b.check_out >= v_business_date
        order by b.check_in, b.created_at, b.id
        limit 12
      ) q
    ), '[]'::jsonb)
  );
end;
$fn$;

create or replace function public.get_property_operations_board(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_timezone text;
  v_business_date date;
  v_finance boolean;
  v_result jsonb;
begin
  perform app_private.require_property_permission(p_property_id, 'bookings', 'view');
  perform app_private.require_property_permission(p_property_id, 'rooms', 'view');
  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  v_finance := app_private.can_view_property_finance(p_property_id);

  with arrivals as (
    select
      b.*,
      r.name as room_name,
      r.room_type,
      g.first_name,
      g.last_name,
      g.phone as guest_phone,
      coalesce((select sum(p.amount) from public.payments p
        where p.booking_id = b.id
          and coalesce(p.payment_status, p.status) = 'completed'), 0)::numeric
        as amount_paid
    from public.bookings b
    join public.rooms r on r.id = b.room_id and r.property_id = b.property_id
    left join public.guests g on g.id = b.guest_id
    where b.property_id = p_property_id
      and b.status in ('pending', 'confirmed', 'reserved')
      and b.check_in <= v_business_date
    order by (b.check_in < v_business_date) desc, b.check_in, b.created_at
    limit 50
  ),
  departures as (
    select
      b.*,
      r.name as room_name,
      r.room_type,
      g.first_name,
      g.last_name,
      g.phone as guest_phone,
      coalesce((select sum(p.amount) from public.payments p
        where p.booking_id = b.id
          and coalesce(p.payment_status, p.status) = 'completed'), 0)::numeric
        as amount_paid
    from public.bookings b
    join public.rooms r on r.id = b.room_id and r.property_id = b.property_id
    left join public.guests g on g.id = b.guest_id
    where b.property_id = p_property_id
      and b.status = 'checked_in'
      and b.check_out <= v_business_date
    order by (b.check_out < v_business_date) desc, b.check_out, b.created_at
    limit 50
  ),
  room_items as (
    select
      r.id,
      r.name,
      app_private.room_workspace_item(
        p_property_id, r.id, v_business_date
      ) as item
    from public.rooms r
    where r.property_id = p_property_id and coalesce(r.is_active, false)
  ),
  totals as (
    select
      (select count(*) from arrivals)::integer as arrivals_due,
      (select count(*) from departures)::integer as departures_due,
      (select count(*) from arrivals where check_in < v_business_date)::integer
        as overdue_arrivals,
      (select count(*) from departures where check_out < v_business_date)::integer
        as overdue_departures,
      (select count(*) from public.bookings b
        where b.property_id = p_property_id and b.status = 'checked_in')::integer
        as in_house,
      (select count(*) from room_items
        where item->>'operational_status' = 'ready')::integer as ready_rooms,
      (select count(*) from room_items
        where item->>'current_stay' is null
          and item->>'operational_status' in (
            'needs_cleaning', 'cleaning', 'out_of_service'
          ))::integer as rooms_needing_attention
  )
  select jsonb_build_object(
    'success', true,
    'property', jsonb_build_object(
      'id', p_property_id,
      'timezone', v_timezone,
      'business_date', v_business_date
    ),
    'capabilities', jsonb_build_object(
      'check_in', app_private.has_property_permission(
        p_property_id, 'bookings', 'checkin'
      ),
      'check_out', app_private.has_property_permission(
        p_property_id, 'bookings', 'checkout'
      ),
      'manage_rooms', app_private.has_property_permission(
        p_property_id, 'rooms', 'update'
      ),
      'create_booking', app_private.has_property_permission(
        p_property_id, 'bookings', 'create'
      )
    ),
    'summary', jsonb_build_object(
      'arrivals_due', t.arrivals_due,
      'departures_due', t.departures_due,
      'overdue_arrivals', t.overdue_arrivals,
      'overdue_departures', t.overdue_departures,
      'in_house', t.in_house,
      'ready_rooms', t.ready_rooms,
      'rooms_needing_attention', t.rooms_needing_attention
    ),
    'arrivals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'booking_number', a.booking_number,
        'guest_name', coalesce(
          nullif(btrim(concat_ws(' ', a.first_name, a.last_name)), ''),
          'Guest'
        ),
        'guest_phone', a.guest_phone,
        'status', a.status,
        'check_in', a.check_in,
        'check_out', a.check_out,
        'adults', a.adults,
        'children', a.children,
        'total_guests', coalesce(a.total_guests, a.adults + a.children),
        'room_id', a.room_id,
        'room_name', a.room_name,
        'room_type', a.room_type,
        'amount_paid', case when v_finance then a.amount_paid end,
        'balance_due', case when v_finance
          then greatest(a.total_price - a.amount_paid, 0) end,
        'payment_status', case when v_finance then a.payment_status end,
        'is_overdue', a.check_in < v_business_date
      ) order by (a.check_in < v_business_date) desc, a.check_in, a.created_at)
      from arrivals a
    ), '[]'::jsonb),
    'departures', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'booking_number', d.booking_number,
        'guest_name', coalesce(
          nullif(btrim(concat_ws(' ', d.first_name, d.last_name)), ''),
          'Guest'
        ),
        'guest_phone', d.guest_phone,
        'status', d.status,
        'check_in', d.check_in,
        'check_out', d.check_out,
        'adults', d.adults,
        'children', d.children,
        'total_guests', coalesce(d.total_guests, d.adults + d.children),
        'room_id', d.room_id,
        'room_name', d.room_name,
        'room_type', d.room_type,
        'amount_paid', case when v_finance then d.amount_paid end,
        'balance_due', case when v_finance
          then greatest(d.total_price - d.amount_paid, 0) end,
        'payment_status', case when v_finance then d.payment_status end,
        'is_overdue', d.check_out < v_business_date
      ) order by (d.check_out < v_business_date) desc, d.check_out, d.created_at)
      from departures d
    ), '[]'::jsonb),
    'housekeeping', coalesce((
      select jsonb_agg(ri.item order by lower(ri.name), ri.id)
      from room_items ri
      where ri.item->'current_stay' = 'null'::jsonb
        and ri.item->>'operational_status' in (
          'ready', 'needs_cleaning', 'cleaning', 'out_of_service'
        )
    ), '[]'::jsonb)
  ) into v_result
  from totals t;

  return v_result;
end;
$fn$;

create or replace function public.create_room(
  p_property_id uuid,
  p_room_id uuid,
  p_room_name text,
  p_room_type text,
  p_is_active boolean,
  p_price_per_night numeric,
  p_capacity integer,
  p_bed_count integer,
  p_description text,
  p_amenities text[],
  p_images jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_room_name, ''));
  v_type text := lower(btrim(coalesce(p_room_type, '')));
  v_amenities text[];
  v_images jsonb;
  v_room public.rooms%rowtype;
begin
  perform app_private.require_property_permission(p_property_id, 'rooms', 'create');
  if p_room_id is null then
    raise exception using errcode = '22023', message = 'Room id is required';
  end if;
  if length(v_name) < 2 or length(v_name) > 100 then
    raise exception using errcode = '22023', message = 'Room name must be 2-100 characters';
  end if;
  if length(v_type) < 2 or length(v_type) > 50 then
    raise exception using errcode = '22023', message = 'Room type is invalid';
  end if;
  if p_price_per_night is null or p_price_per_night <= 0
     or p_price_per_night > 100000000 then
    raise exception using errcode = '22023', message = 'Room price is invalid';
  end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 100 then
    raise exception using errcode = '22023', message = 'Capacity must be 1-100';
  end if;
  if p_bed_count is null or p_bed_count < 1 or p_bed_count > p_capacity then
    raise exception using errcode = '22023', message = 'Bed count must be between 1 and capacity';
  end if;
  if jsonb_typeof(coalesce(p_images, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Images must be an array';
  end if;
  if jsonb_array_length(coalesce(p_images, '[]'::jsonb)) > 5 then
    raise exception using errcode = '22023', message = 'Provide at most five images';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) x
    where jsonb_typeof(x) <> 'string'
      or btrim(x #>> '{}') !~ '^https://'
      or btrim(x #>> '{}') not like (
        '%/room-images/' || p_property_id::text || '/' || p_room_id::text || '/%'
      )
  ) then
    raise exception using errcode = '22023', message = 'Invalid room image path';
  end if;

  select coalesce(array_agg(a order by a), array[]::text[])
  into v_amenities
  from (
    select distinct btrim(x) as a
    from unnest(coalesce(p_amenities, array[]::text[])) x
    where nullif(btrim(x), '') is not null
  ) q;
  select coalesce(jsonb_agg(jsonb_build_object(
    'url', url, 'is_cover', ord = 1, 'position', ord
  ) order by ord), '[]'::jsonb)
  into v_images
  from (
    select btrim(value #>> '{}') as url, min(ordinality)::integer as ord
    from jsonb_array_elements(coalesce(p_images, '[]'::jsonb))
      with ordinality e(value, ordinality)
    group by btrim(value #>> '{}')
  ) q;

  insert into public.rooms(
    id, property_id, name, room_type, capacity, bed_count,
    price_per_night, description, amenities, images, is_active, updated_at
  ) values (
    p_room_id, p_property_id, v_name, v_type, p_capacity, p_bed_count,
    round(p_price_per_night, 2),
    nullif(btrim(coalesce(p_description, '')), ''),
    to_jsonb(v_amenities), v_images, coalesce(p_is_active, true), now()
  ) returning * into v_room;

  insert into public.room_images(room_id, url, position, is_cover)
  select p_room_id, e.value->>'url', (e.value->>'position')::integer,
    (e.value->>'is_cover')::boolean
  from jsonb_array_elements(v_images) e(value);

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'room', p_room_id::text,
    'room_created', to_jsonb(v_room)
  );

  return jsonb_build_object(
    'success', true,
    'room_id', p_room_id,
    'message', 'Room created'
  );
end;
$fn$;

create or replace function public.update_room(
  p_property_id uuid,
  p_room_id uuid,
  p_room_name text,
  p_room_type text,
  p_is_active boolean,
  p_price_per_night numeric,
  p_capacity integer,
  p_bed_count integer,
  p_description text,
  p_amenities text[],
  p_images jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_room_name, ''));
  v_type text := lower(btrim(coalesce(p_room_type, '')));
  v_amenities text[];
  v_images jsonb;
  v_old public.rooms%rowtype;
  v_new public.rooms%rowtype;
begin
  perform app_private.require_property_permission(p_property_id, 'rooms', 'update');
  select r.* into v_old
  from public.rooms r
  where r.id = p_room_id and r.property_id = p_property_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Room not found';
  end if;
  if length(v_name) < 2 or length(v_name) > 100
     or length(v_type) < 2 or length(v_type) > 50 then
    raise exception using errcode = '22023', message = 'Room name or type is invalid';
  end if;
  if p_price_per_night is null or p_price_per_night <= 0
     or p_price_per_night > 100000000 then
    raise exception using errcode = '22023', message = 'Room price is invalid';
  end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 100
     or p_bed_count is null or p_bed_count < 1 or p_bed_count > p_capacity then
    raise exception using errcode = '22023', message = 'Room capacity or bed count is invalid';
  end if;
  if not coalesce(p_is_active, false) and exists (
    select 1 from public.bookings b
    where b.room_id = p_room_id
      and b.status in ('pending', 'reserved', 'confirmed', 'checked_in')
      and b.check_out >= app_private.property_business_date(p_property_id)
  ) then
    raise exception using
      errcode = '22023', message = 'A room with an active stay cannot be deactivated';
  end if;
  if jsonb_typeof(coalesce(p_images, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_images, '[]'::jsonb)) > 5 then
    raise exception using errcode = '22023', message = 'Images must be an array of at most five URLs';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) x
    where jsonb_typeof(x) <> 'string'
      or btrim(x #>> '{}') !~ '^https://'
      or btrim(x #>> '{}') not like (
        '%/room-images/' || p_property_id::text || '/' || p_room_id::text || '/%'
      )
  ) then
    raise exception using errcode = '22023', message = 'Invalid room image path';
  end if;

  select coalesce(array_agg(a order by a), array[]::text[])
  into v_amenities
  from (
    select distinct btrim(x) as a
    from unnest(coalesce(p_amenities, array[]::text[])) x
    where nullif(btrim(x), '') is not null
  ) q;
  select coalesce(jsonb_agg(jsonb_build_object(
    'url', url, 'is_cover', ord = 1, 'position', ord
  ) order by ord), '[]'::jsonb)
  into v_images
  from (
    select btrim(value #>> '{}') as url, min(ordinality)::integer as ord
    from jsonb_array_elements(coalesce(p_images, '[]'::jsonb))
      with ordinality e(value, ordinality)
    group by btrim(value #>> '{}')
  ) q;

  update public.rooms
  set name = v_name,
      room_type = v_type,
      is_active = coalesce(p_is_active, is_active),
      price_per_night = round(p_price_per_night, 2),
      capacity = p_capacity,
      bed_count = p_bed_count,
      description = nullif(btrim(coalesce(p_description, '')), ''),
      amenities = to_jsonb(v_amenities),
      images = v_images,
      updated_at = now()
  where id = p_room_id and property_id = p_property_id
  returning * into v_new;

  delete from public.room_images where room_id = p_room_id;
  insert into public.room_images(room_id, url, position, is_cover)
  select p_room_id, e.value->>'url', (e.value->>'position')::integer,
    (e.value->>'is_cover')::boolean
  from jsonb_array_elements(v_images) e(value);

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'room', p_room_id::text,
    'room_updated', to_jsonb(v_old), to_jsonb(v_new)
  );

  return jsonb_build_object(
    'success', true,
    'room_id', p_room_id,
    'message', 'Room updated'
  );
end;
$fn$;


-- Declared before lifecycle RPCs so PostgreSQL can resolve every referenced
-- helper and composite-field name while checking the function bodies.
create or replace function app_private.property_business_date(p_property_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $fn$
  select (clock_timestamp() at time zone
    app_private.property_timezone(p_property_id))::date;
$fn$;

create or replace function app_private.require_property_permission(
  p_property_id uuid,
  p_resource text,
  p_action text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_role text;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  v_role := app_private.current_property_role(p_property_id);
  if v_role is null then
    raise exception using errcode = '42501', message = 'Property access denied';
  end if;
  if not app_private.has_property_permission(p_property_id, p_resource, p_action) then
    raise exception using errcode = '42501', message = 'Permission denied';
  end if;
  return v_role;
end;
$fn$;

alter table public.bookings
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id),
  add column if not exists no_show_reason text,
  add column if not exists no_show_at timestamptz,
  add column if not exists no_show_by uuid references auth.users(id),
  add column if not exists idempotency_key uuid,
  add column if not exists idempotency_fingerprint text;
alter table public.payments
  add column if not exists idempotency_key uuid,
  add column if not exists idempotency_fingerprint text;

create or replace function public.update_booking_lifecycle(
  p_property_id uuid,
  p_booking_id uuid,
  p_action text,
  p_reason text default null,
  p_allow_balance boolean default false
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
  v_permission text;
  v_booking public.bookings%rowtype;
  v_old_booking public.bookings%rowtype;
  v_room public.rooms%rowtype;
  v_business_date date;
  v_paid numeric;
  v_balance numeric;
  v_payment_status text;
  v_event text;
begin
  v_permission := case v_action
    when 'confirm' then 'confirm'
    when 'check_in' then 'checkin'
    when 'check_out' then 'checkout'
    when 'cancel' then 'cancel'
    when 'mark_no_show' then 'no_show'
    when 'reinstate' then 'reinstate'
    else null
  end;
  if v_permission is null then
    raise exception using errcode = '22023', message = 'Unknown lifecycle action';
  end if;
  perform app_private.require_property_permission(
    p_property_id, 'bookings', v_permission
  );

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id and b.property_id = p_property_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;
  v_old_booking := v_booking;

  select r.* into v_room
  from public.rooms r
  where r.id = v_booking.room_id and r.property_id = p_property_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Room not found';
  end if;

  v_business_date := app_private.property_business_date(p_property_id);
  select coalesce(sum(p.amount) filter (
    where coalesce(p.payment_status, p.status) = 'completed'
  ), 0)
  into v_paid
  from public.payments p
  where p.booking_id = p_booking_id;
  v_balance := greatest(v_booking.total_price - v_paid, 0);
  v_payment_status := case
    when v_balance = 0 then 'paid'
    when v_paid > 0 then 'partial'
    else 'unpaid'
  end;

  case v_action
    when 'confirm' then
      if v_booking.status not in ('pending', 'reserved') then
        raise exception using
          errcode = '22023', message = 'Only pending or reserved bookings can be confirmed';
      end if;
      update public.bookings
      set status = 'confirmed', updated_at = now()
      where id = p_booking_id
      returning * into v_booking;
      v_event := 'booking_confirmed';

    when 'check_in' then
      if v_booking.status not in ('confirmed', 'reserved') then
        raise exception using
          errcode = '22023', message = 'Only confirmed or reserved bookings can check in';
      end if;
      if v_business_date < v_booking.check_in
         or v_business_date >= v_booking.check_out then
        raise exception using
          errcode = '22023', message = 'Booking is outside its check-in window';
      end if;
      if not coalesce(v_room.is_active, false)
         or coalesce(v_room.housekeeping_status, '') <> 'ready'
         or coalesce(v_room.operational_status, '') <> 'available' then
        raise exception using errcode = '22023', message = 'Room is not ready';
      end if;
      if exists (
        select 1 from public.bookings b
        where b.room_id = v_room.id
          and b.id <> p_booking_id
          and b.status = 'checked_in'
      ) then
        raise exception using errcode = '23P01', message = 'Room is occupied';
      end if;

      update public.bookings
      set status = 'checked_in',
          checked_in_at = now(),
          checked_in_by = v_user_id,
          updated_at = now()
      where id = p_booking_id
      returning * into v_booking;
      update public.rooms
      set operational_status = 'occupied', updated_at = now()
      where id = v_room.id;
      v_event := 'booking_checked_in';

    when 'check_out' then
      if v_booking.status <> 'checked_in' then
        raise exception using
          errcode = '22023', message = 'Only checked-in bookings can check out';
      end if;
      if v_balance > 0 and not coalesce(p_allow_balance, false) then
        return jsonb_build_object(
          'success', false,
          'requires_payment', true,
          'booking_id', p_booking_id,
          'balance_due', v_balance,
          'message', 'Outstanding payment required before checkout'
        );
      end if;
      if v_balance > 0 then
        if v_reason is null then
          raise exception using
            errcode = '22023',
            message = 'A reason is required to check out with a balance';
        end if;
        if not app_private.has_property_permission(
          p_property_id, 'bookings', 'checkout_with_balance'
        ) then
          raise exception using
            errcode = '42501', message = 'Balance override permission denied';
        end if;
      end if;

      update public.bookings
      set status = 'checked_out',
          payment_status = v_payment_status,
          checked_out_at = now(),
          checked_out_by = v_user_id,
          updated_at = now()
      where id = p_booking_id
      returning * into v_booking;
      update public.rooms
      set operational_status = 'dirty',
          housekeeping_status = 'needs_cleaning',
          housekeeping_updated_at = now(),
          updated_at = now()
      where id = v_room.id;
      v_event := 'booking_checked_out';

    when 'cancel' then
      if v_booking.status not in ('pending', 'reserved', 'confirmed') then
        raise exception using
          errcode = '22023', message = 'This booking cannot be cancelled';
      end if;
      if v_reason is null then
        raise exception using errcode = '22023', message = 'Cancellation reason is required';
      end if;
      update public.bookings
      set status = 'cancelled',
          cancellation_reason = v_reason,
          cancelled_at = now(),
          cancelled_by = v_user_id,
          updated_at = now()
      where id = p_booking_id
      returning * into v_booking;
      v_event := 'booking_cancelled';

    when 'mark_no_show' then
      if v_booking.status not in ('reserved', 'confirmed') then
        raise exception using
          errcode = '22023', message = 'Only reserved or confirmed bookings can be no-show';
      end if;
      if v_booking.check_in >= v_business_date then
        raise exception using
          errcode = '22023', message = 'The arrival is not overdue';
      end if;
      if v_reason is null then
        raise exception using errcode = '22023', message = 'No-show reason is required';
      end if;
      update public.bookings
      set status = 'no_show',
          no_show_reason = v_reason,
          no_show_at = now(),
          no_show_by = v_user_id,
          updated_at = now()
      where id = p_booking_id
      returning * into v_booking;
      v_event := 'booking_marked_no_show';

    when 'reinstate' then
      if v_booking.status not in ('cancelled', 'no_show') then
        raise exception using
          errcode = '22023', message = 'Only cancelled or no-show bookings can be reinstated';
      end if;
      if v_booking.check_out <= v_business_date then
        raise exception using
          errcode = '22023', message = 'This stay has already ended';
      end if;
      if not coalesce(v_room.is_active, false) then
        raise exception using errcode = '22023', message = 'Room is inactive';
      end if;
      if exists (
        select 1
        from public.bookings b
        where b.room_id = v_booking.room_id
          and b.id <> p_booking_id
          and b.status not in ('cancelled', 'no_show', 'checked_out')
          and v_booking.check_in < b.check_out
          and v_booking.check_out > b.check_in
      ) then
        raise exception using
          errcode = '23P01', message = 'Room is no longer available';
      end if;
      update public.bookings
      set status = 'confirmed',
          cancellation_reason = null,
          cancelled_at = null,
          cancelled_by = null,
          no_show_reason = null,
          no_show_at = null,
          no_show_by = null,
          updated_at = now()
      where id = p_booking_id
      returning * into v_booking;
      v_event := 'booking_reinstated';
  end case;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type,
    old_data, new_data
  ) values (
    p_property_id, v_user_id, 'booking', p_booking_id::text, v_event,
    to_jsonb(v_old_booking),
    jsonb_build_object(
      'booking', to_jsonb(v_booking),
      'action', v_action,
      'reason', v_reason,
      'business_date', v_business_date,
      'amount_paid', v_paid,
      'balance_due', v_balance,
      'balance_override', v_action = 'check_out'
        and v_balance > 0 and coalesce(p_allow_balance, false)
    )
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'status', v_booking.status,
    'action', v_action,
    'business_date', v_business_date,
    'payment_status', v_booking.payment_status,
    'amount_paid', v_paid,
    'balance_due', v_balance
  );
end;
$fn$;

create or replace function public.check_in_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_property_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  select b.property_id into v_property_id
  from public.bookings b
  where b.id = p_booking_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;
  return public.update_booking_lifecycle(
    v_property_id, p_booking_id, 'check_in', null, false
  );
end;
$fn$;

create or replace function public.checkout_booking(
  p_booking_id uuid,
  p_allow_balance boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_property_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  select b.property_id into v_property_id
  from public.bookings b
  where b.id = p_booking_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;
  return public.update_booking_lifecycle(
    v_property_id,
    p_booking_id,
    'check_out',
    case when coalesce(p_allow_balance, false)
      then 'Legacy checkout balance override' end,
    coalesce(p_allow_balance, false)
  );
end;
$fn$;

create or replace function public.record_booking_payment(
  p_property_id uuid,
  p_booking_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_existing public.payments%rowtype;
  v_amount numeric;
  v_paid numeric;
  v_new_paid numeric;
  v_balance numeric;
  v_new_status text;
  v_method_key text;
  v_method_label text;
  v_reference text := nullif(btrim(coalesce(p_reference, '')), '');
  v_fingerprint text;
begin
  perform app_private.require_property_permission(
    p_property_id, 'payments', 'create'
  );
  v_amount := round(p_amount, 2);
  if v_amount is null or v_amount <= 0 then
    raise exception using
      errcode = '22023', message = 'Payment amount must be greater than zero';
  end if;

  v_method_key := lower(replace(btrim(coalesce(p_method, '')), ' ', '_'));
  if v_method_key not in (
    'cash', 'card', 'mobile_money', 'bank_transfer', 'cheque', 'other'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported payment method';
  end if;
  v_method_label := case v_method_key
    when 'cash' then 'Cash'
    when 'card' then 'Card'
    when 'mobile_money' then 'Mobile Money'
    when 'bank_transfer' then 'Bank Transfer'
    when 'cheque' then 'Cheque'
    else 'Other'
  end;
  v_fingerprint := md5(jsonb_build_object(
    'booking_id', p_booking_id,
    'amount', v_amount,
    'method', v_method_key,
    'reference', lower(v_reference),
    'notes', nullif(btrim(coalesce(p_notes, '')), '')
  )::text);

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id and b.property_id = p_property_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;
  if v_booking.status in ('cancelled', 'no_show') then
    raise exception using
      errcode = '22023', message = 'Cannot record payment for this booking state';
  end if;

  if v_reference is not null then
    select p.* into v_existing
    from public.payments p
    where p.booking_id = p_booking_id
      and lower(btrim(coalesce(
        p.transaction_reference, p.transaction_ref, ''
      ))) = lower(v_reference)
      and coalesce(p.payment_status, p.status) = 'completed'
    order by p.created_at
    limit 1;
    if found then
      if round(v_existing.amount, 2) <> v_amount
         or lower(replace(btrim(coalesce(
           v_existing.method, v_existing.payment_method, ''
         )), ' ', '_')) <> v_method_key then
        raise exception using
          errcode = '22023',
          message = 'Payment reference was reused with different details';
      end if;
      select coalesce(sum(p.amount), 0)
      into v_paid
      from public.payments p
      where p.booking_id = p_booking_id
        and coalesce(p.payment_status, p.status) = 'completed';
      return jsonb_build_object(
        'success', true,
        'replayed', true,
        'payment_id', v_existing.id,
        'amount_paid', v_paid,
        'balance_due', greatest(v_booking.total_price - v_paid, 0),
        'payment_status', v_booking.payment_status
      );
    end if;
  end if;

  select coalesce(sum(p.amount), 0)
  into v_paid
  from public.payments p
  where p.booking_id = p_booking_id
    and coalesce(p.payment_status, p.status) = 'completed';
  v_balance := greatest(v_booking.total_price - v_paid, 0);
  if v_amount > v_balance then
    raise exception using
      errcode = '22023',
      message = 'Payment exceeds outstanding balance',
      detail = format('Outstanding balance: %s', v_balance);
  end if;

  insert into public.payments(
    booking_id, amount, currency, payment_method, payment_status,
    transaction_reference, received_by, paid_at, notes,
    method, status, transaction_ref, idempotency_fingerprint
  ) values (
    p_booking_id, v_amount, 'TZS', v_method_label, 'completed',
    v_reference, v_user_id, now(),
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_method_key, 'completed', v_reference, v_fingerprint
  ) returning * into v_payment;

  v_new_paid := v_paid + v_amount;
  v_new_status := case
    when v_new_paid >= v_booking.total_price then 'paid'
    when v_new_paid > 0 then 'partial'
    else 'unpaid'
  end;
  update public.bookings
  set payment_status = v_new_status, updated_at = now()
  where id = p_booking_id;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'booking', p_booking_id::text,
    'payment_recorded',
    jsonb_build_object(
      'payment_id', v_payment.id,
      'amount', v_payment.amount,
      'method', v_method_key,
      'reference', v_reference,
      'total_paid', v_new_paid,
      'balance_due', greatest(v_booking.total_price - v_new_paid, 0),
      'payment_status', v_new_status
    )
  );

  return jsonb_build_object(
    'success', true,
    'replayed', false,
    'payment_id', v_payment.id,
    'amount_paid', v_new_paid,
    'balance_due', greatest(v_booking.total_price - v_new_paid, 0),
    'payment_status', v_new_status
  );
end;
$fn$;


create or replace function app_private.property_business_date(p_property_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $fn$
  select (clock_timestamp() at time zone
    app_private.property_timezone(p_property_id))::date;
$fn$;

create or replace function app_private.require_property_permission(
  p_property_id uuid,
  p_resource text,
  p_action text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_role text;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  v_role := app_private.current_property_role(p_property_id);
  if v_role is null then
    raise exception using errcode = '42501', message = 'Property access denied';
  end if;

  if not app_private.has_property_permission(p_property_id, p_resource, p_action) then
    raise exception using errcode = '42501', message = 'Permission denied';
  end if;

  return v_role;
end;
$fn$;

revoke all on function app_private.current_property_role(uuid)
  from public, anon, authenticated;
revoke all on function app_private.has_property_permission(uuid,text,text)
  from public, anon, authenticated;
revoke all on function app_private.can_view_property_finance(uuid)
  from public, anon, authenticated;
revoke all on function app_private.property_timezone(uuid)
  from public, anon, authenticated;
revoke all on function app_private.property_business_date(uuid)
  from public, anon, authenticated;
revoke all on function app_private.require_property_permission(uuid,text,text)
  from public, anon, authenticated;

-- The application only recognizes these roles. Any legacy/unknown role fails
-- closed because current_property_role() returns null for it.
insert into public.role_permissions(role, resource, action)
values
  ('owner', 'bookings', 'view'),
  ('owner', 'bookings', 'create'),
  ('owner', 'bookings', 'update'),
  ('owner', 'bookings', 'confirm'),
  ('owner', 'bookings', 'checkin'),
  ('owner', 'bookings', 'checkout'),
  ('owner', 'bookings', 'checkout_with_balance'),
  ('owner', 'bookings', 'cancel'),
  ('owner', 'bookings', 'no_show'),
  ('owner', 'bookings', 'reinstate'),
  ('owner', 'guests', 'view'),
  ('owner', 'guests', 'update'),
  ('owner', 'payments', 'view'),
  ('owner', 'payments', 'create'),
  ('owner', 'rooms', 'view'),
  ('owner', 'rooms', 'create'),
  ('owner', 'rooms', 'update'),
  ('owner', 'property', 'view'),
  ('owner', 'property', 'update'),
  ('owner', 'reports', 'view'),
  ('owner', 'activity', 'view'),
  ('owner', 'notifications', 'view'),
  ('manager', 'bookings', 'view'),
  ('manager', 'bookings', 'create'),
  ('manager', 'bookings', 'update'),
  ('manager', 'bookings', 'confirm'),
  ('manager', 'bookings', 'checkin'),
  ('manager', 'bookings', 'checkout'),
  ('manager', 'bookings', 'cancel'),
  ('manager', 'bookings', 'no_show'),
  ('manager', 'bookings', 'reinstate'),
  ('manager', 'guests', 'view'),
  ('manager', 'guests', 'update'),
  ('manager', 'rooms', 'view'),
  ('manager', 'rooms', 'create'),
  ('manager', 'rooms', 'update'),
  ('manager', 'property', 'view'),
  ('manager', 'property', 'update'),
  ('manager', 'activity', 'view'),
  ('manager', 'notifications', 'view'),
  ('receptionist', 'bookings', 'view'),
  ('receptionist', 'bookings', 'create'),
  ('receptionist', 'bookings', 'update'),
  ('receptionist', 'bookings', 'confirm'),
  ('receptionist', 'bookings', 'checkin'),
  ('receptionist', 'guests', 'view'),
  ('receptionist', 'guests', 'update'),
  ('receptionist', 'rooms', 'view'),
  ('receptionist', 'property', 'view'),
  ('receptionist', 'notifications', 'view')
on conflict (role, resource, action) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Property-scoped guests, lifecycle metadata and idempotency.
-- ---------------------------------------------------------------------------

create table if not exists public.property_guests (
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  property_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (property_id, guest_id)
);

insert into public.property_guests(property_id, guest_id, created_at, updated_at)
select distinct b.property_id, b.guest_id, now(), now()
from public.bookings b
where b.guest_id is not null
on conflict (property_id, guest_id) do nothing;

alter table public.bookings
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id),
  add column if not exists no_show_reason text,
  add column if not exists no_show_at timestamptz,
  add column if not exists no_show_by uuid references auth.users(id),
  add column if not exists idempotency_key uuid,
  add column if not exists idempotency_fingerprint text;

alter table public.payments
  add column if not exists idempotency_key uuid,
  add column if not exists idempotency_fingerprint text;

alter table public.bookings drop constraint if exists booking_status_check;
alter table public.bookings
  add constraint booking_status_check
  check (status in (
    'pending', 'reserved', 'confirmed', 'checked_in', 'checked_out',
    'cancelled', 'no_show'
  )) not valid;
alter table public.bookings validate constraint booking_status_check;

create unique index if not exists bookings_property_idempotency_unique
  on public.bookings(property_id, idempotency_key)
  where idempotency_key is not null;
create unique index if not exists payments_booking_idempotency_unique
  on public.payments(booking_id, idempotency_key)
  where idempotency_key is not null;
create unique index if not exists payments_booking_reference_unique_ci
  on public.payments(booking_id, lower(btrim(transaction_reference)))
  where nullif(btrim(transaction_reference), '') is not null
    and coalesce(payment_status, status) = 'completed';
create index if not exists property_guests_guest_property_idx
  on public.property_guests(guest_id, property_id);
create index if not exists bookings_property_arrivals_idx
  on public.bookings(property_id, check_in, created_at, id)
  where status in ('pending', 'reserved', 'confirmed');
create index if not exists bookings_property_departures_idx
  on public.bookings(property_id, check_out, created_at, id)
  where status = 'checked_in';
create index if not exists bookings_property_created_desc_idx
  on public.bookings(property_id, created_at desc, id desc);
create index if not exists payments_received_by_idx
  on public.payments(received_by)
  where received_by is not null;
create index if not exists audit_log_actor_idx
  on public.audit_log(actor_id)
  where actor_id is not null;

alter table public.property_guests enable row level security;

create or replace function app_private.can_access_guest(p_guest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.property_guests pg
    where pg.guest_id = p_guest_id
      and app_private.current_property_role(pg.property_id) is not null
  );
$fn$;
revoke all on function app_private.can_access_guest(uuid)
  from public, anon, authenticated;

drop policy if exists loji_property_guests_read on public.property_guests;
create policy loji_property_guests_read
on public.property_guests for select to authenticated
using (app_private.current_property_role(property_id) is not null);

drop policy if exists loji_guests_member_read on public.guests;
create policy loji_guests_member_read
on public.guests for select to authenticated
using (app_private.can_access_guest(id));

drop policy if exists loji_payments_member_read on public.payments;
create policy loji_payments_owner_read
on public.payments for select to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = payments.booking_id
      and app_private.can_view_property_finance(b.property_id)
  )
);

drop policy if exists booking_payments_member_read on public.booking_payments;
create policy booking_payments_owner_read
on public.booking_payments for select to authenticated
using (app_private.can_view_property_finance(property_id));

drop policy if exists audit_log_manager_read on public.audit_log;
create policy audit_log_permission_read
on public.audit_log for select to authenticated
using (
  property_id is not null
  and app_private.has_property_permission(property_id, 'activity', 'view')
);

revoke all on table public.property_guests from public, anon;
grant select on table public.property_guests to authenticated;

alter table public.guests
  add column if not exists updated_at timestamptz;
update public.guests
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
alter table public.guests alter column updated_at set default now();

-- Replace credential-bearing booking webhooks with an in-database inbox. The
-- Edge Function and its secret are deliberately not modified by this migration.
drop trigger if exists booking_created_notification on public.bookings;
drop trigger if exists booking_status_notification on public.bookings;

create or replace function public.loji_create_booking_inbox_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_type public.notification_type;
  v_title text;
  v_body text;
begin
  if tg_op = 'INSERT' then
    v_type := 'booking_created'::public.notification_type;
    v_title := 'New booking';
    v_body := format('Booking %s was created.', new.booking_number);
  elsif new.status is distinct from old.status then
    v_type := case new.status
      when 'cancelled' then 'booking_cancelled'::public.notification_type
      when 'checked_in' then 'guest_checked_in'::public.notification_type
      when 'checked_out' then 'guest_checked_out'::public.notification_type
      else 'system'::public.notification_type
    end;
    v_title := case new.status
      when 'cancelled' then 'Booking cancelled'
      when 'checked_in' then 'Guest checked in'
      when 'checked_out' then 'Guest checked out'
      when 'no_show' then 'Guest marked no-show'
      else 'Booking updated'
    end;
    v_body := format('Booking %s is now %s.', new.booking_number,
      replace(new.status, '_', ' '));
  else
    return new;
  end if;

  insert into public.notifications(
    user_id, property_id, title, body, data, is_read, type, priority
  )
  select
    pu.user_id,
    new.property_id,
    v_title,
    v_body,
    jsonb_build_object(
      'booking_id', new.id,
      'booking_number', new.booking_number,
      'status', new.status
    ),
    false,
    v_type,
    'normal'::public.notification_priority
  from public.property_users pu
  where pu.property_id = new.property_id
    and lower(coalesce(pu.status, '')) = 'active'
    and lower(btrim(pu.role)) in ('owner', 'manager', 'receptionist');

  return new;
end;
$fn$;

revoke all on function public.loji_create_booking_inbox_notifications()
  from public, anon, authenticated;

create trigger loji_booking_inbox_notifications
after insert or update of status on public.bookings
for each row execute function public.loji_create_booking_inbox_notifications();

-- ---------------------------------------------------------------------------
-- 4. Booking collection and workspace reads.
-- ---------------------------------------------------------------------------

create or replace function public.list_property_bookings(
  p_property_id uuid,
  p_query text default null,
  p_view text default 'all',
  p_status text default null,
  p_from date default null,
  p_to date default null,
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
  v_view text := lower(btrim(coalesce(p_view, 'all')));
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_finance boolean;
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(
    p_property_id, 'bookings', 'view'
  );
  if v_view not in (
    'all', 'arrivals', 'departures', 'in_house', 'attention',
    'upcoming', 'past'
  ) then
    raise exception using errcode = '22023', message = 'Invalid booking view';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception using errcode = '22023', message = 'Invalid date range';
  end if;

  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  v_finance := app_private.can_view_property_finance(p_property_id);

  with payment_rollup as (
    select
      p.booking_id,
      coalesce(sum(p.amount) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
      ), 0)::numeric as amount_paid
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    where b.property_id = p_property_id
    group by p.booking_id
  ),
  base as (
    select
      b.*,
      r.name as room_name,
      r.room_type,
      g.first_name,
      g.last_name,
      g.phone as guest_phone,
      coalesce(pr.amount_paid, 0)::numeric as amount_paid,
      greatest(b.total_price - coalesce(pr.amount_paid, 0), 0)::numeric as balance_due
    from public.bookings b
    join public.rooms r
      on r.id = b.room_id and r.property_id = b.property_id
    left join public.guests g on g.id = b.guest_id
    left join payment_rollup pr on pr.booking_id = b.id
    where b.property_id = p_property_id
  ),
  filtered as (
    select b.*
    from base b
    where (v_status is null or lower(b.status) = v_status)
      and (p_from is null or b.check_out > p_from)
      and (p_to is null or b.check_in <= p_to)
      and (
        v_query is null
        or b.booking_number ilike '%' || v_query || '%'
        or concat_ws(' ', b.first_name, b.last_name) ilike '%' || v_query || '%'
        or coalesce(b.guest_phone, '') ilike '%' || v_query || '%'
        or b.room_name ilike '%' || v_query || '%'
      )
      and case v_view
        when 'arrivals' then
          b.status in ('pending', 'reserved', 'confirmed')
          and b.check_in <= v_business_date
        when 'departures' then
          b.status = 'checked_in' and b.check_out <= v_business_date
        when 'in_house' then b.status = 'checked_in'
        when 'attention' then
          (b.status in ('pending', 'reserved', 'confirmed')
            and b.check_in < v_business_date)
          or (b.status = 'checked_in' and b.check_out < v_business_date)
        when 'upcoming' then
          b.status in ('pending', 'reserved', 'confirmed')
          and b.check_in > v_business_date
        when 'past' then
          b.status in ('checked_out', 'cancelled', 'no_show')
        else true
      end
  ),
  counts as (
    select
      (select count(*) from base)::integer as total,
      (select count(*) from filtered)::integer as filtered_total,
      count(*) filter (
        where status in ('pending', 'reserved', 'confirmed')
          and check_in = v_business_date
      )::integer as arrivals_today,
      count(*) filter (
        where status = 'checked_in' and check_out = v_business_date
      )::integer as departures_today,
      count(*) filter (where status = 'checked_in')::integer as in_house,
      count(*) filter (
        where status in ('pending', 'reserved', 'confirmed')
          and check_in < v_business_date
      )::integer as overdue_arrivals,
      count(*) filter (
        where status = 'checked_in' and check_out < v_business_date
      )::integer as overdue_departures
    from base
  ),
  page_rows as (
    select f.*
    from filtered f
    order by
      case when v_view in ('arrivals', 'attention') then f.check_in end,
      case when v_view = 'departures' then f.check_out end,
      f.created_at desc,
      f.id desc
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'success', true,
    'property', jsonb_build_object(
      'id', p_property_id,
      'timezone', v_timezone,
      'business_date', v_business_date
    ),
    'role', v_role,
    'capabilities', jsonb_build_object(
      'create_booking', app_private.has_property_permission(
        p_property_id, 'bookings', 'create'
      ),
      'view_finance', v_finance,
      'record_payment', app_private.has_property_permission(
        p_property_id, 'payments', 'create'
      )
    ),
    'summary', jsonb_build_object(
      'total', c.total,
      'filtered_total', c.filtered_total,
      'arrivals_today', c.arrivals_today,
      'departures_today', c.departures_today,
      'in_house', c.in_house,
      'overdue_arrivals', c.overdue_arrivals,
      'overdue_departures', c.overdue_departures
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', p.id,
        'booking_number', p.booking_number,
        'status', p.status,
        'guest', jsonb_build_object(
          'id', p.guest_id,
          'name', coalesce(
            nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
            'Guest'
          ),
          'phone', p.guest_phone
        ),
        'room', jsonb_build_object(
          'id', p.room_id,
          'name', p.room_name,
          'type', p.room_type
        ),
        'check_in', p.check_in,
        'check_out', p.check_out,
        'guests', jsonb_build_object(
          'adults', p.adults,
          'children', p.children,
          'total', coalesce(p.total_guests, p.adults + p.children)
        ),
        'source', p.booking_source,
        'special_requests', p.special_requests,
        'created_at', p.created_at,
        'is_overdue', (
          p.status in ('pending', 'reserved', 'confirmed')
            and p.check_in < v_business_date
        ) or (p.status = 'checked_in' and p.check_out < v_business_date),
        'settlement', case when v_finance then jsonb_build_object(
          'total', p.total_price,
          'paid', p.amount_paid,
          'balance', p.balance_due,
          'status', p.payment_status
        ) end
      )) order by
        case when v_view in ('arrivals', 'attention') then p.check_in end,
        case when v_view = 'departures' then p.check_out end,
        p.created_at desc,
        p.id desc)
      from page_rows p
    ), '[]'::jsonb),
    'page', jsonb_build_object(
      'limit', v_limit,
      'offset', v_offset,
      'has_more', c.filtered_total > v_offset + v_limit,
      'next_offset', case
        when c.filtered_total > v_offset + v_limit then v_offset + v_limit
      end
    )
  )
  into v_result
  from counts c;

  return v_result;
end;
$fn$;

create or replace function public.get_booking_workspace(
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
  v_role text;
  v_booking public.bookings%rowtype;
  v_room public.rooms%rowtype;
  v_guest public.guests%rowtype;
  v_timezone text;
  v_business_date date;
  v_finance boolean;
  v_paid numeric;
  v_balance numeric;
  v_allowed_actions jsonb;
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(
    p_property_id, 'bookings', 'view'
  );

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id and b.property_id = p_property_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;

  select r.* into v_room
  from public.rooms r
  where r.id = v_booking.room_id and r.property_id = p_property_id;
  if v_booking.guest_id is not null then
    select g.* into v_guest
    from public.guests g
    where g.id = v_booking.guest_id
      and exists (
        select 1 from public.property_guests pg
        where pg.property_id = p_property_id and pg.guest_id = g.id
      );
  end if;

  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  v_finance := app_private.can_view_property_finance(p_property_id);

  select coalesce(sum(p.amount) filter (
    where coalesce(p.payment_status, p.status) = 'completed'
  ), 0)
  into v_paid
  from public.payments p
  where p.booking_id = p_booking_id;
  v_balance := greatest(v_booking.total_price - v_paid, 0);

  select coalesce(jsonb_agg(a.action order by a.sort_order), '[]'::jsonb)
  into v_allowed_actions
  from (
    select 'edit'::text as action, 0 as sort_order
    where v_booking.status in ('pending', 'reserved', 'confirmed')
      and app_private.has_property_permission(
        p_property_id, 'bookings', 'update'
      )
    union all
    select 'confirm'::text as action, 1 as sort_order
    where v_booking.status in ('pending', 'reserved')
      and app_private.has_property_permission(
        p_property_id, 'bookings', 'confirm'
      )
    union all
    select 'check_in', 2
    where v_booking.status in ('confirmed', 'reserved')
      and v_business_date >= v_booking.check_in
      and v_business_date < v_booking.check_out
      and app_private.has_property_permission(
        p_property_id, 'bookings', 'checkin'
      )
    union all
    select 'check_out', 3
    where v_booking.status = 'checked_in'
      and app_private.has_property_permission(
        p_property_id, 'bookings', 'checkout'
      )
    union all
    select 'cancel', 4
    where v_booking.status in ('pending', 'reserved', 'confirmed')
      and app_private.has_property_permission(
        p_property_id, 'bookings', 'cancel'
      )
    union all
    select 'mark_no_show', 5
    where v_booking.status in ('reserved', 'confirmed')
      and v_booking.check_in < v_business_date
      and app_private.has_property_permission(
        p_property_id, 'bookings', 'no_show'
      )
    union all
    select 'reinstate', 6
    where v_booking.status in ('cancelled', 'no_show')
      and app_private.has_property_permission(
        p_property_id, 'bookings', 'reinstate'
      )
  ) a;

  select jsonb_strip_nulls(jsonb_build_object(
    'success', true,
    'property', jsonb_build_object(
      'id', p_property_id,
      'timezone', v_timezone,
      'business_date', v_business_date
    ),
    'role', v_role,
    'capabilities', jsonb_build_object(
      'view_finance', v_finance,
      'record_payment', app_private.has_property_permission(
        p_property_id, 'payments', 'create'
      )
    ),
    'allowed_actions', v_allowed_actions,
    'booking', jsonb_strip_nulls(jsonb_build_object(
      'id', v_booking.id,
      'booking_number', v_booking.booking_number,
      'status', v_booking.status,
      'check_in', v_booking.check_in,
      'check_out', v_booking.check_out,
      'checked_in_at', v_booking.checked_in_at,
      'checked_out_at', v_booking.checked_out_at,
      'adults', v_booking.adults,
      'children', v_booking.children,
      'total_guests', coalesce(
        v_booking.total_guests, v_booking.adults + v_booking.children
      ),
      'source', v_booking.booking_source,
      'special_requests', v_booking.special_requests,
      'created_at', v_booking.created_at,
      'cancellation_reason', v_booking.cancellation_reason,
      'cancelled_at', v_booking.cancelled_at,
      'no_show_reason', v_booking.no_show_reason,
      'no_show_at', v_booking.no_show_at,
      'settlement', case when v_finance then jsonb_build_object(
        'total', v_booking.total_price,
        'paid', v_paid,
        'balance', v_balance,
        'status', v_booking.payment_status
      ) end
    )),
    'guest', case when v_booking.guest_id is not null then
      jsonb_strip_nulls(jsonb_build_object(
        'id', v_guest.id,
        'title', v_guest.title,
        'first_name', v_guest.first_name,
        'middle_name', v_guest.middle_name,
        'last_name', v_guest.last_name,
        'name', nullif(btrim(concat_ws(
          ' ', v_guest.first_name, v_guest.middle_name, v_guest.last_name
        )), ''),
        'gender', v_guest.gender,
        'phone', v_guest.phone,
        'email', v_guest.email,
        'nationality', v_guest.nationality,
        'occupation', v_guest.occupation,
        'address', v_guest.address,
        'where_from', v_guest.where_from,
        'where_to', v_guest.where_to,
        'id_type', case when v_role in ('owner', 'manager') then v_guest.id_type end,
        'id_number', case when v_role in ('owner', 'manager') then v_guest.id_number end,
        'emergency_contact_name', case when v_role in ('owner', 'manager')
          then v_guest.emergency_contact_name end,
        'emergency_contact_phone', case when v_role in ('owner', 'manager')
          then v_guest.emergency_contact_phone end,
        'notes', case when v_role in ('owner', 'manager') then v_guest.notes end
      ))
    end,
    'room', jsonb_strip_nulls(jsonb_build_object(
      'id', v_room.id,
      'name', v_room.name,
      'room_type', v_room.room_type,
      'capacity', v_room.capacity,
      'bed_count', v_room.bed_count,
      'housekeeping_status', v_room.housekeeping_status,
      'operational_status', v_room.operational_status
    )),
    'activity', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', a.id::text,
        'event', a.event_type,
        'created_at', a.created_at,
        'actor', jsonb_build_object(
          'id', a.actor_id,
          'name', coalesce(up.display_name, 'System')
        ),
        'details', case when v_role = 'owner' then a.new_data end
      )) order by a.created_at desc, a.id desc)
      from public.audit_log a
      left join public.user_profiles up on up.user_id = a.actor_id
      where a.property_id = p_property_id
        and a.entity_type = 'booking'
        and a.entity_id = p_booking_id::text
    ), '[]'::jsonb),
    'payments', case when v_finance then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'amount', p.amount,
        'currency', p.currency,
        'method', coalesce(p.payment_method, p.method),
        'status', coalesce(p.payment_status, p.status),
        'reference', coalesce(p.transaction_reference, p.transaction_ref),
        'notes', p.notes,
        'paid_at', coalesce(p.paid_at, p.created_at),
        'received_by', p.received_by
      ) order by coalesce(p.paid_at, p.created_at) desc, p.id desc)
      from public.payments p
      where p.booking_id = p_booking_id
    ), '[]'::jsonb) end
  )) into v_result;

  return v_result;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 5. Booking creation, lifecycle and canonical payment recording.
-- ---------------------------------------------------------------------------

create or replace function public.create_property_booking(
  p_property_id uuid,
  p_idempotency_key uuid,
  p_room_id uuid,
  p_guest jsonb,
  p_existing_guest_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer default 1,
  p_children integer default 0,
  p_source text default 'front_desk',
  p_special_requests text default null,
  p_initial_payment_amount numeric default null,
  p_initial_payment_method text default null,
  p_initial_payment_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_room public.rooms%rowtype;
  v_guest_id uuid;
  v_guest public.guests%rowtype;
  v_booking public.bookings%rowtype;
  v_existing public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_business_date date;
  v_nights integer;
  v_total numeric;
  v_initial_amount numeric;
  v_payment_status text := 'unpaid';
  v_method_key text;
  v_method_label text;
  v_fingerprint text;
  v_attempt integer;
  v_booking_number text;
begin
  v_role := app_private.require_property_permission(
    p_property_id, 'bookings', 'create'
  );
  if p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'Idempotency key is required';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception using errcode = '22023', message = 'Check-out must be after check-in';
  end if;
  if coalesce(p_adults, 1) < 1 or coalesce(p_children, 0) < 0 then
    raise exception using errcode = '22023', message = 'Invalid guest count';
  end if;
  if p_existing_guest_id is not null and p_guest is not null
     and p_guest <> '{}'::jsonb then
    raise exception using
      errcode = '22023',
      message = 'Choose an existing guest or provide a new guest, not both';
  end if;

  v_fingerprint := md5(jsonb_build_object(
    'room_id', p_room_id,
    'existing_guest_id', p_existing_guest_id,
    'guest', coalesce(p_guest, '{}'::jsonb),
    'check_in', p_check_in,
    'check_out', p_check_out,
    'adults', coalesce(p_adults, 1),
    'children', coalesce(p_children, 0),
    'source', lower(btrim(coalesce(p_source, 'front_desk'))),
    'special_requests', nullif(btrim(coalesce(p_special_requests, '')), ''),
    'initial_payment_amount', round(coalesce(p_initial_payment_amount, 0), 2),
    'initial_payment_method', lower(btrim(coalesce(p_initial_payment_method, ''))),
    'initial_payment_reference', nullif(btrim(coalesce(p_initial_payment_reference, '')), '')
  )::text);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_property_id::text || ':' || p_idempotency_key::text, 0
    )
  );

  select b.* into v_existing
  from public.bookings b
  where b.property_id = p_property_id
    and b.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.idempotency_fingerprint is distinct from v_fingerprint then
      raise exception using
        errcode = '22023',
        message = 'Idempotency key was reused with different booking details';
    end if;
    return jsonb_build_object(
      'success', true,
      'replayed', true,
      'booking', jsonb_build_object(
        'id', v_existing.id,
        'booking_number', v_existing.booking_number,
        'status', v_existing.status,
        'total_price', v_existing.total_price,
        'payment_status', v_existing.payment_status
      )
    );
  end if;

  select r.* into v_room
  from public.rooms r
  join public.properties p on p.id = r.property_id
  where r.id = p_room_id
    and r.property_id = p_property_id
    and coalesce(r.is_active, false)
    and coalesce(p.status, false)
  for update of r;
  if not found then
    raise exception using errcode = 'P0002', message = 'Active room not found';
  end if;

  v_business_date := app_private.property_business_date(p_property_id);
  if p_check_in < v_business_date then
    raise exception using errcode = '22023', message = 'Check-in cannot be in the past';
  end if;
  if coalesce(p_adults, 1) + coalesce(p_children, 0)
      > coalesce(v_room.capacity, 0) then
    raise exception using errcode = '22023', message = 'Guest count exceeds room capacity';
  end if;
  if coalesce(v_room.operational_status, 'available') in (
    'maintenance', 'out_of_order'
  ) then
    raise exception using errcode = '22023', message = 'Room is out of service';
  end if;
  if exists (
    select 1
    from public.bookings b
    where b.room_id = p_room_id
      and b.status not in ('cancelled', 'no_show', 'checked_out')
      and p_check_in < b.check_out
      and p_check_out > b.check_in
  ) then
    raise exception using errcode = '23P01', message = 'Room is no longer available';
  end if;

  v_nights := p_check_out - p_check_in;
  v_total := round(v_room.price_per_night * v_nights, 2);
  if v_total <= 0 then
    raise exception using errcode = '22023', message = 'Room price is invalid';
  end if;

  if p_existing_guest_id is not null then
    select g.* into v_guest
    from public.guests g
    join public.property_guests pg
      on pg.guest_id = g.id and pg.property_id = p_property_id
    where g.id = p_existing_guest_id;
    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Guest is not associated with this property';
    end if;
    v_guest_id := v_guest.id;
  else
    if p_guest is null or jsonb_typeof(p_guest) <> 'object' then
      raise exception using errcode = '22023', message = 'Guest details are required';
    end if;
    if nullif(btrim(coalesce(p_guest->>'first_name', '')), '') is null
       or nullif(btrim(coalesce(p_guest->>'last_name', '')), '') is null
       or nullif(btrim(coalesce(p_guest->>'gender', '')), '') is null
       or nullif(btrim(coalesce(p_guest->>'phone', '')), '') is null then
      raise exception using
        errcode = '22023',
        message = 'Guest first name, last name, gender and phone are required';
    end if;

    insert into public.guests(
      title, first_name, middle_name, last_name, gender, date_of_birth,
      occupation, nationality, phone, email, address, where_from, where_to,
      id_type, id_number, emergency_contact_name, emergency_contact_phone,
      notes, updated_at
    ) values (
      nullif(btrim(coalesce(p_guest->>'title', '')), ''),
      btrim(p_guest->>'first_name'),
      nullif(btrim(coalesce(p_guest->>'middle_name', '')), ''),
      btrim(p_guest->>'last_name'),
      btrim(p_guest->>'gender'),
      case when nullif(p_guest->>'date_of_birth', '') is not null
        then (p_guest->>'date_of_birth')::date end,
      nullif(btrim(coalesce(p_guest->>'occupation', '')), ''),
      nullif(btrim(coalesce(p_guest->>'nationality', '')), ''),
      btrim(p_guest->>'phone'),
      nullif(lower(btrim(coalesce(p_guest->>'email', ''))), ''),
      nullif(btrim(coalesce(p_guest->>'address', '')), ''),
      nullif(btrim(coalesce(p_guest->>'where_from', '')), ''),
      nullif(btrim(coalesce(p_guest->>'where_to', '')), ''),
      nullif(btrim(coalesce(p_guest->>'id_type', '')), ''),
      nullif(btrim(coalesce(p_guest->>'id_number', '')), ''),
      nullif(btrim(coalesce(p_guest->>'emergency_contact_name', '')), ''),
      nullif(btrim(coalesce(p_guest->>'emergency_contact_phone', '')), ''),
      nullif(btrim(coalesce(p_guest->>'notes', '')), ''),
      now()
    ) returning * into v_guest;
    v_guest_id := v_guest.id;

    insert into public.property_guests(property_id, guest_id)
    values (p_property_id, v_guest_id)
    on conflict (property_id, guest_id) do nothing;
  end if;

  v_initial_amount := round(coalesce(p_initial_payment_amount, 0), 2);
  if v_initial_amount < 0 or v_initial_amount > v_total then
    raise exception using errcode = '22023', message = 'Invalid initial payment amount';
  end if;
  if v_initial_amount > 0 then
    if not app_private.has_property_permission(
      p_property_id, 'payments', 'create'
    ) then
      raise exception using
        errcode = '42501',
        message = 'Create the booking unpaid; payment permission is required';
    end if;
    v_method_key := lower(replace(btrim(coalesce(
      p_initial_payment_method, ''
    )), ' ', '_'));
    if v_method_key not in (
      'cash', 'card', 'mobile_money', 'bank_transfer', 'cheque', 'other'
    ) then
      raise exception using errcode = '22023', message = 'Unsupported payment method';
    end if;
    v_method_label := case v_method_key
      when 'cash' then 'Cash'
      when 'card' then 'Card'
      when 'mobile_money' then 'Mobile Money'
      when 'bank_transfer' then 'Bank Transfer'
      when 'cheque' then 'Cheque'
      else 'Other'
    end;
    v_payment_status := case
      when v_initial_amount = v_total then 'paid' else 'partial'
    end;
  end if;

  for v_attempt in 1..5 loop
    v_booking_number := 'LB-' || to_char(clock_timestamp(), 'YYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.bookings(
        booking_number, property_id, room_id, guest_id, created_by,
        check_in, check_out, adults, children, total_price,
        booking_source, status, payment_status, special_requests,
        idempotency_key, idempotency_fingerprint, updated_at
      ) values (
        v_booking_number, p_property_id, p_room_id, v_guest_id, v_user_id,
        p_check_in, p_check_out, coalesce(p_adults, 1), coalesce(p_children, 0),
        v_total,
        nullif(btrim(coalesce(p_source, 'front_desk')), ''),
        'confirmed', v_payment_status,
        nullif(btrim(coalesce(p_special_requests, '')), ''),
        p_idempotency_key, v_fingerprint, now()
      ) returning * into v_booking;
      exit;
    exception when unique_violation then
      if v_attempt = 5 then raise; end if;
    end;
  end loop;

  if v_initial_amount > 0 then
    insert into public.payments(
      booking_id, amount, currency, payment_method, payment_status,
      transaction_reference, received_by, notes,
      method, status, transaction_ref,
      idempotency_key, idempotency_fingerprint
    ) values (
      v_booking.id, v_initial_amount, 'TZS', v_method_label, 'completed',
      nullif(btrim(coalesce(p_initial_payment_reference, '')), ''),
      v_user_id, 'Initial booking payment',
      v_method_key, 'completed',
      nullif(btrim(coalesce(p_initial_payment_reference, '')), ''),
      p_idempotency_key, v_fingerprint
    ) returning * into v_payment;
  end if;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'booking', v_booking.id::text,
    'booking_created',
    jsonb_build_object(
      'booking_number', v_booking.booking_number,
      'room_id', v_booking.room_id,
      'guest_id', v_booking.guest_id,
      'status', v_booking.status,
      'total_price', v_booking.total_price,
      'initial_payment_id', v_payment.id,
      'source', v_booking.booking_source
    )
  );

  return jsonb_build_object(
    'success', true,
    'replayed', false,
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'booking_number', v_booking.booking_number,
      'status', v_booking.status,
      'total_price', v_booking.total_price,
      'payment_status', v_booking.payment_status
    ),
    'guest_id', v_guest_id,
    'payment_id', v_payment.id
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 7. Property guest directory and guest workspace.
-- ---------------------------------------------------------------------------

create or replace function public.list_property_guests(
  p_property_id uuid,
  p_query text default null,
  p_page integer default 1,
  p_page_size integer default 25,
  p_stay_filter text default 'all'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_role text;
  v_business_date date;
  v_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
  v_filter text := lower(btrim(coalesce(p_stay_filter, 'all')));
  v_finance boolean;
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(p_property_id, 'guests', 'view');
  if v_filter not in (
    'all', 'current', 'in_house', 'arriving', 'upcoming', 'past', 'returning'
  ) then
    raise exception using errcode = '22023', message = 'Invalid guest filter';
  end if;
  v_business_date := app_private.property_business_date(p_property_id);
  v_finance := app_private.can_view_property_finance(p_property_id);

  with base as (
    select
      g.*,
      pg.property_notes,
      pg.created_at as associated_at,
      coalesce(s.stay_count, 0)::integer as stay_count,
      coalesce(s.completed_stays, 0)::integer as completed_stays,
      coalesce(s.upcoming_stays, 0)::integer as upcoming_stays,
      s.last_check_out,
      s.next_check_in,
      coalesce(s.is_current, false) as is_current,
      coalesce(s.is_arriving, false) as is_arriving,
      coalesce(s.is_upcoming, false) as is_upcoming,
      s.current_stay,
      coalesce(s.booking_value, 0)::numeric as booking_value,
      coalesce(s.amount_paid, 0)::numeric as amount_paid
    from public.property_guests pg
    join public.guests g on g.id = pg.guest_id
    left join lateral (
      select
        count(*)::integer as stay_count,
        count(*) filter (where b.status = 'checked_out')::integer as completed_stays,
        count(*) filter (
          where b.status in ('pending', 'reserved', 'confirmed')
            and b.check_out >= v_business_date
        )::integer as upcoming_stays,
        max(b.check_out) filter (
          where b.status = 'checked_out' or b.check_out < v_business_date
        ) as last_check_out,
        min(b.check_in) filter (
          where b.status in ('pending', 'reserved', 'confirmed')
            and b.check_out >= v_business_date
        ) as next_check_in,
        bool_or(b.status = 'checked_in') as is_current,
        bool_or(
          b.status in ('pending', 'reserved', 'confirmed')
            and b.check_in = v_business_date
        ) as is_arriving,
        bool_or(
          b.status in ('pending', 'reserved', 'confirmed')
            and b.check_in > v_business_date
        ) as is_upcoming,
        (
          select jsonb_build_object(
            'booking_id', cb.id,
            'booking_number', cb.booking_number,
            'room_id', cb.room_id,
            'room_name', cr.name,
            'check_in', cb.check_in,
            'check_out', cb.check_out,
            'status', cb.status
          )
          from public.bookings cb
          join public.rooms cr on cr.id = cb.room_id
          where cb.property_id = p_property_id
            and cb.guest_id = g.id
            and cb.status = 'checked_in'
          order by cb.checked_in_at desc nulls last, cb.created_at desc, cb.id desc
          limit 1
        ) as current_stay,
        sum(b.total_price) filter (
          where b.status not in ('cancelled', 'no_show')
        ) as booking_value,
        (
          select sum(p.amount) filter (
            where coalesce(p.payment_status, p.status) = 'completed'
          )
          from public.payments p
          join public.bookings pb on pb.id = p.booking_id
          where pb.property_id = p_property_id and pb.guest_id = g.id
        ) as amount_paid
      from public.bookings b
      where b.property_id = p_property_id and b.guest_id = g.id
    ) s on true
    where pg.property_id = p_property_id
  ),
  filtered as (
    select b.*
    from base b
    where (
      v_query is null
      or concat_ws(' ', b.first_name, b.middle_name, b.last_name)
        ilike '%' || v_query || '%'
      or b.phone ilike '%' || v_query || '%'
      or coalesce(b.email, '') ilike '%' || v_query || '%'
    )
    and case v_filter
      when 'current' then b.is_current
      when 'in_house' then b.is_current
      when 'arriving' then b.is_arriving and not b.is_current
      when 'upcoming' then b.is_upcoming and not b.is_current
      when 'past' then b.last_check_out is not null
        and not b.is_current and not b.is_arriving and not b.is_upcoming
      when 'returning' then b.stay_count > 1
      else true
    end
  ),
  totals as (
    select
      (select count(*) from filtered)::integer as filtered_total,
      count(*)::integer as total,
      count(*) filter (where is_current)::integer as current_guests,
      count(*) filter (where is_arriving and not is_current)::integer as arriving_guests,
      count(*) filter (where is_upcoming and not is_current)::integer as upcoming_guests,
      count(*) filter (where stay_count > 1)::integer as returning_guests
    from base
  ),
  page_rows as (
    select f.*
    from filtered f
    order by f.is_current desc, f.next_check_in nulls last,
      f.last_check_out desc nulls last, lower(f.first_name), lower(f.last_name), f.id
    limit v_page_size offset ((v_page - 1) * v_page_size)
  )
  select jsonb_build_object(
    'success', true,
    'property_id', p_property_id,
    'business_date', v_business_date,
    'property', jsonb_build_object(
      'id', p_property_id,
      'timezone', app_private.property_timezone(p_property_id),
      'business_date', v_business_date
    ),
    'role', v_role,
    'capabilities', jsonb_build_object(
      'view_guests', true,
      'update_guest', app_private.has_property_permission(
        p_property_id, 'guests', 'update'
      ),
      'create_booking', app_private.has_property_permission(
        p_property_id, 'bookings', 'create'
      ),
      'view_finance', v_finance
    ),
    'total', t.filtered_total,
    'page', v_page,
    'page_size', v_page_size,
    'has_more', t.filtered_total > v_page * v_page_size,
    'summary', jsonb_build_object(
      'total_guests', t.total,
      'in_house', t.current_guests,
      'arriving_today', t.arriving_guests,
      'upcoming', t.upcoming_guests,
      'returning', t.returning_guests
    ),
    'guests', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', p.id,
        'name', nullif(btrim(concat_ws(
          ' ', p.first_name, p.middle_name, p.last_name
        )), ''),
        'first_name', p.first_name,
        'last_name', p.last_name,
        'phone', p.phone,
        'email', p.email,
        'nationality', p.nationality,
        'created_at', p.created_at,
        'associated_at', p.associated_at,
        'property_notes', case when v_role in ('owner', 'manager')
          then p.property_notes end,
        'total_stays', p.stay_count,
        'completed_stays', p.completed_stays,
        'upcoming_stays', p.upcoming_stays,
        'last_stay_date', p.last_check_out,
        'next_stay_date', p.next_check_in,
        'current_stay', p.current_stay,
        'stay_status', case
          when p.is_current then 'current'
          when p.is_upcoming then 'upcoming'
          when p.last_check_out is not null then 'past'
          else 'prospect'
        end,
        'commercial', case when v_finance then jsonb_build_object(
          'lifetime_booked', p.booking_value,
          'total_collected', p.amount_paid,
          'outstanding_balance', greatest(p.booking_value - p.amount_paid, 0),
          'average_stay_value', case when p.stay_count > 0
            then round(p.booking_value / p.stay_count, 2) else 0 end
        ) end
      )) order by p.is_current desc, p.next_check_in nulls last,
        p.last_check_out desc nulls last, lower(p.first_name), lower(p.last_name), p.id)
      from page_rows p
    ), '[]'::jsonb)
  ) into v_result
  from totals t;

  return v_result;
end;
$fn$;

create or replace function public.get_guest_workspace(
  p_property_id uuid,
  p_guest_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_role text;
  v_guest public.guests%rowtype;
  v_property_notes text;
  v_business_date date;
  v_finance boolean;
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(p_property_id, 'guests', 'view');
  select g.*
  into v_guest
  from public.property_guests pg
  join public.guests g on g.id = pg.guest_id
  where pg.property_id = p_property_id and pg.guest_id = p_guest_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Guest not found';
  end if;
  select pg.property_notes into v_property_notes
  from public.property_guests pg
  where pg.property_id = p_property_id and pg.guest_id = p_guest_id;
  v_business_date := app_private.property_business_date(p_property_id);
  v_finance := app_private.can_view_property_finance(p_property_id);

  with stays as (
    select
      b.*,
      r.name as room_name,
      r.room_type,
      coalesce((
        select sum(p.amount) from public.payments p
        where p.booking_id = b.id
          and coalesce(p.payment_status, p.status) = 'completed'
      ), 0)::numeric as amount_paid
    from public.bookings b
    join public.rooms r on r.id = b.room_id
    where b.property_id = p_property_id and b.guest_id = p_guest_id
  ),
  summary as (
    select
      count(*)::integer as stays,
      count(*) filter (where status = 'checked_out')::integer as completed_stays,
      coalesce(sum(greatest(check_out - check_in, 0)) filter (
        where status not in ('cancelled', 'no_show')
      ), 0)::integer as room_nights,
      max(check_out) filter (where status = 'checked_out') as last_stay,
      min(check_in) filter (
        where status in ('pending', 'reserved', 'confirmed')
          and check_out >= v_business_date
      ) as next_stay,
      coalesce(bool_or(status = 'checked_in'), false) as is_in_house,
      coalesce(sum(total_price) filter (
        where status not in ('cancelled', 'no_show')
      ), 0)::numeric as booking_value,
      coalesce(sum(amount_paid), 0)::numeric as amount_paid
    from stays
  )
  select jsonb_build_object(
    'success', true,
    'property_id', p_property_id,
    'business_date', v_business_date,
    'property', jsonb_build_object(
      'id', p_property_id,
      'timezone', app_private.property_timezone(p_property_id),
      'business_date', v_business_date
    ),
    'role', v_role,
    'capabilities', jsonb_build_object(
      'update_guest', app_private.has_property_permission(
        p_property_id, 'guests', 'update'
      ),
      'create_booking', app_private.has_property_permission(
        p_property_id, 'bookings', 'create'
      ),
      'view_finance', v_finance
    ),
    'guest', jsonb_strip_nulls(jsonb_build_object(
      'id', v_guest.id,
      'title', v_guest.title,
      'first_name', v_guest.first_name,
      'middle_name', v_guest.middle_name,
      'last_name', v_guest.last_name,
      'name', nullif(btrim(concat_ws(
        ' ', v_guest.first_name, v_guest.middle_name, v_guest.last_name
      )), ''),
      'gender', v_guest.gender,
      'date_of_birth', case when v_role in ('owner', 'manager')
        then v_guest.date_of_birth end,
      'occupation', v_guest.occupation,
      'nationality', v_guest.nationality,
      'phone', v_guest.phone,
      'email', v_guest.email,
      'address', v_guest.address,
      'where_from', v_guest.where_from,
      'where_to', v_guest.where_to,
      'id_type', case when v_role in ('owner', 'manager') then v_guest.id_type end,
      'id_number', case when v_role in ('owner', 'manager') then v_guest.id_number end,
      'emergency_contact_name', case when v_role in ('owner', 'manager')
        then v_guest.emergency_contact_name end,
      'emergency_contact_phone', case when v_role in ('owner', 'manager')
        then v_guest.emergency_contact_phone end,
      'notes', case when v_role in ('owner', 'manager') then v_guest.notes end,
      'property_notes', case when v_role in ('owner', 'manager')
        then v_property_notes end,
      'created_at', v_guest.created_at,
      'updated_at', v_guest.updated_at
    )),
    'summary', jsonb_build_object(
      'total_stays', s.stays,
      'total_nights', s.room_nights,
      'last_stay_date', s.last_stay,
      'next_stay_date', s.next_stay,
      'is_in_house', s.is_in_house
    ),
    'stays', jsonb_build_object(
      'current', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', x.id, 'booking_number', x.booking_number,
          'status', x.status, 'check_in', x.check_in, 'check_out', x.check_out,
          'room_id', x.room_id, 'room_name', x.room_name, 'room_type', x.room_type,
          'total_guests', coalesce(x.total_guests, x.adults + x.children),
          'source', x.booking_source, 'created_at', x.created_at,
          'settlement', case when v_finance then jsonb_build_object(
            'total', x.total_price,
            'paid', x.amount_paid,
            'balance', greatest(x.total_price - x.amount_paid, 0),
            'status', x.payment_status
          ) end
        ) order by x.check_in)
        from stays x where x.status = 'checked_in'
      ), '[]'::jsonb),
      'upcoming', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', x.id, 'booking_number', x.booking_number,
          'status', x.status, 'check_in', x.check_in, 'check_out', x.check_out,
          'room_id', x.room_id, 'room_name', x.room_name, 'room_type', x.room_type,
          'total_guests', coalesce(x.total_guests, x.adults + x.children),
          'source', x.booking_source, 'created_at', x.created_at,
          'settlement', case when v_finance then jsonb_build_object(
            'total', x.total_price,
            'paid', x.amount_paid,
            'balance', greatest(x.total_price - x.amount_paid, 0),
            'status', x.payment_status
          ) end
        ) order by x.check_in)
        from stays x
        where x.status in ('pending', 'reserved', 'confirmed')
          and x.check_out >= v_business_date
      ), '[]'::jsonb),
      'past', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', x.id, 'booking_number', x.booking_number,
          'status', x.status, 'check_in', x.check_in, 'check_out', x.check_out,
          'room_id', x.room_id, 'room_name', x.room_name, 'room_type', x.room_type,
          'total_guests', coalesce(x.total_guests, x.adults + x.children),
          'source', x.booking_source, 'created_at', x.created_at,
          'settlement', case when v_finance then jsonb_build_object(
            'total', x.total_price,
            'paid', x.amount_paid,
            'balance', greatest(x.total_price - x.amount_paid, 0),
            'status', x.payment_status
          ) end
        ) order by x.check_out desc)
        from (
          select sx.*
          from stays sx
          where sx.status in ('checked_out', 'cancelled', 'no_show')
            or sx.check_out < v_business_date
          order by sx.check_out desc, sx.created_at desc, sx.id desc
          limit 20
        ) x
      ), '[]'::jsonb),
      'past_limit', 20
    ),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id::text,
        'type', a.event_type,
        'at', a.created_at,
        'actor', jsonb_build_object(
          'id', a.actor_id,
          'name', coalesce(a.actor_name, 'System')
        ),
        'summary', initcap(replace(a.event_type, '_', ' ')),
        'metadata', jsonb_build_object(
          'entity_type', a.entity_type,
          'entity_id', a.entity_id
        )
      ) order by a.created_at desc, a.id desc)
      from (
        select al.*, up.display_name as actor_name
        from public.audit_log al
        left join public.user_profiles up on up.user_id = al.actor_id
        where al.property_id = p_property_id
          and (
            (al.entity_type = 'guest' and al.entity_id = p_guest_id::text)
            or (al.entity_type = 'booking' and al.entity_id in (
              select b.id::text from stays b
            ))
          )
        order by al.created_at desc, al.id desc
        limit 50
      ) a
    ), '[]'::jsonb),
    'commercial', case when v_finance then jsonb_build_object(
      'lifetime_booked', s.booking_value,
      'total_collected', s.amount_paid,
      'outstanding_balance', greatest(s.booking_value - s.amount_paid, 0),
      'average_stay_value', case when s.stays > 0
        then round(s.booking_value / s.stays, 2) else 0 end
    ) end
  ) into v_result
  from summary s;

  return v_result;
end;
$fn$;

create or replace function public.update_property_guest(
  p_property_id uuid,
  p_guest_id uuid,
  p_guest jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_old public.guests%rowtype;
  v_new public.guests%rowtype;
  v_first_name text;
  v_last_name text;
  v_gender text;
  v_phone text;
  v_email text;
  v_dob_text text;
  v_dob date;
  v_property_notes text;
begin
  v_role := app_private.require_property_permission(
    p_property_id, 'guests', 'update'
  );
  if p_guest is null or jsonb_typeof(p_guest) <> 'object' then
    raise exception using errcode = '22023', message = 'Guest details are required';
  end if;
  if v_role not in ('owner', 'manager') and p_guest ?| array[
    'date_of_birth', 'id_type', 'id_number',
    'emergency_contact_name', 'emergency_contact_phone',
    'notes', 'property_notes'
  ] then
    raise exception using
      errcode = '42501',
      message = 'Sensitive guest fields require manager access';
  end if;

  v_first_name := nullif(btrim(coalesce(p_guest->>'first_name', '')), '');
  v_last_name := nullif(btrim(coalesce(p_guest->>'last_name', '')), '');
  v_gender := nullif(btrim(coalesce(p_guest->>'gender', '')), '');
  v_phone := nullif(btrim(coalesce(p_guest->>'phone', '')), '');
  v_email := nullif(lower(btrim(coalesce(p_guest->>'email', ''))), '');
  v_dob_text := nullif(btrim(coalesce(p_guest->>'date_of_birth', '')), '');
  if v_first_name is null or v_last_name is null
     or v_gender is null or v_phone is null then
    raise exception using
      errcode = '22023',
      message = 'Guest first name, last name, gender and phone are required';
  end if;
  if length(v_first_name) > 100 or length(v_last_name) > 100
     or length(v_gender) > 32
     or length(v_phone) < 5 or length(v_phone) > 32 then
    raise exception using errcode = '22023', message = 'Guest details exceed allowed lengths';
  end if;
  if v_phone !~ '^[0-9+() .-]{5,32}$' then
    raise exception using errcode = '22023', message = 'Invalid guest phone';
  end if;
  if v_email is not null and (
    length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then
    raise exception using errcode = '22023', message = 'Invalid guest email';
  end if;
  if length(btrim(coalesce(p_guest->>'title', ''))) > 32
     or length(btrim(coalesce(p_guest->>'middle_name', ''))) > 100
     or length(btrim(coalesce(p_guest->>'occupation', ''))) > 120
     or length(btrim(coalesce(p_guest->>'nationality', ''))) > 80
     or length(btrim(coalesce(p_guest->>'address', ''))) > 500
     or length(btrim(coalesce(p_guest->>'where_from', ''))) > 160
     or length(btrim(coalesce(p_guest->>'where_to', ''))) > 160
     or length(btrim(coalesce(p_guest->>'id_type', ''))) > 80
     or length(btrim(coalesce(p_guest->>'id_number', ''))) > 120
     or length(btrim(coalesce(p_guest->>'emergency_contact_name', ''))) > 160
     or length(btrim(coalesce(p_guest->>'emergency_contact_phone', ''))) > 32
     or length(btrim(coalesce(p_guest->>'notes', ''))) > 1000
     or length(btrim(coalesce(p_guest->>'property_notes', ''))) > 1000 then
    raise exception using errcode = '22023', message = 'Guest details exceed allowed lengths';
  end if;
  if nullif(btrim(coalesce(p_guest->>'emergency_contact_phone', '')), '')
       is not null
     and btrim(p_guest->>'emergency_contact_phone') !~ '^[0-9+() .-]{5,32}$' then
    raise exception using errcode = '22023', message = 'Invalid emergency contact phone';
  end if;
  if (p_guest ? 'id_type' or p_guest ? 'id_number') and (
    (nullif(btrim(coalesce(p_guest->>'id_type', '')), '') is null)
    <> (nullif(btrim(coalesce(p_guest->>'id_number', '')), '') is null)
  ) then
    raise exception using
      errcode = '22023', message = 'ID type and ID number must be provided together';
  end if;
  if v_dob_text is not null then
    begin
      v_dob := v_dob_text::date;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception using errcode = '22023', message = 'Invalid date of birth';
    end;
    if v_dob > app_private.property_business_date(p_property_id) then
      raise exception using errcode = '22023', message = 'Date of birth cannot be in the future';
    end if;
  end if;

  select pg.property_notes into v_property_notes
  from public.property_guests pg
  where pg.property_id = p_property_id and pg.guest_id = p_guest_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Guest not found';
  end if;

  select g.* into v_old
  from public.guests g
  where g.id = p_guest_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Guest not found';
  end if;

  update public.guests
  set title = case when p_guest ? 'title'
        then nullif(btrim(coalesce(p_guest->>'title', '')), '') else title end,
      first_name = v_first_name,
      middle_name = case when p_guest ? 'middle_name'
        then nullif(btrim(coalesce(p_guest->>'middle_name', '')), '') else middle_name end,
      last_name = v_last_name,
      gender = v_gender,
      date_of_birth = case when p_guest ? 'date_of_birth' then v_dob else date_of_birth end,
      occupation = case when p_guest ? 'occupation'
        then nullif(btrim(coalesce(p_guest->>'occupation', '')), '') else occupation end,
      nationality = case when p_guest ? 'nationality'
        then nullif(btrim(coalesce(p_guest->>'nationality', '')), '') else nationality end,
      phone = v_phone,
      email = case when p_guest ? 'email' then v_email else email end,
      address = case when p_guest ? 'address'
        then nullif(btrim(coalesce(p_guest->>'address', '')), '') else address end,
      where_from = case when p_guest ? 'where_from'
        then nullif(btrim(coalesce(p_guest->>'where_from', '')), '') else where_from end,
      where_to = case when p_guest ? 'where_to'
        then nullif(btrim(coalesce(p_guest->>'where_to', '')), '') else where_to end,
      id_type = case when p_guest ? 'id_type'
        then nullif(btrim(coalesce(p_guest->>'id_type', '')), '') else id_type end,
      id_number = case when p_guest ? 'id_number'
        then nullif(btrim(coalesce(p_guest->>'id_number', '')), '') else id_number end,
      emergency_contact_name = case when p_guest ? 'emergency_contact_name'
        then nullif(btrim(coalesce(p_guest->>'emergency_contact_name', '')), '')
        else emergency_contact_name end,
      emergency_contact_phone = case when p_guest ? 'emergency_contact_phone'
        then nullif(btrim(coalesce(p_guest->>'emergency_contact_phone', '')), '')
        else emergency_contact_phone end,
      notes = case when p_guest ? 'notes'
        then nullif(btrim(coalesce(p_guest->>'notes', '')), '') else notes end,
      updated_at = now()
  where id = p_guest_id
  returning * into v_new;

  if p_guest ? 'property_notes' then
    update public.property_guests
    set property_notes = nullif(btrim(coalesce(p_guest->>'property_notes', '')), ''),
        updated_at = now()
    where property_id = p_property_id and guest_id = p_guest_id
    returning property_notes into v_property_notes;
  end if;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'guest', p_guest_id::text, 'guest_updated',
    to_jsonb(v_old), to_jsonb(v_new) || jsonb_build_object(
      'property_notes', v_property_notes
    )
  );

  return jsonb_build_object(
    'success', true,
    'guest', jsonb_strip_nulls(jsonb_build_object(
      'id', v_new.id,
      'title', v_new.title,
      'first_name', v_new.first_name,
      'middle_name', v_new.middle_name,
      'last_name', v_new.last_name,
      'name', nullif(btrim(concat_ws(
        ' ', v_new.first_name, v_new.middle_name, v_new.last_name
      )), ''),
      'gender', v_new.gender,
      'date_of_birth', case when v_role in ('owner', 'manager') then v_new.date_of_birth end,
      'occupation', v_new.occupation,
      'nationality', v_new.nationality,
      'phone', v_new.phone,
      'email', v_new.email,
      'address', v_new.address,
      'where_from', v_new.where_from,
      'where_to', v_new.where_to,
      'id_type', case when v_role in ('owner', 'manager') then v_new.id_type end,
      'id_number', case when v_role in ('owner', 'manager') then v_new.id_number end,
      'emergency_contact_name', case when v_role in ('owner', 'manager')
        then v_new.emergency_contact_name end,
      'emergency_contact_phone', case when v_role in ('owner', 'manager')
        then v_new.emergency_contact_phone end,
      'notes', case when v_role in ('owner', 'manager') then v_new.notes end,
      'property_notes', case when v_role in ('owner', 'manager') then v_property_notes end,
      'created_at', v_new.created_at,
      'updated_at', v_new.updated_at
    ))
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 8. Calendar, finance, payments and property reports.
-- ---------------------------------------------------------------------------

create or replace function public.get_property_calendar(
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
  v_timezone text;
  v_business_date date;
begin
  perform app_private.require_property_permission(p_property_id, 'bookings', 'view');
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception using errcode = '22023', message = 'Invalid calendar range';
  end if;
  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);

  return jsonb_build_object(
    'property', jsonb_build_object(
      'business_date', v_business_date,
      'timezone', v_timezone
    ),
    'range', jsonb_build_object('from', p_from, 'to', p_to),
    'rooms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'room_type', r.room_type,
        'is_active', coalesce(r.is_active, false),
        'housekeeping_status', r.housekeeping_status
      ) order by lower(r.name), r.id)
      from public.rooms r
      where r.property_id = p_property_id
    ), '[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'booking_number', b.booking_number,
        'room_id', b.room_id,
        'room_name', r.name,
        'guest_name', coalesce(
          nullif(btrim(concat_ws(' ', g.first_name, g.last_name)), ''),
          'Guest'
        ),
        'check_in', b.check_in,
        'check_out', b.check_out,
        'status', b.status,
        'total_guests', coalesce(b.total_guests, b.adults + b.children)
      ) order by b.check_in, lower(r.name), b.id)
      from public.bookings b
      join public.rooms r on r.id = b.room_id and r.property_id = b.property_id
      left join public.guests g on g.id = b.guest_id
      where b.property_id = p_property_id
        and b.check_in <= p_to
        and b.check_out > p_from
    ), '[]'::jsonb)
  );
end;
$fn$;

create or replace function public.get_owner_finance_dashboard(
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
  v_role := app_private.require_property_permission(p_property_id, 'payments', 'view');
  if v_role <> 'owner' then
    raise exception using errcode = '42501', message = 'Owner finance access required';
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
          and coalesce(p.payment_status, p.status) = 'completed'
          and (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date = d.day
      ), 0)::numeric as collected,
      (select count(*) from public.bookings b
        where b.property_id = p_property_id and b.check_in = d.day
          and b.status not in ('cancelled', 'no_show'))::integer as bookings,
      (select count(*) from public.bookings b
        where b.property_id = p_property_id
          and b.status not in ('cancelled', 'no_show')
          and b.check_in <= d.day and b.check_out > d.day)::integer as occupied_rooms
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
        where coalesce(p.payment_status, p.status) = 'refunded'
      ), 0)::numeric as refunds,
      count(*) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
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
      'outstanding', bt.outstanding,
      'refunds', pt.refunds,
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
          coalesce(p.payment_method, initcap(replace(p.method, '_', ' ')), 'Other') as method,
          sum(p.amount)::numeric as amount,
          count(*)::integer as count
        from public.payments p
        join public.bookings b on b.id = p.booking_id
        where b.property_id = p_property_id
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
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_role text;
  v_timezone text;
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_method text := nullif(lower(replace(btrim(coalesce(p_method, '')), ' ', '_')), '');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(p_property_id, 'payments', 'view');
  if v_role <> 'owner' then
    raise exception using errcode = '42501', message = 'Owner finance access required';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception using errcode = '22023', message = 'Invalid payment range';
  end if;
  v_timezone := app_private.property_timezone(p_property_id);

  with filtered as (
    select
      p.*,
      b.booking_number,
      concat_ws(' ', g.first_name, g.last_name) as guest_name,
      up.display_name as receiver_name
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    left join public.guests g on g.id = b.guest_id
    left join public.user_profiles up on up.user_id = p.received_by
    where b.property_id = p_property_id
      and (p_from is null or
        (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date >= p_from)
      and (p_to is null or
        (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date <= p_to)
      and (v_status is null or lower(coalesce(p.payment_status, p.status)) = v_status)
      and (
        v_method is null
        or lower(replace(btrim(coalesce(
          p.method, p.payment_method, ''
        )), ' ', '_')) = v_method
      )
      and (
        v_search is null
        or b.booking_number ilike '%' || v_search || '%'
        or concat_ws(' ', g.first_name, g.last_name) ilike '%' || v_search || '%'
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
        'status', coalesce(p.payment_status, p.status),
        'paid_at', coalesce(p.paid_at, p.created_at),
        'receiver_name', coalesce(p.receiver_name, 'System'),
        'reference', coalesce(p.transaction_reference, p.transaction_ref)
      ) order by coalesce(p.paid_at, p.created_at) desc, p.id desc)
      from page_rows p
    ), '[]'::jsonb),
    'total', (select count(*)::integer from filtered)
  ) into v_result;
  return v_result;
end;
$fn$;

create or replace function public.get_property_reports(
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
  v_rooms integer;
  v_days integer;
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(p_property_id, 'reports', 'view');
  if v_role <> 'owner' then
    raise exception using errcode = '42501', message = 'Owner report access required';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception using errcode = '22023', message = 'Invalid report range';
  end if;
  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  v_days := p_to - p_from + 1;
  select count(*)::integer into v_rooms
  from public.rooms r
  where r.property_id = p_property_id and coalesce(r.is_active, false);

  with dates as (
    select d::date as day from generate_series(p_from, p_to, interval '1 day') d
  ),
  valid_bookings as (
    select b.*, r.name as room_name, r.room_type,
      b.total_price / greatest(b.check_out - b.check_in, 1) as nightly_revenue
    from public.bookings b
    join public.rooms r on r.id = b.room_id
    where b.property_id = p_property_id
      and b.status not in ('cancelled', 'no_show')
      and b.check_in <= p_to and b.check_out > p_from
  ),
  daily as (
    select
      d.day,
      coalesce(sum(v.nightly_revenue) filter (
        where v.check_in <= d.day and v.check_out > d.day
      ), 0)::numeric as room_revenue,
      coalesce((
        select sum(p.amount)
        from public.payments p
        join public.bookings b on b.id = p.booking_id
        where b.property_id = p_property_id
          and coalesce(p.payment_status, p.status) = 'completed'
          and (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date = d.day
      ), 0)::numeric as collected,
      count(v.id) filter (
        where v.check_in <= d.day and v.check_out > d.day
      )::integer as room_nights
    from dates d
    left join valid_bookings v on true
    group by d.day
  ),
  summary as (
    select
      coalesce(sum(d.room_revenue), 0)::numeric as room_revenue,
      coalesce(sum(d.collected), 0)::numeric as collected,
      coalesce(sum(d.room_nights), 0)::integer as room_nights,
      (select count(*) from valid_bookings)::integer as bookings,
      (select count(*) from public.bookings b
        where b.property_id = p_property_id and b.status = 'cancelled'
          and (b.cancelled_at at time zone v_timezone)::date
            between p_from and p_to)::integer as cancellations
    from daily d
  )
  select jsonb_build_object(
    'property', jsonb_build_object(
      'business_date', v_business_date,
      'timezone', v_timezone
    ),
    'summary', jsonb_build_object(
      'room_revenue', s.room_revenue,
      'collected', s.collected,
      'occupancy_rate', case when v_rooms * v_days > 0
        then round(s.room_nights * 100.0 / (v_rooms * v_days), 2) else 0 end,
      'average_daily_rate', case when s.room_nights > 0
        then round(s.room_revenue / s.room_nights, 2) else 0 end,
      'revenue_per_available_room', case when v_rooms * v_days > 0
        then round(s.room_revenue / (v_rooms * v_days), 2) else 0 end,
      'room_nights', s.room_nights,
      'bookings', s.bookings,
      'cancellations', s.cancellations
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', d.day,
        'room_revenue', d.room_revenue,
        'collected', d.collected,
        'occupancy_rate', case when v_rooms > 0
          then round(d.room_nights * 100.0 / v_rooms, 2) else 0 end,
        'room_nights', d.room_nights
      ) order by d.day) from daily d
    ), '[]'::jsonb),
    'rooms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'room_id', x.room_id,
        'room_name', x.room_name,
        'room_type', x.room_type,
        'room_revenue', x.room_revenue,
        'room_nights', x.room_nights,
        'occupancy_rate', round(x.room_nights * 100.0 / v_days, 2)
      ) order by x.room_revenue desc, lower(x.room_name))
      from (
        select v.room_id, v.room_name, v.room_type,
          sum(v.nightly_revenue * greatest(
            least(v.check_out, p_to + 1) - greatest(v.check_in, p_from), 0
          ))::numeric as room_revenue,
          sum(greatest(
            least(v.check_out, p_to + 1) - greatest(v.check_in, p_from), 0
          ))::integer as room_nights
        from valid_bookings v
        group by v.room_id, v.room_name, v.room_type
      ) x
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source', x.source,
        'bookings', x.bookings,
        'revenue', x.revenue
      ) order by x.revenue desc, x.source)
      from (
        select coalesce(nullif(btrim(v.booking_source), ''), 'Unknown') as source,
          count(*)::integer as bookings,
          sum(v.nightly_revenue * greatest(
            least(v.check_out, p_to + 1) - greatest(v.check_in, p_from), 0
          ))::numeric as revenue
        from valid_bookings v
        group by 1
      ) x
    ), '[]'::jsonb)
  ) into v_result
  from summary s;

  return v_result;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 9. Property activity.
-- ---------------------------------------------------------------------------

create or replace function public.list_property_activity(
  p_property_id uuid,
  p_event_type text default null,
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
  v_category text := nullif(lower(btrim(coalesce(p_event_type, ''))), '');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(p_property_id, 'activity', 'view');
  if v_category is not null and v_category not in (
    'booking', 'payment', 'room', 'property'
  ) then
    raise exception using errcode = '22023', message = 'Invalid activity category';
  end if;

  with filtered as (
    select a.*, up.display_name as actor_name, up.email as actor_email
    from public.audit_log a
    left join public.user_profiles up on up.user_id = a.actor_id
    where a.property_id = p_property_id
      and case v_category
        when 'booking' then a.entity_type = 'booking'
          and a.event_type not ilike 'payment%'
        when 'payment' then a.event_type ilike 'payment%'
        when 'room' then a.entity_type = 'room'
        when 'property' then a.entity_type = 'property'
        else true
      end
  ),
  page_rows as (
    select * from filtered
    order by created_at desc, id desc
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id::text,
        'event_type', a.event_type,
        'entity_type', a.entity_type,
        'entity_id', a.entity_id,
        'actor_name', coalesce(a.actor_name, 'System'),
        'actor_email', case when v_role in ('owner', 'manager')
          then a.actor_email end,
        'description', initcap(replace(a.event_type, '_', ' ')),
        'created_at', a.created_at
      ) order by a.created_at desc, a.id desc)
      from page_rows a
    ), '[]'::jsonb),
    'total', (select count(*)::integer from filtered)
  ) into v_result;
  return v_result;
end;
$fn$;

create or replace function public.get_property_activity_feed(
  p_property_id uuid,
  p_entity_type text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.list_property_activity(
    p_property_id, p_entity_type, p_limit, p_offset
  );
$fn$;

-- ---------------------------------------------------------------------------
-- 10. Notification inbox and invitation rejection.
-- ---------------------------------------------------------------------------

create or replace function public.list_my_notifications(
  p_property_id uuid default null,
  p_unread_only boolean default false,
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
  v_user_id uuid := (select auth.uid());
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_property_id is not null then
    perform app_private.require_property_permission(
      p_property_id, 'notifications', 'view'
    );
  end if;

  with filtered as (
    select n.*
    from public.notifications n
    where n.user_id = v_user_id
      and (p_property_id is null or n.property_id = p_property_id)
      and (not coalesce(p_unread_only, false) or not coalesce(n.is_read, false))
      and (
        n.property_id is null
        or app_private.has_property_permission(
          n.property_id, 'notifications', 'view'
        )
      )
  ),
  page_rows as (
    select * from filtered
    order by created_at desc nulls last, id desc
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id,
        'title', n.title,
        'body', n.body,
        'type', n.type,
        'priority', n.priority,
        'is_read', coalesce(n.is_read, false),
        'created_at', n.created_at,
        'data', coalesce(n.data, '{}'::jsonb)
      ) order by n.created_at desc nulls last, n.id desc)
      from page_rows n
    ), '[]'::jsonb),
    'total', (select count(*)::integer from filtered),
    'unread_count', (
      select count(*)::integer
      from public.notifications n
      where n.user_id = v_user_id
        and (p_property_id is null or n.property_id = p_property_id)
        and not coalesce(n.is_read, false)
        and (
          n.property_id is null
          or app_private.has_property_permission(
            n.property_id, 'notifications', 'view'
          )
        )
    )
  ) into v_result;
  return v_result;
end;
$fn$;

create or replace function public.list_notifications(
  p_limit integer default 50,
  p_offset integer default 0,
  p_unread_only boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.list_my_notifications(
    null, p_unread_only, p_limit, p_offset
  );
$fn$;

create or replace function public.set_notification_read(
  p_notification_id uuid,
  p_is_read boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_notification public.notifications%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  select n.* into v_notification
  from public.notifications n
  where n.id = p_notification_id and n.user_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Notification not found';
  end if;
  if v_notification.property_id is not null then
    perform app_private.require_property_permission(
      v_notification.property_id, 'notifications', 'view'
    );
  end if;
  update public.notifications
  set is_read = coalesce(p_is_read, true)
  where id = p_notification_id and user_id = v_user_id
  returning * into v_notification;
  return jsonb_build_object(
    'success', true,
    'id', v_notification.id,
    'is_read', coalesce(v_notification.is_read, false)
  );
end;
$fn$;

-- The legacy RPC returns void. PostgreSQL cannot change an existing function's
-- return type through CREATE OR REPLACE, so replace the identity explicitly.
drop function if exists public.mark_notification_read(uuid);

create function public.mark_notification_read(p_notification_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $fn$
  select public.set_notification_read(p_notification_id, true);
$fn$;

create or replace function public.mark_all_notifications_read(
  p_property_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_property_id is not null then
    perform app_private.require_property_permission(
      p_property_id, 'notifications', 'view'
    );
  end if;
  update public.notifications n
  set is_read = true
  where n.user_id = v_user_id
    and not coalesce(n.is_read, false)
    and (p_property_id is null or n.property_id = p_property_id)
    and (
      n.property_id is null
      or app_private.has_property_permission(
        n.property_id, 'notifications', 'view'
      )
    );
  get diagnostics v_count = row_count;
  return jsonb_build_object('success', true, 'updated', v_count);
end;
$fn$;

alter table public.property_invitations
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id);

create or replace function public.reject_property_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_invitation public.property_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    raise exception using errcode = '22023', message = 'Invitation token is required';
  end if;
  select lower(u.email) into v_email
  from auth.users u where u.id = v_user_id;
  select i.* into v_invitation
  from public.property_invitations i
  where upper(i.token) = upper(btrim(p_token))
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Invitation not found';
  end if;
  if lower(coalesce(v_invitation.status, '')) <> 'pending' then
    raise exception using errcode = '22023', message = 'Invitation is no longer pending';
  end if;
  if v_invitation.expires_at is not null and v_invitation.expires_at <= now() then
    raise exception using errcode = '22023', message = 'Invitation has expired';
  end if;
  if v_email is null or lower(v_invitation.email) <> v_email then
    raise exception using errcode = '42501', message = 'Invitation belongs to another user';
  end if;

  update public.property_invitations
  set status = 'rejected', rejected_at = now(), rejected_by = v_user_id
  where id = v_invitation.id
  returning * into v_invitation;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    v_invitation.property_id, v_user_id, 'property_invitation',
    v_invitation.id::text, 'property_invitation_rejected',
    jsonb_build_object('email', v_invitation.email, 'role', v_invitation.role)
  );
  return jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation.id,
    'property_id', v_invitation.property_id,
    'status', v_invitation.status
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 11. Property settings and personal profile.
-- ---------------------------------------------------------------------------

create or replace function public.get_property_settings(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_role text;
  v_property public.properties%rowtype;
begin
  v_role := app_private.require_property_permission(p_property_id, 'property', 'view');
  select p.* into v_property from public.properties p where p.id = p_property_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;
  return jsonb_build_object(
    'property', jsonb_strip_nulls(jsonb_build_object(
      'id', v_property.id,
      'name', v_property.name,
      'description', v_property.description,
      'property_type', v_property.property_type,
      'phone', v_property.phone,
      'email', v_property.email,
      'country', v_property.country,
      'region', v_property.region,
      'district', v_property.district,
      'ward', v_property.ward,
      'street', v_property.street,
      'formatted_address', v_property.formatted_address,
      'place_id', v_property.place_id,
      'latitude', v_property.latitude,
      'longitude', v_property.longitude,
      'timezone', app_private.property_timezone(p_property_id),
      'checkin_time', v_property.checkin_time,
      'checkout_time', v_property.checkout_time,
      'amenities', v_property.amenities,
      'images', v_property.images,
      'is_active', coalesce(v_property.status, false),
      'updated_at', v_property.updated_at
    )),
    'role', v_role,
    'capabilities', jsonb_build_object(
      'update_property', app_private.has_property_permission(
        p_property_id, 'property', 'update'
      ),
      'manage_property', app_private.has_property_permission(
        p_property_id, 'property', 'update'
      ),
      'change_visibility', v_role = 'owner'
    )
  );
end;
$fn$;

create or replace function public.update_property_profile(
  p_property_id uuid,
  p_name text,
  p_description text default null,
  p_property_type text default null,
  p_phone text default null,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_old public.properties%rowtype;
  v_new public.properties%rowtype;
begin
  perform app_private.require_property_permission(p_property_id, 'property', 'update');
  if length(btrim(coalesce(p_name, ''))) < 2
     or length(btrim(coalesce(p_name, ''))) > 120 then
    raise exception using errcode = '22023', message = 'Property name must be 2-120 characters';
  end if;
  if p_phone is null or length(btrim(p_phone)) < 5 or length(btrim(p_phone)) > 32 then
    raise exception using errcode = '22023', message = 'A valid property phone is required';
  end if;
  if p_email is not null and nullif(btrim(p_email), '') is not null
     and btrim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Invalid property email';
  end if;
  select p.* into v_old
  from public.properties p where p.id = p_property_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;
  update public.properties
  set name = btrim(p_name),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      property_type = coalesce(
        nullif(btrim(coalesce(p_property_type, '')), ''), property_type
      ),
      phone = btrim(p_phone),
      email = nullif(lower(btrim(coalesce(p_email, ''))), ''),
      updated_at = now()
  where id = p_property_id
  returning * into v_new;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property', p_property_id::text,
    'property_profile_updated', to_jsonb(v_old), to_jsonb(v_new)
  );
  return public.get_property_settings(p_property_id);
end;
$fn$;

create or replace function public.update_property_operational_settings(
  p_property_id uuid,
  p_timezone text,
  p_checkin_time time,
  p_checkout_time time
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_old public.properties%rowtype;
  v_new public.properties%rowtype;
begin
  perform app_private.require_property_permission(p_property_id, 'property', 'update');
  if not exists (
    select 1 from pg_catalog.pg_timezone_names tz where tz.name = p_timezone
  ) then
    raise exception using errcode = '22023', message = 'Invalid IANA timezone';
  end if;
  if p_checkin_time is null or p_checkout_time is null then
    raise exception using errcode = '22023', message = 'Check-in and checkout times are required';
  end if;
  select p.* into v_old
  from public.properties p where p.id = p_property_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;
  update public.properties
  set timezone = p_timezone,
      checkin_time = p_checkin_time,
      checkout_time = p_checkout_time,
      updated_at = now()
  where id = p_property_id
  returning * into v_new;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property', p_property_id::text,
    'property_operations_updated', to_jsonb(v_old), to_jsonb(v_new)
  );
  return public.get_property_settings(p_property_id);
end;
$fn$;

create or replace function public.get_my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  select jsonb_build_object(
    'user_id', v_user_id,
    'display_name', up.display_name,
    'email', coalesce(up.email, u.email),
    'phone', up.phone,
    'image_url', up.image_url,
    'bio', up.bio,
    'created_at', up.created_at,
    'updated_at', up.updated_at
  ) into v_result
  from auth.users u
  left join public.user_profiles up on up.user_id = u.id
  where u.id = v_user_id;
  return v_result;
end;
$fn$;

create or replace function public.update_my_profile(
  p_display_name text,
  p_phone text default null,
  p_bio text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if length(btrim(coalesce(p_display_name, ''))) < 2
     or length(btrim(coalesce(p_display_name, ''))) > 100 then
    raise exception using errcode = '22023', message = 'Display name must be 2-100 characters';
  end if;
  if p_phone is not null and length(btrim(p_phone)) > 32 then
    raise exception using errcode = '22023', message = 'Phone must be at most 32 characters';
  end if;
  if p_bio is not null and length(btrim(p_bio)) > 500 then
    raise exception using errcode = '22023', message = 'Bio must be at most 500 characters';
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_user_id;
  insert into public.user_profiles(
    user_id, display_name, email, phone, bio, created_at, updated_at
  ) values (
    v_user_id,
    btrim(p_display_name),
    v_email,
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_bio, '')), ''),
    now(), now()
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      phone = excluded.phone,
      bio = excluded.bio,
      updated_at = now();
  return public.get_my_profile();
end;
$fn$;

create or replace function public.update_property_amenities(
  p_property_id uuid,
  p_amenities text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_amenities text[];
  v_old jsonb;
begin
  perform app_private.require_property_permission(p_property_id, 'property', 'update');
  if exists (
    select 1 from unnest(coalesce(p_amenities, array[]::text[])) x
    where length(btrim(x)) > 80
  ) then
    raise exception using errcode = '22023', message = 'Amenities must be at most 80 characters';
  end if;
  select coalesce(array_agg(value order by first_position), array[]::text[])
  into v_amenities
  from (
    select min(btrim(x)) as value, min(ord) as first_position
    from unnest(coalesce(p_amenities, array[]::text[]))
      with ordinality u(x, ord)
    where nullif(btrim(x), '') is not null
    group by lower(btrim(x))
  ) q;
  if cardinality(v_amenities) > 50 then
    raise exception using errcode = '22023', message = 'Provide at most 50 amenities';
  end if;
  select coalesce(p.amenities, '[]'::jsonb) into v_old
  from public.properties p where p.id = p_property_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;
  update public.properties
  set amenities = to_jsonb(v_amenities), updated_at = now()
  where id = p_property_id;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property', p_property_id::text,
    'property_amenities_updated',
    jsonb_build_object('amenities', v_old),
    jsonb_build_object('amenities', to_jsonb(v_amenities))
  );
  return public.get_property_settings(p_property_id);
end;
$fn$;

create or replace function public.update_property_location(
  p_property_id uuid,
  p_country text default null,
  p_region text default null,
  p_district text default null,
  p_ward text default null,
  p_street text default null,
  p_formatted_address text default null,
  p_place_id text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_old public.properties%rowtype;
  v_new public.properties%rowtype;
begin
  perform app_private.require_property_permission(p_property_id, 'property', 'update');
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception using
      errcode = '22023', message = 'Latitude and longitude must be supplied together';
  end if;
  if p_latitude is not null and (
    p_latitude < -90 or p_latitude > 90
    or p_longitude < -180 or p_longitude > 180
  ) then
    raise exception using errcode = '22023', message = 'Invalid map coordinates';
  end if;
  select p.* into v_old
  from public.properties p where p.id = p_property_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;
  update public.properties
  set country = nullif(btrim(coalesce(p_country, '')), ''),
      region = nullif(btrim(coalesce(p_region, '')), ''),
      district = nullif(btrim(coalesce(p_district, '')), ''),
      ward = nullif(btrim(coalesce(p_ward, '')), ''),
      street = nullif(btrim(coalesce(p_street, '')), ''),
      formatted_address = nullif(btrim(coalesce(p_formatted_address, '')), ''),
      place_id = nullif(btrim(coalesce(p_place_id, '')), ''),
      latitude = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  where id = p_property_id
  returning * into v_new;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property', p_property_id::text,
    'property_location_updated', to_jsonb(v_old), to_jsonb(v_new)
  );
  return public.get_property_settings(p_property_id);
end;
$fn$;

create or replace function public.update_property_gallery(
  p_property_id uuid,
  p_images text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_images text[];
  v_images_json jsonb;
  v_old jsonb;
begin
  perform app_private.require_property_permission(p_property_id, 'property', 'update');
  select coalesce(array_agg(url order by first_position), array[]::text[])
  into v_images
  from (
    select btrim(x) as url, min(ord) as first_position
    from unnest(coalesce(p_images, array[]::text[])) with ordinality u(x, ord)
    where nullif(btrim(x), '') is not null
    group by btrim(x)
  ) q;
  if cardinality(v_images) > 8 then
    raise exception using errcode = '22023', message = 'Provide at most eight property images';
  end if;
  if exists (
    select 1 from unnest(v_images) x
    where x !~ '^https://'
      or x not like ('%/property-images/' || p_property_id::text || '/%')
  ) then
    raise exception using errcode = '22023', message = 'Invalid property image path';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'url', x, 'is_cover', ord = 1, 'position', ord - 1
  ) order by ord), '[]'::jsonb)
  into v_images_json
  from unnest(v_images) with ordinality u(x, ord);
  select coalesce(p.images, '[]'::jsonb) into v_old
  from public.properties p where p.id = p_property_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;
  delete from public.property_images where property_id = p_property_id;
  insert into public.property_images(property_id, url, is_cover, position)
  select p_property_id, x, ord = 1, (ord - 1)::integer
  from unnest(v_images) with ordinality u(x, ord);
  update public.properties
  set images = v_images_json, updated_at = now()
  where id = p_property_id;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property', p_property_id::text,
    'property_gallery_updated',
    jsonb_build_object('images', v_old),
    jsonb_build_object('images', v_images_json)
  );
  return public.get_property_settings(p_property_id);
end;
$fn$;

create or replace function public.update_property_visibility(
  p_property_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_old_status boolean;
begin
  v_role := app_private.require_property_permission(
    p_property_id, 'property', 'update'
  );
  if v_role <> 'owner' then
    raise exception using
      errcode = '42501', message = 'Only the property owner can change visibility';
  end if;
  if p_is_active is null then
    raise exception using errcode = '22023', message = 'Visibility status is required';
  end if;
  select coalesce(p.status, false) into v_old_status
  from public.properties p where p.id = p_property_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;
  update public.properties
  set status = p_is_active, updated_at = now()
  where id = p_property_id;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property', p_property_id::text,
    'property_visibility_updated',
    jsonb_build_object('is_active', v_old_status),
    jsonb_build_object('is_active', p_is_active)
  );
  return public.get_property_settings(p_property_id);
end;
$fn$;

create or replace function public.update_property_booking(
  p_property_id uuid,
  p_booking_id uuid,
  p_room_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_source text,
  p_special_requests text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_old public.bookings%rowtype;
  v_new public.bookings%rowtype;
  v_room public.rooms%rowtype;
  v_business_date date;
  v_total numeric;
  v_paid numeric;
  v_payment_status text;
begin
  perform app_private.require_property_permission(
    p_property_id, 'bookings', 'update'
  );
  select b.* into v_old
  from public.bookings b
  where b.id = p_booking_id and b.property_id = p_property_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;
  if v_old.status not in ('pending', 'reserved', 'confirmed') then
    raise exception using
      errcode = '22023', message = 'Only pending, reserved or confirmed bookings can be edited';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception using errcode = '22023', message = 'Check-out must be after check-in';
  end if;
  if coalesce(p_adults, 0) < 1 or coalesce(p_children, -1) < 0 then
    raise exception using errcode = '22023', message = 'Invalid guest count';
  end if;
  v_business_date := app_private.property_business_date(p_property_id);
  if p_check_in < v_business_date then
    raise exception using errcode = '22023', message = 'Check-in cannot be in the past';
  end if;

  select r.* into v_room
  from public.rooms r
  where r.id = p_room_id
    and r.property_id = p_property_id
    and coalesce(r.is_active, false)
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Active room not found';
  end if;
  if coalesce(p_adults, 0) + coalesce(p_children, 0)
      > coalesce(v_room.capacity, 0) then
    raise exception using errcode = '22023', message = 'Guest count exceeds room capacity';
  end if;
  if coalesce(v_room.operational_status, 'available') in (
    'maintenance', 'out_of_order'
  ) then
    raise exception using errcode = '22023', message = 'Room is out of service';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.room_id = p_room_id
      and b.id <> p_booking_id
      and b.status not in ('cancelled', 'no_show', 'checked_out')
      and p_check_in < b.check_out
      and p_check_out > b.check_in
  ) then
    raise exception using errcode = '23P01', message = 'Room is no longer available';
  end if;

  v_total := round(v_room.price_per_night * (p_check_out - p_check_in), 2);
  select coalesce(sum(p.amount), 0)
  into v_paid
  from public.payments p
  where p.booking_id = p_booking_id
    and coalesce(p.payment_status, p.status) = 'completed';
  if v_paid > v_total then
    raise exception using
      errcode = '22023',
      message = 'The amended total is below payments already collected';
  end if;
  v_payment_status := case
    when v_paid = v_total then 'paid'
    when v_paid > 0 then 'partial'
    else 'unpaid'
  end;

  update public.bookings
  set room_id = p_room_id,
      check_in = p_check_in,
      check_out = p_check_out,
      adults = p_adults,
      children = p_children,
      
      total_price = v_total,
      payment_status = v_payment_status,
      booking_source = coalesce(
        nullif(btrim(coalesce(p_source, '')), ''), booking_source
      ),
      special_requests = nullif(btrim(coalesce(p_special_requests, '')), ''),
      updated_at = now()
  where id = p_booking_id and property_id = p_property_id
  returning * into v_new;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'booking', p_booking_id::text,
    'booking_amended', to_jsonb(v_old), to_jsonb(v_new)
  );
  return jsonb_build_object(
    'success', true,
    'booking', jsonb_build_object(
      'id', v_new.id,
      'booking_number', v_new.booking_number,
      'status', v_new.status,
      'room_id', v_new.room_id,
      'check_in', v_new.check_in,
      'check_out', v_new.check_out,
      'adults', v_new.adults,
      'children', v_new.children,
      'total_guests', v_new.total_guests,
      'total_price', v_new.total_price,
      'payment_status', v_new.payment_status,
      'source', v_new.booking_source,
      'special_requests', v_new.special_requests
    )
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 12. Role-projected compatibility view and fail-closed tenant RLS.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 12a. Resumable app session and property onboarding.
-- ---------------------------------------------------------------------------

alter table public.properties
  add column if not exists onboarding_request_key uuid;
create unique index if not exists properties_owner_onboarding_request_unique
  on public.properties(owner_id, onboarding_request_key)
  where owner_id is not null and onboarding_request_key is not null;

drop function if exists public.create_property_basic_info(text,text,text,text,jsonb);
drop function if exists public.create_property_basic_info(text,text,text,text,text[]);

create or replace function public.create_property_basic_info(
  p_name text,
  p_type text,
  p_phone text,
  p_email text,
  p_amenities jsonb,
  p_request_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_property public.properties%rowtype;
  v_state public.onboarding_state%rowtype;
  v_amenities jsonb := coalesce(p_amenities, '[]'::jsonb);
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if length(btrim(coalesce(p_name, ''))) < 2
     or length(btrim(coalesce(p_name, ''))) > 120 then
    raise exception using errcode = '22023', message = 'Property name must be 2-120 characters';
  end if;
  if length(btrim(coalesce(p_type, ''))) < 2
     or length(btrim(coalesce(p_type, ''))) > 60 then
    raise exception using errcode = '22023', message = 'Property type is invalid';
  end if;
  if length(btrim(coalesce(p_phone, ''))) < 5
     or length(btrim(coalesce(p_phone, ''))) > 32 then
    raise exception using errcode = '22023', message = 'A valid phone is required';
  end if;
  if nullif(btrim(coalesce(p_email, '')), '') is not null
     and btrim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Invalid property email';
  end if;
  if jsonb_typeof(v_amenities) <> 'array'
     or exists (
       select 1 from jsonb_array_elements(v_amenities) x
       where jsonb_typeof(x) <> 'string' or length(btrim(x #>> '{}')) > 80
     ) then
    raise exception using errcode = '22023', message = 'Amenities must be an array of short names';
  end if;
  if jsonb_array_length(v_amenities) > 50 then
    raise exception using errcode = '22023', message = 'Provide at most 50 amenities';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('property-onboarding:' || v_user_id::text, 0)
  );
  select os.* into v_state
  from public.onboarding_state os
  where os.user_id = v_user_id
  for update;

  if v_state.user_id is not null
     and coalesce(v_state.has_property_physical_address, false)
     and lower(coalesce(v_state.current_step, '')) = 'done' then
    raise exception using errcode = '22023', message = 'Property onboarding is already complete';
  end if;

  if p_request_key is not null then
    select p.* into v_property
    from public.properties p
    where p.owner_id = v_user_id
      and p.onboarding_request_key = p_request_key
    order by p.created_at, p.id
    limit 1
    for update;
  end if;

  if v_property.id is null then
    select p.* into v_property
    from public.properties p
    where p.owner_id = v_user_id
    order by
      (nullif(btrim(coalesce(p.formatted_address, '')), '') is null) desc,
      (p.onboarding_request_key is not null) desc,
      p.created_at desc,
      p.id desc
    limit 1
    for update;
  end if;

  if v_property.id is null then
    insert into public.properties(
      owner_id, name, description, property_type, phone, email,
      amenities, status, onboarding_request_key, updated_at
    ) values (
      v_user_id,
      btrim(p_name),
      null,
      lower(btrim(p_type)),
      btrim(p_phone),
      nullif(lower(btrim(coalesce(p_email, ''))), ''),
      v_amenities,
      true,
      p_request_key,
      now()
    ) returning * into v_property;
  else
    update public.properties
    set name = btrim(p_name),
        property_type = lower(btrim(p_type)),
        phone = btrim(p_phone),
        email = nullif(lower(btrim(coalesce(p_email, ''))), ''),
        amenities = v_amenities,
        onboarding_request_key = coalesce(onboarding_request_key, p_request_key),
        updated_at = now()
    where id = v_property.id
    returning * into v_property;
  end if;

  insert into public.property_users(property_id, user_id, role, status)
  values (v_property.id, v_user_id, 'owner', 'active')
  on conflict (property_id, user_id) do update
  set role = 'owner', status = 'active';

  insert into public.onboarding_state(
    user_id, has_property, has_property_physical_address,
    current_step, created_at, updated_at
  ) values (
    v_user_id, true, false, 'property_address', now(), now()
  )
  on conflict (user_id) do update
  set has_property = true,
      current_step = case
        when public.onboarding_state.has_property_physical_address then
          public.onboarding_state.current_step
        else 'property_address'
      end,
      updated_at = now();

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    v_property.id, v_user_id, 'property', v_property.id::text,
    'property_onboarding_saved',
    jsonb_build_object(
      'request_key', p_request_key,
      'name', v_property.name,
      'property_type', v_property.property_type
    )
  );
  return v_property.id;
end;
$fn$;

create or replace function public.complete_property_onboarding_location(
  p_property_id uuid,
  p_country text,
  p_region text,
  p_district text,
  p_ward text,
  p_street text,
  p_formatted_address text,
  p_place_id text,
  p_latitude double precision,
  p_longitude double precision
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_old public.properties%rowtype;
  v_new public.properties%rowtype;
begin
  v_role := app_private.require_property_permission(
    p_property_id, 'property', 'update'
  );
  if v_role <> 'owner' then
    raise exception using errcode = '42501', message = 'Owner access required';
  end if;
  if nullif(btrim(coalesce(p_country, '')), '') is null
     or nullif(btrim(coalesce(p_region, '')), '') is null
     or nullif(btrim(coalesce(p_district, '')), '') is null
     or nullif(btrim(coalesce(p_ward, '')), '') is null
     or nullif(btrim(coalesce(p_street, '')), '') is null
     or nullif(btrim(coalesce(p_formatted_address, '')), '') is null then
    raise exception using errcode = '22023', message = 'Complete property address is required';
  end if;
  if length(btrim(p_country)) > 100 or length(btrim(p_region)) > 120
     or length(btrim(p_district)) > 120 or length(btrim(p_ward)) > 120
     or length(btrim(p_street)) > 200
     or length(btrim(p_formatted_address)) > 500
     or length(btrim(coalesce(p_place_id, ''))) > 255 then
    raise exception using errcode = '22023', message = 'Property address exceeds allowed lengths';
  end if;
  if (p_latitude is null) <> (p_longitude is null)
     or (p_latitude is not null and p_latitude not between -90 and 90)
     or (p_longitude is not null and p_longitude not between -180 and 180) then
    raise exception using errcode = '22023', message = 'Invalid property coordinates';
  end if;

  select p.* into v_old
  from public.properties p
  where p.id = p_property_id and p.owner_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Owned property not found';
  end if;

  update public.properties
  set country = btrim(p_country),
      region = btrim(p_region),
      district = btrim(p_district),
      ward = btrim(p_ward),
      street = btrim(p_street),
      formatted_address = btrim(p_formatted_address),
      place_id = nullif(btrim(coalesce(p_place_id, '')), ''),
      latitude = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  where id = p_property_id
  returning * into v_new;

  insert into public.onboarding_state(
    user_id, has_property, has_property_physical_address,
    current_step, created_at, updated_at
  ) values (
    v_user_id, true, true, 'done', now(), now()
  )
  on conflict (user_id) do update
  set has_property = true,
      has_property_physical_address = true,
      current_step = 'done',
      updated_at = now();

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property', p_property_id::text,
    'property_onboarding_location_completed', to_jsonb(v_old), to_jsonb(v_new)
  );
  return jsonb_build_object(
    'success', true,
    'property_id', p_property_id,
    'message', 'Property location saved'
  );
end;
$fn$;

create or replace function public.get_app_session()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_profile_name text;
  v_state public.onboarding_state%rowtype;
  v_memberships jsonb := '[]'::jsonb;
  v_onboarding_membership jsonb;
  v_onboarding_property_id uuid;
  v_has_owner boolean := false;
  v_has_active_membership boolean := false;
  v_pending_invitation_count integer := 0;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'status', 'unauthenticated', 'step', 'login',
      'memberships', '[]'::jsonb
    );
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_user_id;
  select exists (
    select 1 from public.property_users pu
    where pu.user_id = v_user_id
      and lower(coalesce(pu.status, '')) = 'active'
      and lower(btrim(pu.role)) in ('owner', 'manager', 'receptionist')
  ) into v_has_active_membership;
  if v_email is not null then
    select count(*)::integer into v_pending_invitation_count
    from public.property_invitations i
    where lower(btrim(i.email)) = v_email
      and lower(coalesce(i.status, '')) = 'pending'
      and lower(btrim(i.role)) in ('manager', 'receptionist')
      and (i.expires_at is null or i.expires_at > now());
  end if;
  if not v_has_active_membership and v_pending_invitation_count > 0 then
    return jsonb_build_object(
      'status', 'onboarding', 'step', 'invitation',
      'memberships', '[]'::jsonb,
      'pending_invitation_count', v_pending_invitation_count
    );
  end if;

  select nullif(btrim(up.display_name), '') into v_profile_name
  from public.user_profiles up where up.user_id = v_user_id;
  if v_profile_name is null then
    return jsonb_build_object(
      'status', 'onboarding', 'step', 'profile',
      'memberships', '[]'::jsonb
    );
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'property_user_id', pu.id,
    'role', lower(btrim(pu.role)),
    'status', pu.status,
    'property_id', pu.property_id,
    'property', jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'type', p.property_type,
      'description', p.description,
      'phone', p.phone,
      'email', p.email,
      'country', p.country,
      'street', p.street,
      'region', p.region,
      'district', p.district,
      'ward', p.ward,
      'latitude', p.latitude,
      'longitude', p.longitude,
      'status', p.status,
      'formatted_address', p.formatted_address,
      'place_id', p.place_id,
      'images', coalesce(p.images, '[]'::jsonb),
      'amenities', coalesce(p.amenities, '[]'::jsonb)
    )
  ) order by pu.created_at, pu.id), '[]'::jsonb),
  coalesce(bool_or(lower(btrim(pu.role)) = 'owner'), false)
  into v_memberships, v_has_owner
  from public.property_users pu
  join public.properties p on p.id = pu.property_id
  where pu.user_id = v_user_id
    and lower(coalesce(pu.status, '')) = 'active'
    and lower(btrim(pu.role)) in ('owner', 'manager', 'receptionist');

  select os.* into v_state
  from public.onboarding_state os where os.user_id = v_user_id;

  if v_has_owner
     and coalesce(v_state.has_property, false)
     and not coalesce(v_state.has_property_physical_address, false) then
    select pu.property_id into v_onboarding_property_id
    from public.property_users pu
    join public.properties p on p.id = pu.property_id
    where pu.user_id = v_user_id
      and lower(coalesce(pu.status, '')) = 'active'
      and lower(btrim(pu.role)) = 'owner'
    order by
      (nullif(btrim(coalesce(p.formatted_address, '')), '') is null) desc,
      (p.onboarding_request_key is not null) desc,
      pu.created_at desc,
      pu.id desc
    limit 1;

    select membership.item into v_onboarding_membership
    from jsonb_array_elements(v_memberships) as membership(item)
    where membership.item->>'property_id' = v_onboarding_property_id::text
    limit 1;
  end if;

  if v_has_owner then
    if v_state.user_id is null or not coalesce(v_state.has_property, false) then
      return jsonb_build_object(
        'status', 'onboarding', 'step', 'property_basic',
        'memberships', '[]'::jsonb
      );
    end if;
    if not coalesce(v_state.has_property_physical_address, false) then
      return jsonb_build_object(
        'status', 'onboarding', 'step', 'property_address',
        'memberships', v_memberships,
        'active_property_id', (coalesce(
          v_onboarding_membership, v_memberships->0
        ))->>'property_id',
        'active_role', (coalesce(
          v_onboarding_membership, v_memberships->0
        ))->>'role',
        'property', (coalesce(
          v_onboarding_membership, v_memberships->0
        ))->'property'
      );
    end if;
  end if;

  if jsonb_array_length(v_memberships) > 0 then
    return jsonb_build_object(
      'status', 'ready',
      'step', 'done',
      'memberships', v_memberships,
      'active_property_id', v_memberships->0->>'property_id',
      'active_role', v_memberships->0->>'role',
      'property', v_memberships->0->'property',
      'has_pending_invitation', v_pending_invitation_count > 0,
      'pending_invitation_count', v_pending_invitation_count
    );
  end if;

  if v_state.user_id is null then
    return jsonb_build_object(
      'status', 'onboarding', 'step', 'property_basic',
      'memberships', '[]'::jsonb
    );
  end if;
  if not coalesce(v_state.has_property, false) then
    return jsonb_build_object(
      'status', 'onboarding', 'step', 'property_basic',
      'memberships', '[]'::jsonb
    );
  end if;
  if not coalesce(v_state.has_property_physical_address, false) then
    return jsonb_build_object(
      'status', 'onboarding', 'step', 'property_address',
      'memberships', v_memberships,
      'active_property_id', (coalesce(
        v_onboarding_membership, v_memberships->0
      ))->>'property_id',
      'active_role', (coalesce(
        v_onboarding_membership, v_memberships->0
      ))->>'role',
      'property', (coalesce(
        v_onboarding_membership, v_memberships->0
      ))->'property'
    );
  end if;
  return jsonb_build_object(
    'status', 'inactive', 'step', 'done',
    'message', 'No active property membership is available for this account.',
    'memberships', '[]'::jsonb
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 12b. Idempotent payment writer for references and reference-less payments.
-- ---------------------------------------------------------------------------

create or replace function public.record_booking_payment(
  p_property_id uuid,
  p_booking_id uuid,
  p_idempotency_key uuid,
  p_amount numeric,
  p_method text,
  p_reference text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_fingerprint text;
  v_existing public.payments%rowtype;
  v_result jsonb;
  v_payment_id uuid;
begin
  perform app_private.require_property_permission(
    p_property_id, 'payments', 'create'
  );
  if p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'Idempotency key is required';
  end if;
  v_fingerprint := md5(jsonb_build_object(
    'booking_id', p_booking_id,
    'amount', round(p_amount, 2),
    'method', lower(replace(btrim(coalesce(p_method, '')), ' ', '_')),
    'reference', nullif(lower(btrim(coalesce(p_reference, ''))), ''),
    'notes', nullif(btrim(coalesce(p_notes, '')), '')
  )::text);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_booking_id::text || ':' || p_idempotency_key::text, 0
    )
  );
  select p.* into v_existing
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  where b.property_id = p_property_id
    and p.booking_id = p_booking_id
    and p.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.idempotency_fingerprint is distinct from v_fingerprint then
      raise exception using
        errcode = '22023',
        message = 'Idempotency key was reused with different payment details';
    end if;
    return jsonb_build_object(
      'success', true,
      'replayed', true,
      'payment_id', v_existing.id,
      'amount_paid', (
        select coalesce(sum(p.amount), 0) from public.payments p
        where p.booking_id = p_booking_id
          and coalesce(p.payment_status, p.status) = 'completed'
      ),
      'balance_due', greatest((
        select b.total_price - coalesce(sum(p.amount) filter (
          where coalesce(p.payment_status, p.status) = 'completed'
        ), 0)
        from public.bookings b
        left join public.payments p on p.booking_id = b.id
        where b.id = p_booking_id and b.property_id = p_property_id
        group by b.total_price
      ), 0),
      'payment_status', (
        select b.payment_status from public.bookings b
        where b.id = p_booking_id and b.property_id = p_property_id
      )
    );
  end if;

  v_result := public.record_booking_payment(
    p_property_id, p_booking_id, p_amount, p_method, p_reference, p_notes
  );
  v_payment_id := nullif(v_result->>'payment_id', '')::uuid;
  if v_payment_id is null then
    raise exception using errcode = 'P0001', message = 'Payment writer returned no payment id';
  end if;
  if coalesce((v_result->>'replayed')::boolean, false) then
    return v_result || jsonb_build_object('replayed', true);
  end if;
  update public.payments
  set idempotency_key = p_idempotency_key,
      idempotency_fingerprint = v_fingerprint
  where id = v_payment_id and booking_id = p_booking_id;
  return v_result || jsonb_build_object('replayed', false);
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 12c. Team and access workspace.
-- ---------------------------------------------------------------------------

insert into public.role_permissions(role, resource, action)
values
  ('owner', 'staff', 'view'),
  ('owner', 'staff', 'invite'),
  ('owner', 'staff', 'manage'),
  ('manager', 'staff', 'view'),
  ('manager', 'staff', 'invite'),
  ('manager', 'staff', 'manage')
on conflict (role, resource, action) do nothing;

create or replace function app_private.new_invitation_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_code text;
begin
  for v_attempt in 1..25 loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    if not exists (
      select 1 from public.property_invitations i where i.token = v_code
    ) then
      return v_code;
    end if;
  end loop;
  raise exception using errcode = '23505', message = 'Unable to allocate invitation code';
end;
$fn$;
revoke all on function app_private.new_invitation_code()
  from public, anon, authenticated;

create or replace function public.get_team_access_workspace(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(p_property_id, 'staff', 'view');
  with members as (
    select pu.*, up.display_name, up.email, up.phone, up.image_url
    from public.property_users pu
    left join public.user_profiles up on up.user_id = pu.user_id
    where pu.property_id = p_property_id
      and lower(btrim(pu.role)) in ('owner', 'manager', 'receptionist')
  ),
  invitations as (
    select i.*, up.display_name as invited_by_name
    from public.property_invitations i
    left join public.user_profiles up on up.user_id = i.created_by
    where i.property_id = p_property_id
      and lower(coalesce(i.status, '')) = 'pending'
  )
  select jsonb_build_object(
    'success', true,
    'property', jsonb_build_object(
      'id', p_property_id,
      'name', (select p.name from public.properties p where p.id = p_property_id)
    ),
    'role', v_role,
    'capabilities', jsonb_build_object(
      'invite_staff', app_private.has_property_permission(
        p_property_id, 'staff', 'invite'
      ),
      'manage_members', app_private.has_property_permission(
        p_property_id, 'staff', 'manage'
      ),
      'manage_invitations', app_private.has_property_permission(
        p_property_id, 'staff', 'manage'
      ),
      'invite_roles', case when v_role = 'owner'
        then jsonb_build_array('manager', 'receptionist')
        else jsonb_build_array('receptionist') end
    ),
    'summary', jsonb_build_object(
      'total', (select count(*)::integer from members),
      'active', (select count(*)::integer from members
        where lower(coalesce(status, '')) = 'active'),
      'suspended', (select count(*)::integer from members
        where lower(coalesce(status, '')) <> 'active'),
      'pending_invitations', (select count(*)::integer from invitations)
    ),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', m.id,
        'user_id', m.user_id,
        'name', coalesce(nullif(btrim(m.display_name), ''), 'Team member'),
        'email', m.email,
        'phone', m.phone,
        'image_url', m.image_url,
        'role', lower(btrim(m.role)),
        'status', case when lower(coalesce(m.status, '')) = 'active'
          then 'active' else 'suspended' end,
        'joined_at', m.created_at,
        'is_current_user', m.user_id = v_user_id,
        'is_owner', lower(btrim(m.role)) = 'owner',
        'allowed_actions', case
          when m.user_id = v_user_id or lower(btrim(m.role)) = 'owner'
            then '[]'::jsonb
          when v_role = 'owner' then jsonb_build_array(
            'change_role',
            case when lower(coalesce(m.status, '')) = 'active'
              then 'suspend' else 'activate' end,
            'remove'
          )
          when v_role = 'manager' and lower(btrim(m.role)) = 'receptionist'
            then jsonb_build_array(
              case when lower(coalesce(m.status, '')) = 'active'
                then 'suspend' else 'activate' end,
              'remove'
            )
          else '[]'::jsonb
        end,
        'assignable_roles', case
          when m.user_id = v_user_id or lower(btrim(m.role)) = 'owner'
            then '[]'::jsonb
          when v_role = 'owner' then jsonb_build_array('manager', 'receptionist')
          else '[]'::jsonb
        end
      ) order by
        case lower(btrim(m.role)) when 'owner' then 1 when 'manager' then 2 else 3 end,
        lower(coalesce(m.display_name, m.email, '')), m.id)
      from members m
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'email', i.email,
        'role', lower(btrim(i.role)),
        'status', i.status,
        'created_at', i.created_at,
        'expires_at', i.expires_at,
        'invited_by_name', coalesce(i.invited_by_name, 'Team administrator'),
        'code', case
          when v_role = 'owner'
            or (v_role = 'manager' and lower(btrim(i.role)) = 'receptionist')
            then i.token
        end,
        'allowed_actions', case
          when v_role = 'owner'
            or (v_role = 'manager' and lower(btrim(i.role)) = 'receptionist')
            then jsonb_build_array('resend', 'revoke')
          else '[]'::jsonb
        end
      ) order by i.created_at desc nulls last, i.id desc)
      from invitations i
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$fn$;

create or replace function public.invite_staff(
  p_property_id uuid,
  p_email text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_caller_role text;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_role text := lower(btrim(coalesce(p_role, '')));
  v_invitation public.property_invitations%rowtype;
begin
  v_caller_role := app_private.require_property_permission(
    p_property_id, 'staff', 'invite'
  );
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Invalid email address';
  end if;
  if v_role not in ('manager', 'receptionist')
     or (v_caller_role = 'manager' and v_role <> 'receptionist') then
    raise exception using errcode = '42501', message = 'Role assignment denied';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_property_id::text || ':' || v_email, 0)
  );
  if exists (
    select 1 from public.property_users pu
    join auth.users u on u.id = pu.user_id
    where pu.property_id = p_property_id and lower(u.email) = v_email
  ) or exists (
    select 1 from public.property_users pu
    join public.user_profiles up on up.user_id = pu.user_id
    where pu.property_id = p_property_id and lower(up.email) = v_email
  ) then
    raise exception using errcode = '22023', message = 'This person is already a property member';
  end if;
  select i.* into v_invitation
  from public.property_invitations i
  where i.property_id = p_property_id
    and lower(i.email) = v_email
    and lower(coalesce(i.status, '')) = 'pending'
  order by i.created_at desc
  limit 1
  for update;
  if found then
    if lower(btrim(v_invitation.role)) <> v_role then
      update public.property_invitations
      set role = v_role
      where id = v_invitation.id
      returning * into v_invitation;
    end if;
    return jsonb_build_object(
      'success', true, 'replayed', true,
      'invitation_id', v_invitation.id,
      'status', v_invitation.status,
      'expires_at', v_invitation.expires_at,
      'code', v_invitation.token
    );
  end if;
  insert into public.property_invitations(
    property_id, email, role, token, status, created_at, expires_at, created_by
  ) values (
    p_property_id, v_email, v_role, app_private.new_invitation_code(),
    'pending', now(), now() + interval '7 days', v_user_id
  ) returning * into v_invitation;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'property_invitation', v_invitation.id::text,
    'staff_invited', jsonb_build_object('email', v_email, 'role', v_role)
  );
  return jsonb_build_object(
    'success', true, 'replayed', false,
    'invitation_id', v_invitation.id,
    'status', v_invitation.status,
    'expires_at', v_invitation.expires_at,
    'code', v_invitation.token
  );
end;
$fn$;

create or replace function public.resend_staff_invitation(
  p_property_id uuid,
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_invitation public.property_invitations%rowtype;
begin
  v_role := app_private.require_property_permission(p_property_id, 'staff', 'manage');
  select i.* into v_invitation
  from public.property_invitations i
  where i.id = p_invitation_id and i.property_id = p_property_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Invitation not found'; end if;
  if lower(coalesce(v_invitation.status, '')) <> 'pending' then
    raise exception using errcode = '22023', message = 'Only pending invitations can be resent';
  end if;
  if v_role = 'manager' and lower(btrim(v_invitation.role)) <> 'receptionist' then
    raise exception using errcode = '42501', message = 'Invitation management denied';
  end if;
  update public.property_invitations
  set token = app_private.new_invitation_code(),
      expires_at = now() + interval '7 days'
  where id = p_invitation_id
  returning * into v_invitation;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'property_invitation', p_invitation_id::text,
    'staff_invitation_resent', jsonb_build_object(
      'email', v_invitation.email, 'role', v_invitation.role,
      'expires_at', v_invitation.expires_at
    )
  );
  return jsonb_build_object(
    'success', true, 'invitation_id', v_invitation.id,
    'status', v_invitation.status, 'expires_at', v_invitation.expires_at,
    'code', v_invitation.token
  );
end;
$fn$;

create or replace function public.cancel_staff_invitation(
  p_property_id uuid,
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_invitation public.property_invitations%rowtype;
begin
  v_role := app_private.require_property_permission(p_property_id, 'staff', 'manage');
  select i.* into v_invitation
  from public.property_invitations i
  where i.id = p_invitation_id and i.property_id = p_property_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Invitation not found'; end if;
  if lower(coalesce(v_invitation.status, '')) <> 'pending' then
    raise exception using errcode = '22023', message = 'Only pending invitations can be revoked';
  end if;
  if v_role = 'manager' and lower(btrim(v_invitation.role)) <> 'receptionist' then
    raise exception using errcode = '42501', message = 'Invitation management denied';
  end if;
  update public.property_invitations
  set status = 'cancelled', token = null
  where id = p_invitation_id
  returning * into v_invitation;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'property_invitation', p_invitation_id::text,
    'staff_invitation_revoked', jsonb_build_object(
      'email', v_invitation.email, 'role', v_invitation.role
    )
  );
  return jsonb_build_object(
    'success', true, 'invitation_id', v_invitation.id, 'status', v_invitation.status
  );
end;
$fn$;

create or replace function public.delete_property_invitation(
  p_property_id uuid,
  p_invitation_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $fn$
  select public.cancel_staff_invitation(p_property_id, p_invitation_id);
$fn$;

create or replace function public.change_staff_role(
  p_property_id uuid,
  p_staff_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_caller_role text;
  v_role text := lower(btrim(coalesce(p_role, '')));
  v_member public.property_users%rowtype;
begin
  v_caller_role := app_private.require_property_permission(p_property_id, 'staff', 'manage');
  if p_staff_user_id = v_user_id then
    raise exception using errcode = '42501', message = 'You cannot change your own role';
  end if;
  if v_role not in ('manager', 'receptionist')
     or (v_caller_role = 'manager' and v_role <> 'receptionist') then
    raise exception using errcode = '42501', message = 'Role assignment denied';
  end if;
  select pu.* into v_member
  from public.property_users pu
  where pu.property_id = p_property_id and pu.user_id = p_staff_user_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Team member not found'; end if;
  if lower(btrim(v_member.role)) = 'owner'
     or (v_caller_role = 'manager' and lower(btrim(v_member.role)) <> 'receptionist') then
    raise exception using errcode = '42501', message = 'Team member management denied';
  end if;
  update public.property_users
  set role = v_role
  where id = v_member.id;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property_user', v_member.id::text,
    'staff_role_changed', to_jsonb(v_member), jsonb_build_object('role', v_role)
  );
  return jsonb_build_object(
    'success', true, 'membership_id', v_member.id,
    'user_id', v_member.user_id, 'role', v_role
  );
end;
$fn$;

create or replace function public.update_staff_status(
  p_property_id uuid,
  p_staff_user_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_caller_role text;
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_member public.property_users%rowtype;
begin
  v_caller_role := app_private.require_property_permission(p_property_id, 'staff', 'manage');
  if v_status = 'suspended' then v_status := 'inactive'; end if;
  if v_status not in ('active', 'inactive') then
    raise exception using errcode = '22023', message = 'Status must be active or suspended';
  end if;
  if p_staff_user_id = v_user_id then
    raise exception using errcode = '42501', message = 'You cannot suspend your own access';
  end if;
  select pu.* into v_member
  from public.property_users pu
  where pu.property_id = p_property_id and pu.user_id = p_staff_user_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Team member not found'; end if;
  if lower(btrim(v_member.role)) = 'owner'
     or (v_caller_role = 'manager' and lower(btrim(v_member.role)) <> 'receptionist') then
    raise exception using errcode = '42501', message = 'Team member management denied';
  end if;
  update public.property_users set status = v_status where id = v_member.id;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property_user', v_member.id::text,
    case when v_status = 'active' then 'staff_activated' else 'staff_suspended' end,
    to_jsonb(v_member), jsonb_build_object('status', v_status)
  );
  return jsonb_build_object(
    'success', true, 'membership_id', v_member.id,
    'user_id', v_member.user_id,
    'status', case when v_status = 'active' then 'active' else 'suspended' end
  );
end;
$fn$;

create or replace function public.remove_staff(
  p_property_id uuid,
  p_property_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_caller_role text;
  v_member public.property_users%rowtype;
begin
  v_caller_role := app_private.require_property_permission(p_property_id, 'staff', 'manage');
  select pu.* into v_member
  from public.property_users pu
  where pu.id = p_property_user_id and pu.property_id = p_property_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Team member not found'; end if;
  if v_member.user_id = v_user_id then
    raise exception using errcode = '42501', message = 'You cannot remove your own access';
  end if;
  if lower(btrim(v_member.role)) = 'owner'
     or (v_caller_role = 'manager' and lower(btrim(v_member.role)) <> 'receptionist') then
    raise exception using errcode = '42501', message = 'Team member management denied';
  end if;
  delete from public.property_users where id = v_member.id;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data
  ) values (
    p_property_id, v_user_id, 'property_user', v_member.id::text,
    'staff_removed', to_jsonb(v_member)
  );
  return jsonb_build_object(
    'success', true, 'membership_id', v_member.id, 'removed', true
  );
end;
$fn$;

create or replace view public.bookings_with_details
with (security_barrier = true, security_invoker = false)
as
select
  b.id,
  b.booking_number,
  b.property_id,
  b.room_id,
  b.guest_id,
  b.check_in,
  b.check_out,
  b.checked_in_at,
  b.checked_out_at,
  b.adults,
  b.children,
  b.total_guests,
  (case when app_private.can_view_property_finance(b.property_id)
    then b.total_price end)::numeric(10,2) as total_price,
  b.status,
  case when app_private.can_view_property_finance(b.property_id)
    then b.payment_status end as payment_status,
  b.booking_source,
  b.special_requests,
  b.created_at,
  r.name as room_name,
  r.room_type,
  (case when app_private.can_view_property_finance(b.property_id)
    then r.price_per_night end)::numeric(10,2) as price_per_night,
  g.title,
  g.first_name,
  g.middle_name,
  g.last_name,
  concat(g.first_name, ' ', g.last_name) as guest_name,
  g.gender,
  case when app_private.current_property_role(b.property_id) in ('owner', 'manager')
    then g.date_of_birth end as date_of_birth,
  g.occupation,
  g.nationality,
  g.phone as guest_phone,
  g.email as guest_email,
  g.address,
  g.where_from,
  g.where_to,
  case when app_private.current_property_role(b.property_id) in ('owner', 'manager')
    then g.id_type end as id_type,
  case when app_private.current_property_role(b.property_id) in ('owner', 'manager')
    then g.id_number end as id_number,
  case when app_private.current_property_role(b.property_id) in ('owner', 'manager')
    then g.emergency_contact_name end as emergency_contact_name,
  case when app_private.current_property_role(b.property_id) in ('owner', 'manager')
    then g.emergency_contact_phone end as emergency_contact_phone,
  case when app_private.current_property_role(b.property_id) in ('owner', 'manager')
    then g.notes end as guest_notes,
  case when app_private.can_view_property_finance(b.property_id) then
    coalesce(sum(case
      when coalesce(p.payment_status, p.status) = 'completed' then p.amount
      else 0::numeric
    end), 0::numeric)
  end as amount_paid,
  case when app_private.can_view_property_finance(b.property_id) then
    b.total_price - coalesce(sum(case
      when coalesce(p.payment_status, p.status) = 'completed' then p.amount
      else 0::numeric
    end), 0::numeric)
  end as balance_due,
  case when app_private.can_view_property_finance(b.property_id) then
    count(p.id) filter (
      where coalesce(p.payment_status, p.status) = 'completed'
    )
  end as payment_count,
  case when app_private.can_view_property_finance(b.property_id) then
    max(coalesce(p.paid_at, p.created_at)) filter (
      where coalesce(p.payment_status, p.status) = 'completed'
    )
  end as last_payment_date,
  case when app_private.can_view_property_finance(b.property_id) then
    (array_agg(coalesce(p.payment_method, p.method)
      order by coalesce(p.paid_at, p.created_at) desc)
      filter (where coalesce(p.payment_status, p.status) = 'completed'))[1]
  end as last_payment_method
from public.bookings b
left join public.rooms r on r.id = b.room_id
left join public.guests g on g.id = b.guest_id
left join public.payments p on p.booking_id = b.id
where app_private.current_property_role(b.property_id) is not null
group by b.id, r.id, g.id;

revoke all on public.bookings_with_details from public, anon, authenticated;
grant select on public.bookings_with_details to authenticated;

drop policy if exists loji_bookings_member_read on public.bookings;
create policy loji_bookings_known_role_read
on public.bookings for select to authenticated
using (app_private.current_property_role(property_id) is not null);

drop policy if exists loji_properties_member_read on public.properties;
create policy loji_properties_known_role_read
on public.properties for select to authenticated
using (app_private.current_property_role(id) is not null);

drop policy if exists loji_rooms_member_read on public.rooms;
create policy loji_rooms_known_role_read
on public.rooms for select to authenticated
using (app_private.current_property_role(property_id) is not null);

drop policy if exists loji_property_users_member_read on public.property_users;
create policy loji_property_users_known_role_read
on public.property_users for select to authenticated
using (app_private.current_property_role(property_id) is not null);

drop policy if exists loji_property_images_member_read on public.property_images;
create policy loji_property_images_known_role_read
on public.property_images for select to authenticated
using (
  property_id is not null
  and app_private.current_property_role(property_id) is not null
);

drop policy if exists loji_room_images_member_read on public.room_images;
create policy loji_room_images_known_role_read
on public.room_images for select to authenticated
using (
  exists (
    select 1 from public.rooms r
    where r.id = room_images.room_id
      and app_private.current_property_role(r.property_id) is not null
  )
);

drop policy if exists loji_notifications_self_read on public.notifications;
create policy loji_notifications_authorized_self_read
on public.notifications for select to authenticated
using (
  user_id = (select auth.uid())
  and (
    property_id is null
    or app_private.has_property_permission(property_id, 'notifications', 'view')
  )
);

-- Helpers used from RLS/security-invoker views expose only the caller's own
-- membership-derived role/capability. Mutation helpers remain private.
grant execute on function app_private.current_property_role(uuid)
  to authenticated;
grant execute on function app_private.has_property_permission(uuid,text,text)
  to authenticated;
grant execute on function app_private.can_view_property_finance(uuid)
  to authenticated;
grant execute on function app_private.can_access_guest(uuid)
  to authenticated;
grant usage on schema app_private to authenticated;

-- Replace the legacy dashboard implementation so an unknown/fallback member
-- cannot receive operational queues merely by having an active membership row.
create or replace function public.get_property_dashboard(p_property_id uuid)
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
  v_finance boolean;
  v_ops jsonb;
  v_result jsonb;
begin
  v_role := app_private.require_property_permission(
    p_property_id, 'bookings', 'view'
  );
  perform app_private.require_property_permission(p_property_id, 'rooms', 'view');
  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  v_finance := app_private.can_view_property_finance(p_property_id);
  v_ops := public.get_property_operations_board(p_property_id);

  with payment_rollup as (
    select b.id as booking_id,
      coalesce(sum(p.amount) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
      ), 0)::numeric as paid
    from public.bookings b
    left join public.payments p on p.booking_id = b.id
    where b.property_id = p_property_id
    group by b.id
  ),
  room_summary as (
    select
      count(*) filter (where coalesce(r.is_active, false))::integer
        as total_active_rooms,
      count(*) filter (where exists (
        select 1 from public.bookings b
        where b.room_id = r.id and b.status = 'checked_in'
      ))::integer as occupied_rooms,
      count(*) filter (
        where coalesce(r.is_active, false)
          and r.housekeeping_status = 'ready'
          and not exists (
            select 1 from public.bookings b
            where b.room_id = r.id and b.status = 'checked_in'
          )
      )::integer as ready_rooms,
      count(*) filter (
        where coalesce(r.is_active, false)
          and (
            r.housekeeping_status <> 'ready'
            or coalesce(r.operational_status, 'available') <> 'available'
          )
          and not exists (
            select 1 from public.bookings b
            where b.room_id = r.id and b.status = 'checked_in'
          )
      )::integer as attention_rooms
    from public.rooms r
    where r.property_id = p_property_id
  ),
  task_summary as (
    select
      count(*) filter (
        where b.status in ('pending', 'reserved', 'confirmed')
          and b.check_in <= v_business_date
      )::integer as arrivals_due,
      count(*) filter (
        where b.status = 'checked_in' and b.check_out <= v_business_date
      )::integer as departures_due,
      count(*) filter (
        where b.status in ('pending', 'reserved', 'confirmed')
          and b.check_in < v_business_date
      )::integer as overdue_arrivals,
      count(*) filter (
        where b.status = 'checked_in' and b.check_out < v_business_date
      )::integer as overdue_departures
    from public.bookings b
    where b.property_id = p_property_id
  ),
  finance_summary as (
    select
      coalesce(sum(p.amount) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
          and (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date
            = v_business_date
      ), 0)::numeric as today_collected,
      count(*) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
          and (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date
            = v_business_date
      )::integer as today_payment_count
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    where b.property_id = p_property_id
  ),
  outstanding as (
    select
      coalesce(sum(greatest(b.total_price - pr.paid, 0)) filter (
        where b.status not in ('cancelled', 'no_show')
      ), 0)::numeric as outstanding_balance,
      count(*) filter (
        where b.status not in ('cancelled', 'no_show')
          and b.total_price - pr.paid > 0
      )::integer as open_balance_count
    from public.bookings b
    join payment_rollup pr on pr.booking_id = b.id
    where b.property_id = p_property_id
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'property', jsonb_build_object(
      'id', p_property_id,
      'timezone', v_timezone,
      'business_date', v_business_date
    ),
    'role', v_role,
    'capabilities', jsonb_build_object(
      'view_finance', v_finance,
      'create_booking', app_private.has_property_permission(
        p_property_id, 'bookings', 'create'
      ),
      'update_booking', app_private.has_property_permission(
        p_property_id, 'bookings', 'update'
      ),
      'check_out', app_private.has_property_permission(
        p_property_id, 'bookings', 'checkout'
      ),
      'manage_rooms', app_private.has_property_permission(
        p_property_id, 'rooms', 'update'
      ),
      'record_payment', app_private.has_property_permission(
        p_property_id, 'payments', 'create'
      )
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
      'limit', 50,
      'arrivals', coalesce(v_ops->'arrivals', '[]'::jsonb),
      'departures', coalesce(v_ops->'departures', '[]'::jsonb),
      'housekeeping', coalesce((
        select jsonb_agg(q.item)
        from jsonb_array_elements(
          coalesce(v_ops->'housekeeping', '[]'::jsonb)
        ) q(item)
        where q.item->>'operational_status' in (
          'needs_cleaning', 'cleaning', 'out_of_service'
        )
      ), '[]'::jsonb)
    ),
    'finance', case when v_finance then jsonb_build_object(
      'today_collected', fs.today_collected,
      'today_payment_count', fs.today_payment_count,
      'outstanding_balance', os.outstanding_balance,
      'open_balance_count', os.open_balance_count
    ) end
  )) into v_result
  from room_summary rs
  cross join task_summary ts
  cross join finance_summary fs
  cross join outstanding os;
  return v_result;
end;
$fn$;

-- Preserve the invitation onboarding JSON contracts while binding every code
-- lookup to the authenticated account email and a locked invitation row.
create or replace function public.get_invitation_details(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_user_email text;
  v_invitation public.property_invitations%rowtype;
  v_property_name text;
  v_formatted_address text;
begin
  if v_user_id is null then
    return jsonb_build_object('status', 'error', 'message', 'Not authenticated');
  end if;
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    return jsonb_build_object(
      'status', 'error', 'message', 'Invalid invitation code or email mismatch'
    );
  end if;
  select lower(u.email) into v_user_email
  from auth.users u where u.id = v_user_id;
  if v_user_email is null then
    return jsonb_build_object('status', 'error', 'message', 'Not authenticated');
  end if;

  select i.* into v_invitation
  from public.property_invitations i
  where upper(i.token) = upper(btrim(p_token))
  limit 1
  for update;
  if not found or lower(btrim(v_invitation.email)) <> v_user_email then
    return jsonb_build_object(
      'status', 'error', 'message', 'Invalid invitation code or email mismatch'
    );
  end if;
  if lower(btrim(v_invitation.role)) not in ('manager', 'receptionist') then
    return jsonb_build_object(
      'status', 'error', 'message', 'Invitation role is not supported'
    );
  end if;
  if lower(coalesce(v_invitation.status, '')) <> 'pending' then
    return jsonb_build_object(
      'status', 'error', 'message', 'Invitation already used'
    );
  end if;
  if v_invitation.expires_at is not null
     and v_invitation.expires_at <= now() then
    return jsonb_build_object('status', 'error', 'message', 'Invitation expired');
  end if;

  select p.name, p.formatted_address
  into v_property_name, v_formatted_address
  from public.properties p
  where p.id = v_invitation.property_id;
  if not found then
    return jsonb_build_object('status', 'error', 'message', 'Property not found');
  end if;
  return jsonb_build_object(
    'status', 'success',
    'invitation', jsonb_build_object(
      'property_name', v_property_name,
      'formatted_address', v_formatted_address,
      'role', lower(btrim(v_invitation.role))
    )
  );
end;
$fn$;

create or replace function public.accept_property_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_user_email text;
  v_invitation public.property_invitations%rowtype;
  v_membership public.property_users%rowtype;
  v_role text;
  v_replayed boolean := false;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'status', 'error', 'message', 'You must be logged in'
    );
  end if;
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    return jsonb_build_object(
      'status', 'error', 'message', 'Invalid invitation code'
    );
  end if;
  select lower(u.email) into v_user_email
  from auth.users u where u.id = v_user_id;
  if v_user_email is null then
    return jsonb_build_object(
      'status', 'error', 'message', 'You must be logged in'
    );
  end if;

  select i.* into v_invitation
  from public.property_invitations i
  where upper(i.token) = upper(btrim(p_token))
  limit 1
  for update;
  if not found then
    return jsonb_build_object(
      'status', 'error', 'message', 'Invalid invitation code'
    );
  end if;
  if lower(btrim(v_invitation.email)) <> v_user_email then
    return jsonb_build_object(
      'status', 'error', 'message', 'This invitation belongs to another email'
    );
  end if;
  v_role := lower(btrim(v_invitation.role));
  if v_role not in ('manager', 'receptionist') then
    return jsonb_build_object(
      'status', 'error', 'message', 'Invitation role is not supported'
    );
  end if;

  if lower(coalesce(v_invitation.status, '')) = 'accepted'
     and v_invitation.accepted_by = v_user_id then
    v_replayed := true;
  elsif lower(coalesce(v_invitation.status, '')) <> 'pending' then
    return jsonb_build_object(
      'status', 'error', 'message', 'Invitation is no longer active'
    );
  elsif v_invitation.expires_at is not null
        and v_invitation.expires_at <= now() then
    update public.property_invitations
    set status = 'expired'
    where id = v_invitation.id;
    return jsonb_build_object(
      'status', 'error', 'message', 'Invitation expired'
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_invitation.property_id::text || ':' || v_user_id::text, 0
    )
  );
  select pu.* into v_membership
  from public.property_users pu
  where pu.property_id = v_invitation.property_id
    and pu.user_id = v_user_id
  for update;
  if found then
    if not v_replayed or lower(btrim(v_membership.role)) <> v_role then
      return jsonb_build_object(
        'status', 'error',
        'message', 'You already belong to this property'
      );
    end if;
    -- A replay never changes an existing role or suspension state. In
    -- particular, an invitation can never demote an owner membership.
  else
    if v_replayed then
      return jsonb_build_object(
        'status', 'error',
        'message', 'Invitation already used'
      );
    end if;
    insert into public.property_users(
      property_id, user_id, role, status, created_at
    ) values (
      v_invitation.property_id, v_user_id, v_role, 'active', now()
    );
  end if;

  if not v_replayed then
    update public.property_invitations
    set status = 'accepted',
        accepted_at = now(),
        accepted_by = v_user_id
    where id = v_invitation.id;

    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id, event_type, new_data
    ) values (
      v_invitation.property_id, v_user_id, 'property_invitation',
      v_invitation.id::text, 'property_invitation_accepted',
      jsonb_build_object('email', v_user_email, 'role', v_role)
    );
  end if;

  return jsonb_build_object(
    'status', 'success',
    'message', 'Invitation accepted successfully',
    'property_id', v_invitation.property_id,
    'role', v_role,
    'replayed', v_replayed
  );
end;
$fn$;

create or replace function public.update_room_housekeeping_status(
  p_property_id uuid,
  p_room_id uuid,
  p_status text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_old public.rooms%rowtype;
  v_new public.rooms%rowtype;
begin
  perform app_private.require_property_permission(
    p_property_id, 'rooms', 'update'
  );
  if v_status not in (
    'ready', 'needs_cleaning', 'cleaning', 'out_of_service'
  ) then
    raise exception using errcode = '22023', message = 'Invalid housekeeping status';
  end if;

  select r.* into v_old
  from public.rooms r
  where r.id = p_room_id and r.property_id = p_property_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Room not found';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.property_id = p_property_id
      and b.room_id = p_room_id
      and b.status = 'checked_in'
  ) then
    raise exception using
      errcode = '22023',
      message = 'Check out the guest before changing housekeeping state';
  end if;

  update public.rooms
  set housekeeping_status = v_status,
      housekeeping_notes = nullif(btrim(coalesce(p_notes, '')), ''),
      housekeeping_updated_at = now(),
      operational_status = case v_status
        when 'ready' then 'available'
        when 'needs_cleaning' then 'dirty'
        when 'cleaning' then 'cleaning'
        else 'out_of_order'
      end,
      updated_at = now()
  where id = p_room_id and property_id = p_property_id
  returning * into v_new;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'room', p_room_id::text,
    'housekeeping_status_changed', to_jsonb(v_old), to_jsonb(v_new)
  );
  return jsonb_build_object(
    'success', true,
    'room_id', p_room_id,
    'status', v_new.housekeeping_status,
    'operational_status', v_new.operational_status,
    'updated_at', v_new.housekeeping_updated_at
  );
end;
$fn$;

-- Legacy new-booking availability contract, retained with canonical ACLs.
-- Both permissions are intentional: room inventory is operational data and
-- this price-bearing projection is only needed by staff who can create stays.
create or replace function public.get_walkin_available_rooms(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer default 1
)
returns table(
  room_id uuid,
  room_name text,
  room_type text,
  capacity integer,
  bed_count integer,
  price_per_night numeric,
  total_price numeric,
  nights integer,
  operational_status text,
  amenities jsonb,
  images jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_today date;
  v_nights integer;
begin
  perform app_private.require_property_permission(
    p_property_id, 'rooms', 'view'
  );
  perform app_private.require_property_permission(
    p_property_id, 'bookings', 'create'
  );
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception using errcode = '22023', message = 'Check-out must be after check-in';
  end if;
  if coalesce(p_guests, 0) < 1 then
    raise exception using errcode = '22023', message = 'Guests must be at least one';
  end if;

  v_today := app_private.property_business_date(p_property_id);
  if p_check_in < v_today then
    raise exception using errcode = '22023', message = 'Check-in cannot be in the past';
  end if;
  v_nights := p_check_out - p_check_in;

  return query
  select
    r.id,
    r.name,
    r.room_type,
    r.capacity,
    r.bed_count,
    r.price_per_night,
    round(r.price_per_night * v_nights, 2),
    v_nights,
    r.operational_status,
    coalesce(r.amenities, '[]'::jsonb),
    coalesce(r.images, '[]'::jsonb)
  from public.rooms r
  where r.property_id = p_property_id
    and coalesce(r.is_active, false)
    and coalesce(r.capacity, 0) >= p_guests
    and (
      (p_check_in = v_today
        and r.operational_status = 'available'
        and r.housekeeping_status = 'ready')
      or
      (p_check_in > v_today
        and coalesce(r.operational_status, '') not in (
          'maintenance', 'out_of_order'
        ))
    )
    and not exists (
      select 1
      from public.bookings b
      where b.room_id = r.id
        and b.status not in ('cancelled', 'no_show', 'checked_out')
        and p_check_in < b.check_out
        and p_check_out > b.check_in
    )
  order by r.price_per_night, lower(r.name), r.id;
end;
$fn$;

-- Expand phase: preserve legacy SELECT compatibility until the redesigned UI
-- is promoted, but remove every direct write and non-RLS-protected privilege.
do $expand_relation_acl$
declare
  v_relation text;
begin
  foreach v_relation in array array[
    'public.audit_log',
    'public.booking_full_details',
    'public.booking_payment_summary',
    'public.booking_payments',
    'public.bookings',
    'public.bookings_with_details',
    'public.guests',
    'public.guests_with_stats',
    'public.onboarding_state',
    'public.owner_profiles',
    'public.payments',
    'public.properties',
    'public.property_guests',
    'public.property_images',
    'public.property_invitations',
    'public.property_users',
    'public.role_permissions',
    'public.room_images',
    'public.rooms',
    'public.rooms_with_images',
    'public.user_permissions_view'
  ] loop
    if pg_catalog.to_regclass(v_relation) is not null then
      execute pg_catalog.format(
        'revoke insert, update, delete, truncate, references, trigger on table %s from public, anon, authenticated',
        v_relation
      );
    end if;
  end loop;
end;
$expand_relation_acl$;

-- Shared consumer surfaces retain their policy-scoped DML. Only privileges
-- that bypass row policies or enable schema-side effects are removed here.
do $shared_relation_acl$
declare
  v_relation text;
begin
  foreach v_relation in array array[
    'public.consumer_users_onboarding_state',
    'public.device_tokens',
    'public.notifications',
    'public.reviews',
    'public.roles',
    'public.user_profiles'
  ] loop
    if pg_catalog.to_regclass(v_relation) is not null then
      execute pg_catalog.format(
        'revoke truncate, references, trigger on table %s from public, anon, authenticated',
        v_relation
      );
    end if;
  end loop;
end;
$shared_relation_acl$;

-- These sensitive projections are not used by the currently deployed client;
-- remove raw reads now rather than waiting for the contract phase.
do $sensitive_select_acl$
declare
  v_relation text;
begin
  foreach v_relation in array array[
    'public.audit_log',
    'public.booking_full_details',
    'public.booking_payment_summary',
    'public.booking_payments',
    'public.guests',
    'public.guests_with_stats',
    'public.payments',
    'public.property_guests',
    'public.rooms_with_images',
    'public.user_permissions_view'
  ] loop
    if pg_catalog.to_regclass(v_relation) is not null then
      execute pg_catalog.format(
        'revoke select on table %s from public, anon, authenticated',
        v_relation
      );
    end if;
  end loop;
end;
$sensitive_select_acl$;

-- ---------------------------------------------------------------------------
-- 13. Explicit RPC ACLs. PostgreSQL otherwise grants EXECUTE to PUBLIC.
-- ---------------------------------------------------------------------------

revoke all on function
  public.get_property_dashboard(uuid),
  public.get_room_board(uuid),
  public.get_room_workspace(uuid,uuid),
  public.get_property_operations_board(uuid),
  public.get_walkin_available_rooms(uuid,date,date,integer),
  public.update_room_housekeeping_status(uuid,uuid,text,text),
  public.create_room(uuid,uuid,text,text,boolean,numeric,integer,integer,text,text[],jsonb),
  public.update_room(uuid,uuid,text,text,boolean,numeric,integer,integer,text,text[],jsonb),
  public.update_booking_lifecycle(uuid,uuid,text,text,boolean),
  public.check_in_booking(uuid),
  public.checkout_booking(uuid,boolean),
  public.record_booking_payment(uuid,uuid,numeric,text,text,text),
  public.record_booking_payment(uuid,uuid,uuid,numeric,text,text,text),
  public.list_property_bookings(uuid,text,text,text,date,date,integer,integer),
  public.get_booking_workspace(uuid,uuid),
  public.create_property_booking(uuid,uuid,uuid,jsonb,uuid,date,date,integer,integer,text,text,numeric,text,text),
  public.update_property_booking(uuid,uuid,uuid,date,date,integer,integer,text,text),
  public.list_property_guests(uuid,text,integer,integer,text),
  public.get_guest_workspace(uuid,uuid),
  public.update_property_guest(uuid,uuid,jsonb),
  public.get_property_calendar(uuid,date,date),
  public.get_owner_finance_dashboard(uuid,date,date),
  public.list_property_payments(uuid,date,date,text,text,text,integer,integer),
  public.get_property_reports(uuid,date,date),
  public.list_property_activity(uuid,text,integer,integer),
  public.get_property_activity_feed(uuid,text,integer,integer),
  public.list_my_notifications(uuid,boolean,integer,integer),
  public.list_notifications(integer,integer,boolean),
  public.set_notification_read(uuid,boolean),
  public.mark_notification_read(uuid),
  public.mark_all_notifications_read(uuid),
  public.reject_property_invitation(text),
  public.get_invitation_details(text),
  public.accept_property_invitation(text),
  public.get_property_settings(uuid),
  public.update_property_profile(uuid,text,text,text,text,text),
  public.update_property_operational_settings(uuid,text,time without time zone,time without time zone),
  public.get_my_profile(),
  public.update_my_profile(text,text,text),
  public.update_property_amenities(uuid,text[]),
  public.update_property_location(uuid,text,text,text,text,text,text,text,double precision,double precision),
  public.update_property_gallery(uuid,text[]),
  public.update_property_visibility(uuid,boolean),
  public.create_property_basic_info(text,text,text,text,jsonb,uuid),
  public.complete_property_onboarding_location(uuid,text,text,text,text,text,text,text,double precision,double precision),
  public.get_team_access_workspace(uuid),
  public.invite_staff(uuid,text,text),
  public.resend_staff_invitation(uuid,uuid),
  public.cancel_staff_invitation(uuid,uuid),
  public.delete_property_invitation(uuid,uuid),
  public.change_staff_role(uuid,uuid,text),
  public.update_staff_status(uuid,uuid,text),
  public.remove_staff(uuid,uuid)
from public, anon, authenticated;

-- Some deployed databases still have the legacy six-argument invitation
-- writer, while clean databases do not. Revoke it conditionally so this
-- migration is safe in both environments.
do $acl$
begin
  if pg_catalog.to_regprocedure(
    'public.invite_staff(uuid,text,text,text,text,text)'
  ) is not null then
    execute 'revoke all on function public.invite_staff(uuid,text,text,text,text,text) from public, anon, authenticated';
  end if;
end;
$acl$;

grant execute on function
  public.get_property_dashboard(uuid),
  public.get_room_board(uuid),
  public.get_room_workspace(uuid,uuid),
  public.get_property_operations_board(uuid),
  public.get_walkin_available_rooms(uuid,date,date,integer),
  public.update_room_housekeeping_status(uuid,uuid,text,text),
  public.create_room(uuid,uuid,text,text,boolean,numeric,integer,integer,text,text[],jsonb),
  public.update_room(uuid,uuid,text,text,boolean,numeric,integer,integer,text,text[],jsonb),
  public.update_booking_lifecycle(uuid,uuid,text,text,boolean),
  public.check_in_booking(uuid),
  public.checkout_booking(uuid,boolean),
  public.record_booking_payment(uuid,uuid,uuid,numeric,text,text,text),
  public.list_property_bookings(uuid,text,text,text,date,date,integer,integer),
  public.get_booking_workspace(uuid,uuid),
  public.create_property_booking(uuid,uuid,uuid,jsonb,uuid,date,date,integer,integer,text,text,numeric,text,text),
  public.update_property_booking(uuid,uuid,uuid,date,date,integer,integer,text,text),
  public.list_property_guests(uuid,text,integer,integer,text),
  public.get_guest_workspace(uuid,uuid),
  public.update_property_guest(uuid,uuid,jsonb),
  public.get_property_calendar(uuid,date,date),
  public.get_owner_finance_dashboard(uuid,date,date),
  public.list_property_payments(uuid,date,date,text,text,text,integer,integer),
  public.get_property_reports(uuid,date,date),
  public.list_property_activity(uuid,text,integer,integer),
  public.get_property_activity_feed(uuid,text,integer,integer),
  public.list_my_notifications(uuid,boolean,integer,integer),
  public.list_notifications(integer,integer,boolean),
  public.set_notification_read(uuid,boolean),
  public.mark_notification_read(uuid),
  public.mark_all_notifications_read(uuid),
  public.reject_property_invitation(text),
  public.get_invitation_details(text),
  public.accept_property_invitation(text),
  public.get_property_settings(uuid),
  public.update_property_profile(uuid,text,text,text,text,text),
  public.update_property_operational_settings(uuid,text,time without time zone,time without time zone),
  public.get_my_profile(),
  public.update_my_profile(text,text,text),
  public.update_property_amenities(uuid,text[]),
  public.update_property_location(uuid,text,text,text,text,text,text,text,double precision,double precision),
  public.update_property_gallery(uuid,text[]),
  public.update_property_visibility(uuid,boolean),
  public.create_property_basic_info(text,text,text,text,jsonb,uuid),
  public.complete_property_onboarding_location(uuid,text,text,text,text,text,text,text,double precision,double precision),
  public.get_team_access_workspace(uuid),
  public.invite_staff(uuid,text,text),
  public.resend_staff_invitation(uuid,uuid),
  public.cancel_staff_invitation(uuid,uuid),
  public.delete_property_invitation(uuid,uuid),
  public.change_staff_role(uuid,uuid,text),
  public.update_staff_status(uuid,uuid,text),
  public.remove_staff(uuid,uuid)
to authenticated;

revoke all on function public.loji_create_booking_inbox_notifications()
  from public, anon, authenticated;

-- Preserve the anonymous app bootstrap restored by the preceding migration.
revoke all on function public.get_app_session() from public, anon, authenticated;
grant execute on function public.get_app_session() to anon, authenticated;

commit;
