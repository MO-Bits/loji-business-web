-- Property-aware inventory for hotels, apartments and whole-home stays.
-- The existing rooms/room_id contract remains intact for booking compatibility;
-- each row now describes the kind of bookable space it represents.

create or replace function app_private.inventory_type_for_property_type(
  p_property_type text
)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select case lower(btrim(coalesce(p_property_type, '')))
    when 'apartment' then 'apartment'
    when 'house' then 'house'
    when 'villa' then 'house'
    else 'room'
  end;
$fn$;

revoke all on function app_private.inventory_type_for_property_type(text)
  from public, anon, authenticated;

update public.properties
set property_type = lower(replace(btrim(property_type), '-', '_'))
where property_type is distinct from lower(replace(btrim(property_type), '-', '_'));

alter table public.properties
  add column if not exists expected_inventory_count integer,
  add column if not exists default_bedroom_count smallint,
  add column if not exists default_bathroom_count numeric(4,1);

update public.properties p
set expected_inventory_count = case
      when app_private.inventory_type_for_property_type(p.property_type) = 'house' then 1
      else greatest(1, coalesce((
        select count(*)::integer from public.rooms r where r.property_id = p.id
      ), 0))
    end,
    default_bedroom_count = case
      when app_private.inventory_type_for_property_type(p.property_type) = 'house'
        then coalesce(p.default_bedroom_count, 1)
      else p.default_bedroom_count
    end,
    default_bathroom_count = case
      when app_private.inventory_type_for_property_type(p.property_type) = 'house'
        then coalesce(p.default_bathroom_count, 1)
      else p.default_bathroom_count
    end
where p.expected_inventory_count is null
   or (app_private.inventory_type_for_property_type(p.property_type) = 'house'
       and (p.default_bedroom_count is null or p.default_bathroom_count is null));

alter table public.properties
  alter column expected_inventory_count set default 1,
  alter column expected_inventory_count set not null;

alter table public.properties
  drop constraint if exists properties_property_type_check,
  add constraint properties_property_type_check check (
    property_type in (
      'hotel', 'lodge', 'guesthouse', 'apartment', 'house',
      'resort', 'hostel', 'villa', 'bed_and_breakfast'
    )
  ) not valid,
  drop constraint if exists properties_expected_inventory_count_check,
  add constraint properties_expected_inventory_count_check check (
    expected_inventory_count between 1 and 1000
  ) not valid,
  drop constraint if exists properties_default_bedroom_count_check,
  add constraint properties_default_bedroom_count_check check (
    default_bedroom_count is null or default_bedroom_count between 0 and 20
  ) not valid,
  drop constraint if exists properties_default_bathroom_count_check,
  add constraint properties_default_bathroom_count_check check (
    default_bathroom_count is null
    or default_bathroom_count between 0.5 and 20
  ) not valid;

alter table public.properties validate constraint properties_property_type_check;
alter table public.properties validate constraint properties_expected_inventory_count_check;
alter table public.properties validate constraint properties_default_bedroom_count_check;
alter table public.properties validate constraint properties_default_bathroom_count_check;

alter table public.rooms
  add column if not exists inventory_type text,
  add column if not exists bedroom_count smallint,
  add column if not exists bathroom_count numeric(4,1);

update public.rooms r
set inventory_type = app_private.inventory_type_for_property_type(p.property_type),
    bedroom_count = coalesce(r.bedroom_count, case
      when lower(r.room_type) ~ '^[0-9]+[ -]?bed' then
        substring(lower(r.room_type) from '^([0-9]+)')::smallint
      when lower(r.room_type) = 'studio' then 0
      else 1
    end),
    bathroom_count = coalesce(r.bathroom_count, 1)
from public.properties p
where p.id = r.property_id
  and (r.inventory_type is null or r.bedroom_count is null or r.bathroom_count is null);

