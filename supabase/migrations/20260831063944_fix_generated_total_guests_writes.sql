-- bookings.total_guests is GENERATED ALWAYS from adults + children.
-- Repair previously applied RPC definitions while remaining safe after a clean
-- install whose canonical migration already contains the corrected definitions.
begin;

do $migration$
declare
  v_create_definition text;
  v_update_definition text;
  v_create_columns text :=
    'check_in, check_out, adults, children, total_guests, total_price,';
  v_create_values text :=
    'coalesce(p_adults, 1) + coalesce(p_children, 0), v_total,';
  v_update_assignment text :=
    'total_guests = p_adults + p_children,';
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'total_guests'
      and is_generated = 'ALWAYS'
  ) then
    raise exception 'public.bookings.total_guests must remain a generated column';
  end if;

  select pg_get_functiondef(
    'public.create_property_booking(uuid,uuid,uuid,jsonb,uuid,date,date,integer,integer,text,text,numeric,text,text)'::regprocedure
  )
  into v_create_definition;

  if v_create_definition is null then
    raise exception 'create_property_booking is missing';
  end if;

  if (position(v_create_columns in v_create_definition) > 0)
     <> (position(v_create_values in v_create_definition) > 0) then
    raise exception 'create_property_booking has a partially matched generated-column write';
  end if;

  if position(v_create_columns in v_create_definition) > 0 then
    v_create_definition := replace(
      v_create_definition,
      v_create_columns,
      'check_in, check_out, adults, children, total_price,'
    );
    v_create_definition := replace(
      v_create_definition,
      v_create_values,
      'v_total,'
    );
    execute v_create_definition;
  end if;

  select pg_get_functiondef(
    'public.create_property_booking(uuid,uuid,uuid,jsonb,uuid,date,date,integer,integer,text,text,numeric,text,text)'::regprocedure
  )
  into v_create_definition;

  if position(v_create_columns in v_create_definition) > 0
     or position(v_create_values in v_create_definition) > 0 then
    raise exception 'create_property_booking still writes total_guests';
  end if;

  select pg_get_functiondef(
    'public.update_property_booking(uuid,uuid,uuid,date,date,integer,integer,text,text)'::regprocedure
  )
  into v_update_definition;

  if v_update_definition is null then
    raise exception 'update_property_booking is missing';
  end if;

  if position(v_update_assignment in v_update_definition) > 0 then
    v_update_definition := replace(
      v_update_definition,
      v_update_assignment,
      ''
    );
    execute v_update_definition;
  end if;

  select pg_get_functiondef(
    'public.update_property_booking(uuid,uuid,uuid,date,date,integer,integer,text,text)'::regprocedure
  )
  into v_update_definition;

  if position(v_update_assignment in v_update_definition) > 0 then
    raise exception 'update_property_booking still writes total_guests';
  end if;
end
$migration$;

revoke all on function public.create_property_booking(
  uuid, uuid, uuid, jsonb, uuid, date, date, integer, integer,
  text, text, numeric, text, text
) from public, anon;
grant execute on function public.create_property_booking(
  uuid, uuid, uuid, jsonb, uuid, date, date, integer, integer,
  text, text, numeric, text, text
) to authenticated;

revoke all on function public.update_property_booking(
  uuid, uuid, uuid, date, date, integer, integer, text, text
) from public, anon;
grant execute on function public.update_property_booking(
  uuid, uuid, uuid, date, date, integer, integer, text, text
) to authenticated;

commit;
