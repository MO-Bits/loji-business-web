-- Loji Business daily-operations workspace and richer, code-free hospitality setup.
-- Existing property, room, booking, guest, payment and image records are retained.

alter table public.properties
  add column if not exists payment_methods jsonb;

-- Existing properties predate method configuration and could already be using
-- any supported tender. Preserve that rollout compatibility; new properties
-- still default to cash/mobile and registration saves an explicit selection.
update public.properties
set payment_methods = '["cash","mobile_money","card","bank_transfer","cheque","other"]'::jsonb
where payment_methods is null
   or case
  when jsonb_typeof(payment_methods) = 'array' then
    jsonb_array_length(payment_methods) = 0
    or not (
      payment_methods <@ '["cash","mobile_money","card","bank_transfer","cheque","other"]'::jsonb
    )
  else true
end;

alter table public.properties
  alter column payment_methods set default '["cash","mobile_money"]'::jsonb,
  alter column payment_methods set not null;

alter table public.properties
  drop constraint if exists properties_payment_methods_array_check;
alter table public.properties
  add constraint properties_payment_methods_array_check
  check (case when jsonb_typeof(payment_methods) = 'array' then
    jsonb_array_length(payment_methods) between 1 and 6
    and payment_methods <@ '["cash","mobile_money","card","bank_transfer","cheque","other"]'::jsonb
  else false end) not valid;
alter table public.properties
  validate constraint properties_payment_methods_array_check;

comment on column public.properties.payment_methods is
  'Payment methods accepted by the property front desk.';

-- Enrich the canonical session without replacing its established shape. Both
-- the membership properties and the root active property carry the same list.
alter function public.get_app_session() rename to get_app_session_core;
revoke all on function public.get_app_session_core()
  from public, anon, authenticated;

create or replace function public.get_app_session()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_result jsonb;
  v_memberships jsonb;
  v_active_property_id text;
  v_active_property jsonb;
