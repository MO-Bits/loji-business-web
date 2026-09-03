begin;
set local lock_timeout = '15s';

-- Gate the legacy photo writer on the property row before it changes image
-- metadata. The longer normalization migration can then lock properties first
-- without racing older clients that still call save_property_images().
create or replace function public.save_property_images(
  p_property_id uuid,
  p_images text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform public.update_property_gallery(p_property_id, p_images);
end;
$fn$;

revoke all on function public.save_property_images(uuid, text[])
  from public, anon, authenticated, service_role;
grant execute on function public.save_property_images(uuid, text[])
  to authenticated, service_role;

-- These partial-onboarding writers have no callers in the current app and can
-- race the single canonical registration transaction. Retire them before the
-- ownership migration starts accepting additional properties.
revoke all on function public.create_property_basic_info(
  text, text, text, text, jsonb, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.save_property_onboarding_profile(
  text, text, text, text, jsonb, integer, integer, numeric, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.complete_property_onboarding_location(
  uuid, text, text, text, text, text, text, text,
  double precision, double precision
) from public, anon, authenticated, service_role;

-- Retire the pre-email-access invitation-code surface for every API role. The
-- current staff flow claims access by authenticated email instead.
revoke all on function public.accept_property_invitation(text)
  from public, anon, authenticated, service_role;
revoke all on function public.get_invitation_details(text)
  from public, anon, authenticated, service_role;
revoke all on function public.reject_property_invitation(text)
  from public, anon, authenticated, service_role;
revoke all on function app_private.new_invitation_code()
  from public, anon, authenticated, service_role;

do $acl$
begin
  if to_regprocedure('public.invite_staff(uuid,text,text,text,text,text)') is not null then
    execute 'revoke all on function public.invite_staff(uuid, text, text, text, text, text) from public, anon, authenticated, service_role';
  end if;
end;
$acl$;

-- Keep the fast ACCESS EXCLUSIVE schema change separate from the longer data
-- normalization migration that follows it.
alter table public.properties
  add column if not exists onboarding_request_fingerprint text;

update public.properties
set updated_at = coalesce(created_at, now())
where updated_at is null;
alter table public.properties
  alter column updated_at set default now(),
  alter column updated_at set not null;

comment on column public.properties.onboarding_request_fingerprint is
  'Rejects registration request-key replays whose setup payload has changed.';

commit;
