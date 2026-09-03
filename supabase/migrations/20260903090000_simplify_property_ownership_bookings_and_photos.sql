-- Loji Business ownership, daily booking and property-photo simplification.
--
-- Product rules:
--   * an active staff account belongs to exactly one property;
--   * an active owner may own more than one property;
--   * a pending staff email may target only one property;
--   * a same-business-day front-desk booking checks in immediately;
--   * a property may keep zero to ten ordered photos.

begin;

-- If a live transaction is using an older write path, fail this whole
-- migration cleanly so the deploy runner can retry it. No partial migration
-- state is committed on a lock timeout.
set local lock_timeout = '15s';

-- Keep cleanup, normalization and constraint creation deterministic while the
-- production app remains online. Plain reads continue; conflicting writes are
-- drained before data is normalized.
lock table public.properties in exclusive mode;
lock table public.property_invitations in exclusive mode;
lock table public.property_users in exclusive mode;
lock table public.property_images in share row exclusive mode;

-- ---------------------------------------------------------------------------
-- 1. Resolve the one historical duplicate staff assignment without deleting
--    audit history. The assignment with the most real operational activity is
--    retained; ties prefer the oldest membership.
-- ---------------------------------------------------------------------------

with ranked_staff as (
  select
    pu.id,
    pu.property_id,
    pu.user_id,
    row_number() over (
      partition by pu.user_id
      order by
        (
          (select count(*) from public.bookings b
           where b.property_id = pu.property_id and b.created_by = pu.user_id)
          +
          (select count(*) from public.payments p
           join public.bookings b on b.id = p.booking_id
           where b.property_id = pu.property_id and p.received_by = pu.user_id)
          +
          (select count(*) from public.audit_log a
           where a.property_id = pu.property_id and a.actor_id = pu.user_id)
        ) desc,
        pu.created_at asc nulls last,
        pu.id asc
    ) as staff_rank,
    exists (
      select 1
      from public.property_users owner_membership
      where owner_membership.user_id = pu.user_id
        and lower(coalesce(owner_membership.status, '')) = 'active'
        and lower(btrim(owner_membership.role)) = 'owner'
    ) as has_active_owner_membership
  from public.property_users pu
  where lower(coalesce(pu.status, '')) = 'active'
    and lower(btrim(pu.role)) in ('manager', 'receptionist')
), suspended_staff as (
  update public.property_users pu
  set status = 'inactive'
  from ranked_staff ranked
  where pu.id = ranked.id
    and (ranked.has_active_owner_membership or ranked.staff_rank > 1)
  returning pu.id, pu.property_id, pu.user_id, pu.role
)
insert into public.audit_log(
  property_id, actor_id, entity_type, entity_id,
  event_type, new_data, created_at
)
select
  suspended.property_id,
  null,
  'staff_access',
  suspended.id::text,
  'staff_duplicate_access_suspended',
  jsonb_build_object(
    'user_id', suspended.user_id,
    'role', lower(btrim(suspended.role)),
    'reason', 'one_active_staff_property_policy'
  ),
  now()
from suspended_staff suspended;

create unique index if not exists property_users_one_active_staff_property_idx
  on public.property_users(user_id)
  where lower(coalesce(status, '')) = 'active'
    and lower(btrim(role)) in ('manager', 'receptionist');

create or replace function app_private.enforce_single_active_staff_property()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_role text := lower(btrim(coalesce(new.role, '')));
  v_status text := lower(btrim(coalesce(new.status, '')));
  v_email text;
begin
  if v_status <> 'active' then
    return new;
  end if;

  -- BEFORE UPDATE runs after PostgreSQL has tuple-locked the membership. Email
  -- locking there would invert the claim path (email -> tuple), so public
  -- activation takes the email lock before issuing UPDATE. INSERT has no
  -- existing tuple and can safely enforce both invariants here.
  if tg_op = 'INSERT' then
    select lower(btrim(account.email)) into v_email
    from auth.users account where account.id = new.user_id;
    if v_email is not null then
      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('loji-email-access:' || v_email, 0)
      );
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('loji-membership:' || new.user_id::text, 0)
  );

  if v_role = 'owner' then
    if exists (
      select 1
      from public.property_users existing
      where existing.user_id = new.user_id
        and existing.id is distinct from new.id
        and lower(coalesce(existing.status, '')) = 'active'
        and lower(btrim(existing.role)) in ('manager', 'receptionist')
    ) then
      raise exception using
        errcode = '23505',
        message = 'This email already belongs to staff at another property';
    end if;
  elsif v_role in ('manager', 'receptionist') and exists (
    select 1
    from public.property_users existing
    where existing.user_id = new.user_id
      and existing.id is distinct from new.id
      and lower(coalesce(existing.status, '')) = 'active'
      and existing.property_id is distinct from new.property_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'Staff can belong to only one property';
  end if;

  -- Activating an identity here supersedes unresolved access at every other
  -- property. The invitation change rolls back if the membership write fails.
  if tg_op = 'INSERT'
     and v_email is not null
     and v_role in ('owner', 'manager', 'receptionist') then
    with cancelled as (
      update public.property_invitations invitation
      set status = 'cancelled', token = null, expires_at = null
      where lower(btrim(invitation.email)) = v_email
        and invitation.property_id is distinct from new.property_id
        and lower(coalesce(invitation.status, '')) = 'pending'
        and lower(btrim(invitation.role)) in ('manager', 'receptionist')
      returning invitation.id, invitation.property_id, invitation.role
    )
    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    )
    select
      cancelled.property_id,
      auth.uid(),
      'staff_access',
      cancelled.id::text,
      'staff_access_claim_blocked',
      jsonb_build_object(
        'email', v_email,
        'role', lower(btrim(cancelled.role)),
        'reason', 'access_activated_at_another_property'
      ),
      now()
    from cancelled;
  end if;

  return new;
end;
$fn$;

revoke all on function app_private.enforce_single_active_staff_property()
  from public, anon, authenticated;

drop trigger if exists loji_00_single_active_staff_property
  on public.property_users;