begin
  v_result := public.get_app_session_core();

  select coalesce(jsonb_agg(
    jsonb_set(
      jsonb_set(
        membership.value,
        '{property,payment_methods}',
        coalesce(p.payment_methods, '["cash","mobile_money"]'::jsonb),
        true
      ),
      '{property,business_date}',
      to_jsonb(app_private.property_business_date(p.id)),
      true
    ) order by membership.ordinality
  ), '[]'::jsonb)
  into v_memberships
  from jsonb_array_elements(coalesce(v_result->'memberships', '[]'::jsonb))
    with ordinality membership(value, ordinality)
  left join public.properties p
    on p.id = nullif(membership.value->>'property_id', '')::uuid;

  v_result := jsonb_set(v_result, '{memberships}', v_memberships, true);
  v_active_property_id := coalesce(
    nullif(v_result->>'active_property_id', ''),
    nullif(v_result#>>'{property,id}', '')
  );

  if v_active_property_id is not null then
    select membership.value->'property'
    into v_active_property
    from jsonb_array_elements(v_memberships) membership(value)
    where membership.value->>'property_id' = v_active_property_id
    limit 1;

    if v_active_property is not null then
      v_result := jsonb_set(v_result, '{property}', v_active_property, true);
    end if;
  end if;

  return v_result;
end;
$fn$;

revoke all on function public.get_app_session() from public, anon, authenticated;
grant execute on function public.get_app_session() to anon, authenticated;

-- Keep the already-deployed registration transaction as a private core and wrap
-- it so older clients remain valid while new setup details are saved atomically.
alter function public.complete_hospitality_registration(uuid, jsonb, jsonb, jsonb)
  rename to complete_hospitality_registration_core;

revoke all on function public.complete_hospitality_registration_core(uuid, jsonb, jsonb, jsonb)
  from public, anon, authenticated;

create or replace function public.complete_hospitality_registration(
  p_request_key uuid,
  p_business jsonb,
  p_rooms jsonb,
  p_staff jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_result jsonb;
  v_property_id uuid;
  v_description text := nullif(btrim(coalesce(p_business->>'description', '')), '');
  v_amenities_input jsonb := coalesce(p_business->'amenities', '[]'::jsonb);
  v_payments_input jsonb := case
    when coalesce(p_business, '{}'::jsonb) ? 'payment_methods'
      then coalesce(p_business->'payment_methods', '[]'::jsonb)
    else '["cash","mobile_money"]'::jsonb
  end;
  v_amenities jsonb;
  v_payment_methods jsonb;
  v_checkin_text text := coalesce(nullif(btrim(p_business->>'checkin_time'), ''), '14:00');
  v_checkout_text text := coalesce(nullif(btrim(p_business->>'checkout_time'), ''), '10:00');
  v_checkin_time time;
  v_checkout_time time;
begin
  if jsonb_typeof(coalesce(p_business, 'null'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'Registration data is invalid';
  end if;
  if length(coalesce(v_description, '')) > 2000 then
    raise exception using errcode = '22023', message = 'Business description must be 2,000 characters or fewer';
  end if;
  if case when jsonb_typeof(v_amenities_input) = 'array' then
       jsonb_array_length(v_amenities_input) > 50
     else true end then
    raise exception using errcode = '22023', message = 'Choose up to 50 services and amenities';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_amenities_input) item(value)
    where jsonb_typeof(item.value) <> 'string'
      or length(btrim(item.value #>> '{}')) not between 1 and 80
  ) then
    raise exception using errcode = '22023', message = 'Services and amenities are invalid';
  end if;
  if case when jsonb_typeof(v_payments_input) = 'array' then
       jsonb_array_length(v_payments_input) not between 1 and 6
     else true end then
    raise exception using errcode = '22023', message = 'Accepted payment methods are invalid';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(v_payments_input) method(value)
    where lower(btrim(method.value)) not in (
      'cash', 'mobile_money', 'card', 'bank_transfer', 'cheque', 'other'
    )
  ) then
    raise exception using errcode = '22023', message = 'Accepted payment methods are invalid';
  end if;
  if v_checkin_text !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     or v_checkout_text !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     or v_checkin_text = v_checkout_text then
    raise exception using errcode = '22023', message = 'Choose valid and different check-in and checkout times';
  end if;
  v_checkin_time := v_checkin_text::time;
  v_checkout_time := v_checkout_text::time;

  select coalesce(jsonb_agg(to_jsonb(clean.value) order by clean.first_position), '[]'::jsonb)
  into v_amenities
  from (
    select distinct on (lower(btrim(item.value #>> '{}')))
      item.ordinality as first_position,
      btrim(item.value #>> '{}') as value
    from jsonb_array_elements(v_amenities_input) with ordinality item(value, ordinality)
    order by lower(btrim(item.value #>> '{}')), item.ordinality
  ) clean;

  select coalesce(jsonb_agg(to_jsonb(clean.value) order by clean.first_position), '[]'::jsonb)
  into v_payment_methods
  from (
    select min(item.ordinality) as first_position, lower(btrim(item.value)) as value
    from jsonb_array_elements_text(v_payments_input) with ordinality item(value, ordinality)
    group by lower(btrim(item.value))
  ) clean;

  v_result := public.complete_hospitality_registration_core(
    p_request_key, p_business, p_rooms, p_staff
  );
  v_property_id := nullif(v_result->>'property_id', '')::uuid;

  if v_property_id is not null
     and not coalesce((v_result->>'replayed')::boolean, false) then
    update public.properties
    set description = v_description,
        amenities = v_amenities,
        payment_methods = v_payment_methods,
        checkin_time = v_checkin_time,
        checkout_time = v_checkout_time,
        updated_at = now()
    where id = v_property_id and owner_id = auth.uid();

    update public.property_invitations
    set token = null,
        expires_at = now() + interval '30 days'
    where property_id = v_property_id
      and lower(coalesce(status, '')) = 'pending';

    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id, event_type, new_data, created_at
    ) values (
      v_property_id, auth.uid(), 'property', v_property_id::text,
      'hospitality_registration_details_saved',
      jsonb_build_object(
        'amenity_count', jsonb_array_length(v_amenities),
        'payment_method_count', jsonb_array_length(v_payment_methods),
        'checkin_time', v_checkin_text,
        'checkout_time', v_checkout_text
      ),
      now()
    );

    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    )
    select
      v_property_id,
      auth.uid(),
      'staff_access',
      pu.id::text,
      'staff_access_activated',
      jsonb_build_object(
        'email', lower(btrim(member.value->>'email')),
        'role', lower(btrim(pu.role)),
        'source', 'registration'
      ),
      now()
    from jsonb_array_elements(coalesce(p_staff, '[]'::jsonb)) member(value)
    join auth.users u
      on lower(u.email) = lower(btrim(member.value->>'email'))
     and u.email_confirmed_at is not null
    join public.property_users pu
      on pu.property_id = v_property_id and pu.user_id = u.id
    where lower(btrim(pu.role)) in ('manager', 'receptionist');

    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    )
    select
      v_property_id,
      auth.uid(),
      'staff_access',
      i.id::text,
      'staff_pending_access_created',
      jsonb_build_object(
        'email', lower(btrim(i.email)),
        'role', lower(btrim(i.role)),
        'source', 'registration'
      ),
      now()
    from jsonb_array_elements(coalesce(p_staff, '[]'::jsonb)) member(value)
    join public.property_invitations i
      on i.property_id = v_property_id
     and lower(btrim(i.email)) = lower(btrim(member.value->>'email'))
     and lower(coalesce(i.status, '')) = 'pending';
  end if;

  return v_result;
end;
$fn$;

revoke all on function public.complete_hospitality_registration(uuid, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.complete_hospitality_registration(uuid, jsonb, jsonb, jsonb)
  to authenticated;

-- Extend the property settings read contract without breaking existing update RPCs.
alter function public.get_property_settings(uuid) rename to get_property_settings_core;
revoke all on function public.get_property_settings_core(uuid) from public, anon, authenticated;

create or replace function public.get_property_settings(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_result jsonb;
  v_methods jsonb;
begin
  v_result := public.get_property_settings_core(p_property_id);
  select coalesce(p.payment_methods, '[]'::jsonb) into v_methods
  from public.properties p where p.id = p_property_id;
  return jsonb_set(v_result, '{property,payment_methods}', v_methods, true);
end;
$fn$;

revoke all on function public.get_property_settings(uuid) from public, anon;
grant execute on function public.get_property_settings(uuid) to authenticated;

create or replace function public.update_property_payment_methods(
  p_property_id uuid,
  p_payment_methods text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_methods text[];
  v_old jsonb;
begin
  perform app_private.require_property_permission(p_property_id, 'property', 'update');
  if cardinality(coalesce(p_payment_methods, array[]::text[])) not between 1 and 6
     or exists (
       select 1
       from unnest(coalesce(p_payment_methods, array[]::text[])) item(value)
       where nullif(btrim(item.value), '') is null
          or lower(btrim(item.value)) not in (
            'cash', 'mobile_money', 'card', 'bank_transfer', 'cheque', 'other'
          )
     ) then
    raise exception using errcode = '22023', message = 'Accepted payment methods are invalid';
  end if;
  select coalesce(array_agg(method order by first_position), array[]::text[])
  into v_methods
  from (
    select lower(btrim(value)) as method, min(ordinality) as first_position
    from unnest(coalesce(p_payment_methods, array[]::text[])) with ordinality item(value, ordinality)
    where lower(btrim(value)) in (
      'cash', 'mobile_money', 'card', 'bank_transfer', 'cheque', 'other'
    )
    group by lower(btrim(value))
  ) methods;
  if cardinality(v_methods) < 1 then
    raise exception using errcode = '22023', message = 'Choose at least one accepted payment method';
  end if;
  select coalesce(p.payment_methods, '[]'::jsonb) into v_old
  from public.properties p where p.id = p_property_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Property not found'; end if;
  update public.properties
  set payment_methods = to_jsonb(v_methods), updated_at = now()
  where id = p_property_id;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property', p_property_id::text,
    'property_payment_methods_updated',
    jsonb_build_object('payment_methods', v_old),
    jsonb_build_object('payment_methods', to_jsonb(v_methods))
  );
  return public.get_property_settings(p_property_id);
end;
$fn$;

revoke all on function public.update_property_payment_methods(uuid, text[]) from public, anon;
grant execute on function public.update_property_payment_methods(uuid, text[]) to authenticated;

create or replace function public.update_property_operations_and_payments(
  p_property_id uuid,
  p_timezone text,
  p_checkin_time time,
  p_checkout_time time,
  p_payment_methods text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  -- Both existing writers run in this function's transaction. A validation or
  -- write failure in either half rolls the complete settings change back.
  perform public.update_property_operational_settings(
    p_property_id, p_timezone, p_checkin_time, p_checkout_time
  );
  return public.update_property_payment_methods(p_property_id, p_payment_methods);
end;
$fn$;

revoke all on function public.update_property_operations_and_payments(
  uuid, text, time, time, text[]
) from public, anon;
grant execute on function public.update_property_operations_and_payments(
  uuid, text, time, time, text[]
) to authenticated;

create or replace function app_private.require_property_payment_method(
  p_property_id uuid,
  p_method text
)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_method text := lower(replace(btrim(coalesce(p_method, '')), ' ', '_'));
  v_methods jsonb;
begin
  if v_method not in (
    'cash', 'mobile_money', 'card', 'bank_transfer', 'cheque', 'other'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported payment method';
  end if;

  select p.payment_methods into v_methods
  from public.properties p
  where p.id = p_property_id
  for share;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;
  if not (
    coalesce(v_methods, '["cash","mobile_money"]'::jsonb)
      @> jsonb_build_array(v_method)
  ) then
    raise exception using
      errcode = '22023',
      message = 'This payment method is not accepted by the property';
  end if;
  return v_method;
end;
$fn$;

revoke all on function app_private.require_property_payment_method(uuid, text)
  from public, anon, authenticated;

create or replace function app_private.lock_cashier_cash_ledger_for_user(
  p_property_id uuid,
  p_method text,
  p_cashier_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_method text := lower(replace(btrim(coalesce(p_method, '')), ' ', '_'));
  v_date date;
begin
  if v_method = 'cash' and p_cashier_id is not null then
    v_date := app_private.property_business_date(p_property_id);
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      'loji-cashier-close:' || p_property_id::text || ':'
        || p_cashier_id::text || ':' || v_date::text,
      0
    ));
    if exists (
      select 1
      from public.cashier_closings cc
      where cc.property_id = p_property_id
        and cc.cashier_id = p_cashier_id
        and cc.business_date = v_date
    ) then
      raise exception using
        errcode = '55000',
        message = 'Your cash drawer is already closed for this business date';
    end if;
  end if;
end;
$fn$;

revoke all on function app_private.lock_cashier_cash_ledger_for_user(
  uuid, text, uuid
) from public, anon, authenticated;

create or replace function app_private.lock_cashier_cash_ledger(
  p_property_id uuid,
  p_method text
)
returns void
language sql
security definer
set search_path = ''
as $fn$
  select app_private.lock_cashier_cash_ledger_for_user(
    p_property_id, p_method, auth.uid()
  );
$fn$;

revoke all on function app_private.lock_cashier_cash_ledger(uuid, text)
  from public, anon, authenticated;

-- Serialize use of an existing property/guest association with copy-on-write
-- identity isolation below. Booking creation takes the same lock so it cannot
-- attach a new stay to an association while that association is being split.
create or replace function app_private.lock_property_guest_identity(
  p_property_id uuid,
  p_guest_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $fn$
  select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'loji-property-guest:' || p_property_id::text || ':' || p_guest_id::text,
    0
  ));
$fn$;

revoke all on function app_private.lock_property_guest_identity(uuid, uuid)
  from public, anon, authenticated;

-- Enforce accepted methods at both established function signatures while
-- preserving their prior ACL split: the six-argument non-idempotent overload
-- remains internal, and authenticated clients use the seven-argument writer.
alter function public.record_booking_payment(uuid, uuid, numeric, text, text, text)
  rename to record_booking_payment_core;
revoke all on function public.record_booking_payment_core(
  uuid, uuid, numeric, text, text, text
) from public, anon, authenticated;

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
begin
  perform app_private.require_property_permission(p_property_id, 'payments', 'create');
  perform app_private.require_property_payment_method(p_property_id, p_method);
  perform app_private.lock_cashier_cash_ledger(p_property_id, p_method);
  return public.record_booking_payment_core(
    p_property_id, p_booking_id, p_amount, p_method, p_reference, p_notes
  );
end;
$fn$;

revoke all on function public.record_booking_payment(
  uuid, uuid, numeric, text, text, text
) from public, anon, authenticated;
-- Intentionally no authenticated grant. The preceding canonical migration
-- explicitly retired this non-idempotent overload from the public RPC surface.

alter function public.record_booking_payment(uuid, uuid, uuid, numeric, text, text, text)
  rename to record_booking_payment_idempotent_core;
revoke all on function public.record_booking_payment_idempotent_core(
  uuid, uuid, uuid, numeric, text, text, text
) from public, anon, authenticated;

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
begin
  perform app_private.require_property_permission(p_property_id, 'payments', 'create');
  if not exists (
    select 1
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    where b.property_id = p_property_id
      and p.booking_id = p_booking_id
      and p.idempotency_key = p_idempotency_key
  ) then
    perform app_private.require_property_payment_method(p_property_id, p_method);
    perform app_private.lock_cashier_cash_ledger(p_property_id, p_method);
  end if;
  return public.record_booking_payment_idempotent_core(
    p_property_id, p_booking_id, p_idempotency_key,
    p_amount, p_method, p_reference, p_notes
  );
end;
$fn$;

revoke all on function public.record_booking_payment(
  uuid, uuid, uuid, numeric, text, text, text
) from public, anon;
grant execute on function public.record_booking_payment(
  uuid, uuid, uuid, numeric, text, text, text
) to authenticated;

alter function public.create_property_booking(
  uuid, uuid, uuid, jsonb, uuid, date, date, integer, integer,
  text, text, numeric, text, text
) rename to create_property_booking_core;
revoke all on function public.create_property_booking_core(
  uuid, uuid, uuid, jsonb, uuid, date, date, integer, integer,
  text, text, numeric, text, text
) from public, anon, authenticated;

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
begin
  perform app_private.require_property_permission(p_property_id, 'bookings', 'create');
  if p_existing_guest_id is not null then
    perform app_private.lock_property_guest_identity(
      p_property_id, p_existing_guest_id
    );
  end if;
  if not exists (
    select 1 from public.bookings b
    where b.property_id = p_property_id
      and b.idempotency_key = p_idempotency_key
  ) and round(coalesce(p_initial_payment_amount, 0), 2) > 0 then
    perform app_private.require_property_payment_method(
      p_property_id, p_initial_payment_method
    );
    perform app_private.lock_cashier_cash_ledger(
      p_property_id, p_initial_payment_method
    );
  end if;
  return public.create_property_booking_core(
    p_property_id, p_idempotency_key, p_room_id, p_guest,
    p_existing_guest_id, p_check_in, p_check_out, p_adults, p_children,
    p_source, p_special_requests, p_initial_payment_amount,
    p_initial_payment_method, p_initial_payment_reference
  );
end;
$fn$;

revoke all on function public.create_property_booking(
  uuid, uuid, uuid, jsonb, uuid, date, date, integer, integer,
  text, text, numeric, text, text
) from public, anon;
grant execute on function public.create_property_booking(
  uuid, uuid, uuid, jsonb, uuid, date, date, integer, integer,
  text, text, numeric, text, text
) to authenticated;

alter function public.reverse_booking_payment(uuid, uuid, text, text, uuid)
  rename to reverse_booking_payment_core;
revoke all on function public.reverse_booking_payment_core(
  uuid, uuid, text, text, uuid
) from public, anon, authenticated;

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
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_method text;
  v_booking_id uuid;
  v_original_receiver uuid;
  v_affected_cashier uuid;
  v_result jsonb;
begin
  if v_action not in ('refund', 'void') then
    raise exception using errcode = '22023', message = 'Unsupported reversal action';
  end if;
  perform app_private.require_property_permission(
    p_property_id, 'payments', v_action
  );
  select p.booking_id, coalesce(p.payment_method, p.method), p.received_by
  into v_booking_id, v_method, v_original_receiver
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  where p.id = p_payment_id and b.property_id = p_property_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Payment not found';
  end if;
  -- A void unwinds the original cashier's receipt. A refund is a new cash
  -- disbursement by the approving actor because the RPC has no cashier input.
  v_affected_cashier := case when v_action = 'void'
    then v_original_receiver else auth.uid() end;
  -- An exact idempotent replay remains available after drawer close, but a
  -- new cash reversal cannot be posted into an already reconciled drawer.
  if not exists (
    select 1
    from public.payments p
    where p.booking_id = v_booking_id
      and p.idempotency_key = p_idempotency_key
  ) then
    perform app_private.lock_cashier_cash_ledger_for_user(
      p_property_id, v_method, v_affected_cashier
    );
  end if;
  v_result := public.reverse_booking_payment_core(
    p_property_id, p_payment_id, p_action, p_reason, p_idempotency_key
  );
  if v_action = 'void'
     and not coalesce((v_result->>'replayed')::boolean, false) then
    -- The canonical core records approved_by as the actor but historically
    -- also attributed every reversal to that actor. Correct only the newly
    -- inserted row inside this transaction so the void nets the original
    -- cashier drawer while approved_by remains the manager/owner.
    update public.payments p
    set received_by = v_original_receiver
    where p.id = (v_result->>'payment_id')::uuid
      and p.booking_id = v_booking_id
      and p.entry_type = 'void'
      and p.reverses_payment_id = p_payment_id;
  end if;
  return v_result;
end;
$fn$;

revoke all on function public.reverse_booking_payment(
  uuid, uuid, text, text, uuid
) from public, anon;
grant execute on function public.reverse_booking_payment(
  uuid, uuid, text, text, uuid
) to authenticated;

-- Tanzania-only manual location editor. Untouched properties retain legacy map
-- data; a successful manual address edit clears coordinates that would be stale.
alter function public.update_property_location(
  uuid, text, text, text, text, text, text, text, double precision, double precision
) rename to update_property_location_core;
revoke all on function public.update_property_location_core(
  uuid, text, text, text, text, text, text, text, double precision, double precision
) from public, anon, authenticated;

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
  v_region text := nullif(btrim(coalesce(p_region, '')), '');
  v_district text := nullif(btrim(coalesce(p_district, '')), '');
  v_ward text := nullif(btrim(coalesce(p_ward, '')), '');
  v_street text := nullif(btrim(coalesce(p_street, '')), '');
  v_address text;
begin
  perform app_private.require_property_permission(p_property_id, 'property', 'update');
  if v_region is null or lower(v_region) not in (
    'arusha', 'dar es salaam', 'dodoma', 'geita', 'iringa', 'kagera',
    'katavi', 'kigoma', 'kilimanjaro', 'kaskazini pemba', 'kaskazini unguja',
    'kusini pemba', 'kusini unguja', 'lindi', 'manyara', 'mara', 'mbeya',
    'mjini magharibi', 'morogoro', 'mtwara', 'mwanza', 'njombe', 'pwani',
    'rukwa', 'ruvuma', 'shinyanga', 'simiyu', 'singida', 'songwe', 'tabora', 'tanga'
  ) then
    raise exception using errcode = '22023', message = 'Choose a Tanzania region';
  end if;
  if v_district is null or length(v_district) > 120
     or length(coalesce(v_ward, '')) > 120
     or length(coalesce(v_street, '')) > 200
     or (v_ward is null and v_street is null) then
    raise exception using errcode = '22023', message = 'Add the district and a ward, street or nearby landmark';
  end if;
  v_address := pg_catalog.concat_ws(', ', v_street, v_ward, v_district, v_region, 'Tanzania');
  return public.update_property_location_core(
    p_property_id, 'Tanzania', v_region, v_district, v_ward, v_street,
    v_address, null, null, null
  );
end;
$fn$;

revoke all on function public.update_property_location(
  uuid, text, text, text, text, text, text, text, double precision, double precision
) from public, anon;
grant execute on function public.update_property_location(
  uuid, text, text, text, text, text, text, text, double precision, double precision
) to authenticated;

-- Per-booking settlement belongs in the daily guest workflow even when the
-- caller cannot inspect property-wide finance. Commercial lifetime aggregates
-- remain in the core response and stay owner/manager-only.
create or replace function app_private.guest_stays_with_settlement(
  p_property_id uuid,
  p_guest_id uuid,
  p_stays jsonb
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(jsonb_agg(
    case when b.id is null then stay.value else
      stay.value || jsonb_build_object(
        'settlement', jsonb_build_object(
          'total', b.total_price,
          'paid', coalesce(paid.amount_paid, 0),
          'balance', greatest(b.total_price - coalesce(paid.amount_paid, 0), 0),
          'status', b.payment_status
        )
      )
    end order by stay.ordinality
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_stays, '[]'::jsonb))
    with ordinality stay(value, ordinality)
  left join public.bookings b
    on b.id = nullif(stay.value->>'id', '')::uuid
   and b.property_id = p_property_id
   and b.guest_id = p_guest_id
  left join lateral (
    select coalesce(sum(p.amount) filter (
      where coalesce(p.payment_status, p.status) = 'completed'
    ), 0)::numeric as amount_paid
    from public.payments p
    where p.booking_id = b.id
  ) paid on true;
$fn$;

revoke all on function app_private.guest_stays_with_settlement(
  uuid, uuid, jsonb
) from public, anon, authenticated;

alter function public.get_guest_workspace(uuid, uuid)
  rename to get_guest_workspace_core;
revoke all on function public.get_guest_workspace_core(uuid, uuid)
  from public, anon, authenticated;

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
  v_result jsonb;
  v_view_settlement boolean;
begin
  v_result := public.get_guest_workspace_core(p_property_id, p_guest_id);
  v_view_settlement := app_private.can_view_booking_settlement(p_property_id);
  v_result := jsonb_set(
    v_result,
    '{capabilities}',
    coalesce(v_result->'capabilities', '{}'::jsonb) || jsonb_build_object(
      'view_settlement', v_view_settlement
    ),
    true
  );

  if v_view_settlement then
    v_result := jsonb_set(
      v_result, '{stays,current}',
      app_private.guest_stays_with_settlement(
        p_property_id, p_guest_id, v_result#>'{stays,current}'
      ), true
    );
    v_result := jsonb_set(
      v_result, '{stays,upcoming}',
      app_private.guest_stays_with_settlement(
        p_property_id, p_guest_id, v_result#>'{stays,upcoming}'
      ), true
    );
    v_result := jsonb_set(
      v_result, '{stays,past}',
      app_private.guest_stays_with_settlement(
        p_property_id, p_guest_id, v_result#>'{stays,past}'
      ), true
    );
  end if;

  return v_result;
end;
$fn$;

revoke all on function public.get_guest_workspace(uuid, uuid)
  from public, anon;
grant execute on function public.get_guest_workspace(uuid, uuid)
  to authenticated;

-- Keep internal guest notes property-scoped and reject stale edits without
-- changing the public RPC signature used by existing clients.
alter function public.update_property_guest(uuid, uuid, jsonb)
  rename to update_property_guest_core;
revoke all on function public.update_property_guest_core(uuid, uuid, jsonb)
  from public, anon, authenticated;

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
  v_payload jsonb := p_guest;
  v_expected_text text;
  v_expected_updated_at timestamptz;
  v_current_updated_at timestamptz;
  v_effective_guest_id uuid := p_guest_id;
  v_link public.property_guests%rowtype;
  v_guest public.guests%rowtype;
  v_clone public.guests%rowtype;
  v_requires_isolation boolean := false;
begin
  perform app_private.require_property_permission(p_property_id, 'guests', 'update');
  if v_payload is null or jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'Guest details are required';
  end if;

  v_expected_text := nullif(btrim(coalesce(v_payload->>'expected_updated_at', '')), '');
  if v_expected_text is not null then
    begin
      v_expected_updated_at := v_expected_text::timestamptz;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception using errcode = '22023', message = 'Guest version is invalid';
    end;

  end if;

  perform app_private.lock_property_guest_identity(p_property_id, p_guest_id);

  -- Every link for the shared identity is locked in property order before the
  -- guest row. Concurrent edits from two properties therefore cannot deadlock
  -- or both decide to mutate the shared row.
  perform 1
  from public.property_guests pg
  where pg.guest_id = p_guest_id
  order by pg.property_id
  for update;

  select pg.* into v_link
  from public.property_guests pg
  where pg.property_id = p_property_id and pg.guest_id = p_guest_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Guest not found';
  end if;

  select g.* into v_guest
  from public.guests g
  where g.id = p_guest_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Guest not found';
  end if;
  v_current_updated_at := v_guest.updated_at;

  if v_expected_updated_at is not null
     and v_current_updated_at is distinct from v_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'This guest profile changed in another session. Refresh and review the latest details before saving.';
  end if;

  select exists (
    select 1
    from public.property_guests pg
    where pg.guest_id = p_guest_id
      and pg.property_id <> p_property_id
      and app_private.current_property_role(pg.property_id) is null
  ) into v_requires_isolation;

  if v_requires_isolation then
    insert into public.guests(
      title, first_name, middle_name, last_name, gender, date_of_birth,
      occupation, nationality, phone, email, address, where_from, where_to,
      id_type, id_number, emergency_contact_name, emergency_contact_phone,
      notes, created_at, updated_at
    ) values (
      v_guest.title, v_guest.first_name, v_guest.middle_name,
      v_guest.last_name, v_guest.gender, v_guest.date_of_birth,
      v_guest.occupation, v_guest.nationality, v_guest.phone, v_guest.email,
      v_guest.address, v_guest.where_from, v_guest.where_to,
      v_guest.id_type, v_guest.id_number, v_guest.emergency_contact_name,
      v_guest.emergency_contact_phone, v_guest.notes,
      v_guest.created_at, v_guest.updated_at
    ) returning * into v_clone;
    v_effective_guest_id := v_clone.id;

    insert into public.property_guests(
      property_id, guest_id, property_notes, created_at, updated_at
    ) values (
      p_property_id, v_effective_guest_id, v_link.property_notes,
      v_link.created_at, v_link.updated_at
    );

    update public.bookings
    set guest_id = v_effective_guest_id
    where property_id = p_property_id and guest_id = p_guest_id;

    delete from public.property_guests
    where property_id = p_property_id and guest_id = p_guest_id;

    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id, event_type, new_data
    ) values (
      p_property_id, auth.uid(), 'guest', v_effective_guest_id::text,
      'guest_identity_isolated',
      jsonb_build_object(
        'previous_guest_id', p_guest_id,
        'guest_id', v_effective_guest_id,
        'reason', 'shared_with_an_unavailable_property'
      )
    );
  end if;

  v_payload := v_payload - 'expected_updated_at';
  if v_payload ? 'notes' and not (v_payload ? 'property_notes') then
    v_payload := jsonb_set(
      v_payload - 'notes',
      '{property_notes}',
      coalesce(v_payload->'notes', 'null'::jsonb),
      true
    );
  else
    v_payload := v_payload - 'notes';
  end if;

  return public.update_property_guest_core(
    p_property_id, v_effective_guest_id, v_payload
  );
end;
$fn$;

revoke all on function public.update_property_guest(uuid, uuid, jsonb)
  from public, anon;
grant execute on function public.update_property_guest(uuid, uuid, jsonb)
  to authenticated;

-- Make Confirmed the sole check-in source state. The lifecycle core remains
-- the lock-holding authority for date, room-readiness and occupancy checks.
alter function public.update_booking_lifecycle(uuid, uuid, text, text, boolean)
  rename to update_booking_lifecycle_core;
revoke all on function public.update_booking_lifecycle_core(
  uuid, uuid, text, text, boolean
) from public, anon, authenticated;

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
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_status text;
begin
  if v_action = 'check_in' then
    perform app_private.require_property_permission(
      p_property_id, 'bookings', 'checkin'
    );
    select b.status into v_status
    from public.bookings b
    where b.id = p_booking_id and b.property_id = p_property_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'Booking not found';
    end if;
    if v_status <> 'confirmed' then
      raise exception using
        errcode = '22023',
        message = 'Confirm this booking before check-in';
    end if;
  end if;

  return public.update_booking_lifecycle_core(
    p_property_id, p_booking_id, p_action, p_reason, p_allow_balance
  );
end;
$fn$;

revoke all on function public.update_booking_lifecycle(
  uuid, uuid, text, text, boolean
) from public, anon;
grant execute on function public.update_booking_lifecycle(
  uuid, uuid, text, text, boolean
) to authenticated;

-- Project check-in only when the complete server predicate is currently true.
-- The core response and every other allowed action remain unchanged.
alter function public.get_booking_workspace(uuid, uuid)
  rename to get_booking_workspace_lifecycle_core;
revoke all on function public.get_booking_workspace_lifecycle_core(uuid, uuid)
  from public, anon, authenticated;

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
  v_result jsonb;
  v_can_check_in boolean;
  v_actions jsonb;
begin
  v_result := public.get_booking_workspace_lifecycle_core(
    p_property_id, p_booking_id
  );
  select exists (
    select 1
    from public.bookings b
    join public.rooms r
      on r.id = b.room_id and r.property_id = b.property_id
    where b.id = p_booking_id
      and b.property_id = p_property_id
      and b.status = 'confirmed'
      and app_private.property_business_date(p_property_id) >= b.check_in
      and app_private.property_business_date(p_property_id) < b.check_out
      and coalesce(r.is_active, false)
      and coalesce(r.housekeeping_status, '') = 'ready'
      and coalesce(r.operational_status, '') = 'available'
      and not exists (
        select 1
        from public.bookings occupied
        where occupied.room_id = b.room_id
          and occupied.id <> b.id
          and occupied.status = 'checked_in'
      )
  ) into v_can_check_in;

  if not v_can_check_in then
    select coalesce(jsonb_agg(action.value order by action.ordinality), '[]'::jsonb)
    into v_actions
    from jsonb_array_elements(coalesce(v_result->'allowed_actions', '[]'::jsonb))
      with ordinality action(value, ordinality)
    where action.value <> '"check_in"'::jsonb;
    v_result := jsonb_set(v_result, '{allowed_actions}', v_actions, true);
  end if;

  return v_result;
end;
$fn$;

revoke all on function public.get_booking_workspace(uuid, uuid)
  from public, anon;
grant execute on function public.get_booking_workspace(uuid, uuid)
  to authenticated;

-- Receptionists may complete a settled checkout. The lifecycle RPC remains the
-- authority and still rejects any balance override.
insert into public.role_permissions(role, resource, action)
values
  ('receptionist', 'bookings', 'checkout'),
  ('manager', 'reports', 'view'),
  ('owner', 'rooms', 'housekeeping'),
  ('manager', 'rooms', 'housekeeping'),
  ('receptionist', 'rooms', 'housekeeping')
on conflict (role, resource, action) do nothing;

-- Keep room administration separate from daily housekeeping. Existing clients
-- retain manage_rooms while the room board/detail can independently enable
-- status controls for receptionists through manage_housekeeping.
alter function public.get_room_board(uuid)
  rename to get_room_board_capabilities_core;
revoke all on function public.get_room_board_capabilities_core(uuid)
  from public, anon, authenticated;

create or replace function public.get_room_board(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_result jsonb;
begin
  v_result := public.get_room_board_capabilities_core(p_property_id);
  return jsonb_set(
    v_result,
    '{capabilities}',
    coalesce(v_result->'capabilities', '{}'::jsonb) || jsonb_build_object(
      'manage_rooms', app_private.has_property_permission(
        p_property_id, 'rooms', 'update'
      ),
      'manage_housekeeping', app_private.has_property_permission(
        p_property_id, 'rooms', 'housekeeping'
      )
    ),
    true
  );
end;
$fn$;

revoke all on function public.get_room_board(uuid) from public, anon;
grant execute on function public.get_room_board(uuid) to authenticated;

alter function public.get_room_workspace(uuid, uuid)
  rename to get_room_workspace_capabilities_core;
revoke all on function public.get_room_workspace_capabilities_core(uuid, uuid)
  from public, anon, authenticated;

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
  v_result jsonb;
begin
  v_result := public.get_room_workspace_capabilities_core(
    p_property_id, p_room_id
  );
  return jsonb_set(
    v_result,
    '{capabilities}',
    coalesce(v_result->'capabilities', '{}'::jsonb) || jsonb_build_object(
      'manage_rooms', app_private.has_property_permission(
        p_property_id, 'rooms', 'update'
      ),
      'manage_housekeeping', app_private.has_property_permission(
        p_property_id, 'rooms', 'housekeeping'
      )
    ),
    true
  );
end;
$fn$;

revoke all on function public.get_room_workspace(uuid, uuid) from public, anon;
grant execute on function public.get_room_workspace(uuid, uuid) to authenticated;

-- Actual-stay reports for owners and managers. Pending/reserved/confirmed
-- bookings never contribute occupancy or room revenue. Because room activation
-- and out-of-service history is not stored, availability uses today's active
-- room count and the response explicitly marks that denominator as estimated.
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
  if v_role not in ('owner', 'manager') then
    raise exception using errcode = '42501', message = 'Report access denied';
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
  booking_cohort as (
    select b.id, b.status
    from public.bookings b
    where b.property_id = p_property_id
      and (b.created_at at time zone v_timezone)::date between p_from and p_to
  ),
  stay_starts as (
    select
      b.*,
      r.name as room_name,
      r.room_type,
      coalesce(
        (b.checked_in_at at time zone v_timezone)::date,
        b.check_in
      ) as actual_start
    from public.bookings b
    join public.rooms r on r.id = b.room_id and r.property_id = b.property_id
    where b.property_id = p_property_id
      and b.status in ('checked_in', 'checked_out')
  ),
  stay_bounds as (
    select s.*,
      case when s.status = 'checked_out' then greatest(
        coalesce(
          (s.checked_out_at at time zone v_timezone)::date,
          s.check_out
        ),
        s.actual_start + 1
      ) else greatest(v_business_date + 1, s.actual_start + 1) end as actual_end
    from stay_starts s
  ),
  actual_stays as (
    select s.*,
      case when s.status = 'checked_out'
        then s.total_price / greatest(s.actual_end - s.actual_start, 1)
        else s.total_price / greatest(s.check_out - s.check_in, 1)
      end as nightly_revenue,
      case when s.status = 'checked_out'
        then s.actual_end
        else least(s.actual_end, s.check_out)
      end as revenue_end
    from stay_bounds s
    where s.actual_start <= p_to and s.actual_end > p_from
  ),
  daily as (
    select
      d.day,
      coalesce(sum(stay.nightly_revenue) filter (
        where stay.actual_start <= d.day and stay.revenue_end > d.day
      ), 0)::numeric as room_revenue,
      coalesce((
        select sum(p.amount)
        from public.payments p
        join public.bookings b on b.id = p.booking_id
        where b.property_id = p_property_id
          and coalesce(p.payment_status, p.status) = 'completed'
          and (coalesce(p.paid_at, p.created_at) at time zone v_timezone)::date = d.day
      ), 0)::numeric as collected,
      count(stay.id) filter (
        where stay.actual_start <= d.day and stay.actual_end > d.day
      )::integer as room_nights
    from dates d
    left join actual_stays stay on true
    group by d.day
  ),
  summary as (
    select
      coalesce(sum(d.room_revenue), 0)::numeric as room_revenue,
      coalesce(sum(d.collected), 0)::numeric as collected,
      coalesce(sum(d.room_nights), 0)::integer as room_nights,
      (select count(*) from booking_cohort)::integer as bookings,
      (select count(*) from booking_cohort b
        where b.status = 'cancelled')::integer as cancellations
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
      'cancellations', s.cancellations,
      'available_room_nights', v_rooms * v_days,
      'availability_denominator_estimated', true
    ),
    'methodology', jsonb_build_object(
      'metric_basis', 'actual_stays',
      'stay_statuses', jsonb_build_array('checked_in', 'checked_out'),
      'revenue_basis', 'Checked-out stay value is allocated across actual occupied nights; in-house value uses scheduled nightly value only for elapsed priced nights. Unpriced overstay nights affect occupancy but not room revenue.',
      'booking_cohort', 'Bookings created within the selected property-local date range.',
      'cancellation_cohort', 'Cancelled bookings from that same created-booking cohort.',
      'availability_denominator', 'Current active room count multiplied by selected calendar days.',
      'availability_history_available', false,
      'denominator_limitation', 'Historical room activation and out-of-service periods are not stored, so occupancy and RevPAR denominators are estimates for past dates.'
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
        select stay.room_id, stay.room_name, stay.room_type,
          sum(stay.nightly_revenue * greatest(
            least(stay.revenue_end, p_to + 1) - greatest(stay.actual_start, p_from), 0
          ))::numeric as room_revenue,
          sum(greatest(
            least(stay.actual_end, p_to + 1) - greatest(stay.actual_start, p_from), 0
          ))::integer as room_nights
        from actual_stays stay
        group by stay.room_id, stay.room_name, stay.room_type
      ) x
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source', x.source,
        'bookings', x.bookings,
        'revenue', x.revenue
      ) order by x.revenue desc, x.source)
      from (
        select coalesce(nullif(btrim(stay.booking_source), ''), 'Unknown') as source,
          count(*)::integer as bookings,
          sum(stay.nightly_revenue * greatest(
            least(stay.revenue_end, p_to + 1) - greatest(stay.actual_start, p_from), 0
          ))::numeric as revenue
        from actual_stays stay
        group by 1
      ) x
    ), '[]'::jsonb)
  ) into v_result
  from summary s;

  return v_result;
end;
$fn$;

revoke all on function public.get_property_reports(uuid, date, date)
from public, anon, authenticated;
grant execute on function public.get_property_reports(uuid, date, date)
to authenticated;

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
          or a.entity_type = 'cashier_closing'
        when 'room' then a.entity_type = 'room'
        when 'property' then a.entity_type in (
          'property', 'property_user', 'staff_access', 'property_invitation'
        )
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

revoke all on function public.list_property_activity(uuid, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.list_property_activity(uuid, text, integer, integer)
to authenticated;

create or replace function public.get_front_desk_workspace(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_timezone text;
  v_business_date date;
  v_local_now timestamp;
  v_checkin_time time;
  v_checkout_time time;
  v_settlement boolean;
  v_can_checkin boolean;
  v_can_checkout boolean;
  v_can_checkout_balance boolean;
  v_can_record_payment boolean;
  v_result jsonb;
begin
  perform app_private.require_property_permission(p_property_id, 'bookings', 'view');
  perform app_private.require_property_permission(p_property_id, 'rooms', 'view');
  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  v_local_now := now() at time zone v_timezone;
  v_settlement := app_private.can_view_booking_settlement(p_property_id);
  v_can_checkin := app_private.has_property_permission(p_property_id, 'bookings', 'checkin');
  v_can_checkout := app_private.has_property_permission(p_property_id, 'bookings', 'checkout');
  v_can_checkout_balance := app_private.has_property_permission(
    p_property_id, 'bookings', 'checkout_with_balance'
  );
  v_can_record_payment := app_private.has_property_permission(p_property_id, 'payments', 'create');

  select coalesce(p.checkin_time, '14:00'::time),
         coalesce(p.checkout_time, '10:00'::time)
  into v_checkin_time, v_checkout_time
  from public.properties p
  where p.id = p_property_id;

  with payment_totals as (
    select p.booking_id,
      coalesce(sum(p.amount) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
      ), 0)::numeric as paid
    from public.payments p
    join public.bookings scoped_booking
      on scoped_booking.id = p.booking_id
     and scoped_booking.property_id = p_property_id
    group by p.booking_id
  ),
  booking_rows as (
    select
      b.id, b.booking_number, b.guest_id, b.room_id, b.status,
      b.check_in, b.check_out, b.adults, b.children,
      coalesce(b.total_guests, b.adults + b.children) as total_guests,
      b.total_price,
      greatest(b.total_price - coalesce(pt.paid, 0), 0)::numeric as balance_due,
      coalesce(pt.paid, 0)::numeric as amount_paid,
      b.payment_status,
      b.created_at,
      r.name as room_name,
      r.room_type,
      coalesce(r.is_active, false) as room_active,
      coalesce(r.housekeeping_status, '') as housekeeping_status,
      coalesce(r.operational_status, '') as operational_status,
      coalesce(nullif(btrim(concat_ws(' ', g.first_name, g.last_name)), ''), 'Guest') as guest_name,
      g.phone as guest_phone
    from public.bookings b
    join public.rooms r on r.id = b.room_id and r.property_id = b.property_id
    left join public.guests g on g.id = b.guest_id
    left join payment_totals pt on pt.booking_id = b.id
    where b.property_id = p_property_id
  ),
  active_rows as (
    select br.*,
      (br.check_in::text || ' ' || v_checkin_time::text)::timestamp as checkin_due_at,
      (br.check_out::text || ' ' || v_checkout_time::text)::timestamp as checkout_due_at,
      v_can_checkin
        and br.status = 'confirmed'
        and v_business_date >= br.check_in
        and v_business_date < br.check_out
        and br.room_active
        and br.housekeeping_status = 'ready'
        and br.operational_status = 'available'
        and not exists (
          select 1
          from public.bookings occupied
          where occupied.room_id = br.room_id
            and occupied.id <> br.id
            and occupied.status = 'checked_in'
        )
        as can_check_in,
      v_can_checkout and br.status = 'checked_in' and br.balance_due <= 0 as can_check_out,
      v_can_checkout_balance and br.status = 'checked_in' and br.balance_due > 0
        as can_check_out_with_balance,
      v_settlement and v_can_record_payment and br.balance_due > 0
        and br.status not in ('cancelled', 'no_show') as can_record_payment
    from booking_rows br
    where br.status in (
      'pending', 'reserved', 'confirmed', 'checked_in', 'checked_out'
    )
  ),
  room_items as (
    select r.id, r.name,
      app_private.room_workspace_item(p_property_id, r.id, v_business_date) as item
    from public.rooms r
    where r.property_id = p_property_id and coalesce(r.is_active, false)
  ),
  totals as (
    select
      count(*) filter (where ar.status in ('pending', 'reserved', 'confirmed') and ar.check_in <= v_business_date)::integer as arrivals_due,
      count(*) filter (where ar.status = 'checked_in' and ar.check_out <= v_business_date)::integer as departures_due,
      count(*) filter (where ar.status in ('pending', 'reserved', 'confirmed') and ar.checkin_due_at < v_local_now)::integer as overdue_arrivals,
      count(*) filter (where ar.status = 'checked_in' and ar.checkout_due_at < v_local_now)::integer as overdue_departures,
      count(*) filter (where ar.status = 'checked_in')::integer as in_house,
      coalesce(sum(ar.total_guests) filter (where ar.status = 'checked_in'), 0)::integer as in_house_guests,
      count(*) filter (where ar.balance_due > 0)::integer as open_balances,
      coalesce(sum(ar.balance_due) filter (where ar.balance_due > 0), 0)::numeric as outstanding_balance
    from active_rows ar
  )
  select jsonb_build_object(
    'success', true,
    'property', jsonb_build_object(
      'id', p_property_id,
      'timezone', v_timezone,
      'business_date', v_business_date,
      'server_time', v_local_now,
      'checkin_time', v_checkin_time,
      'checkout_time', v_checkout_time,
      'payment_methods', coalesce((select p.payment_methods from public.properties p where p.id = p_property_id), '[]'::jsonb)
    ),
    'capabilities', jsonb_build_object(
      'check_in', v_can_checkin,
      'check_out', v_can_checkout,
      'check_out_with_balance', v_can_checkout_balance,
      'record_payment', v_can_record_payment and v_settlement,
      'manage_rooms', app_private.has_property_permission(
        p_property_id, 'rooms', 'update'
      ),
      'manage_housekeeping', app_private.has_property_permission(
        p_property_id, 'rooms', 'housekeeping'
      ),
      'create_booking', app_private.has_property_permission(p_property_id, 'bookings', 'create')
    ),
    'summary', jsonb_build_object(
      'arrivals_due', t.arrivals_due,
      'departures_due', t.departures_due,
      'overdue_arrivals', t.overdue_arrivals,
      'overdue_departures', t.overdue_departures,
      'in_house', t.in_house,
      'in_house_guests', t.in_house_guests,
      'ready_rooms', (select count(*)::integer from room_items ri where ri.item->>'operational_status' = 'ready'),
      'rooms_needing_attention', (select count(*)::integer from room_items ri where ri.item->>'operational_status' in ('needs_cleaning', 'cleaning', 'out_of_service')),
      'open_balances', t.open_balances,
      'outstanding_balance', t.outstanding_balance
    ),
    'arrivals', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', ar.id, 'booking_number', ar.booking_number,
        'guest_id', ar.guest_id, 'guest_name', ar.guest_name, 'guest_phone', ar.guest_phone,
        'status', ar.status, 'check_in', ar.check_in, 'check_out', ar.check_out,
        'adults', ar.adults, 'children', ar.children, 'total_guests', ar.total_guests,
        'room_id', ar.room_id, 'room_name', ar.room_name, 'room_type', ar.room_type,
        'room_readiness', ar.housekeeping_status,
        'amount_paid', case when v_settlement then ar.amount_paid end,
        'balance_due', case when v_settlement then ar.balance_due end,
        'payment_status', case when v_settlement then ar.payment_status end,
        'due_at', ar.checkin_due_at,
        'is_overdue', ar.checkin_due_at < v_local_now,
        'can_check_in', ar.can_check_in,
        'can_record_payment', ar.can_record_payment,
        'blocked_reason', case
          when ar.status in ('pending', 'reserved') then 'Confirm this booking before check-in'
          when v_business_date < ar.check_in then 'Check-in is not open yet'
          when v_business_date >= ar.check_out then 'The check-in window has ended'
          when not ar.room_active then 'Room is inactive'
          when ar.housekeeping_status <> 'ready' then 'Room is not ready'
          when ar.operational_status = 'occupied' or exists (
            select 1
            from public.bookings occupied
            where occupied.room_id = ar.room_id
              and occupied.id <> ar.id
              and occupied.status = 'checked_in'
          ) then 'Room is occupied'
          when ar.operational_status <> 'available' then 'Room is unavailable'
        end
      )) order by (ar.checkin_due_at < v_local_now) desc, ar.checkin_due_at, ar.created_at)
      from active_rows ar
      where ar.status in ('pending', 'reserved', 'confirmed') and ar.check_in <= v_business_date
    ), '[]'::jsonb),
    'departures', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', ar.id, 'booking_number', ar.booking_number,
        'guest_id', ar.guest_id, 'guest_name', ar.guest_name, 'guest_phone', ar.guest_phone,
        'status', ar.status, 'check_in', ar.check_in, 'check_out', ar.check_out,
        'adults', ar.adults, 'children', ar.children, 'total_guests', ar.total_guests,
        'room_id', ar.room_id, 'room_name', ar.room_name, 'room_type', ar.room_type,
        'amount_paid', case when v_settlement then ar.amount_paid end,
        'balance_due', case when v_settlement then ar.balance_due end,
        'payment_status', case when v_settlement then ar.payment_status end,
        'due_at', ar.checkout_due_at,
        'is_overdue', ar.checkout_due_at < v_local_now,
        'can_check_out', ar.can_check_out,
        'can_check_out_with_balance', ar.can_check_out_with_balance,
        'can_record_payment', ar.can_record_payment,
        'blocked_reason', case when ar.balance_due > 0 then 'Record the outstanding balance before checkout' end
      )) order by (ar.checkout_due_at < v_local_now) desc, ar.checkout_due_at, ar.created_at)
      from active_rows ar
      where ar.status = 'checked_in' and ar.check_out <= v_business_date
    ), '[]'::jsonb),
    'in_house', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', ar.id, 'booking_number', ar.booking_number,
        'guest_id', ar.guest_id, 'guest_name', ar.guest_name, 'guest_phone', ar.guest_phone,
        'status', ar.status, 'check_in', ar.check_in, 'check_out', ar.check_out,
        'adults', ar.adults, 'children', ar.children, 'total_guests', ar.total_guests,
        'room_id', ar.room_id, 'room_name', ar.room_name, 'room_type', ar.room_type,
        'amount_paid', case when v_settlement then ar.amount_paid end,
        'balance_due', case when v_settlement then ar.balance_due end,
        'payment_status', case when v_settlement then ar.payment_status end,
        'can_check_out', ar.can_check_out,
        'can_check_out_with_balance', ar.can_check_out_with_balance,
        'can_record_payment', ar.can_record_payment
      )) order by ar.check_out, lower(ar.guest_name), ar.id)
      from active_rows ar where ar.status = 'checked_in'
    ), '[]'::jsonb),
    'balances', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ar.id, 'booking_number', ar.booking_number,
        'guest_id', ar.guest_id, 'guest_name', ar.guest_name,
        'status', ar.status, 'check_in', ar.check_in, 'check_out', ar.check_out,
        'room_id', ar.room_id, 'room_name', ar.room_name,
        'amount_paid', ar.amount_paid, 'balance_due', ar.balance_due,
        'payment_status', ar.payment_status, 'can_record_payment', ar.can_record_payment
      ) order by ar.check_out, ar.created_at)
      from active_rows ar where v_settlement and ar.balance_due > 0
    ), '[]'::jsonb),
    'housekeeping', coalesce((
      select jsonb_agg(ri.item order by lower(ri.name), ri.id)
      from room_items ri
      where ri.item->'current_stay' = 'null'::jsonb
        and ri.item->>'operational_status' in ('ready', 'needs_cleaning', 'cleaning', 'out_of_service')
    ), '[]'::jsonb)
  ) into v_result
  from totals t;

  return v_result;
