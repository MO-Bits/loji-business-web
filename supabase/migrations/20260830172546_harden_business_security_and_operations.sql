-- Loji Business hardening migration for project kymloctcridmvqtdglro.
-- Audit deliverable only: not applied. Run on a development branch first.

begin;

-- ---------------------------------------------------------------------------
-- 1. Private authorization helpers
-- ---------------------------------------------------------------------------

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;
revoke create on schema public from public, anon, authenticated;

create or replace function app_private.is_property_member(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.property_users pu
    where pu.property_id = p_property_id
      and pu.user_id = (select auth.uid())
      and lower(coalesce(pu.status, '')) = 'active'
  );
$fn$;

create or replace function app_private.has_property_role(
  p_property_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.property_users pu
    where pu.property_id = p_property_id
      and pu.user_id = (select auth.uid())
      and lower(coalesce(pu.status, '')) = 'active'
      and lower(pu.role) = any (p_roles)
  );
$fn$;

create or replace function app_private.can_access_guest(p_guest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.bookings b
    where b.guest_id = p_guest_id
      and app_private.is_property_member(b.property_id)
  );
$fn$;

create or replace function app_private.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select p_user_id = (select auth.uid())
    or exists (
      select 1
      from public.property_users mine
      join public.property_users theirs
        on theirs.property_id = mine.property_id
      where mine.user_id = (select auth.uid())
        and lower(coalesce(mine.status, '')) = 'active'
        and theirs.user_id = p_user_id
        and lower(coalesce(theirs.status, '')) = 'active'
    );
$fn$;

create or replace function app_private.can_manage_property_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.property_users pu
    where pu.property_id::text = (storage.foldername(p_name))[1]
      and pu.user_id = (select auth.uid())
      and lower(coalesce(pu.status, '')) = 'active'
      and lower(pu.role) in ('owner', 'manager')
  );
$fn$;

create or replace function app_private.can_manage_room_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.property_users pu
    where pu.property_id::text = (storage.foldername(p_name))[1]
      and pu.user_id = (select auth.uid())
      and lower(coalesce(pu.status, '')) = 'active'
      and lower(pu.role) in ('owner', 'manager')
      and (storage.foldername(p_name))[2] ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
$fn$;

revoke all on function app_private.is_property_member(uuid) from public, anon;
revoke all on function app_private.has_property_role(uuid,text[]) from public, anon;
revoke all on function app_private.can_access_guest(uuid) from public, anon;
revoke all on function app_private.can_view_profile(uuid) from public, anon;
revoke all on function app_private.can_manage_property_object(text) from public, anon;
revoke all on function app_private.can_manage_room_object(text) from public, anon;

grant execute on function app_private.is_property_member(uuid) to authenticated;
grant execute on function app_private.has_property_role(uuid,text[]) to authenticated;
grant execute on function app_private.can_access_guest(uuid) to authenticated;
grant execute on function app_private.can_view_profile(uuid) to authenticated;
grant execute on function app_private.can_manage_property_object(text) to authenticated;
grant execute on function app_private.can_manage_room_object(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tenant RLS and explicit table privileges
-- ---------------------------------------------------------------------------

drop policy if exists "Enable read access for all users" on public.bookings;
drop policy if exists "Enable read access for all users" on public.guests;
drop policy if exists "Enable read access for all users" on public.payments;
drop policy if exists "Enable read access for all users" on public.properties;
drop policy if exists "Enable read access for all users" on public.rooms;
drop policy if exists "Enable read access for all users" on public.property_users;
drop policy if exists "Enable read access for all users" on public.property_invitations;
drop policy if exists "Enable read access for all users" on public.device_tokens;
drop policy if exists "Enable read access for all users" on public.property_images;
drop policy if exists "Enable read access for all users" on public.room_images;
drop policy if exists "Enable read access for all users" on public.role_permissions;
drop policy if exists "Allow read user profiles" on public.user_profiles;
drop policy if exists "Enable read access for all users" on public.user_profiles;
drop policy if exists "Enable insert for authenticated users only" on public.property_images;
drop policy if exists "Users manage own notification devices" on public.device_tokens;
drop policy if exists "Users see own notifications" on public.notifications;

drop policy if exists loji_bookings_member_read on public.bookings;
create policy loji_bookings_member_read
on public.bookings for select to authenticated
using (app_private.is_property_member(property_id));

drop policy if exists loji_guests_member_read on public.guests;
create policy loji_guests_member_read
on public.guests for select to authenticated
using (app_private.can_access_guest(id));

drop policy if exists loji_payments_member_read on public.payments;
create policy loji_payments_member_read
on public.payments for select to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = payments.booking_id
      and app_private.is_property_member(b.property_id)
  )
);