alter table public.rooms
  alter column inventory_type set default 'room',
  alter column inventory_type set not null,
  alter column bedroom_count set default 1,
  alter column bedroom_count set not null,
  alter column bathroom_count set default 1,
  alter column bathroom_count set not null,
  drop constraint if exists rooms_inventory_type_check,
  add constraint rooms_inventory_type_check check (
    inventory_type in ('room', 'apartment', 'house')
  ) not valid,
  drop constraint if exists rooms_bedroom_count_check,
  add constraint rooms_bedroom_count_check check (
    bedroom_count between 0 and 20
  ) not valid,
  drop constraint if exists rooms_bathroom_count_check,
  add constraint rooms_bathroom_count_check check (
    bathroom_count between 0.5 and 20
  ) not valid;

alter table public.rooms validate constraint rooms_inventory_type_check;
alter table public.rooms validate constraint rooms_bedroom_count_check;
alter table public.rooms validate constraint rooms_bathroom_count_check;

create index if not exists rooms_property_inventory_active_idx
  on public.rooms(property_id, inventory_type, is_active);

create unique index if not exists rooms_one_whole_home_per_property_idx
  on public.rooms(property_id)
  where inventory_type = 'house';

create or replace function app_private.guard_property_inventory_model()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_old_model text;
  v_new_model text;