end;
$fn$;

revoke all on function public.get_front_desk_workspace(uuid) from public, anon;
grant execute on function public.get_front_desk_workspace(uuid) to authenticated;

create or replace function public.get_finance_outstanding_balances(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_date date;
  v_timezone text;
  v_local_now timestamp;
  v_checkout_time time;
  v_result jsonb;
begin
  perform app_private.require_property_permission(p_property_id, 'payments', 'view');
  if not app_private.can_view_property_finance(p_property_id) then
    raise exception using errcode = '42501', message = 'Finance access denied';
  end if;
  v_timezone := app_private.property_timezone(p_property_id);
  v_date := app_private.property_business_date(p_property_id);
  v_local_now := now() at time zone v_timezone;
  select coalesce(p.checkout_time, '10:00'::time)
  into v_checkout_time
  from public.properties p
  where p.id = p_property_id;

  with booking_scope as (
    select
      b.id, b.booking_number, b.guest_id,
      coalesce(nullif(btrim(concat_ws(' ', g.first_name, g.last_name)), ''), 'Guest') as guest_name,
      g.phone as guest_phone,
      b.room_id, r.name as room_name, b.status, b.check_in, b.check_out,
      b.total_price, b.created_at
    from public.bookings b
    join public.rooms r on r.id = b.room_id and r.property_id = b.property_id
    left join public.guests g on g.id = b.guest_id
    where b.property_id = p_property_id
      and b.status not in ('cancelled', 'no_show')
  ),
  paid as (
    select p.booking_id,
      coalesce(sum(p.amount) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
      ), 0)::numeric as amount_paid
    from public.payments p
    join booking_scope scoped_booking on scoped_booking.id = p.booking_id
    group by p.booking_id
  ),
  settlement as (
    select
      b.*,
      coalesce(paid.amount_paid, 0)::numeric as amount_paid,
      greatest(b.total_price - coalesce(paid.amount_paid, 0), 0)::numeric as balance,
      (b.check_out::text || ' ' || v_checkout_time::text)::timestamp as due_at
    from booking_scope b
    left join paid on paid.booking_id = b.id
  ),
  outstanding as (
    select
      s.*,
      case when s.due_at < v_local_now
        then greatest(v_date - s.check_out, 0)
        else 0
      end as age_days,
      s.due_at < v_local_now as overdue
    from settlement s
    where s.balance > 0
  ),
  limited as (
    select o.*
    from outstanding o
    order by o.overdue desc, o.due_at, o.created_at, o.id
    limit 500
  ),
  summary as (
    select
      count(*)::integer as total_count,
      coalesce(sum(o.balance), 0)::numeric as total_balance,
      count(*) filter (where o.overdue)::integer as overdue_count
    from outstanding o
  )
  select jsonb_build_object(
    'success', true,
    'business_date', v_date,
    'as_of', v_local_now,
    'summary', jsonb_build_object(
      'total_count', s.total_count,
      'total_balance', s.total_balance,
      'overdue_count', s.overdue_count,
      'items_returned', (select count(*)::integer from limited),
      'truncated', s.total_count > (select count(*) from limited)
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'booking_id', o.id,
        'booking_number', o.booking_number,
        'guest_id', o.guest_id,
        'guest_name', o.guest_name,
        'guest_phone', o.guest_phone,
        'room_id', o.room_id,
        'room_name', o.room_name,
        'status', o.status,
        'check_in', o.check_in,
        'check_out', o.check_out,
        'total', o.total_price,
        'paid', o.amount_paid,
        'balance', o.balance,
        'age_days', o.age_days,
        'overdue', o.overdue,
        'due_at', o.due_at
      ) order by o.overdue desc, o.due_at, o.created_at, o.id)
      from limited o
    ), '[]'::jsonb)
  ) into v_result
  from summary s;

  return v_result;