drop policy if exists loji_properties_member_read on public.properties;
create policy loji_properties_member_read
on public.properties for select to authenticated
using (app_private.is_property_member(id));

drop policy if exists loji_rooms_member_read on public.rooms;
create policy loji_rooms_member_read
on public.rooms for select to authenticated
using (app_private.is_property_member(property_id));

drop policy if exists loji_property_users_member_read on public.property_users;
create policy loji_property_users_member_read
on public.property_users for select to authenticated
using (app_private.is_property_member(property_id));

drop policy if exists loji_invitations_manager_read on public.property_invitations;
create policy loji_invitations_manager_read
on public.property_invitations for select to authenticated
using (app_private.has_property_role(property_id, array['owner','manager']::text[]));

drop policy if exists loji_profiles_member_read on public.user_profiles;
create policy loji_profiles_member_read
on public.user_profiles for select to authenticated
using (app_private.can_view_profile(user_id));

drop policy if exists loji_profiles_self_write on public.user_profiles;
create policy loji_profiles_self_write
on public.user_profiles for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists loji_device_tokens_self on public.device_tokens;
create policy loji_device_tokens_self
on public.device_tokens for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists loji_notifications_self_read on public.notifications;
create policy loji_notifications_self_read
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists loji_property_images_member_read on public.property_images;
create policy loji_property_images_member_read
on public.property_images for select to authenticated
using (app_private.is_property_member(property_id));

drop policy if exists loji_room_images_member_read on public.room_images;
create policy loji_room_images_member_read
on public.room_images for select to authenticated
using (
  exists (
    select 1
    from public.rooms r
    where r.id = room_images.room_id
      and app_private.is_property_member(r.property_id)
  )
);

drop policy if exists loji_role_permissions_read on public.role_permissions;
create policy loji_role_permissions_read
on public.role_permissions for select to authenticated
using (true);

revoke all on table
  public.bookings,
  public.guests,
  public.payments,
  public.properties,
  public.rooms,
  public.property_users,
  public.property_invitations,
  public.user_profiles,
  public.device_tokens,
  public.notifications,
  public.property_images,
  public.room_images,
  public.role_permissions,
  public.audit_log,
  public.booking_payments,
  public.onboarding_state,
  public.owner_profiles,
  public.consumer_users_onboarding_state
from anon;

grant select on table
  public.bookings,
  public.guests,
  public.payments,
  public.properties,
  public.rooms,
  public.property_users,
  public.property_invitations,
  public.user_profiles,
  public.device_tokens,
  public.notifications,
  public.property_images,
  public.room_images,
  public.role_permissions,
  public.audit_log,
  public.onboarding_state,
  public.owner_profiles,
  public.consumer_users_onboarding_state
to authenticated;

grant insert, update, delete on public.device_tokens to authenticated;
grant insert, update on public.user_profiles to authenticated;
grant insert, update on public.onboarding_state to authenticated;
grant insert, update on public.owner_profiles to authenticated;
grant insert, update on public.consumer_users_onboarding_state to authenticated;

revoke insert, update, delete on table
  public.bookings,
  public.guests,
  public.payments,
  public.properties,
  public.rooms,
  public.property_users,
  public.property_invitations,
  public.property_images,
  public.room_images,
  public.role_permissions,
  public.audit_log,
  public.booking_payments
from authenticated;

create index if not exists property_users_user_status_property_idx
  on public.property_users(user_id, status, property_id);
create index if not exists bookings_guest_idx
  on public.bookings(guest_id);
create index if not exists payments_booking_paid_at_idx
  on public.payments(booking_id, paid_at desc);
create index if not exists notifications_user_unread_created_idx
  on public.notifications(user_id, is_read, created_at desc);
create index if not exists property_invitations_property_status_email_idx
  on public.property_invitations(property_id, status, lower(email));
create unique index if not exists rooms_property_name_unique_ci
  on public.rooms(property_id, lower(btrim(name)))
  where property_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Storage: public reads remain, writes are property/path scoped
-- ---------------------------------------------------------------------------

drop policy if exists "access to room images 1ied7ze_1" on storage.objects;
drop policy if exists "access to room images 1ied7ze_2" on storage.objects;
drop policy if exists "Only system can delete room images" on storage.objects;
drop policy if exists "policies for property images access 107eh68_1" on storage.objects;
drop policy if exists "policies for property images access 107eh68_2" on storage.objects;
drop policy if exists "policies for property images access 107eh68_3" on storage.objects;

drop policy if exists loji_property_images_insert on storage.objects;
create policy loji_property_images_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'property-images'
  and app_private.can_manage_property_object(name)
);