begin
  new.property_type := lower(replace(btrim(coalesce(new.property_type, '')), '-', '_'));
  if new.property_type not in (
    'hotel', 'lodge', 'guesthouse', 'apartment', 'house',
    'resort', 'hostel', 'villa', 'bed_and_breakfast'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported property type';
  end if;

  v_new_model := app_private.inventory_type_for_property_type(new.property_type);
  if v_new_model = 'house' then
    new.expected_inventory_count := 1;
  end if;

  if tg_op = 'UPDATE' and new.property_type is distinct from old.property_type then
    v_old_model := app_private.inventory_type_for_property_type(old.property_type);
    if v_old_model <> v_new_model and exists (
      select 1 from public.rooms r where r.property_id = old.id
    ) then
      raise exception using
        errcode = '22023',
        message = 'Change the property type before adding bookable spaces, or contact support to convert existing inventory safely';
    end if;
  end if;
  return new;
end;
$fn$;

revoke all on function app_private.guard_property_inventory_model()
  from public, anon, authenticated;

drop trigger if exists loji_guard_property_inventory_model on public.properties;
create trigger loji_guard_property_inventory_model
before insert or update of property_type, expected_inventory_count
on public.properties
for each row execute function app_private.guard_property_inventory_model();

create or replace function app_private.guard_room_inventory_model()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_expected text;
begin
  select app_private.inventory_type_for_property_type(p.property_type)
  into v_expected
  from public.properties p
  where p.id = new.property_id;
  if v_expected is null then
    raise exception using errcode = '23503', message = 'Property not found';
  end if;
  if new.inventory_type is distinct from v_expected then
    raise exception using
      errcode = '22023',
      message = 'This bookable space does not match the property type';
  end if;
  return new;
end;
$fn$;

revoke all on function app_private.guard_room_inventory_model()
  from public, anon, authenticated;

drop trigger if exists loji_guard_room_inventory_model on public.rooms;
create trigger loji_guard_room_inventory_model
before insert or update of property_id, inventory_type
on public.rooms
for each row execute function app_private.guard_room_inventory_model();

create or replace function public.save_property_onboarding_profile(
  p_name text,
  p_type text,
  p_phone text,
  p_email text,
  p_amenities jsonb,
  p_expected_inventory_count integer,
  p_default_bedroom_count integer default null,
  p_default_bathroom_count numeric default null,
  p_request_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_type text := lower(replace(btrim(coalesce(p_type, '')), '-', '_'));
  v_model text;
  v_count integer;
  v_property_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if v_type not in (
    'hotel', 'lodge', 'guesthouse', 'apartment', 'house',
    'resort', 'hostel', 'villa', 'bed_and_breakfast'
  ) then
    raise exception using errcode = '22023', message = 'Choose a supported property type';
  end if;
  v_model := app_private.inventory_type_for_property_type(v_type);
  v_count := case when v_model = 'house' then 1 else p_expected_inventory_count end;
  if v_count is null or v_count not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'Bookable space count must be between 1 and 1000';
  end if;
  if v_model = 'house' and (
    p_default_bedroom_count is null or p_default_bedroom_count not between 0 and 20
    or p_default_bathroom_count is null or p_default_bathroom_count not between 0.5 and 20
  ) then
    raise exception using errcode = '22023', message = 'Add valid bedroom and bathroom counts for the home';
  end if;

  v_property_id := public.create_property_basic_info(
    p_name, v_type, p_phone, p_email, coalesce(p_amenities, '[]'::jsonb), p_request_key
  );

  update public.properties
  set expected_inventory_count = v_count,
      default_bedroom_count = case when v_model = 'house'
        then p_default_bedroom_count else null end,
      default_bathroom_count = case when v_model = 'house'
        then round(p_default_bathroom_count, 1) else null end,
      updated_at = now()
  where id = v_property_id and owner_id = v_user_id;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    v_property_id, v_user_id, 'property', v_property_id::text,
    'property_inventory_model_configured',
    jsonb_build_object(
      'property_type', v_type,
      'inventory_type', v_model,
      'expected_inventory_count', v_count,
      'default_bedroom_count', p_default_bedroom_count,
      'default_bathroom_count', p_default_bathroom_count
    )
  );
  return v_property_id;
end;
$fn$;

revoke all on function public.save_property_onboarding_profile(
  text,text,text,text,jsonb,integer,integer,numeric,uuid
) from public, anon;
grant execute on function public.save_property_onboarding_profile(
  text,text,text,text,jsonb,integer,integer,numeric,uuid
) to authenticated, service_role;

create or replace function public.get_property_inventory_setup(
  p_property_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_property public.properties%rowtype;
begin
  perform app_private.require_property_permission(p_property_id, 'rooms', 'view');
  select p.* into v_property
  from public.properties p
  where p.id = p_property_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;
  return jsonb_build_object(
    'property_id', v_property.id,
    'property_type', v_property.property_type,
    'inventory_type', app_private.inventory_type_for_property_type(v_property.property_type),
    'expected_inventory_count', v_property.expected_inventory_count,
    'default_bedroom_count', v_property.default_bedroom_count,
    'default_bathroom_count', v_property.default_bathroom_count
  );
end;
$fn$;

revoke all on function public.get_property_inventory_setup(uuid)
  from public, anon;
grant execute on function public.get_property_inventory_setup(uuid)
  to authenticated, service_role;

create or replace function public.create_inventory_unit(
  p_property_id uuid,
  p_unit_id uuid,
  p_name text,
  p_space_type text,
  p_inventory_type text,
  p_is_active boolean,
  p_price_per_night numeric,
  p_capacity integer,
  p_bed_count integer,
  p_bedroom_count integer,
  p_bathroom_count numeric,
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
  v_name text := btrim(coalesce(p_name, ''));
  v_space_type text := lower(replace(btrim(coalesce(p_space_type, '')), '_', '-'));
  v_inventory_type text;
  v_amenities text[];
  v_images jsonb;
  v_unit public.rooms%rowtype;
begin
  perform app_private.require_property_permission(p_property_id, 'rooms', 'create');
  select app_private.inventory_type_for_property_type(p.property_type)
  into v_inventory_type from public.properties p where p.id = p_property_id;
  if v_inventory_type is null then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;
  if lower(btrim(coalesce(p_inventory_type, ''))) <> v_inventory_type then
    raise exception using errcode = '22023', message = 'Bookable space type does not match this property';
  end if;
  if p_unit_id is null then
    raise exception using errcode = '22023', message = 'Bookable space id is required';
  end if;
  if length(v_name) < 2 or length(v_name) > 100 then
    raise exception using errcode = '22023', message = 'Name must be 2-100 characters';
  end if;
  if length(v_space_type) < 2 or length(v_space_type) > 50 then
    raise exception using errcode = '22023', message = 'Space type is invalid';
  end if;
  if p_price_per_night is null or p_price_per_night <= 0
     or p_price_per_night > 100000000 then
    raise exception using errcode = '22023', message = 'Nightly price is invalid';
  end if;
  if p_capacity is null or p_capacity not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Guest capacity must be 1-100';
  end if;
  if p_bed_count is null or p_bed_count < 1 or p_bed_count > p_capacity then
    raise exception using errcode = '22023', message = 'Bed count must be between 1 and guest capacity';
  end if;
  if p_bedroom_count is null or p_bedroom_count not between 0 and 20 then
    raise exception using errcode = '22023', message = 'Bedroom count must be 0-20';
  end if;
  if p_bathroom_count is null or p_bathroom_count not between 0.5 and 20 then
    raise exception using errcode = '22023', message = 'Bathroom count must be 0.5-20';
  end if;
  if jsonb_typeof(coalesce(p_images, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_images, '[]'::jsonb)) > 5 then
    raise exception using errcode = '22023', message = 'Images must be an array of at most five URLs';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) x
    where jsonb_typeof(x) <> 'string'
      or btrim(x #>> '{}') !~ '^https://'
      or not (
        btrim(x #>> '{}') like (
          '%/room-images/' || p_property_id::text || '/' || p_unit_id::text || '/%'
        )
        or (
          v_inventory_type = 'house'
          and btrim(x #>> '{}') like (
            '%/property-images/' || p_property_id::text || '/%'
          )
        )
      )
  ) then
    raise exception using errcode = '22023', message = 'Invalid image path';
  end if;

  if v_inventory_type = 'house' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('whole-home:' || p_property_id::text, 0)
    );
    if exists (select 1 from public.rooms r where r.property_id = p_property_id) then
      raise exception using errcode = '23505', message = 'This property already has its whole-home inventory';
    end if;
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
    id, property_id, name, room_type, inventory_type,
    capacity, bed_count, bedroom_count, bathroom_count,
    price_per_night, description, amenities, images, is_active, updated_at
  ) values (
    p_unit_id, p_property_id, v_name, v_space_type, v_inventory_type,
    p_capacity, p_bed_count, p_bedroom_count, round(p_bathroom_count, 1),
    round(p_price_per_night, 2), nullif(btrim(coalesce(p_description, '')), ''),
    to_jsonb(v_amenities), v_images, coalesce(p_is_active, true), now()
  ) returning * into v_unit;

  insert into public.room_images(room_id, url, position, is_cover)
  select p_unit_id, e.value->>'url', (e.value->>'position')::integer,
    (e.value->>'is_cover')::boolean
  from jsonb_array_elements(v_images) e(value);

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'room', p_unit_id::text,
    'inventory_unit_created', to_jsonb(v_unit)
  );
  return jsonb_build_object(
    'success', true, 'room_id', p_unit_id,
    'inventory_type', v_inventory_type, 'message', 'Bookable space created'
  );