end;
$fn$;

revoke all on function public.get_finance_outstanding_balances(uuid) from public, anon;
grant execute on function public.get_finance_outstanding_balances(uuid) to authenticated;

-- Preserve an existing room note when a status-only update is made.
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
  perform app_private.require_property_permission(p_property_id, 'rooms', 'housekeeping');
  if v_status not in ('ready', 'needs_cleaning', 'cleaning', 'out_of_service') then
    raise exception using errcode = '22023', message = 'Invalid housekeeping status';
  end if;
  select r.* into v_old from public.rooms r
  where r.id = p_room_id and r.property_id = p_property_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Room not found'; end if;
  if exists (
    select 1 from public.bookings b
    where b.property_id = p_property_id and b.room_id = p_room_id and b.status = 'checked_in'
  ) then
    raise exception using errcode = '22023', message = 'Check out the guest before changing housekeeping state';
  end if;
  update public.rooms
  set housekeeping_status = v_status,
      housekeeping_notes = case
        when p_notes is null then housekeeping_notes
        else nullif(btrim(p_notes), '')
      end,
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
    'success', true, 'room_id', p_room_id,
    'status', v_new.housekeeping_status,
    'operational_status', v_new.operational_status,
    'updated_at', v_new.housekeeping_updated_at,
    'message', 'Room status updated'
  );