drop policy if exists loji_property_images_update on storage.objects;
create policy loji_property_images_update
on storage.objects for update to authenticated
using (
  bucket_id = 'property-images'
  and app_private.can_manage_property_object(name)
)
with check (
  bucket_id = 'property-images'
  and app_private.can_manage_property_object(name)
);

drop policy if exists loji_property_images_delete on storage.objects;
create policy loji_property_images_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'property-images'
  and app_private.can_manage_property_object(name)
);

drop policy if exists loji_room_images_insert on storage.objects;
create policy loji_room_images_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'room-images'
  and app_private.can_manage_room_object(name)
);

drop policy if exists loji_room_images_update on storage.objects;
create policy loji_room_images_update
on storage.objects for update to authenticated
using (
  bucket_id = 'room-images'
  and app_private.can_manage_room_object(name)
)
with check (
  bucket_id = 'room-images'
  and app_private.can_manage_room_object(name)
);

drop policy if exists loji_room_images_delete on storage.objects;
create policy loji_room_images_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'room-images'
  and app_private.can_manage_room_object(name)
);

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']::text[]
where id in ('property-images','room-images');

-- ---------------------------------------------------------------------------
-- 4. Dashboard: authenticated, tenant checked, RLS-aware and set-based
-- ---------------------------------------------------------------------------

create or replace function public.get_home_dashboard(p_property_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $fn$
declare
  v_timezone text;
  v_today date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not app_private.is_property_member(p_property_id) then
    raise exception using errcode = '42501', message = 'Property access denied';
  end if;

  select coalesce(p.timezone, 'UTC')
  into v_timezone
  from public.properties p
  where p.id = p_property_id;

  v_today := (clock_timestamp() at time zone v_timezone)::date;
  v_day_start := v_today::timestamp at time zone v_timezone;
  v_day_end := (v_today + 1)::timestamp at time zone v_timezone;

  with payment_rollup as (
    select
      p.booking_id,
      coalesce(sum(p.amount) filter (
        where coalesce(p.payment_status, p.status) = 'completed'
      ), 0) as amount_paid
    from public.payments p
    group by p.booking_id
  )
  select jsonb_build_object(
    'today_revenue', coalesce((
      select sum(p.amount)
      from public.payments p
      join public.bookings b on b.id = p.booking_id
      where b.property_id = p_property_id
        and coalesce(p.payment_status, p.status) = 'completed'
        and coalesce(p.paid_at, p.created_at) >= v_day_start
        and coalesce(p.paid_at, p.created_at) < v_day_end
    ), 0),
    'bookings', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'booking_number', b.booking_number,
          'room_id', b.room_id,
          'check_in', b.check_in,
          'check_out', b.check_out,
          'status', b.status,
          'payment_status', b.payment_status,
          'room_name', r.name,
          'room_type', r.room_type,
          'guest_name', btrim(concat_ws(' ', g.first_name, g.last_name)),
          'amount_paid', coalesce(pr.amount_paid, 0),
          'balance_due', greatest(b.total_price - coalesce(pr.amount_paid, 0), 0)
        ) order by b.check_in, b.created_at desc
      )
      from public.bookings b
      join public.rooms r on r.id = b.room_id
      left join public.guests g on g.id = b.guest_id
      left join payment_rollup pr on pr.booking_id = b.id
      where b.property_id = p_property_id
    ), '[]'::jsonb),
    'rooms', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.name)
      from public.rooms r
      where r.property_id = p_property_id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 5. Availability and atomic walk-in creation
-- ---------------------------------------------------------------------------

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
  v_timezone text;
  v_today date;
  v_nights integer;
begin
  if (select auth.uid()) is null
     or not app_private.is_property_member(p_property_id) then
    raise exception using errcode = '42501', message = 'Property access denied';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception using errcode = '22023', message = 'Check-out must be after check-in';
  end if;
  if coalesce(p_guests, 0) < 1 then
    raise exception using errcode = '22023', message = 'Guests must be at least one';
  end if;

  select coalesce(p.timezone, 'UTC') into v_timezone
  from public.properties p where p.id = p_property_id;
  v_today := (clock_timestamp() at time zone v_timezone)::date;
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
        and coalesce(r.operational_status, '') not in ('maintenance','out_of_order'))
    )
    and not exists (
      select 1
      from public.bookings b
      where b.room_id = r.id
        and b.status not in ('cancelled','no_show','checked_out')
        and p_check_in < b.check_out
        and p_check_out > b.check_in
    )
  order by r.price_per_night, r.name;
end;
$fn$;