create trigger loji_00_single_active_staff_property
before insert or update of property_id, user_id, role, status
on public.property_users
for each row execute function app_private.enforce_single_active_staff_property();

-- Expired access must not reserve an email forever. If an older environment
-- contains duplicate pending rows, retain the newest request and cancel the
-- others before enforcing the global rule.
update public.property_invitations
set status = 'expired', token = null
where lower(coalesce(status, '')) = 'pending'
  and lower(btrim(role)) in ('manager', 'receptionist')
  and expires_at is not null
  and expires_at <= now();

with conflicting_pending as (
  update public.property_invitations invitation
  set status = 'cancelled', token = null, expires_at = null
  from auth.users account
  where lower(btrim(invitation.email)) = lower(btrim(account.email))
    and account.email_confirmed_at is not null
    and lower(coalesce(invitation.status, '')) = 'pending'
    and lower(btrim(invitation.role)) in ('manager', 'receptionist')
    and exists (
      select 1 from public.property_users membership
      where membership.user_id = account.id
        and lower(coalesce(membership.status, '')) = 'active'
    )
  returning invitation.id, invitation.property_id, invitation.email,
    invitation.role
)
insert into public.audit_log(
  property_id, actor_id, entity_type, entity_id,
  event_type, new_data, created_at
)
select
  conflict.property_id,
  null,
  'staff_access',
  conflict.id::text,
  'staff_access_claim_blocked',
  jsonb_build_object(
    'email', lower(btrim(conflict.email)),
    'role', lower(btrim(conflict.role)),
    'reason', 'existing_active_membership'
  ),
  now()
from conflicting_pending conflict;

with ranked_pending as (
  select
    invitation.id,
    row_number() over (
      partition by lower(btrim(invitation.email))
      order by invitation.created_at desc nulls last, invitation.id desc
    ) as pending_rank
  from public.property_invitations invitation
  where lower(coalesce(invitation.status, '')) = 'pending'
    and lower(btrim(invitation.role)) in ('manager', 'receptionist')
), cancelled_pending as (
  update public.property_invitations invitation
  set status = 'cancelled', token = null, expires_at = null
  from ranked_pending ranked
  where invitation.id = ranked.id and ranked.pending_rank > 1
  returning invitation.id, invitation.property_id, invitation.email,
    invitation.role
)
insert into public.audit_log(
  property_id, actor_id, entity_type, entity_id,
  event_type, new_data, created_at
)
select
  cancelled.property_id,
  null,
  'staff_access',
  cancelled.id::text,
  'duplicate_pending_access_cancelled',
  jsonb_build_object(
    'email', lower(btrim(cancelled.email)),
    'role', lower(btrim(cancelled.role)),
    'reason', 'one_pending_staff_property_policy'
  ),
  now()
from cancelled_pending cancelled;

-- A live pending access email is exclusive to one property.
create unique index if not exists property_invitations_one_pending_email_idx
  on public.property_invitations(lower(btrim(email)))
  where lower(coalesce(status, '')) = 'pending'
    and lower(btrim(role)) in ('manager', 'receptionist');

create or replace function app_private.enforce_single_pending_staff_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_user_id uuid;
begin
  if lower(coalesce(new.status, '')) <> 'pending'
     or lower(btrim(coalesce(new.role, ''))) not in ('manager', 'receptionist') then
    return new;
  end if;

  if new.expires_at is null then
    new.expires_at := now() + interval '30 days';
  elsif new.expires_at <= now() then
    new.status := 'expired';
    new.token := null;
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('loji-email-access:' || v_email, 0)
  );

  -- Direct table writers receive the same expiry semantics as the public RPCs.
  -- Updating status to expired does not recurse into this guarded branch.
  update public.property_invitations stale
  set status = 'expired', token = null
  where lower(btrim(stale.email)) = v_email
    and stale.id is distinct from new.id
    and lower(coalesce(stale.status, '')) = 'pending'
    and lower(btrim(stale.role)) in ('manager', 'receptionist')
    and stale.expires_at is not null
    and stale.expires_at <= now();

  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = v_email
    and u.email_confirmed_at is not null
  order by u.created_at, u.id
  limit 1;

  if v_user_id is not null and exists (
    select 1
    from public.property_users membership
    where membership.user_id = v_user_id
      and lower(coalesce(membership.status, '')) = 'active'
  ) then
    raise exception using
      errcode = '23505',
      message = 'This staff email already belongs to a property';
  end if;

  if exists (
    select 1
    from public.property_invitations pending
    where lower(btrim(pending.email)) = v_email
      and pending.id is distinct from new.id
      and lower(coalesce(pending.status, '')) = 'pending'
      and lower(btrim(pending.role)) in ('manager', 'receptionist')
      and pending.property_id is distinct from new.property_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'This staff email already has pending access to another property';
  end if;

  return new;
end;
$fn$;

revoke all on function app_private.enforce_single_pending_staff_email()
  from public, anon, authenticated;

drop trigger if exists loji_00_single_pending_staff_email
  on public.property_invitations;
create trigger loji_00_single_pending_staff_email
before insert or update of property_id, email, role, status, expires_at
on public.property_invitations
for each row execute function app_private.enforce_single_pending_staff_email();

-- If a confirmed account already has active access, signing in must not try to
-- turn another property's pending request into a second membership. Preserve
-- the established suspended-membership behavior in the private core.
alter function public.claim_email_property_access()
  rename to claim_email_property_access_single_property_core;
revoke all on function public.claim_email_property_access_single_property_core()
  from public, anon, authenticated, service_role;

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
  v_blocked integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select lower(btrim(u.email)), u.email_confirmed_at
  into v_email, v_email_confirmed_at
  from auth.users u where u.id = v_user_id;
  if v_email is null or v_email_confirmed_at is null then
    return jsonb_build_object('success', true, 'claimed', 0, 'blocked', 0);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('loji-email-access:' || v_email, 0)
  );

  update public.property_invitations invitation
  set status = 'expired', token = null
  where lower(btrim(invitation.email)) = v_email
    and lower(coalesce(invitation.status, '')) = 'pending'
    and lower(btrim(invitation.role)) in ('manager', 'receptionist')
    and invitation.expires_at is not null
    and invitation.expires_at <= now();

  if exists (
    select 1 from public.property_users membership
    where membership.user_id = v_user_id
      and lower(coalesce(membership.status, '')) = 'active'
  ) then
    with cancelled as (
      update public.property_invitations invitation
      set status = 'cancelled', token = null, expires_at = null
      where lower(btrim(invitation.email)) = v_email
        and lower(coalesce(invitation.status, '')) = 'pending'
        and lower(btrim(invitation.role)) in ('manager', 'receptionist')
      returning invitation.id, invitation.property_id, invitation.role
    )
    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    )
    select
      cancelled.property_id,
      v_user_id,
      'staff_access',
      cancelled.id::text,
      'staff_access_claim_blocked',
      jsonb_build_object(
        'email', v_email,
        'role', lower(btrim(cancelled.role)),
        'reason', 'existing_active_membership'
      ),
      now()
    from cancelled;
    get diagnostics v_blocked = row_count;

    return jsonb_build_object(
      'success', true, 'claimed', 0, 'blocked', v_blocked
    );
  end if;

  return public.claim_email_property_access_single_property_core();