end;
$fn$;

revoke all on function public.update_room_housekeeping_status(uuid, uuid, text, text)
  from public, anon;
grant execute on function public.update_room_housekeeping_status(uuid, uuid, text, text)
  to authenticated;

-- One cashier closing per property, business date and staff member. Entries are
-- snapshots of the append-only cash ledger and never rewrite payments.
create table if not exists public.cashier_closings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  business_date date not null,
  cashier_id uuid not null references auth.users(id) on delete restrict,
  request_key uuid not null,
  request_fingerprint text not null check (char_length(request_fingerprint) = 32),
  opening_float numeric(14,2) not null default 0 check (opening_float >= 0),
  expected_cash numeric(14,2) not null,
  counted_cash numeric(14,2) not null check (counted_cash >= 0),
  variance numeric(14,2) generated always as (counted_cash - expected_cash - opening_float) stored,
  notes text,
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(property_id, business_date, cashier_id),
  unique(property_id, cashier_id, request_key),
  check (char_length(coalesce(notes, '')) <= 500)
);

comment on column public.cashier_closings.closed_at is
  'Point-in-time cash-ledger cutoff; later cash mutations for this cashier and business date are rejected.';

alter table public.cashier_closings enable row level security;
revoke all on table public.cashier_closings from public, anon, authenticated;

