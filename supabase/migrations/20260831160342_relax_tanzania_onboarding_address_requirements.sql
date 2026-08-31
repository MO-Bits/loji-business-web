CREATE OR REPLACE FUNCTION public.complete_property_onboarding_location(p_property_id uuid, p_country text, p_region text, p_district text, p_ward text, p_street text, p_formatted_address text, p_place_id text, p_latitude double precision, p_longitude double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = ''
AS $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_country text := coalesce(
    nullif(btrim(coalesce(p_country, '')), ''),
    'Tanzania'
  );
  v_region text := nullif(btrim(coalesce(p_region, '')), '');
  v_district text := nullif(btrim(coalesce(p_district, '')), '');
  v_ward text := nullif(btrim(coalesce(p_ward, '')), '');
  v_street text := nullif(btrim(coalesce(p_street, '')), '');
  v_formatted_address text := nullif(
    btrim(coalesce(p_formatted_address, '')),
    ''
  );
  v_has_coordinates boolean :=
    p_latitude is not null and p_longitude is not null;
  v_old public.properties%rowtype;
  v_new public.properties%rowtype;
begin
  v_role := app_private.require_property_permission(
    p_property_id, 'property', 'update'
  );
  if v_role <> 'owner' then
    raise exception using errcode = '42501', message = 'Owner access required';
  end if;

  if v_formatted_address is null then
    raise exception using errcode = '22023', message = 'Property address is required';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception using errcode = '22023', message = 'Select a complete property location on the map';
  end if;

  if v_has_coordinates and (
    p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
  ) then
    raise exception using errcode = '22023', message = 'Select a valid property location on the map';
  end if;

  if not v_has_coordinates and (v_country is null or v_region is null) then
    raise exception using
      errcode = '22023',
      message = 'Add the country and region when map coordinates are unavailable';
  end if;

  if length(v_country) > 100 or length(coalesce(v_region, '')) > 120
     or length(coalesce(v_district, '')) > 120
     or length(coalesce(v_ward, '')) > 120
     or length(coalesce(v_street, '')) > 200
     or length(v_formatted_address) > 500
     or length(btrim(coalesce(p_place_id, ''))) > 255 then
    raise exception using errcode = '22023', message = 'Property address exceeds allowed lengths';
  end if;

  select p.* into v_old
  from public.properties p
  where p.id = p_property_id and p.owner_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Owned property not found';
  end if;

  update public.properties
  set country = v_country,
      region = v_region,
      district = v_district,
      ward = v_ward,
      street = v_street,
      formatted_address = v_formatted_address,
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
    'formatted_address', v_formatted_address,
    'message', 'Property location saved'
  );
end;
$fn$


revoke all on function public.complete_property_onboarding_location(
  uuid, text, text, text, text, text, text, text,
  double precision, double precision
) from public, anon, authenticated, service_role;
grant execute on function public.complete_property_onboarding_location(
  uuid, text, text, text, text, text, text, text,
  double precision, double precision
) to authenticated;