end;
$fn$;

revoke all on function public.claim_email_property_access()
  from public, anon, authenticated, service_role;
grant execute on function public.claim_email_property_access()
  to authenticated, service_role;

-- Acquire global email locks in a deterministic order before the established
-- registration transaction starts. This prevents two owners from assigning
-- the same staff email concurrently.
alter function public.complete_hospitality_registration(uuid, jsonb, jsonb, jsonb)
  rename to complete_hospitality_registration_email_core;
revoke all on function public.complete_hospitality_registration_email_core(
  uuid, jsonb, jsonb, jsonb
) from public, anon, authenticated, service_role;

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
  v_owner_email text;
  v_staff_email text;
  v_result jsonb;
  v_property_id uuid;
  v_existing_fingerprint text;
  v_request_fingerprint text := md5(jsonb_build_object(
    'operation', 'initial_registration',
    'business', p_business,
    'rooms', p_rooms,
    'staff', p_staff
  )::text);
begin
  if p_request_key is null
     or jsonb_typeof(p_business) is distinct from 'object'
     or jsonb_typeof(p_rooms) is distinct from 'array'
     or jsonb_typeof(p_staff) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Registration data is invalid';
  end if;
  if jsonb_array_length(p_rooms) not between 1 and 300
     or jsonb_array_length(p_staff) > 50 then
    raise exception using errcode = '22023', message = 'Registration size is invalid';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_staff) member(value)
    where length(coalesce(member.value->>'email', '')) > 254
  ) then
    raise exception using errcode = '22023', message = 'A staff email is too long';
  end if;

  select lower(btrim(u.email)) into v_owner_email
  from auth.users u where u.id = auth.uid();

  -- Lock the owner and all requested staff identities in one deterministic
  -- order. This avoids owner/staff cross-registration deadlocks.
  for v_staff_email in
    with candidate_emails as (
      select v_owner_email as email
      union
      select lower(btrim(member.value->>'email'))
      from jsonb_array_elements(
        case when jsonb_typeof(p_staff) = 'array'
          then p_staff else '[]'::jsonb end
      ) member(value)
    )
    select email from candidate_emails
    where nullif(email, '') is not null
    order by email
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('loji-email-access:' || v_staff_email, 0)
    );
  end loop;

  -- Choosing ownership supersedes any still-pending staff request for this
  -- account. The change remains atomic with registration.
  with cancelled as (
    update public.property_invitations invitation
    set status = 'cancelled', token = null, expires_at = null
    where lower(btrim(invitation.email)) = v_owner_email
      and lower(coalesce(invitation.status, '')) = 'pending'
      and lower(btrim(invitation.role)) in ('manager', 'receptionist')
    returning invitation.id, invitation.property_id, invitation.email,
      invitation.role
  )
  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id,
    event_type, new_data, created_at
  )
  select
    cancelled.property_id,
    auth.uid(),
    'staff_access',
    cancelled.id::text,
    'pending_access_cancelled_for_owner',
    jsonb_build_object(
      'email', lower(btrim(cancelled.email)),
      'role', lower(btrim(cancelled.role))
    ),
    now()
  from cancelled;

  v_result := public.complete_hospitality_registration_email_core(
    p_request_key, p_business, p_rooms, p_staff
  );
  v_property_id := nullif(v_result->>'property_id', '')::uuid;

  -- The canonical core can reactivate an existing inactive membership with an
  -- UPDATE. Reconcile pending access after the core so that successful active
  -- staff never retain a pending invitation at this or another property.
  if v_property_id is not null then
    with activated as (
      select distinct lower(btrim(account.email)) as email
      from jsonb_array_elements(p_staff) requested(value)
      join auth.users account
        on lower(btrim(account.email)) =
          lower(btrim(requested.value->>'email'))
       and account.email_confirmed_at is not null
      join public.property_users membership
        on membership.user_id = account.id
       and membership.property_id = v_property_id
       and lower(coalesce(membership.status, '')) = 'active'
       and lower(btrim(membership.role)) in ('manager', 'receptionist')
    ), cancelled as (
      update public.property_invitations invitation
      set status = 'cancelled', token = null, expires_at = null
      from activated
      where lower(btrim(invitation.email)) = activated.email
        and lower(coalesce(invitation.status, '')) = 'pending'
        and lower(btrim(invitation.role)) in ('manager', 'receptionist')
      returning invitation.id, invitation.property_id, invitation.email,
        invitation.role
    )
    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    )
    select
      cancelled.property_id,
      auth.uid(),
      'staff_access',
      cancelled.id::text,
      'pending_access_cancelled_for_active_staff',
      jsonb_build_object(
        'email', lower(btrim(cancelled.email)),
        'role', lower(btrim(cancelled.role)),
        'active_property_id', v_property_id
      ),
      now()
    from cancelled;
  end if;

  if v_property_id is not null then
    select property.onboarding_request_fingerprint
    into v_existing_fingerprint
    from public.properties property
    where property.id = v_property_id and property.owner_id = auth.uid()
    for update;

    if v_existing_fingerprint is not null
       and v_existing_fingerprint <> v_request_fingerprint then
      raise exception using
        errcode = '22023',
        message = 'Registration request key was reused with different details';
    end if;

    update public.properties
    set onboarding_request_fingerprint = v_request_fingerprint
    where id = v_property_id
      and owner_id = auth.uid()
      and onboarding_request_fingerprint is null;
  end if;

  return v_result;