create index if not exists cashier_closings_property_date_idx
  on public.cashier_closings(property_id, business_date desc, closed_at desc);

create or replace function app_private.cash_expected_for_user(
  p_property_id uuid,
  p_user_id uuid,
  p_business_date date,
  p_snapshot_at timestamptz
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(sum(p.amount), 0)::numeric
  from public.payments p
  join public.bookings b on b.id = p.booking_id and b.property_id = p_property_id
  where p.received_by = p_user_id
    and lower(coalesce(p.payment_method, p.method, '')) = 'cash'
    and coalesce(p.payment_status, p.status) = 'completed'
    and coalesce(p.paid_at, p.created_at) <= p_snapshot_at
    and (coalesce(p.paid_at, p.created_at) at time zone app_private.property_timezone(p_property_id))::date
      = p_business_date;
$fn$;

revoke all on function app_private.cash_expected_for_user(uuid, uuid, date, timestamptz)
  from public, anon, authenticated;

create or replace function public.get_cashier_close_workspace(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_date date;
  v_expected numeric;
  v_finance boolean;
  v_snapshot_at timestamptz := clock_timestamp();
begin
  perform app_private.require_property_permission(p_property_id, 'payments', 'create');
  v_date := app_private.property_business_date(p_property_id);
  v_expected := app_private.cash_expected_for_user(
    p_property_id, v_user_id, v_date, v_snapshot_at
  );
  v_finance := app_private.can_view_property_finance(p_property_id);
  return jsonb_build_object(
    'success', true,
    'business_date', v_date,
    'snapshot_at', v_snapshot_at,
    'expected_cash', v_expected,
    'closing', (
      select jsonb_build_object(
        'id', c.id, 'opening_float', c.opening_float,
        'expected_cash', c.expected_cash, 'counted_cash', c.counted_cash,
        'variance', c.variance, 'notes', c.notes, 'closed_at', c.closed_at,
        'snapshot_at', c.closed_at
      ) from public.cashier_closings c
      where c.property_id = p_property_id and c.business_date = v_date and c.cashier_id = v_user_id
    ),
    'team_closings', case when v_finance then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'cashier_id', c.cashier_id,
        'cashier_name', coalesce(up.display_name, 'Staff'),
        'opening_float', c.opening_float, 'expected_cash', c.expected_cash,
        'counted_cash', c.counted_cash, 'variance', c.variance,
        'notes', c.notes, 'closed_at', c.closed_at,
        'snapshot_at', c.closed_at
      ) order by c.closed_at desc)
      from public.cashier_closings c
      left join public.user_profiles up on up.user_id = c.cashier_id
      where c.property_id = p_property_id and c.business_date = v_date
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$fn$;

create or replace function public.close_cashier_day(
  p_property_id uuid,
  p_request_key uuid,
  p_opening_float numeric,
  p_counted_cash numeric,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_date date;
  v_expected numeric;
  v_opening_float numeric;
  v_counted_cash numeric;
  v_notes text;
  v_fingerprint text;
  v_snapshot_at timestamptz;
  v_closing public.cashier_closings%rowtype;
begin
  perform app_private.require_property_permission(p_property_id, 'payments', 'create');
  if p_request_key is null or p_opening_float is null or p_opening_float < 0
     or p_counted_cash is null or p_counted_cash < 0
     or p_opening_float::text in ('NaN', 'Infinity', '-Infinity')
     or p_counted_cash::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using errcode = '22023', message = 'Cashier closing details are invalid';
  end if;

  v_date := app_private.property_business_date(p_property_id);
  v_opening_float := round(p_opening_float, 2);
  v_counted_cash := round(p_counted_cash, 2);
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if length(coalesce(v_notes, '')) > 500 then
    raise exception using errcode = '22023', message = 'Cashier closing details are invalid';
  end if;
  v_fingerprint := md5(jsonb_build_object(
    'property_id', p_property_id,
    'business_date', v_date,
    'opening_float', v_opening_float,
    'counted_cash', v_counted_cash,
    'notes', v_notes
  )::text);

  -- Serialize both request-key replay and the one-close-per-day invariant.
  -- Payments remain append-only; closed_at is the explicit snapshot cut.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'loji-cashier-close-request:' || p_property_id::text || ':'
      || v_user_id::text || ':' || p_request_key::text,
    0
  ));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'loji-cashier-close:' || p_property_id::text || ':' || v_user_id::text || ':' || v_date::text,
    0
  ));

  select c.* into v_closing from public.cashier_closings c
  where c.property_id = p_property_id
    and c.cashier_id = v_user_id
    and c.request_key = p_request_key
  for update;
  if found then
    if v_closing.request_fingerprint is distinct from md5(jsonb_build_object(
      'property_id', p_property_id,
      'business_date', v_closing.business_date,
      'opening_float', v_opening_float,
      'counted_cash', v_counted_cash,
      'notes', v_notes
    )::text) then
      raise exception using
        errcode = '22023',
        message = 'Idempotency key was reused with different cashier closing details';
    end if;
    return jsonb_build_object(
      'success', true, 'replayed', true, 'closing_id', v_closing.id,
      'expected_cash', v_closing.expected_cash,
      'counted_cash', v_closing.counted_cash,
      'variance', v_closing.variance,
      'snapshot_at', v_closing.closed_at
    );
  end if;

  select c.* into v_closing
  from public.cashier_closings c
  where c.property_id = p_property_id
    and c.business_date = v_date
    and c.cashier_id = v_user_id
  for update;
  if found then
    raise exception using errcode = '23505', message = 'This cashier day is already closed';
  end if;

  v_snapshot_at := clock_timestamp();
  v_expected := app_private.cash_expected_for_user(
    p_property_id, v_user_id, v_date, v_snapshot_at
  );
  insert into public.cashier_closings(
    property_id, business_date, cashier_id, request_key, request_fingerprint,
    opening_float, expected_cash, counted_cash, notes, closed_at
  ) values (
    p_property_id, v_date, v_user_id, p_request_key, v_fingerprint,
    v_opening_float, round(v_expected, 2), v_counted_cash,
    v_notes, v_snapshot_at
  ) returning * into v_closing;
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'cashier_closing', v_closing.id::text,
    'cashier_day_closed', jsonb_build_object(
      'business_date', v_date, 'expected_cash', v_closing.expected_cash,
      'counted_cash', v_closing.counted_cash, 'variance', v_closing.variance,
      'snapshot_at', v_closing.closed_at
    )
  );
  return jsonb_build_object(
    'success', true, 'replayed', false, 'closing_id', v_closing.id,
    'expected_cash', v_closing.expected_cash,
    'counted_cash', v_closing.counted_cash, 'variance', v_closing.variance,
    'snapshot_at', v_closing.closed_at
  );
