-- Loji Business onboarding is intentionally limited to hotels, lodges and
-- guesthouses. Existing records for previously supported property types are
-- retained for backwards compatibility. New properties and future type
-- changes are restricted to the three supported hospitality categories.

create or replace function app_private.enforce_hospitality_property_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if lower(btrim(coalesce(new.property_type, ''))) not in (
    'hotel', 'lodge', 'guesthouse'
  ) then
    if tg_op = 'INSERT' then
      raise exception using
        errcode = '23514',
        message = 'Loji Business supports only hotels, lodges and guesthouses';
    end if;
    if tg_op = 'UPDATE'
       and old.property_type is distinct from new.property_type then
      raise exception using
        errcode = '23514',
        message = 'Loji Business supports only hotels, lodges and guesthouses';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function app_private.enforce_hospitality_property_type()
from public, anon, authenticated;

drop trigger if exists properties_hospitality_type_boundary
on public.properties;
drop trigger if exists loji_00_hospitality_type_boundary
on public.properties;
create trigger loji_00_hospitality_type_boundary
before insert or update of property_type on public.properties
for each row execute function app_private.enforce_hospitality_property_type();

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
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owner_email text;
  v_property_id uuid;
  v_property_type text := lower(btrim(coalesce(p_business->>'type', '')));
  v_name text := btrim(coalesce(p_business->>'name', ''));
  v_phone text := btrim(coalesce(p_business->>'phone', ''));
  v_email text := lower(nullif(btrim(coalesce(p_business->>'email', '')), ''));
  v_region text := nullif(btrim(coalesce(p_business->>'region', '')), '');
  v_district text := nullif(btrim(coalesce(p_business->>'district', '')), '');
  v_ward text := nullif(btrim(coalesce(p_business->>'ward', '')), '');
  v_street text := nullif(btrim(coalesce(p_business->>'street', '')), '');
  v_formatted_address text;
  v_room_count integer;
  v_staff_count integer;
  v_existing_state public.onboarding_state%rowtype;
  v_room jsonb;
  v_staff_member jsonb;
  v_room_name text;
  v_room_type text;
  v_room_capacity integer;
  v_room_bed_count integer;
  v_room_price numeric;
  v_staff_email text;
  v_staff_role text;
  v_staff_user_id uuid;
  v_pending_staff integer := 0;
  v_active_staff integer := 0;
  v_replayed boolean := false;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_request_key is null then
    raise exception using errcode = '22023', message = 'Registration request key is required';
  end if;
  if jsonb_typeof(coalesce(p_business, 'null'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_rooms, 'null'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_staff, 'null'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Registration data is invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('loji-registration:' || v_user_id::text, 0)
  );

  select lower(u.email)
  into v_owner_email
  from auth.users as u
  where u.id = v_user_id;

  if v_owner_email is null then
    raise exception using errcode = '22023', message = 'Account email is required';
  end if;
  if v_property_type not in ('hotel', 'lodge', 'guesthouse') then
    raise exception using errcode = '22023', message = 'Choose Hotel, Lodge or Guesthouse';
  end if;
  if length(v_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Business name must be between 2 and 120 characters';
  end if;
  if length(pg_catalog.regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 7 and 15
     or length(v_phone) > 32 then
    raise exception using errcode = '22023', message = 'Enter a valid business phone number';
  end if;
  if v_email is not null and (
    length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then
    raise exception using errcode = '22023', message = 'Enter a valid business email address';
  end if;
  if v_region is null
     or lower(v_region) not in (
       'arusha', 'dar es salaam', 'dodoma', 'geita', 'iringa', 'kagera',
       'katavi', 'kigoma', 'kilimanjaro', 'kaskazini pemba',
       'kaskazini unguja', 'kusini pemba', 'kusini unguja', 'lindi',
       'manyara', 'mara', 'mbeya', 'mjini magharibi', 'morogoro', 'mtwara',
       'mwanza', 'njombe', 'pwani', 'rukwa', 'ruvuma', 'shinyanga',
       'simiyu', 'singida', 'songwe', 'tabora', 'tanga'
     ) then
    raise exception using errcode = '22023', message = 'Choose the Tanzania region where the business is located';
  end if;
  if v_district is null or length(v_district) > 120 then
    raise exception using errcode = '22023', message = 'Enter the business district';
  end if;
  if length(coalesce(v_ward, '')) > 120 or length(coalesce(v_street, '')) > 200 then
    raise exception using errcode = '22023', message = 'Business location is too long';
  end if;
  if v_ward is null and v_street is null then
    raise exception using errcode = '22023', message = 'Add a ward, street or nearby landmark';
  end if;

  v_formatted_address := pg_catalog.concat_ws(
    ', ', v_street, v_ward, v_district, v_region, 'Tanzania'
  );
  v_room_count := jsonb_array_length(p_rooms);
  v_staff_count := jsonb_array_length(p_staff);

  if v_room_count not between 1 and 300 then
    raise exception using errcode = '22023', message = 'Number of rooms must be between 1 and 300';
  end if;
  if v_staff_count > 50 then
    raise exception using errcode = '22023', message = 'You can add up to 50 staff accounts during registration';
  end if;

  if (
    select count(*) <> count(distinct lower(btrim(item->>'name')))
    from jsonb_array_elements(p_rooms) as room(item)
  ) then
    raise exception using errcode = '22023', message = 'Every room must have a unique name';
  end if;

  if (
    select count(*) <> count(distinct lower(btrim(item->>'email')))
    from jsonb_array_elements(p_staff) as staff(item)
  ) then
    raise exception using errcode = '22023', message = 'Each staff email can only be added once';
  end if;

  for v_room in select item from jsonb_array_elements(p_rooms) as room(item)
  loop
    v_room_name := btrim(coalesce(v_room->>'name', ''));
    v_room_type := lower(btrim(coalesce(v_room->>'room_type', '')));
    begin
      v_room_capacity := (v_room->>'capacity')::integer;
      v_room_bed_count := (v_room->>'bed_count')::integer;
      v_room_price := (v_room->>'price_per_night')::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'Check room capacity, beds and nightly price';
    end;

    if length(v_room_name) not between 1 and 80 then
      raise exception using errcode = '22023', message = 'Each room needs a name of up to 80 characters';
    end if;
    if v_room_type not in ('standard', 'single', 'double', 'twin', 'triple', 'family', 'suite', 'deluxe') then
      raise exception using errcode = '22023', message = 'Choose a supported room type';
    end if;
    if v_room_capacity not between 1 and 20 then
      raise exception using errcode = '22023', message = 'Room guest capacity must be between 1 and 20';
    end if;
    if v_room_bed_count not between 1 and v_room_capacity then
      raise exception using errcode = '22023', message = 'Room beds must be between 1 and the guest capacity';
    end if;
    if v_room_price <= 0 or v_room_price > 100000000 then
      raise exception using errcode = '22023', message = 'Room price must be between TZS 1 and TZS 100,000,000';
    end if;
  end loop;

  for v_staff_member in select item from jsonb_array_elements(p_staff) as staff(item)
  loop
    v_staff_email := lower(btrim(coalesce(v_staff_member->>'email', '')));
    v_staff_role := lower(btrim(coalesce(v_staff_member->>'role', '')));
    if length(v_staff_email) > 254
       or v_staff_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception using errcode = '22023', message = 'Enter a valid email for every staff member';
    end if;
    if v_staff_email = v_owner_email then
      raise exception using errcode = '22023', message = 'The owner email cannot also be added as staff';
    end if;
    if v_staff_role not in ('manager', 'receptionist') then
      raise exception using errcode = '22023', message = 'Staff role must be Manager or Receptionist';
    end if;
  end loop;

  select p.id
  into v_property_id
  from public.properties as p
  where p.owner_id = v_user_id
    and p.onboarding_request_key = p_request_key
  limit 1
  for update;

  if found then
    v_replayed := true;
    return jsonb_build_object(
      'success', true,
      'replayed', true,
      'property_id', v_property_id,
      'room_count', (
        select count(*) from public.rooms as r where r.property_id = v_property_id
      ),
      'active_staff_count', (
        select count(*) from public.property_users as pu
        where pu.property_id = v_property_id and lower(btrim(pu.role)) <> 'owner'
      ),
      'pending_staff_count', (
        select count(*) from public.property_invitations as i
        where i.property_id = v_property_id and lower(coalesce(i.status, '')) = 'pending'
      )
    );
  end if;

  select os.*
  into v_existing_state
  from public.onboarding_state as os
  where os.user_id = v_user_id
  for update;

  if coalesce(v_existing_state.has_property_physical_address, false)
     or lower(coalesce(v_existing_state.current_step, '')) = 'done' then
    raise exception using errcode = '55000', message = 'This account has already completed business registration';
  end if;

  select p.id
  into v_property_id
  from public.properties as p
  join public.property_users as pu
    on pu.property_id = p.id
   and pu.user_id = v_user_id
   and lower(btrim(pu.role)) = 'owner'
  where p.owner_id = v_user_id
    and nullif(btrim(coalesce(p.formatted_address, '')), '') is null
    and not exists (
      select 1 from public.bookings as b where b.property_id = p.id
    )
  order by p.created_at desc nulls last, p.id desc
  limit 1
  for update of p;

  if v_property_id is null then
    v_property_id := gen_random_uuid();
    insert into public.properties(
      id, owner_id, name, property_type, phone, email,
      country, region, district, ward, street, formatted_address,
      timezone, status, amenities, images, onboarding_request_key,
      expected_inventory_count, default_bedroom_count,
      default_bathroom_count, created_at, updated_at
    ) values (
      v_property_id, v_user_id, v_name, v_property_type, v_phone, v_email,
      'Tanzania', v_region, v_district, v_ward, v_street,
      v_formatted_address, 'Africa/Dar_es_Salaam', true, '[]'::jsonb,
      '[]'::jsonb, p_request_key, v_room_count, null, null, now(), now()
    );
  else
    update public.properties
    set name = v_name,
        property_type = v_property_type,
        phone = v_phone,
        email = v_email,
        country = 'Tanzania',
        region = v_region,
        district = v_district,
        ward = v_ward,
        street = v_street,
        formatted_address = v_formatted_address,
        place_id = null,
        latitude = null,
        longitude = null,
        timezone = 'Africa/Dar_es_Salaam',
        status = true,
        onboarding_request_key = p_request_key,
        expected_inventory_count = v_room_count,
        default_bedroom_count = null,
        default_bathroom_count = null,
        updated_at = now()
    where id = v_property_id;

    delete from public.rooms as r
    where r.property_id = v_property_id
      and not exists (
        select 1 from public.bookings as b where b.room_id = r.id
      );
  end if;

  insert into public.property_users(property_id, user_id, role, status, created_at)
  values (v_property_id, v_user_id, 'owner', 'active', now())
  on conflict (property_id, user_id)
  do update set role = 'owner', status = 'active';

  for v_room in select item from jsonb_array_elements(p_rooms) as room(item)
  loop
    insert into public.rooms(
      id, property_id, name, room_type, capacity, bed_count,
      price_per_night, is_active, description, amenities,
      operational_status, images, housekeeping_status,
      inventory_type, bedroom_count, bathroom_count, created_at, updated_at
    ) values (
      gen_random_uuid(),
      v_property_id,
      btrim(v_room->>'name'),
      lower(btrim(v_room->>'room_type')),
      (v_room->>'capacity')::integer,
      (v_room->>'bed_count')::integer,
      (v_room->>'price_per_night')::numeric,
      true,
      null,
      '[]'::jsonb,
      'available',
      '[]'::jsonb,
      'ready',
      'room',
      1,
      1,
      now(),
      now()
    );
  end loop;

  for v_staff_member in select item from jsonb_array_elements(p_staff) as staff(item)
  loop
    v_staff_email := lower(btrim(v_staff_member->>'email'));
    v_staff_role := lower(btrim(v_staff_member->>'role'));
    v_staff_user_id := null;

    select u.id
    into v_staff_user_id
    from auth.users as u
    where lower(u.email) = v_staff_email
      and u.email_confirmed_at is not null
    order by u.created_at
    limit 1;

    if v_staff_user_id is not null then
      insert into public.property_users as existing(
        property_id, user_id, role, status, created_at
      )
      values (v_property_id, v_staff_user_id, v_staff_role, 'active', now())
      on conflict (property_id, user_id)
      do update set
        role = case
          when lower(btrim(existing.role)) = 'owner'
            then existing.role
          else excluded.role
        end,
        status = 'active';
      v_active_staff := v_active_staff + 1;
    else
      insert into public.property_invitations(
        property_id, email, role, token, status, created_at,
        expires_at, created_by
      ) values (
        v_property_id, v_staff_email, v_staff_role, null, 'pending',
        now(), null, v_user_id
      );
      v_pending_staff := v_pending_staff + 1;
    end if;
  end loop;

  insert into public.onboarding_state(
    user_id, has_property, has_property_physical_address,
    current_step, created_at, updated_at
  ) values (
    v_user_id, true, true, 'done', now(), now()
  )
  on conflict (user_id)
  do update set
    has_property = true,
    has_property_physical_address = true,
    current_step = 'done',
    updated_at = now();

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id,
    event_type, new_data, created_at
  ) values (
    v_property_id,
    v_user_id,
    'property',
    v_property_id::text,
    'hospitality_registration_completed',
    jsonb_build_object(
      'property_type', v_property_type,
      'room_count', v_room_count,
      'active_staff_count', v_active_staff,
      'pending_staff_count', v_pending_staff,
      'uses_images', false,
      'uses_google_maps', false
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'replayed', v_replayed,
    'property_id', v_property_id,
    'room_count', v_room_count,
    'active_staff_count', v_active_staff,
    'pending_staff_count', v_pending_staff
  );
end;
$$;

create or replace function public.claim_email_property_access()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_email_confirmed_at timestamptz;
  v_invitation public.property_invitations%rowtype;
  v_claimed integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select lower(u.email), u.email_confirmed_at
  into v_email, v_email_confirmed_at
  from auth.users as u
  where u.id = v_user_id;

  if v_email is null or v_email_confirmed_at is null then
    return jsonb_build_object('success', true, 'claimed', 0);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('loji-email-access:' || v_email, 0)
  );

  for v_invitation in
    select i.*
    from public.property_invitations as i
    where lower(btrim(i.email)) = v_email
      and lower(coalesce(i.status, '')) = 'pending'
      and lower(btrim(i.role)) in ('manager', 'receptionist')
      and (i.expires_at is null or i.expires_at > now())
    order by i.created_at, i.id
    for update
  loop
    insert into public.property_users as existing(
      property_id, user_id, role, status, created_at
    )
    values (
      v_invitation.property_id,
      v_user_id,
      lower(btrim(v_invitation.role)),
      'active',
      now()
    )
    on conflict (property_id, user_id)
    do update set
      role = case
        when lower(btrim(existing.role)) = 'owner'
          then existing.role
        else excluded.role
      end,
      status = 'active';

    update public.property_invitations
    set status = 'accepted',
        accepted_at = now(),
        accepted_by = v_user_id
    where id = v_invitation.id;

    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    ) values (
      v_invitation.property_id,
      v_user_id,
      'property_invitation',
      v_invitation.id::text,
      'email_access_claimed',
      jsonb_build_object(
        'email', v_email,
        'role', lower(btrim(v_invitation.role))
      ),
      now()
    );
    v_claimed := v_claimed + 1;
  end loop;

  return jsonb_build_object('success', true, 'claimed', v_claimed);
end;
$$;

-- New staff access is email-based. The existing RPC name is retained so the
-- Team & Access screen and older clients continue to work without codes.
create or replace function public.invite_staff(
  p_property_id uuid,
  p_email text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_caller_role text;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_role text := lower(btrim(coalesce(p_role, '')));
  v_existing_user_id uuid;
  v_invitation public.property_invitations%rowtype;
begin
  v_caller_role := app_private.require_property_permission(
    p_property_id, 'staff', 'invite'
  );
  if length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
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
    select 1
    from public.property_users as pu
    join auth.users as u on u.id = pu.user_id
    where pu.property_id = p_property_id and lower(u.email) = v_email
  ) then
    raise exception using errcode = '22023', message = 'This person already has property access';
  end if;

  select u.id
  into v_existing_user_id
  from auth.users as u
  where lower(u.email) = v_email and u.email_confirmed_at is not null
  order by u.created_at
  limit 1;

  if v_existing_user_id is not null then
    insert into public.property_users(property_id, user_id, role, status, created_at)
    values (p_property_id, v_existing_user_id, v_role, 'active', now())
    on conflict (property_id, user_id)
    do update set role = excluded.role, status = 'active';

    return jsonb_build_object(
      'success', true,
      'status', 'active',
      'access_mode', 'email',
      'user_id', v_existing_user_id
    );
  end if;

  select i.*
  into v_invitation
  from public.property_invitations as i
  where i.property_id = p_property_id
    and lower(i.email) = v_email
    and lower(coalesce(i.status, '')) = 'pending'
  order by i.created_at desc
  limit 1
  for update;

  if found then
    update public.property_invitations
    set role = v_role,
        token = null,
        expires_at = null,
        created_at = now(),
        created_by = v_user_id
    where id = v_invitation.id
    returning * into v_invitation;
  else
    insert into public.property_invitations(
      property_id, email, role, token, status,
      created_at, expires_at, created_by
    ) values (
      p_property_id, v_email, v_role, null, 'pending',
      now(), null, v_user_id
    )
    returning * into v_invitation;
  end if;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id,
    event_type, new_data, created_at
  ) values (
    p_property_id,
    v_user_id,
    'property_invitation',
    v_invitation.id::text,
    'staff_email_access_created',
    jsonb_build_object('email', v_email, 'role', v_role),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'status', 'pending',
    'access_mode', 'email',
    'invitation_id', v_invitation.id
  );
end;
$$;

revoke all on function public.complete_hospitality_registration(uuid, jsonb, jsonb, jsonb)
from public, anon, authenticated;
revoke all on function public.claim_email_property_access()
from public, anon, authenticated;
revoke all on function public.invite_staff(uuid, text, text)
from public, anon, authenticated;

grant execute on function public.complete_hospitality_registration(uuid, jsonb, jsonb, jsonb)
to authenticated;
grant execute on function public.claim_email_property_access()
to authenticated;
grant execute on function public.invite_staff(uuid, text, text)
to authenticated;