end;
$fn$;

revoke all on function public.complete_hospitality_registration(
  uuid, jsonb, jsonb, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.complete_hospitality_registration(
  uuid, jsonb, jsonb, jsonb
) to authenticated, service_role;

-- Retain the established staff-access implementation, while adding the global
-- email guard before the property-specific lock used by its private core.
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
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_existing_user_id uuid;
  v_result jsonb;
  v_expires_at timestamptz;
begin
  -- Authorize before checking a cross-property identity to avoid account
  -- membership enumeration by an unauthorized caller.
  perform app_private.require_property_permission(
    p_property_id, 'staff', 'invite'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('loji-email-access:' || v_email, 0)
  );

  update public.property_invitations invitation
  set status = 'expired', token = null
  where lower(btrim(invitation.email)) = v_email
    and lower(coalesce(invitation.status, '')) = 'pending'
    and lower(btrim(invitation.role)) in ('manager', 'receptionist')
    and invitation.expires_at is not null
    and invitation.expires_at <= now();

  select u.id into v_existing_user_id
  from auth.users u
  where lower(u.email) = v_email
    and u.email_confirmed_at is not null
  order by u.created_at, u.id
  limit 1;

  if v_existing_user_id is not null and exists (
    select 1
    from public.property_users membership
    where membership.user_id = v_existing_user_id
      and lower(coalesce(membership.status, '')) = 'active'
  ) then
    raise exception using
      errcode = '23505',
      message = 'This staff email already belongs to a property';
  end if;

  if exists (
    select 1
    from public.property_invitations pending
    where lower(btrim(pending.email)) = v_email
      and lower(coalesce(pending.status, '')) = 'pending'
      and lower(btrim(pending.role)) in ('manager', 'receptionist')
      and pending.property_id <> p_property_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'This staff email already has pending access to another property';
  end if;

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
    v_result := jsonb_set(
      v_result - 'code', '{expires_at}', to_jsonb(v_expires_at), true
    );
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
        'email', v_email,
        'role', lower(btrim(p_role)),
        'access_mode', 'email'
      ),
      now()
    );
  end if;
  return v_result;
end;
$fn$;

revoke all on function public.invite_staff(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.invite_staff(uuid, text, text)
  to authenticated, service_role;

-- This core predates the global email wrapper. Keep privileged callers on the
-- public entry point so they cannot bypass one-property enforcement.
revoke all on function public.invite_staff_core(uuid, text, text)
  from public, anon, authenticated, service_role;

-- Role changes also UPDATE the membership tuple. Take the same per-identity
-- lock as activation first so role/status changes cannot deadlock each other.
alter function public.change_staff_role(uuid, uuid, text)
  rename to change_staff_role_single_property_core;
revoke all on function public.change_staff_role_single_property_core(
  uuid, uuid, text
) from public, anon, authenticated, service_role;

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
begin
  perform app_private.require_property_permission(
    p_property_id, 'staff', 'manage'
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'loji-membership:' || p_staff_user_id::text, 0
    )
  );
  return public.change_staff_role_single_property_core(
    p_property_id, p_staff_user_id, p_role
  );
end;
$fn$;

revoke all on function public.change_staff_role(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.change_staff_role(uuid, uuid, text)
  to authenticated, service_role;

-- Public activation takes the identity locks before the established function
-- tuple-locks the membership. This keeps its lock order aligned with invite
-- and claim while retaining all existing role and audit behavior.
alter function public.update_staff_status(uuid, uuid, text)
  rename to update_staff_status_single_property_core;
revoke all on function public.update_staff_status_single_property_core(
  uuid, uuid, text
) from public, anon, authenticated, service_role;

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
  v_email text;
  v_result jsonb;
begin
  perform app_private.require_property_permission(
    p_property_id, 'staff', 'manage'
  );

  select lower(btrim(account.email)) into v_email
  from auth.users account where account.id = p_staff_user_id;
  if v_email is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('loji-email-access:' || v_email, 0)
    );
  end if;
  if lower(btrim(coalesce(p_status, ''))) = 'active'
     and v_email is not null then
    with cancelled as (
      update public.property_invitations invitation
      set status = 'cancelled', token = null, expires_at = null
      where lower(btrim(invitation.email)) = v_email
        and lower(coalesce(invitation.status, '')) = 'pending'
        and lower(btrim(invitation.role)) in ('manager', 'receptionist')
      returning invitation.id, invitation.property_id, invitation.role
    )
    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    )
    select
      cancelled.property_id,
      auth.uid(),
      'staff_access',
      cancelled.id::text,
      'staff_access_claim_blocked',
      jsonb_build_object(
        'email', v_email,
        'role', lower(btrim(cancelled.role)),
        'reason', 'staff_access_reactivated'
      ),
      now()
    from cancelled;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'loji-membership:' || p_staff_user_id::text, 0
    )
  );

  v_result := public.update_staff_status_single_property_core(
    p_property_id, p_staff_user_id, p_status
  );

  return v_result;
end;
$fn$;