end;
$fn$;

revoke all on function public.get_cashier_close_workspace(uuid) from public, anon;
revoke all on function public.close_cashier_day(uuid, uuid, numeric, numeric, text) from public, anon;
grant execute on function public.get_cashier_close_workspace(uuid) to authenticated;
grant execute on function public.close_cashier_day(uuid, uuid, numeric, numeric, text) to authenticated;

-- The team workspace now exposes code-free pending access. Keep the legacy
-- `invitations` JSON key briefly for older clients, but strip token details and
-- publish the canonical `pending_access` key for the redesigned UI.
alter function public.get_team_access_workspace(uuid)
  rename to get_team_access_workspace_core;
revoke all on function public.get_team_access_workspace_core(uuid)
  from public, anon, authenticated;

create or replace function public.get_team_access_workspace(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_result jsonb;
  v_pending_access jsonb;
begin
  v_result := public.get_team_access_workspace_core(p_property_id);
  select coalesce(jsonb_agg(
    (entry.value - 'code') || jsonb_build_object(
      'allowed_actions', case
        when coalesce(entry.value->'allowed_actions', '[]'::jsonb) @> '["revoke"]'::jsonb
          then '["revoke"]'::jsonb
        else '[]'::jsonb
      end
    )
    order by entry.ordinality
  ), '[]'::jsonb)
  into v_pending_access
  from jsonb_array_elements(coalesce(v_result->'invitations', '[]'::jsonb))
    with ordinality entry(value, ordinality)
  where nullif(entry.value->>'expires_at', '')::timestamptz > now();

  v_result := jsonb_set(v_result, '{invitations}', v_pending_access, true);
  v_result := jsonb_set(v_result, '{pending_access}', v_pending_access, true);
  v_result := jsonb_set(
    v_result,
    '{summary,pending_access}',
    to_jsonb(jsonb_array_length(v_pending_access)),
    true
  );
  v_result := jsonb_set(
    v_result,
    '{summary,pending_invitations}',
    to_jsonb(jsonb_array_length(v_pending_access)),
    true
  );
  v_result := jsonb_set(
    v_result,
    '{capabilities,manage_pending_access}',
    coalesce(v_result#>'{capabilities,manage_invitations}', 'false'::jsonb),
    true
  );
  return v_result;
end;
$fn$;

revoke all on function public.get_team_access_workspace(uuid) from public, anon;
grant execute on function public.get_team_access_workspace(uuid) to authenticated;

-- Preserve the established add-access RPC while auditing the immediate-access
-- path for people who already have a confirmed Loji account.
alter function public.invite_staff(uuid, text, text)
  rename to invite_staff_core;
revoke all on function public.invite_staff_core(uuid, text, text)
  from public, anon, authenticated;

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
  v_result jsonb;
  v_expires_at timestamptz;
begin
  v_result := public.invite_staff_core(p_property_id, p_email, p_role);
  if lower(coalesce(v_result->>'status', '')) = 'pending' then
    update public.property_invitations
    set token = null,
        expires_at = now() + interval '30 days'
    where id = nullif(v_result->>'invitation_id', '')::uuid
      and property_id = p_property_id
      and lower(coalesce(status, '')) = 'pending'
    returning expires_at into v_expires_at;

    if v_expires_at is null then
      raise exception using errcode = 'P0002', message = 'Pending staff access not found';
    end if;
    v_result := jsonb_set(v_result - 'code', '{expires_at}', to_jsonb(v_expires_at), true);
  elsif lower(coalesce(v_result->>'status', '')) = 'active' then
    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    ) values (
      p_property_id,
      auth.uid(),
      'staff_access',
      v_result->>'user_id',
      'staff_access_activated',
      jsonb_build_object(
        'email', lower(btrim(p_email)),
        'role', lower(btrim(p_role)),
        'access_mode', 'email'
      ),
      now()
    );
  end if;
  return v_result;
end;
$fn$;

revoke all on function public.invite_staff(uuid, text, text) from public, anon;
grant execute on function public.invite_staff(uuid, text, text) to authenticated;

-- Claim only previously absent access. A suspended membership always requires
-- an explicit owner/manager reactivation and can never be revived by sign-in.
create or replace function public.claim_email_property_access()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_pending public.property_invitations%rowtype;
  v_pending_property_id uuid;
  v_membership public.property_users%rowtype;
  v_had_membership boolean;
  v_claimed integer := 0;
  v_blocked integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  select lower(u.email), u.email_confirmed_at
  into v_email, v_email_confirmed_at
  from auth.users u where u.id = v_user_id;
  if v_email is null or v_email_confirmed_at is null then
    return jsonb_build_object('success', true, 'claimed', 0, 'blocked', 0);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('loji-email-access:' || v_email, 0)
  );

  -- Acquire the same property/email locks as invite_staff_core before locking
  -- invitation rows. This shared order prevents invite-versus-claim deadlocks.
  for v_pending_property_id in
    select distinct i.property_id
    from public.property_invitations i
    where lower(btrim(i.email)) = v_email
      and lower(coalesce(i.status, '')) = 'pending'
      and lower(btrim(i.role)) in ('manager', 'receptionist')
      and (i.expires_at is null or i.expires_at > now())
    order by i.property_id
  loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      v_pending_property_id::text || ':' || v_email,
      0
    ));
  end loop;

  for v_pending in
    select i.*
    from public.property_invitations i
    where lower(btrim(i.email)) = v_email
      and lower(coalesce(i.status, '')) = 'pending'
      and lower(btrim(i.role)) in ('manager', 'receptionist')
      and (i.expires_at is null or i.expires_at > now())
    order by i.created_at, i.id
    for update
  loop
    v_had_membership := false;
    select pu.* into v_membership
    from public.property_users pu
    where pu.property_id = v_pending.property_id and pu.user_id = v_user_id
    for update;

    if found then
      v_had_membership := true;
    else
      insert into public.property_users(property_id, user_id, role, status, created_at)
      values (
        v_pending.property_id,
        v_user_id,
        lower(btrim(v_pending.role)),
        'active',
        now()
      )
      on conflict (property_id, user_id) do nothing
      returning * into v_membership;

      if not found then
        select pu.* into v_membership
        from public.property_users pu
        where pu.property_id = v_pending.property_id and pu.user_id = v_user_id
        for update;
        if not found then
          raise exception using errcode = '40001', message = 'Staff access changed concurrently; try again';
        end if;
        v_had_membership := true;
      end if;
    end if;

    if lower(coalesce(v_membership.status, '')) <> 'active' then
      update public.property_invitations
      set status = 'cancelled', token = null, expires_at = null
      where id = v_pending.id;
      insert into public.audit_log(
        property_id, actor_id, entity_type, entity_id,
        event_type, new_data, created_at
      ) values (
        v_pending.property_id, v_user_id, 'staff_access', v_membership.id::text,
        'staff_access_claim_blocked',
        jsonb_build_object('email', v_email, 'reason', 'membership_suspended'),
        now()
      );
      v_blocked := v_blocked + 1;
      continue;
    end if;

    update public.property_invitations
    set status = 'accepted', accepted_at = now(), accepted_by = v_user_id,
        token = null, expires_at = null
    where id = v_pending.id;
    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    ) values (
      v_pending.property_id, v_user_id, 'staff_access', v_membership.id::text,
      'email_access_claimed',
      jsonb_build_object(
        'email', v_email,
        'role', lower(btrim(v_membership.role)),
        'already_active', v_had_membership
      ),
      now()
    );
    v_claimed := v_claimed + 1;
  end loop;

  return jsonb_build_object(
    'success', true, 'claimed', v_claimed, 'blocked', v_blocked
  );
end;
$fn$;

revoke all on function public.claim_email_property_access()
  from public, anon;
grant execute on function public.claim_email_property_access()
  to authenticated;

-- Retire the remaining executable code-based access path. Existing email-based
-- pending access is retained and claimed automatically after sign-in.
update public.property_invitations
set status = 'expired'
where lower(coalesce(status, '')) = 'pending'
  and expires_at is not null and expires_at <= now();

update public.property_invitations
set token = null,
    expires_at = now() + interval '30 days'
where lower(coalesce(status, '')) = 'pending';

-- Code-based access is gone, so no historical status should retain a dormant
-- bearer secret. Non-pending expiry timestamps remain useful audit metadata.
update public.property_invitations
set token = null
where token is not null;

revoke all on function public.get_invitation_details(text) from public, anon, authenticated;
revoke all on function public.accept_property_invitation(text) from public, anon, authenticated;
revoke all on function public.reject_property_invitation(text) from public, anon, authenticated;
revoke all on function public.resend_staff_invitation(uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.new_invitation_code() from public, anon, authenticated;
