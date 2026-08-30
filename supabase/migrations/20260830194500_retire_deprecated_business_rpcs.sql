-- Contract phase. Apply only after the canonical frontend is promoted and its
-- shell no longer performs direct business-table reads.

begin;

do $relation_acl$
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
        'revoke all on table %s from public, anon, authenticated',
        v_relation
      );
    end if;
  end loop;
end;
$relation_acl$;

do $function_acl$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.create_walkin_booking(uuid,uuid,text,text,text,text,date,date,numeric,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text)',
    'public.create_room_with_images(uuid,text,text,integer,numeric,integer,text[],text[])',
    'public.create_room_with_images(uuid,text,text,integer,numeric,integer,text,text[],text[])',
    'public.create_room_with_images(uuid,uuid,text,text,integer,numeric,integer,text[],text[])',
    'public.update_room(uuid,uuid,text,text,boolean,numeric,integer,integer,text[],text[])',
    'public.update_room_basic_info(uuid,uuid,text,text,boolean)',
    'public.update_room_basic_info(uuid,text,text,boolean)',
    'public.update_room_capacity(uuid,uuid,integer,integer)',
    'public.update_room_pricing(uuid,uuid,numeric)',
    'public.update_room_amenities(uuid,uuid,text[])',
    'public.update_room_images(uuid,uuid,text[])',
    'public.create_property_basic(text,text,text,text)',
    'public.create_property_basic(text,text,text,text,jsonb)',
    'public.create_property_basic(text,text,text,text,text,jsonb)',
    'public.create_property_basic(uuid,text,text,text)',
    'public.create_property_basic(uuid,text,text,text,text)',
    'public.claim_property_invitations()',
    'public.rollback_property_setup(uuid)',
    'public.update_property_address(uuid,text,text,text,text,text)',
    'public.update_property_address(uuid,text,text,text,text,text,text,double precision,double precision)',
    'public.update_property_address(uuid,text,text,text,text,text,text,text,double precision,double precision)',
    'public.get_home_dashboard(uuid)',
    'public.get_property_details(uuid)',
    'public.get_property_operations_report(uuid,date,date)',
    'public.get_user_permissions(uuid)',
    'public.get_my_permissions(uuid)',
    'public.get_permissions_batch(uuid,text)',
    'public.has_permission(uuid,text,text)',
    'public.get_unread_notification_count()'
  ] loop
    if pg_catalog.to_regprocedure(v_signature) is not null then
      execute pg_catalog.format(
        'revoke all on function %s from public, anon, authenticated',
        v_signature
      );
    end if;
  end loop;
end;
$function_acl$;

commit;