revoke all on function public.update_staff_status(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.update_staff_status(uuid, uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Owners can add another fully configured property. The established and
--    already-hardened registration transaction is reused. Its onboarding-state
--    guard is opened only inside this owner-only transaction and is never
--    visible to another session.
-- ---------------------------------------------------------------------------

create or replace function public.create_additional_hospitality_property(
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
  v_user_id uuid := auth.uid();
  v_owner_email text;
  v_staff_email text;
  v_result jsonb;
  v_property_id uuid;
  v_shell_id uuid;
  v_hidden_shells jsonb := '[]'::jsonb;
  v_existing_fingerprint text;
  v_request_fingerprint text := md5(jsonb_build_object(
    'operation', 'additional_property',
    'business', p_business,
    'rooms', p_rooms,
    'staff', p_staff
  )::text);
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_request_key is null
     or jsonb_typeof(p_business) is distinct from 'object'
     or jsonb_typeof(p_rooms) is distinct from 'array'
     or jsonb_typeof(p_staff) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Registration data is invalid';
  end if;
  if jsonb_array_length(p_rooms) not between 1 and 300
     or jsonb_array_length(p_staff) > 50 then
    raise exception using errcode = '22023', message = 'Registration size is invalid';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_staff) member(value)
    where length(coalesce(member.value->>'email', '')) > 254
  ) then
    raise exception using errcode = '22023', message = 'A staff email is too long';
  end if;

  if not exists (
    select 1
    from public.property_users membership
    join public.properties property on property.id = membership.property_id
    where membership.user_id = v_user_id
      and lower(coalesce(membership.status, '')) = 'active'
      and lower(btrim(membership.role)) = 'owner'
      and property.owner_id = v_user_id
      and (
        nullif(btrim(coalesce(property.formatted_address, '')), '') is not null
        or exists (
          select 1 from public.onboarding_state state
          where state.user_id = v_user_id
            and (
              coalesce(state.has_property_physical_address, false)
              or lower(coalesce(state.current_step, '')) = 'done'
            )
        )
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'Only an active property owner can add another property';
  end if;

  select lower(btrim(u.email)) into v_owner_email
  from auth.users u where u.id = v_user_id;

  for v_staff_email in
    with candidate_emails as (
      select v_owner_email as email
      union
      select lower(btrim(member.value->>'email'))
      from jsonb_array_elements(
        case when jsonb_typeof(p_staff) = 'array'
          then p_staff else '[]'::jsonb end
      ) member(value)
    )
    select email from candidate_emails
    where nullif(email, '') is not null
    order by email
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('loji-email-access:' || v_staff_email, 0)
    );
  end loop;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('loji-registration:' || v_user_id::text, 0)
  );

  -- Exact retries are resolved by the canonical function before it reads the
  -- onboarding state, so no temporary state change is needed for a replay.
  select property.id, property.onboarding_request_fingerprint
  into v_property_id, v_existing_fingerprint
  from public.properties property
  where property.owner_id = v_user_id
    and property.onboarding_request_key = p_request_key
  limit 1;

  if v_property_id is not null
     and v_existing_fingerprint is not null
     and v_existing_fingerprint <> v_request_fingerprint then
    raise exception using
      errcode = '22023',
      message = 'Registration request key was reused with different details';
  end if;

  if v_property_id is null then
    -- The established first-registration core can reuse an unfinished shell.
    -- Hide every old shell inside this transaction and create one dedicated to
    -- this request, ensuring no existing property is ever repurposed.
    perform 1
    from public.properties property
    where property.owner_id = v_user_id
      and nullif(btrim(coalesce(property.formatted_address, '')), '') is null
      and not exists (
        select 1 from public.bookings booking
        where booking.property_id = property.id
      )
    for update;

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', property.id,
      'formatted_address', property.formatted_address
    )), '[]'::jsonb)
    into v_hidden_shells
    from public.properties property
    where property.owner_id = v_user_id
      and nullif(btrim(coalesce(property.formatted_address, '')), '') is null
      and not exists (
        select 1 from public.bookings booking
        where booking.property_id = property.id
      );

    update public.properties property
    set formatted_address = 'Reserved during additional property setup'
    where property.id in (
      select (item.value->>'id')::uuid
      from jsonb_array_elements(v_hidden_shells) item(value)
    );

    v_shell_id := gen_random_uuid();
    insert into public.properties(
      id, owner_id, name, property_type, phone, email,
      country, region, district, ward, street, formatted_address,
      timezone, status, amenities, payment_methods, images,
      onboarding_request_key, onboarding_request_fingerprint,
      expected_inventory_count, default_bedroom_count,
      default_bathroom_count, created_at, updated_at
    ) values (
      v_shell_id, v_user_id, 'New property setup', 'hotel', '0000000', null,
      'Tanzania', null, null, null, null, null,
      'Africa/Dar_es_Salaam', false, '[]'::jsonb,
      '["cash","mobile_money"]'::jsonb, '[]'::jsonb,
      null, v_request_fingerprint, 1, null, null, now(), now()
    );

    insert into public.property_users(
      property_id, user_id, role, status, created_at
    ) values (
      v_shell_id, v_user_id, 'owner', 'active', now()
    );

    insert into public.onboarding_state(
      user_id, has_property, has_property_physical_address,
      current_step, created_at, updated_at
    ) values (
      v_user_id, true, false, 'property_basic', now(), now()
    )
    on conflict (user_id)
    do update set
      has_property = true,
      has_property_physical_address = false,
      current_step = 'property_basic',
      updated_at = now();
  end if;

  v_result := public.complete_hospitality_registration_email_core(
    p_request_key, p_business, p_rooms, p_staff
  );
  v_property_id := nullif(v_result->>'property_id', '')::uuid;

  if v_property_id is not null then
    with activated as (
      select distinct lower(btrim(account.email)) as email
      from jsonb_array_elements(p_staff) requested(value)
      join auth.users account
        on lower(btrim(account.email)) =
          lower(btrim(requested.value->>'email'))
       and account.email_confirmed_at is not null
      join public.property_users membership
        on membership.user_id = account.id
       and membership.property_id = v_property_id
       and lower(coalesce(membership.status, '')) = 'active'
       and lower(btrim(membership.role)) in ('manager', 'receptionist')
    ), cancelled as (
      update public.property_invitations invitation
      set status = 'cancelled', token = null, expires_at = null
      from activated
      where lower(btrim(invitation.email)) = activated.email
        and lower(coalesce(invitation.status, '')) = 'pending'
        and lower(btrim(invitation.role)) in ('manager', 'receptionist')
      returning invitation.id, invitation.property_id, invitation.email,
        invitation.role
    )
    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    )
    select
      cancelled.property_id,
      v_user_id,
      'staff_access',
      cancelled.id::text,
      'pending_access_cancelled_for_active_staff',
      jsonb_build_object(
        'email', lower(btrim(cancelled.email)),
        'role', lower(btrim(cancelled.role)),
        'active_property_id', v_property_id
      ),
      now()
    from cancelled;
  end if;

  if v_shell_id is not null and v_property_id is distinct from v_shell_id then
    raise exception using
      errcode = 'XX000',
      message = 'Additional property setup selected an unexpected property';
  end if;

  if v_property_id is not null then
    update public.properties
    set onboarding_request_fingerprint = v_request_fingerprint
    where id = v_property_id
      and owner_id = v_user_id
      and onboarding_request_fingerprint is null;
  end if;

  update public.properties property
  set formatted_address = item.value->>'formatted_address'
  from jsonb_array_elements(v_hidden_shells) item(value)
  where property.id = (item.value->>'id')::uuid;

  if v_property_id is not null
     and not coalesce((v_result->>'replayed')::boolean, false) then
    insert into public.audit_log(
      property_id, actor_id, entity_type, entity_id,
      event_type, new_data, created_at
    ) values (
      v_property_id,
      v_user_id,
      'property',
      v_property_id::text,
      'additional_property_created',
      jsonb_build_object('request_key', p_request_key),
      now()
    );
  end if;

  return jsonb_set(v_result, '{additional_property}', 'true'::jsonb, true);