create or replace function public.create_walkin_booking(
  p_property_id uuid,
  p_room_id uuid,
  p_first_name text,
  p_last_name text,
  p_gender text,
  p_phone text,
  p_check_in date,
  p_check_out date,
  p_total_price numeric,
  p_payment_method text,
  p_nationality text default null,
  p_occupation text default null,
  p_email text default null,
  p_where_from text default null,
  p_where_to text default null,
  p_id_type text default null,
  p_id_number text default null,
  p_emergency_contact_name text default null,
  p_emergency_contact_phone text default null,
  p_adults integer default 1,
  p_children integer default 0,
  p_special_requests text default null,
  p_transaction_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_room public.rooms%rowtype;
  v_property_active boolean;
  v_timezone text;
  v_today date;
  v_nights integer;
  v_price numeric(10,2);
  v_method_key text;
  v_method_label text;
  v_guest_id uuid;
  v_booking_id uuid;
  v_payment_id uuid;
  v_booking_number text;
  v_booking_status text;
  v_attempt integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not public.has_permission(p_property_id, 'bookings', 'create') then
    raise exception using errcode = '42501', message = 'Booking permission denied';
  end if;
  if nullif(btrim(coalesce(p_first_name, '')), '') is null
     or nullif(btrim(coalesce(p_last_name, '')), '') is null
     or nullif(btrim(coalesce(p_gender, '')), '') is null
     or nullif(btrim(coalesce(p_phone, '')), '') is null then
    raise exception using errcode = '22023', message = 'Guest name, gender and phone are required';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception using errcode = '22023', message = 'Invalid stay dates';
  end if;
  if coalesce(p_adults, 1) < 1 or coalesce(p_children, 0) < 0 then
    raise exception using errcode = '22023', message = 'Invalid guest count';
  end if;

  select r, coalesce(p.status, false), coalesce(p.timezone, 'UTC')
  into v_room, v_property_active, v_timezone
  from public.rooms r
  join public.properties p on p.id = r.property_id
  where r.id = p_room_id and r.property_id = p_property_id
  for update of r;

  if not found then
    raise exception using errcode = 'P0002', message = 'Room not found in property';
  end if;
  if not v_property_active or not coalesce(v_room.is_active, false) then
    raise exception using errcode = '22023', message = 'Property or room is inactive';
  end if;

  v_today := (clock_timestamp() at time zone v_timezone)::date;
  if p_check_in < v_today then
    raise exception using errcode = '22023', message = 'Check-in cannot be in the past';
  end if;
  if p_check_in = v_today
     and (coalesce(v_room.operational_status, '') <> 'available'
          or v_room.housekeeping_status <> 'ready') then
    raise exception using errcode = '22023', message = 'Room is not ready for immediate check-in';
  end if;
  if p_check_in > v_today
     and coalesce(v_room.operational_status, '') in ('maintenance','out_of_order') then
    raise exception using errcode = '22023', message = 'Room is not bookable';
  end if;
  if coalesce(p_adults, 1) + coalesce(p_children, 0) > coalesce(v_room.capacity, 0) then
    raise exception using errcode = '22023', message = 'Guest count exceeds room capacity';
  end if;
  if exists (
    select 1
    from public.bookings b
    where b.room_id = p_room_id
      and b.status not in ('cancelled','no_show','checked_out')
      and p_check_in < b.check_out
      and p_check_out > b.check_in
  ) then
    raise exception using errcode = '23P01', message = 'Room is no longer available';
  end if;

  v_nights := p_check_out - p_check_in;
  v_price := round(v_room.price_per_night * v_nights, 2);
  if v_price <= 0 then
    raise exception using errcode = '22023', message = 'Room price is invalid';
  end if;
  if p_total_price is not null and round(p_total_price, 2) <> v_price then
    raise exception using
      errcode = '22023',
      message = 'Price changed; refresh the quote',
      detail = format('Current server total: %s', v_price);
  end if;

  v_method_key := lower(replace(btrim(coalesce(p_payment_method, '')), ' ', '_'));
  if v_method_key not in ('cash','card','mobile_money','bank_transfer','cheque','other') then
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

  insert into public.guests(
    first_name, last_name, gender, nationality, occupation, email, phone,
    where_from, where_to, id_type, id_number,
    emergency_contact_name, emergency_contact_phone
  ) values (
    btrim(p_first_name),
    btrim(p_last_name),
    btrim(p_gender),
    nullif(btrim(coalesce(p_nationality, '')), ''),
    nullif(btrim(coalesce(p_occupation, '')), ''),
    nullif(lower(btrim(coalesce(p_email, ''))), ''),
    btrim(p_phone),
    nullif(btrim(coalesce(p_where_from, '')), ''),
    nullif(btrim(coalesce(p_where_to, '')), ''),
    nullif(btrim(coalesce(p_id_type, '')), ''),
    nullif(btrim(coalesce(p_id_number, '')), ''),
    nullif(btrim(coalesce(p_emergency_contact_name, '')), ''),
    nullif(btrim(coalesce(p_emergency_contact_phone, '')), '')
  ) returning id into v_guest_id;

  v_booking_status := case when p_check_in = v_today then 'checked_in' else 'confirmed' end;
  for v_attempt in 1..5 loop
    v_booking_number := 'WB-' || to_char(clock_timestamp(), 'YYMMDD') || '-' ||
      upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.bookings(
        booking_number, property_id, room_id, guest_id, created_by,
        check_in, check_out, checked_in_at, checked_in_by,
        adults, children, total_price, status, payment_status, special_requests
      ) values (
        v_booking_number, p_property_id, p_room_id, v_guest_id, v_user_id,
        p_check_in, p_check_out,
        case when v_booking_status = 'checked_in' then now() end,
        case when v_booking_status = 'checked_in' then v_user_id end,
        coalesce(p_adults, 1), coalesce(p_children, 0),
        v_price, v_booking_status, 'paid',
        nullif(btrim(coalesce(p_special_requests, '')), '')
      ) returning id into v_booking_id;
      exit;
    exception when unique_violation then
      if v_attempt = 5 then raise; end if;
    end;
  end loop;

  insert into public.payments(
    booking_id, amount, currency,
    payment_method, payment_status, transaction_reference, received_by,
    method, status, transaction_ref
  ) values (
    v_booking_id, v_price, 'TZS',
    v_method_label, 'completed',
    nullif(btrim(coalesce(p_transaction_ref, '')), ''), v_user_id,
    v_method_key, 'completed',
    nullif(btrim(coalesce(p_transaction_ref, '')), '')
  ) returning id into v_payment_id;

  if v_booking_status = 'checked_in' then
    update public.rooms
    set operational_status = 'occupied', updated_at = now()
    where id = p_room_id;
  end if;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'booking', v_booking_id::text,
    'walkin_booking_created',
    jsonb_build_object(
      'booking_number', v_booking_number,
      'room_id', p_room_id,
      'guest_id', v_guest_id,
      'total_price', v_price,
      'payment_id', v_payment_id,
      'status', v_booking_status
    )
  );

  return jsonb_build_object(
    'success', true,
    'booking', jsonb_build_object(
      'id', v_booking_id,
      'booking_number', v_booking_number,
      'status', v_booking_status,
      'total_price', v_price
    ),
    'server_total_price', v_price
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 6. Canonical payment writer: public.payments is the live ledger
-- ---------------------------------------------------------------------------

insert into public.role_permissions(role, resource, action)
values ('owner', 'payments', 'create')
on conflict (role, resource, action) do nothing;

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
  v_amount numeric(10,2);
  v_paid numeric(10,2);
  v_new_paid numeric(10,2);
  v_new_status text;
  v_method_key text;
  v_method_label text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not public.has_permission(p_property_id, 'payments', 'create') then
    raise exception using errcode = '42501', message = 'Payment permission denied';
  end if;

  v_amount := round(p_amount, 2);
  if v_amount is null or v_amount <= 0 then
    raise exception using errcode = '22023', message = 'Payment amount must be greater than zero';
  end if;
  v_method_key := lower(replace(btrim(coalesce(p_method, '')), ' ', '_'));
  if v_method_key not in ('cash','card','mobile_money','bank_transfer','cheque','other') then
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

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id and b.property_id = p_property_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;
  if v_booking.status in ('cancelled','no_show') then
    raise exception using errcode = '22023', message = 'Cannot record payment for this booking state';
  end if;

  select coalesce(sum(p.amount), 0)::numeric(10,2)
  into v_paid
  from public.payments p
  where p.booking_id = p_booking_id
    and coalesce(p.payment_status, p.status) = 'completed';

  if v_amount > greatest(v_booking.total_price - v_paid, 0) then
    raise exception using
      errcode = '22023',
      message = 'Payment exceeds outstanding balance',
      detail = format('Outstanding balance: %s', greatest(v_booking.total_price - v_paid, 0));
  end if;

  insert into public.payments(
    booking_id, amount, currency,
    payment_method, payment_status, transaction_reference, received_by, notes,
    method, status, transaction_ref
  ) values (
    p_booking_id, v_amount, 'TZS',
    v_method_label, 'completed',
    nullif(btrim(coalesce(p_reference, '')), ''), v_user_id,
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_method_key, 'completed',
    nullif(btrim(coalesce(p_reference, '')), '')
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
    p_property_id, v_user_id, 'booking', p_booking_id::text, 'payment_recorded',
    jsonb_build_object(
      'payment_id', v_payment.id,
      'amount', v_payment.amount,
      'method', v_method_key,
      'reference', v_payment.transaction_reference,
      'total_paid', v_new_paid,
      'payment_status', v_new_status
    )
  );

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'amount_paid', v_new_paid,
    'balance_due', greatest(v_booking.total_price - v_new_paid, 0),
    'payment_status', v_new_status
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 7. One atomic room edit matching the existing frontend RPC argument names
-- ---------------------------------------------------------------------------

create or replace function public.update_room(
  p_room_id uuid,
  p_property_id uuid,
  p_room_name text,
  p_room_type text,
  p_is_active boolean,
  p_price_per_night numeric,
  p_capacity integer,
  p_bed_count integer,
  p_amenities text[],
  p_images text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_old public.rooms%rowtype;
  v_new public.rooms%rowtype;
  v_name text;
  v_type text;
  v_amenities text[];
  v_images text[];
  v_images_json jsonb;
  v_image text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not public.has_permission(p_property_id, 'rooms', 'update') then
    raise exception using errcode = '42501', message = 'Room update permission denied';
  end if;

  select r.* into v_old
  from public.rooms r
  where r.id = p_room_id and r.property_id = p_property_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Room not found in property';
  end if;

  v_name := btrim(coalesce(p_room_name, ''));
  v_type := lower(btrim(coalesce(p_room_type, '')));
  if length(v_name) < 2 or length(v_name) > 100 then
    raise exception using errcode = '22023', message = 'Room name must be 2-100 characters';
  end if;
  if v_type not in ('single','master','suite','deluxe') then
    raise exception using errcode = '22023', message = 'Unsupported room type';
  end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 100 then
    raise exception using errcode = '22023', message = 'Capacity must be 1-100';
  end if;
  if p_bed_count is null or p_bed_count < 1 or p_bed_count > p_capacity then
    raise exception using errcode = '22023', message = 'Bed count must be between 1 and capacity';
  end if;
  if p_price_per_night is null or p_price_per_night <= 0
     or p_price_per_night > 100000000 then
    raise exception using errcode = '22023', message = 'Invalid room price';
  end if;

  select coalesce(array_agg(a order by a), array[]::text[])
  into v_amenities
  from (
    select distinct btrim(x) as a
    from unnest(coalesce(p_amenities, array[]::text[])) x
    where nullif(btrim(x), '') is not null
  ) q;

  select coalesce(array_agg(url order by first_pos), array[]::text[])
  into v_images
  from (
    select btrim(x) as url, min(ord) as first_pos
    from unnest(coalesce(p_images, array[]::text[])) with ordinality u(x, ord)
    where nullif(btrim(x), '') is not null
    group by btrim(x)
  ) q;

  if cardinality(v_images) < 1 or cardinality(v_images) > 3 then
    raise exception using errcode = '22023', message = 'Provide 1-3 room images';
  end if;
  foreach v_image in array v_images loop
    if v_image not like (
      'https://kymloctcridmvqtdglro.supabase.co/storage/v1/object/public/room-images/' ||
      p_property_id::text || '/' || p_room_id::text || '/%'
    ) then
      raise exception using errcode = '22023', message = 'Room image path is outside this room';
    end if;
  end loop;

  select coalesce(jsonb_agg(
    jsonb_build_object('url', x, 'is_cover', ord = 1, 'position', ord)
    order by ord
  ), '[]'::jsonb)
  into v_images_json
  from unnest(v_images) with ordinality u(x, ord);

  update public.rooms
  set name = v_name,
      room_type = v_type,
      is_active = coalesce(p_is_active, is_active),
      price_per_night = round(p_price_per_night, 2),
      capacity = p_capacity,
      bed_count = p_bed_count,
      amenities = to_jsonb(v_amenities),
      images = v_images_json,
      updated_at = now()
  where id = p_room_id and property_id = p_property_id
  returning * into v_new;

  delete from public.room_images where room_id = p_room_id;
  insert into public.room_images(room_id, url, position, is_cover)
  select p_room_id, x, ord::integer, ord = 1
  from unnest(v_images) with ordinality u(x, ord);

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'room', p_room_id::text, 'room_updated',
    to_jsonb(v_old), to_jsonb(v_new)
  );

  return jsonb_build_object('success', true, 'room', to_jsonb(v_new));
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 8. Property RPCs used by the current onboarding UI
-- ---------------------------------------------------------------------------

create or replace function public.save_property_images(
  p_property_id uuid,
  p_images text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_images text[];
  v_images_json jsonb;
  v_image text;
begin
  if v_user_id is null
     or not app_private.has_property_role(
       p_property_id, array['owner','manager']::text[]
     ) then
    raise exception using errcode = '42501', message = 'Property image permission denied';
  end if;

  select coalesce(array_agg(url order by first_pos), array[]::text[])
  into v_images
  from (
    select btrim(x) as url, min(ord) as first_pos
    from unnest(coalesce(p_images, array[]::text[])) with ordinality u(x, ord)
    where nullif(btrim(x), '') is not null
    group by btrim(x)
  ) q;

  if cardinality(v_images) < 1 or cardinality(v_images) > 3 then
    raise exception using errcode = '22023', message = 'Provide 1-3 property images';
  end if;
  foreach v_image in array v_images loop
    if v_image not like (
      'https://kymloctcridmvqtdglro.supabase.co/storage/v1/object/public/property-images/' ||
      p_property_id::text || '/%'
    ) then
      raise exception using errcode = '22023', message = 'Property image path is outside this property';
    end if;
  end loop;

  select coalesce(jsonb_agg(
    jsonb_build_object('url', x, 'is_cover', ord = 1, 'position', ord - 1)
    order by ord
  ), '[]'::jsonb)
  into v_images_json
  from unnest(v_images) with ordinality u(x, ord);

  delete from public.property_images where property_id = p_property_id;
  insert into public.property_images(property_id, url, is_cover, position)
  select p_property_id, x, ord = 1, (ord - 1)::integer
  from unnest(v_images) with ordinality u(x, ord);

  update public.properties
  set images = v_images_json, updated_at = now()
  where id = p_property_id;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'property', p_property_id::text,
    'property_images_updated', jsonb_build_object('images', v_images_json)
  );
end;
$fn$;

create or replace function public.update_property_address(
  p_owner_id uuid,
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
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_property_id uuid;
begin
  if v_user_id is null or p_owner_id is distinct from v_user_id then
    raise exception using errcode = '42501', message = 'Owner identity mismatch';
  end if;
  if p_latitude is null or p_latitude < -90 or p_latitude > 90
     or p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception using errcode = '22023', message = 'Invalid map coordinates';
  end if;

  select p.id into v_property_id
  from public.properties p
  where p.owner_id = v_user_id
  order by p.created_at
  limit 1
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found for owner';
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
  where id = v_property_id;

  insert into public.property_users(property_id, user_id, role, status)
  values (v_property_id, v_user_id, 'owner', 'active')
  on conflict (property_id, user_id)
  do update set role = 'owner', status = 'active';

  update public.onboarding_state
  set current_step = 'done',
      has_property_physical_address = true,
      updated_at = now()
  where user_id = v_user_id;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    v_property_id, v_user_id, 'property', v_property_id::text,
    'property_address_updated',
    jsonb_build_object(
      'country', p_country,
      'region', p_region,
      'district', p_district,
      'latitude', p_latitude,
      'longitude', p_longitude
    )
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 9. Payment-derived checkout and consistent housekeeping transition
-- ---------------------------------------------------------------------------

insert into public.role_permissions(role, resource, action)
values
  ('owner', 'bookings', 'checkout'),
  ('manager', 'bookings', 'checkout')
on conflict (role, resource, action) do nothing;

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
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings%rowtype;
  v_paid numeric;
  v_balance numeric;
  v_payment_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;
  if not public.has_permission(v_booking.property_id, 'bookings', 'checkout') then
    raise exception using errcode = '42501', message = 'Checkout permission denied';
  end if;
  if v_booking.status <> 'checked_in' then
    raise exception using errcode = '22023', message = 'Only checked-in bookings can check out';
  end if;

  select coalesce(sum(p.amount), 0)
  into v_paid
  from public.payments p
  where p.booking_id = p_booking_id
    and coalesce(p.payment_status, p.status) = 'completed';
  v_balance := greatest(v_booking.total_price - v_paid, 0);
  v_payment_status := case
    when v_balance = 0 then 'paid'
    when v_paid > 0 then 'partial'
    else 'unpaid'
  end;

  if v_balance > 0 and not coalesce(p_allow_balance, false) then
    return jsonb_build_object(
      'success', false,
      'requires_payment', true,
      'balance_due', v_balance,
      'message', 'Outstanding payment required before checkout'
    );
  end if;

  update public.bookings
  set status = 'checked_out',
      payment_status = v_payment_status,
      checked_out_at = now(),
      checked_out_by = v_user_id,
      updated_at = now()
  where id = p_booking_id;

  update public.rooms
  set operational_status = 'dirty',
      housekeeping_status = 'needs_cleaning',
      housekeeping_updated_at = now(),
      updated_at = now()
  where id = v_booking.room_id;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    v_booking.property_id, v_user_id, 'booking', p_booking_id::text,
    'booking_checked_out', to_jsonb(v_booking),
    jsonb_build_object(
      'status', 'checked_out',
      'payment_status', v_payment_status,
      'balance_due', v_balance
    )
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', 'checked_out',
    'payment_status', v_payment_status,
    'balance_due', v_balance
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
  v_old public.rooms%rowtype;
  v_new public.rooms%rowtype;
begin
  if v_user_id is null
     or not public.has_permission(p_property_id, 'rooms', 'update') then
    raise exception using errcode = '42501', message = 'Housekeeping permission denied';
  end if;
  if p_status not in ('ready','needs_cleaning','cleaning','out_of_service') then
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
    where b.room_id = p_room_id and b.status = 'checked_in'
  ) then
    raise exception using errcode = '22023', message = 'Check out the guest before changing housekeeping state';
  end if;

  update public.rooms
  set housekeeping_status = p_status,
      housekeeping_notes = nullif(btrim(coalesce(p_notes, '')), ''),
      housekeeping_updated_at = now(),
      operational_status = case p_status
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
    'operational_status', v_new.operational_status
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 10. Function ACLs: no blanket authenticated grant
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon;

-- The only intentional anonymous consumer discovery surface.
grant execute on function public.get_available_rooms(uuid,date,date,integer)
to anon, authenticated;
grant execute on function public.get_nearby_properties(
  double precision,double precision,double precision,integer
) to anon, authenticated;
grant execute on function public.get_property_by_id(uuid)
to anon, authenticated;
grant execute on function public.search_available_properties(
  text,date,date,integer,
  double precision,double precision,double precision,integer,integer
) to anon, authenticated;
grant execute on function public.search_property_locations(text,integer)
to anon, authenticated;

-- Explicit authenticated application functions introduced/replaced above.
grant execute on function public.get_home_dashboard(uuid) to authenticated;
grant execute on function public.get_walkin_available_rooms(uuid,date,date,integer)
to authenticated;
grant execute on function public.create_walkin_booking(
  uuid,uuid,text,text,text,text,date,date,numeric,text,
  text,text,text,text,text,text,text,text,text,integer,integer,text,text
) to authenticated;
grant execute on function public.record_booking_payment(
  uuid,uuid,numeric,text,text,text
) to authenticated;
grant execute on function public.update_room(
  uuid,uuid,text,text,boolean,numeric,integer,integer,text[],text[]
) to authenticated;
grant execute on function public.save_property_images(uuid,text[])
to authenticated;
grant execute on function public.update_property_address(
  uuid,text,text,text,text,text,text,text,double precision,double precision
) to authenticated;
grant execute on function public.checkout_booking(uuid,boolean)
to authenticated;
grant execute on function public.update_room_housekeeping_status(
  uuid,uuid,text,text
) to authenticated;

-- invite_staff(uuid,text,text) previously inherited only PUBLIC execute.
grant execute on function public.invite_staff(uuid,text,text) to authenticated;

-- Known IDOR/stale/internal functions must not remain authenticated RPCs.
revoke execute on function public.complete_consumer_profile(uuid,text,text)
from authenticated;
revoke execute on function public.complete_owner_profile(uuid,text,text,text)
from authenticated;
revoke execute on function public.create_property_basic(uuid,text,text,text)
from authenticated;
revoke execute on function public.create_property_basic(uuid,text,text,text,text)
from authenticated;
revoke execute on function public.create_first_room(
  uuid,text,text,integer,numeric,integer
) from authenticated;
revoke execute on function public.update_property_address(
  uuid,text,text,text,text,text
) from authenticated;
revoke execute on function public.update_property_address(
  uuid,text,text,text,text,text,text,double precision,double precision
) from authenticated;
revoke execute on function public.update_property_map_location(
  uuid,double precision,double precision
) from authenticated;
revoke execute on function public.auto_checkout_bookings() from authenticated;
revoke execute on function public.handle_new_user_profile() from authenticated;
revoke execute on function public.loji_mark_room_dirty_after_checkout()
from authenticated;
revoke execute on function public.rls_auto_enable() from authenticated;
revoke execute on function public.set_booking_checkout_time() from authenticated;

-- Resolve every mutable-search-path advisor finding.
alter function public.get_permissions_batch(uuid,text) set search_path = public;
alter function public.get_property_by_id(uuid) set search_path = public;
alter function public.auto_checkout_bookings() set search_path = public;
alter function public.set_booking_checkout_time() set search_path = public;

alter default privileges for role postgres in schema public
revoke execute on functions from public, anon, authenticated;

commit;

