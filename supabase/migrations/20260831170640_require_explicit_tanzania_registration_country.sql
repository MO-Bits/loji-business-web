CREATE OR REPLACE FUNCTION public.complete_property_onboarding_location(
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
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_role text;
  v_country_input text := nullif(btrim(coalesce(p_country, '')), '');
  v_country text;
  v_region text := nullif(btrim(coalesce(p_region, '')), '');
  v_district text := nullif(btrim(coalesce(p_district, '')), '');
  v_ward text := nullif(btrim(coalesce(p_ward, '')), '');
  v_street text := nullif(btrim(coalesce(p_street, '')), '');
  v_formatted_address text := nullif(
    btrim(coalesce(p_formatted_address, '')),
    ''
  );
  v_has_coordinates boolean :=
    p_latitude IS NOT NULL AND p_longitude IS NOT NULL;
  v_old public.properties%rowtype;
  v_new public.properties%rowtype;
BEGIN
  v_role := app_private.require_property_permission(
    p_property_id, 'property', 'update'
  );
  IF v_role <> 'owner' THEN
    RAISE EXCEPTION USING
      errcode = '42501',
      message = 'Owner access required';
  END IF;

  IF v_formatted_address IS NULL THEN
    RAISE EXCEPTION USING
      errcode = '22023',
      message = 'Property address is required';
  END IF;

  IF (p_latitude IS NULL) <> (p_longitude IS NULL) THEN
    RAISE EXCEPTION USING
      errcode = '22023',
      message = 'Select a complete property location on the map';
  END IF;

  IF v_has_coordinates AND (
    p_latitude NOT BETWEEN -11.75 AND -0.75
    OR p_longitude NOT BETWEEN 28.75 AND 40.75
  ) THEN
    RAISE EXCEPTION USING
      errcode = '22023',
      message = 'Property location must be within Tanzania';
  END IF;

  IF v_country_input IS NULL THEN
    RAISE EXCEPTION USING
      errcode = '22023',
      message = 'Confirm that the property country is Tanzania';
  ELSIF lower(v_country_input) IN (
    'tz',
    'tanzania',
    'united republic of tanzania',
    'tanzania, united republic of'
  ) THEN
    v_country := 'Tanzania';
  ELSE
    RAISE EXCEPTION USING
      errcode = '22023',
      message = 'Loji Business registration currently supports Tanzania locations only';
  END IF;

  IF NOT v_has_coordinates AND (v_country IS NULL OR v_region IS NULL) THEN
    RAISE EXCEPTION USING
      errcode = '22023',
      message = 'Add a Tanzania region when map coordinates are unavailable';
  END IF;

  IF length(coalesce(v_country, '')) > 100
     OR length(coalesce(v_region, '')) > 120
     OR length(coalesce(v_district, '')) > 120
     OR length(coalesce(v_ward, '')) > 120
     OR length(coalesce(v_street, '')) > 200
     OR length(v_formatted_address) > 500
     OR length(btrim(coalesce(p_place_id, ''))) > 255 THEN
    RAISE EXCEPTION USING
      errcode = '22023',
      message = 'Property address exceeds allowed lengths';
  END IF;

  SELECT p.*
  INTO v_old
  FROM public.properties AS p
  WHERE p.id = p_property_id
    AND p.owner_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      errcode = 'P0002',
      message = 'Owned property not found';
  END IF;

  UPDATE public.properties
  SET country = v_country,
      region = v_region,
      district = v_district,
      ward = v_ward,
      street = v_street,
      formatted_address = v_formatted_address,
      place_id = nullif(btrim(coalesce(p_place_id, '')), ''),
      latitude = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  WHERE id = p_property_id
  RETURNING *
  INTO v_new;

  INSERT INTO public.onboarding_state(
    user_id,
    has_property,
    has_property_physical_address,
    current_step,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    true,
    true,
    'done',
    now(),
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE
  SET has_property = true,
      has_property_physical_address = true,
      current_step = 'done',
      updated_at = now();

  INSERT INTO public.audit_log(
    property_id,
    actor_id,
    entity_type,
    entity_id,
    event_type,
    old_data,
    new_data
  )
  VALUES (
    p_property_id,
    v_user_id,
    'property',
    p_property_id::text,
    'property_onboarding_location_completed',
    to_jsonb(v_old),
    to_jsonb(v_new)
  );

  RETURN jsonb_build_object(
    'success', true,
    'property_id', p_property_id,
    'formatted_address', v_formatted_address,
    'message', 'Property location saved'
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.complete_property_onboarding_location(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision
) FROM public, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.complete_property_onboarding_location(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision
) TO authenticated;