end;
$fn$;

revoke all on function public.create_additional_hospitality_property(
  uuid, jsonb, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.create_additional_hospitality_property(
  uuid, jsonb, jsonb, jsonb
) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. A front-desk booking for today's business date is created directly in
--    checked-in state. Future stays remain confirmed reservations.
-- ---------------------------------------------------------------------------

create or replace function public.create_property_booking_core(
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
  v_user_id uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_guest_id uuid;
  v_guest public.guests%rowtype;
  v_booking public.bookings%rowtype;
  v_existing public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_business_date date;
  v_initial_status text;
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
  perform app_private.require_property_permission(
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

  select booking.* into v_existing
  from public.bookings booking
  where booking.property_id = p_property_id
    and booking.idempotency_key = p_idempotency_key;
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

  select room.* into v_room
  from public.rooms room
  join public.properties property on property.id = room.property_id
  where room.id = p_room_id
    and room.property_id = p_property_id
    and coalesce(room.is_active, false)
    and coalesce(property.status, false)
  for update of room;
  if not found then
    raise exception using errcode = 'P0002', message = 'Active room not found';
  end if;

  v_business_date := app_private.property_business_date(p_property_id);
  v_initial_status := case
    when p_check_in = v_business_date then 'checked_in'
    else 'confirmed'
  end;

  if p_check_in < v_business_date then
    raise exception using errcode = '22023', message = 'Check-in cannot be in the past';
  end if;
  if v_initial_status = 'checked_in' then
    perform app_private.require_property_permission(
      p_property_id, 'bookings', 'checkin'
    );
    if coalesce(v_room.operational_status, '') <> 'available'
       or coalesce(v_room.housekeeping_status, '') <> 'ready' then
      raise exception using
        errcode = '22023',
        message = 'Room must be available and ready for check-in';
    end if;
    if exists (
      select 1 from public.bookings active_stay
      where active_stay.room_id = p_room_id
        and active_stay.status = 'checked_in'
    ) then
      raise exception using errcode = '23P01', message = 'Room is occupied';
    end if;
  elsif coalesce(v_room.operational_status, 'available') in (
    'maintenance', 'out_of_order'
  ) then
    raise exception using errcode = '22023', message = 'Room is out of service';
  end if;
  if coalesce(p_adults, 1) + coalesce(p_children, 0)
      > coalesce(v_room.capacity, 0) then
    raise exception using errcode = '22023', message = 'Guest count exceeds room capacity';
  end if;
  if exists (
    select 1
    from public.bookings booking
    where booking.room_id = p_room_id
      and booking.status not in ('cancelled', 'no_show', 'checked_out')
      and p_check_in < booking.check_out
      and p_check_out > booking.check_in
  ) then
    raise exception using errcode = '23P01', message = 'Room is no longer available';
  end if;

  v_nights := p_check_out - p_check_in;
  v_total := round(v_room.price_per_night * v_nights, 2);
  if v_total <= 0 then
    raise exception using errcode = '22023', message = 'Room price is invalid';
  end if;

  if p_existing_guest_id is not null then
    select guest.* into v_guest
    from public.guests guest
    join public.property_guests property_guest
      on property_guest.guest_id = guest.id
     and property_guest.property_id = p_property_id
    where guest.id = p_existing_guest_id;
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
        check_in, check_out, checked_in_at, checked_in_by,
        adults, children, total_price,
        booking_source, status, payment_status, special_requests,
        idempotency_key, idempotency_fingerprint, updated_at
      ) values (
        v_booking_number, p_property_id, p_room_id, v_guest_id, v_user_id,
        p_check_in, p_check_out,
        case when v_initial_status = 'checked_in' then now() end,
        case when v_initial_status = 'checked_in' then v_user_id end,
        coalesce(p_adults, 1), coalesce(p_children, 0), v_total,
        nullif(btrim(coalesce(p_source, 'front_desk')), ''),
        v_initial_status, v_payment_status,
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

  if v_initial_status = 'checked_in' then
    update public.rooms
    set operational_status = 'occupied', updated_at = now()
    where id = p_room_id and property_id = p_property_id;
  end if;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, v_user_id, 'booking', v_booking.id::text,
    case when v_initial_status = 'checked_in'
      then 'booking_created_and_checked_in'
      else 'booking_created'
    end,
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

revoke all on function public.create_property_booking_core(
  uuid, uuid, uuid, jsonb, uuid, date, date, integer, integer,
  text, text, numeric, text, text
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Property photos: compact, ordered, and capped at ten.
-- ---------------------------------------------------------------------------

-- Preserve valid, object-backed URLs held only in the older properties.images
-- JSON field before making property_images authoritative.
with raw_candidates as (
  select
    property.id as property_id,
    case jsonb_typeof(item.value)
      when 'string' then btrim(item.value #>> '{}')
      when 'object' then btrim(coalesce(item.value->>'url', ''))
      else ''
    end as url,
    item.ordinality
  from public.properties property
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(property.images) = 'array'
      then property.images else '[]'::jsonb end
  ) with ordinality item(value, ordinality)
), candidates as (
  select
    raw.property_id,
    raw.url,
    raw.ordinality,
    substring(
      raw.url from length(
        'https://kymloctcridmvqtdglro.supabase.co/storage/v1/object/public/property-images/'
      ) + 1
    ) as object_name
  from raw_candidates raw
  where nullif(raw.url, '') is not null
), accepted as (
  select distinct on (candidate.property_id, candidate.url)
    candidate.property_id,
    candidate.url,
    candidate.ordinality
  from candidates candidate
  where length(candidate.url) <= 2048
    and position(
      'https://kymloctcridmvqtdglro.supabase.co/storage/v1/object/public/property-images/'
        || candidate.property_id::text || '/'
      in candidate.url
    ) = 1
    and candidate.url !~ '[?#%]'
    and position(chr(92) in candidate.url) = 0
    and candidate.object_name ~* (
      '^' || candidate.property_id::text
      || '/[A-Za-z0-9][A-Za-z0-9._-]{0,254}[.](jpe?g|png|webp)$'
    )
    and exists (
      select 1 from storage.objects object
      where object.bucket_id = 'property-images'
        and object.name = candidate.object_name
    )
  order by candidate.property_id, candidate.url, candidate.ordinality
)
insert into public.property_images(property_id, url, is_cover, position)
select
  accepted.property_id,
  accepted.url,
  false,
  (100000 + row_number() over (
    partition by accepted.property_id order by accepted.ordinality, accepted.url
  ))::integer
from accepted
where not exists (
  select 1 from public.property_images existing
  where existing.property_id = accepted.property_id
    and btrim(existing.url) = accepted.url
);

update public.property_images
set url = btrim(url)
where url is not null and url is distinct from btrim(url);

-- Invalid metadata is removed, never the underlying object. This prevents a
-- broken legacy URL from blocking all future photo edits.
with classified as (
  select
    image.id,
    image.property_id,
    image.url,
    substring(
      image.url from length(
        'https://kymloctcridmvqtdglro.supabase.co/storage/v1/object/public/property-images/'
      ) + 1
    ) as object_name
  from public.property_images image
), removed as (
  delete from public.property_images image
  using classified candidate
  where image.id = candidate.id
    and (
      candidate.property_id is null
      or nullif(candidate.url, '') is null
      or length(candidate.url) > 2048
      or position(
        'https://kymloctcridmvqtdglro.supabase.co/storage/v1/object/public/property-images/'
          || candidate.property_id::text || '/'
        in candidate.url
      ) <> 1
      or candidate.url ~ '[?#%]'
      or position(chr(92) in candidate.url) > 0
      or candidate.object_name !~* (
        '^' || candidate.property_id::text
        || '/[A-Za-z0-9][A-Za-z0-9._-]{0,254}[.](jpe?g|png|webp)$'
      )
      or not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'property-images'
          and object.name = candidate.object_name
      )
    )
  returning image.property_id
)
insert into public.audit_log(
  property_id, actor_id, entity_type, entity_id,
  event_type, new_data, created_at
)
select
  removed.property_id,
  null,
  'property',
  removed.property_id::text,
  'invalid_property_photo_metadata_removed',
  jsonb_build_object('removed_count', count(*)),
  now()
from removed
where removed.property_id is not null
group by removed.property_id;

with ranked_urls as (
  select
    image.id,
    image.property_id,
    row_number() over (
      partition by image.property_id, image.url
      order by image.position asc nulls last,
        image.is_cover desc nulls last,
        image.created_at asc nulls last,
        image.id asc
    ) as duplicate_rank
  from public.property_images image
), removed as (
  delete from public.property_images image
  using ranked_urls ranked
  where image.id = ranked.id and ranked.duplicate_rank > 1
  returning image.property_id
)
insert into public.audit_log(
  property_id, actor_id, entity_type, entity_id,
  event_type, new_data, created_at
)
select
  removed.property_id,
  null,
  'property',
  removed.property_id::text,
  'duplicate_property_photo_metadata_removed',
  jsonb_build_object('removed_count', count(*)),
  now()
from removed
group by removed.property_id;

with ranked_images as (
  select
    image.id,
    image.property_id,
    row_number() over (
      partition by image.property_id
      order by image.position asc nulls last,
        image.is_cover desc nulls last,
        image.created_at asc nulls last,
        image.id asc
    ) as photo_rank
  from public.property_images image
), removed as (
  delete from public.property_images image
  using ranked_images ranked
  where image.id = ranked.id and ranked.photo_rank > 10
  returning image.property_id
)
insert into public.audit_log(
  property_id, actor_id, entity_type, entity_id,
  event_type, new_data, created_at
)
select
  removed.property_id,
  null,
  'property',
  removed.property_id::text,
  'property_photo_metadata_capped',
  jsonb_build_object('removed_count', count(*), 'maximum', 10),
  now()
from removed
group by removed.property_id;

with ordered_images as (
  select
    image.id,
    row_number() over (
      partition by image.property_id
      order by image.position asc nulls last,
        image.is_cover desc nulls last,
        image.created_at asc nulls last,
        image.id asc
    ) - 1 as next_position
  from public.property_images image
)
update public.property_images image
set position = ordered.next_position::integer,
    is_cover = ordered.next_position = 0
from ordered_images ordered
where ordered.id = image.id;

alter table public.property_images
  alter column property_id set not null,
  alter column url set not null,
  alter column position set not null,
  alter column is_cover set not null;

alter table public.property_images
  drop constraint if exists property_images_url_not_blank_check;
alter table public.property_images
  add constraint property_images_url_not_blank_check
  check (length(btrim(url)) between 1 and 2048) not valid;
alter table public.property_images
  validate constraint property_images_url_not_blank_check;

alter table public.property_images
  drop constraint if exists property_images_position_check;
alter table public.property_images
  add constraint property_images_position_check
  check (position between 0 and 9) not valid;
alter table public.property_images
  validate constraint property_images_position_check;

alter table public.property_images
  drop constraint if exists property_images_cover_position_check;
alter table public.property_images
  add constraint property_images_cover_position_check
  check (is_cover = (position = 0)) not valid;
alter table public.property_images
  validate constraint property_images_cover_position_check;

create unique index if not exists property_images_property_position_unique_idx
  on public.property_images(property_id, position);
create unique index if not exists property_images_property_url_unique_idx
  on public.property_images(property_id, url);
create unique index if not exists property_images_single_cover_idx
  on public.property_images(property_id)
  where is_cover;

-- Keep the legacy JSON projection synchronized with the normalized metadata.
with galleries as (
  select
    property.id as property_id,
    coalesce(jsonb_agg(
      jsonb_build_object(
        'url', image.url,
        'is_cover', image.is_cover,
        'position', image.position
      ) order by image.position
    ) filter (where image.id is not null), '[]'::jsonb) as images
  from public.properties property
  left join public.property_images image on image.property_id = property.id
  group by property.id
)
update public.properties property
set images = galleries.images,
    updated_at = now()
from galleries
where property.id = galleries.property_id
  and property.images is distinct from galleries.images;

create or replace function public.update_property_gallery_versioned(
  p_property_id uuid,
  p_images text[],
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_images text[];
  v_images_json jsonb;
  v_image text;
  v_object_name text;
  v_old jsonb;
  v_current_updated_at timestamptz;
  v_public_prefix constant text :=
    'https://kymloctcridmvqtdglro.supabase.co/storage/v1/object/public/property-images/';
begin
  perform app_private.require_property_permission(
    p_property_id, 'property', 'update'
  );
  if p_expected_updated_at is null then
    raise exception using
      errcode = '22023',
      message = 'Reload property photos before saving';
  end if;

  select coalesce(array_agg(url order by first_position), array[]::text[])
  into v_images
  from (
    select btrim(item) as url, min(ordinality) as first_position
    from unnest(coalesce(p_images, array[]::text[]))
      with ordinality supplied(item, ordinality)
    where nullif(btrim(item), '') is not null
    group by btrim(item)
  ) normalized;

  if cardinality(v_images) > 10 then
    raise exception using
      errcode = '22023',
      message = 'A property can have up to 10 photos';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'url', image_url,
      'is_cover', ordinality = 1,
      'position', ordinality - 1
    ) order by ordinality
  ), '[]'::jsonb)
  into v_images_json
  from unnest(v_images) with ordinality ordered(image_url, ordinality);

  select coalesce(property.images, '[]'::jsonb), property.updated_at
  into v_old, v_current_updated_at
  from public.properties property
  where property.id = p_property_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Property not found';
  end if;

  -- Validate backing objects while holding the same property lock used by
  -- writes and retries. A retried request therefore waits for an earlier
  -- indeterminate request before deciding whether cleanup is safe.
  foreach v_image in array v_images loop
    v_object_name := substring(v_image from length(v_public_prefix) + 1);
    if length(v_image) > 2048
       or position(v_public_prefix || p_property_id::text || '/' in v_image) <> 1
       or v_image ~ '[?#%]'
       or position(chr(92) in v_image) > 0
       or v_object_name !~* (
         '^' || p_property_id::text
         || '/[A-Za-z0-9][A-Za-z0-9._-]{0,254}[.](jpe?g|png|webp)$'
       )
       or not exists (
         select 1 from storage.objects object
         where object.bucket_id = 'property-images'
           and object.name = v_object_name
       ) then
      raise exception using
        errcode = '22023',
        message = 'Invalid property photo path';
    end if;
  end loop;

  -- Exact retries are safe even when the first response was lost after commit.
  if v_old = v_images_json then
    return public.get_property_settings(p_property_id);
  end if;
  if v_current_updated_at is distinct from p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'Property photos changed in another session; reload and try again';
  end if;

  delete from public.property_images
  where property_id = p_property_id;

  insert into public.property_images(property_id, url, is_cover, position)
  select
    p_property_id,
    image_url,
    ordinality = 1,
    (ordinality - 1)::integer
  from unnest(v_images) with ordinality ordered(image_url, ordinality);

  update public.properties
  set images = v_images_json, updated_at = now()
  where id = p_property_id;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id,
    event_type, old_data, new_data
  ) values (
    p_property_id, v_user_id, 'property', p_property_id::text,
    'property_photos_updated',
    jsonb_build_object('images', v_old),
    jsonb_build_object('images', v_images_json)
  );

  return public.get_property_settings(p_property_id);
end;
$fn$;

-- The current web client uses only the versioned writer. Retire the two stale,
-- last-write-wins contracts once normalization is complete.
drop function if exists public.save_property_images(uuid, text[]);
drop function if exists public.update_property_gallery(uuid, text[]);

insert into storage.buckets(
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'property-images',
  'property-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

revoke all on function public.update_property_gallery_versioned(
  uuid, text[], timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.update_property_gallery_versioned(
  uuid, text[], timestamptz
) to authenticated, service_role;

comment on index public.property_users_one_active_staff_property_idx is
  'An active staff identity is assigned to one property; owners may own many.';
comment on constraint property_images_position_check on public.property_images is
  'Property photos are ordered from zero to nine, enforcing a ten-photo maximum.';

commit;