end;
$fn$;

create or replace function public.update_inventory_unit(
  p_property_id uuid,
  p_unit_id uuid,
  p_name text,
  p_space_type text,
  p_inventory_type text,
  p_is_active boolean,
  p_price_per_night numeric,
  p_capacity integer,
  p_bed_count integer,
  p_bedroom_count integer,
  p_bathroom_count numeric,
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
  v_name text := btrim(coalesce(p_name, ''));
  v_space_type text := lower(replace(btrim(coalesce(p_space_type, '')), '_', '-'));
  v_expected_inventory_type text;
  v_amenities text[];
  v_images jsonb;
  v_old public.rooms%rowtype;
  v_new public.rooms%rowtype;
begin
  perform app_private.require_property_permission(p_property_id, 'rooms', 'update');
  select r.* into v_old from public.rooms r
  where r.id = p_unit_id and r.property_id = p_property_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Bookable space not found';
  end if;
  select app_private.inventory_type_for_property_type(p.property_type)
  into v_expected_inventory_type from public.properties p where p.id = p_property_id;
  if lower(btrim(coalesce(p_inventory_type, ''))) <> v_expected_inventory_type
     or v_old.inventory_type <> v_expected_inventory_type then
    raise exception using errcode = '22023', message = 'Bookable space type does not match this property';
  end if;
  if length(v_name) < 2 or length(v_name) > 100
     or length(v_space_type) < 2 or length(v_space_type) > 50 then
    raise exception using errcode = '22023', message = 'Name or space type is invalid';
  end if;
  if p_price_per_night is null or p_price_per_night <= 0
     or p_price_per_night > 100000000 then
    raise exception using errcode = '22023', message = 'Nightly price is invalid';
  end if;
  if p_capacity is null or p_capacity not between 1 and 100
     or p_bed_count is null or p_bed_count < 1 or p_bed_count > p_capacity then
    raise exception using errcode = '22023', message = 'Guest capacity or bed count is invalid';
  end if;
  if p_bedroom_count is null or p_bedroom_count not between 0 and 20
     or p_bathroom_count is null or p_bathroom_count not between 0.5 and 20 then
    raise exception using errcode = '22023', message = 'Bedroom or bathroom count is invalid';
  end if;
  if not coalesce(p_is_active, false) and exists (
    select 1 from public.bookings b
    where b.room_id = p_unit_id
      and b.status in ('pending', 'reserved', 'confirmed', 'checked_in')
      and b.check_out >= app_private.property_business_date(p_property_id)
  ) then
    raise exception using errcode = '22023', message = 'A space with an active stay cannot be deactivated';
  end if;
  if jsonb_typeof(coalesce(p_images, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_images, '[]'::jsonb)) > 5 then
    raise exception using errcode = '22023', message = 'Images must be an array of at most five URLs';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) x
    where jsonb_typeof(x) <> 'string'
      or btrim(x #>> '{}') !~ '^https://'
      or not (
        btrim(x #>> '{}') like (
          '%/room-images/' || p_property_id::text || '/' || p_unit_id::text || '/%'
        )
        or (
          v_expected_inventory_type = 'house'
          and btrim(x #>> '{}') like (
            '%/property-images/' || p_property_id::text || '/%'
          )
        )
      )
  ) then
    raise exception using errcode = '22023', message = 'Invalid image path';
  end if;

  select coalesce(array_agg(a order by a), array[]::text[])
  into v_amenities from (
    select distinct btrim(x) as a
    from unnest(coalesce(p_amenities, array[]::text[])) x
    where nullif(btrim(x), '') is not null
  ) q;
  select coalesce(jsonb_agg(jsonb_build_object(
    'url', url, 'is_cover', ord = 1, 'position', ord
  ) order by ord), '[]'::jsonb)
  into v_images from (
    select btrim(value #>> '{}') as url, min(ordinality)::integer as ord
    from jsonb_array_elements(coalesce(p_images, '[]'::jsonb))
      with ordinality e(value, ordinality)
    group by btrim(value #>> '{}')
  ) q;

  update public.rooms
  set name = v_name, room_type = v_space_type,
      is_active = coalesce(p_is_active, is_active),
      price_per_night = round(p_price_per_night, 2),
      capacity = p_capacity, bed_count = p_bed_count,
      bedroom_count = p_bedroom_count,
      bathroom_count = round(p_bathroom_count, 1),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      amenities = to_jsonb(v_amenities), images = v_images, updated_at = now()
  where id = p_unit_id and property_id = p_property_id
  returning * into v_new;

  delete from public.room_images where room_id = p_unit_id;
  insert into public.room_images(room_id, url, position, is_cover)
  select p_unit_id, e.value->>'url', (e.value->>'position')::integer,
    (e.value->>'is_cover')::boolean
  from jsonb_array_elements(v_images) e(value);

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'room', p_unit_id::text,
    'inventory_unit_updated', to_jsonb(v_old), to_jsonb(v_new)
  );
  return jsonb_build_object(
    'success', true, 'room_id', p_unit_id,
    'inventory_type', v_expected_inventory_type,
    'message', 'Bookable space updated'
  );
end;
$fn$;

revoke all on function public.create_inventory_unit(
  uuid,uuid,text,text,text,boolean,numeric,integer,integer,integer,numeric,text,text[],jsonb
) from public, anon;
revoke all on function public.update_inventory_unit(
  uuid,uuid,text,text,text,boolean,numeric,integer,integer,integer,numeric,text,text[],jsonb
) from public, anon;
grant execute on function public.create_inventory_unit(
  uuid,uuid,text,text,text,boolean,numeric,integer,integer,integer,numeric,text,text[],jsonb
) to authenticated, service_role;
grant execute on function public.update_inventory_unit(
  uuid,uuid,text,text,text,boolean,numeric,integer,integer,integer,numeric,text,text[],jsonb
) to authenticated, service_role;

-- Keep older clients safe: legacy room mutations now pass through the same
-- property-model rules and preserve the new metadata during edits.
create or replace function public.create_room(
  p_property_id uuid, p_room_id uuid, p_room_name text, p_room_type text,
  p_is_active boolean, p_price_per_night numeric, p_capacity integer,
  p_bed_count integer, p_description text, p_amenities text[], p_images jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_inventory_type text;
  v_bedrooms integer := 1;
begin
  select app_private.inventory_type_for_property_type(p.property_type)
  into v_inventory_type from public.properties p where p.id = p_property_id;
  if lower(btrim(coalesce(p_room_type, ''))) = 'studio' then
    v_bedrooms := 0;
  elsif lower(btrim(coalesce(p_room_type, ''))) ~ '^[0-9]+[ -]?bed' then
    v_bedrooms := substring(lower(p_room_type) from '^([0-9]+)')::integer;
  end if;
  return public.create_inventory_unit(
    p_property_id, p_room_id, p_room_name, p_room_type, v_inventory_type,
    p_is_active, p_price_per_night, p_capacity, p_bed_count,
    v_bedrooms, 1, p_description, p_amenities, p_images
  );
end;
$fn$;

create or replace function public.update_room(
  p_property_id uuid, p_room_id uuid, p_room_name text, p_room_type text,
  p_is_active boolean, p_price_per_night numeric, p_capacity integer,
  p_bed_count integer, p_description text, p_amenities text[], p_images jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_existing public.rooms%rowtype;
begin
  select r.* into v_existing from public.rooms r
  where r.id = p_room_id and r.property_id = p_property_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Bookable space not found';
  end if;
  return public.update_inventory_unit(
    p_property_id, p_room_id, p_room_name, p_room_type,
    v_existing.inventory_type, p_is_active, p_price_per_night,
    p_capacity, p_bed_count, v_existing.bedroom_count,
    v_existing.bathroom_count, p_description, p_amenities, p_images
  );
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
    select r.* from public.rooms r
    where r.id = p_room_id and r.property_id = p_property_id
  ),
  current_stay as (
    select jsonb_build_object(
      'id', b.id, 'booking_number', b.booking_number,
      'guest_name', coalesce(nullif(btrim(concat_ws(' ', g.first_name, g.last_name)), ''), 'Guest'),
      'guest_phone', g.phone, 'status', b.status,
      'check_in', b.check_in, 'check_out', b.check_out,
      'adults', b.adults, 'children', b.children,
      'total_guests', coalesce(b.total_guests, b.adults + b.children)
    ) as item, b.check_out
    from public.bookings b
    left join public.guests g on g.id = b.guest_id
    where b.property_id = p_property_id and b.room_id = p_room_id
      and b.status = 'checked_in'
    order by b.checked_in_at desc nulls last, b.created_at desc, b.id desc
    limit 1
  ),
  next_stay as (
    select jsonb_build_object(
      'id', b.id, 'booking_number', b.booking_number,
      'guest_name', coalesce(nullif(btrim(concat_ws(' ', g.first_name, g.last_name)), ''), 'Guest'),
      'guest_phone', g.phone, 'status', b.status,
      'check_in', b.check_in, 'check_out', b.check_out,
      'adults', b.adults, 'children', b.children,
      'total_guests', coalesce(b.total_guests, b.adults + b.children)
    ) as item
    from public.bookings b
    left join public.guests g on g.id = b.guest_id
    where b.property_id = p_property_id and b.room_id = p_room_id
      and b.status in ('confirmed', 'reserved') and b.check_in >= p_business_date
    order by b.check_in, b.created_at, b.id limit 1
  )
  select jsonb_build_object(
    'id', r.id, 'property_id', r.property_id, 'name', r.name,
    'room_type', r.room_type, 'inventory_type', r.inventory_type,
    'capacity', r.capacity, 'bed_count', r.bed_count,
    'bedroom_count', r.bedroom_count, 'bathroom_count', r.bathroom_count,
    'price_per_night', r.price_per_night, 'description', r.description,
    'amenities', coalesce(r.amenities, '[]'::jsonb),
    'images', coalesce(r.images, '[]'::jsonb),
    'is_active', coalesce(r.is_active, false),
    'housekeeping_status', r.housekeeping_status,
    'housekeeping_notes', r.housekeeping_notes,
    'housekeeping_updated_at', r.housekeeping_updated_at,
    'notes', r.housekeeping_notes, 'updated_at', r.housekeeping_updated_at,
    'operational_status', case
      when not coalesce(r.is_active, false) then 'inactive'
      when cs.item is not null and cs.check_out = p_business_date then 'checking_out_today'
      when cs.item is not null then 'occupied'
      when lower(coalesce(r.operational_status, '')) in ('maintenance', 'out_of_order', 'out_of_service') then 'out_of_service'
      else coalesce(r.housekeeping_status, 'ready')
    end,
    'current_stay', cs.item, 'next_stay', ns.item
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
  v_property public.properties%rowtype;
  v_result jsonb;
begin
  perform app_private.require_property_permission(p_property_id, 'rooms', 'view');
  select p.* into v_property from public.properties p where p.id = p_property_id;
  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  with room_items as (
    select r.id, r.name,
      app_private.room_workspace_item(p_property_id, r.id, v_business_date) as item
    from public.rooms r where r.property_id = p_property_id
  ), summary as (
    select count(*)::integer as total_rooms,
      count(*) filter (where (item->>'is_active')::boolean)::integer as active_rooms,
      count(*) filter (where item->>'operational_status' = 'ready')::integer as ready_rooms,
      count(*) filter (where item->>'operational_status' = 'occupied')::integer as occupied_rooms,
      count(*) filter (where item->>'operational_status' = 'checking_out_today')::integer as checking_out_today_rooms,
      count(*) filter (where item->>'operational_status' = 'needs_cleaning')::integer as needs_cleaning_rooms,
      count(*) filter (where item->>'operational_status' = 'cleaning')::integer as cleaning_rooms,
      count(*) filter (where item->>'operational_status' = 'out_of_service')::integer as out_of_service_rooms,
      count(*) filter (where item->>'operational_status' = 'inactive')::integer as inactive_rooms
    from room_items
  )
  select jsonb_build_object(
    'success', true,
    'property', jsonb_build_object(
      'id', p_property_id, 'timezone', v_timezone, 'business_date', v_business_date,
      'property_type', v_property.property_type,
      'inventory_type', app_private.inventory_type_for_property_type(v_property.property_type),
      'expected_inventory_count', v_property.expected_inventory_count
    ),
    'capabilities', jsonb_build_object(
      'manage_rooms', app_private.has_property_permission(p_property_id, 'rooms', 'update'),
      'create_booking', app_private.has_property_permission(p_property_id, 'bookings', 'create')
    ),
    'summary', jsonb_build_object(
      'total_rooms', s.total_rooms, 'active_rooms', s.active_rooms,
      'ready_rooms', s.ready_rooms, 'occupied_rooms', s.occupied_rooms,
      'checking_out_today_rooms', s.checking_out_today_rooms,
      'needs_cleaning_rooms', s.needs_cleaning_rooms,
      'cleaning_rooms', s.cleaning_rooms,
      'out_of_service_rooms', s.out_of_service_rooms,
      'inactive_rooms', s.inactive_rooms
    ),
    'rooms', coalesce((select jsonb_agg(ri.item order by lower(ri.name), ri.id) from room_items ri), '[]'::jsonb)
  ) into v_result from summary s;
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
  v_property public.properties%rowtype;
  v_room jsonb;
begin
  perform app_private.require_property_permission(p_property_id, 'rooms', 'view');
  select p.* into v_property from public.properties p where p.id = p_property_id;
  v_timezone := app_private.property_timezone(p_property_id);
  v_business_date := app_private.property_business_date(p_property_id);
  v_room := app_private.room_workspace_item(p_property_id, p_room_id, v_business_date);
  if v_room is null then
    raise exception using errcode = 'P0002', message = 'Bookable space not found';
  end if;
  return jsonb_build_object(
    'success', true,
    'property', jsonb_build_object(
      'id', p_property_id, 'timezone', v_timezone, 'business_date', v_business_date,
      'property_type', v_property.property_type,
      'inventory_type', app_private.inventory_type_for_property_type(v_property.property_type),
      'expected_inventory_count', v_property.expected_inventory_count
    ),
    'capabilities', jsonb_build_object(
      'manage_rooms', app_private.has_property_permission(p_property_id, 'rooms', 'update'),
      'create_booking', app_private.has_property_permission(p_property_id, 'bookings', 'create')
    ),
    'room', v_room,
    'upcoming_stays', coalesce((
      select jsonb_agg(q.item order by q.check_in, q.created_at, q.id)
      from (
        select b.id, b.check_in, b.created_at,
          jsonb_build_object(
            'id', b.id, 'booking_number', b.booking_number,
            'guest_name', coalesce(nullif(btrim(concat_ws(' ', g.first_name, g.last_name)), ''), 'Guest'),
            'guest_phone', g.phone, 'status', b.status,
            'check_in', b.check_in, 'check_out', b.check_out,
            'adults', b.adults, 'children', b.children,
            'total_guests', coalesce(b.total_guests, b.adults + b.children)
          ) as item
        from public.bookings b
        left join public.guests g on g.id = b.guest_id
        where b.property_id = p_property_id and b.room_id = p_room_id
          and b.status in ('confirmed', 'reserved') and b.check_out >= v_business_date
        order by b.check_in, b.created_at, b.id limit 12
      ) q
    ), '[]'::jsonb)
  );
end;
$fn$;

create or replace function public.get_available_inventory(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer default 1
)
returns table(
  room_id uuid, room_name text, room_type text, inventory_type text,
  capacity integer, bed_count integer, bedroom_count integer,
  bathroom_count numeric, price_per_night numeric, total_price numeric,
  nights integer, operational_status text, amenities jsonb, images jsonb
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
  perform app_private.require_property_permission(p_property_id, 'rooms', 'view');
  perform app_private.require_property_permission(p_property_id, 'bookings', 'create');
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
  select r.id, r.name, r.room_type, r.inventory_type,
    r.capacity, r.bed_count, r.bedroom_count::integer, r.bathroom_count,
    r.price_per_night, round(r.price_per_night * v_nights, 2),
    v_nights, r.operational_status,
    coalesce(r.amenities, '[]'::jsonb), coalesce(r.images, '[]'::jsonb)
  from public.rooms r
  where r.property_id = p_property_id and coalesce(r.is_active, false)
    and coalesce(r.capacity, 0) >= p_guests
    and ((p_check_in = v_today and r.operational_status = 'available' and r.housekeeping_status = 'ready')
      or (p_check_in > v_today and coalesce(r.operational_status, '') not in ('maintenance', 'out_of_order')))
    and not exists (
      select 1 from public.bookings b
      where b.room_id = r.id and b.status not in ('cancelled', 'no_show', 'checked_out')
        and p_check_in < b.check_out and p_check_out > b.check_in
    )
  order by r.price_per_night, lower(r.name), r.id;
end;
$fn$;

revoke all on function public.get_available_inventory(uuid,date,date,integer)
  from public, anon;
grant execute on function public.get_available_inventory(uuid,date,date,integer)
  to authenticated, service_role;

-- Existing canonical function ACLs remain in force after CREATE OR REPLACE.
-- Explicitly retain authenticated access to the legacy wrappers as well.
revoke all on function public.create_room(
  uuid,uuid,text,text,boolean,numeric,integer,integer,text,text[],jsonb
) from public, anon;
revoke all on function public.update_room(
  uuid,uuid,text,text,boolean,numeric,integer,integer,text,text[],jsonb
) from public, anon;
grant execute on function public.create_room(
  uuid,uuid,text,text,boolean,numeric,integer,integer,text,text[],jsonb
) to authenticated, service_role;
grant execute on function public.update_room(
  uuid,uuid,text,text,boolean,numeric,integer,integer,text,text[],jsonb
) to authenticated, service_role;

comment on column public.rooms.inventory_type is
  'Semantic kind of bookable space; rooms remains the compatibility table name.';
comment on column public.rooms.bedroom_count is
  'Separate bedrooms; zero represents a studio.';
comment on column public.properties.expected_inventory_count is
  'Owner-declared number of separately bookable spaces used for setup guidance.';
