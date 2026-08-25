-- Loji Business operational foundation
-- Apply through Supabase SQL Editor or your migration runner before enabling
-- housekeeping, payment and reporting controls in production.

begin;

alter table public.rooms
  add column if not exists housekeeping_status text not null default 'ready',
  add column if not exists housekeeping_notes text,
  add column if not exists housekeeping_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rooms_housekeeping_status_check'
      and conrelid = 'public.rooms'::regclass
  ) then
    alter table public.rooms
      add constraint rooms_housekeeping_status_check
      check (housekeeping_status in ('ready','needs_cleaning','cleaning','out_of_service'));
  end if;
end $$;

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  method text not null,
  reference text,
  notes text,
  recorded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists booking_payments_booking_idx
  on public.booking_payments (booking_id, created_at desc);
create index if not exists booking_payments_property_idx
  on public.booking_payments (property_id, created_at desc);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  property_id uuid references public.properties(id) on delete cascade,
  actor_id uuid references auth.users(id),
  entity_type text not null,
  entity_id text,
  event_type text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_property_created_idx
  on public.audit_log (property_id, created_at desc);

alter table public.booking_payments enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists booking_payments_member_read on public.booking_payments;
create policy booking_payments_member_read
  on public.booking_payments for select
  using (exists (
    select 1 from public.property_users pu
    where pu.property_id = booking_payments.property_id
      and pu.user_id = auth.uid()
      and pu.status = 'active'
  ));

drop policy if exists audit_log_manager_read on public.audit_log;
create policy audit_log_manager_read
  on public.audit_log for select
  using (exists (
    select 1 from public.property_users pu
    where pu.property_id = audit_log.property_id
      and pu.user_id = auth.uid()
      and pu.status = 'active'
      and lower(pu.role::text) in ('owner','manager')
  ));

create or replace function public.update_room_housekeeping_status(
  p_property_id uuid,
  p_room_id uuid,
  p_status text,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_old public.rooms%rowtype;
  v_new public.rooms%rowtype;
begin
  if p_status not in ('ready','needs_cleaning','cleaning','out_of_service') then
    raise exception 'Invalid housekeeping status';
  end if;

  if not exists (
    select 1 from public.property_users pu
    where pu.property_id = p_property_id
      and pu.user_id = auth.uid()
      and pu.status = 'active'
  ) then
    raise exception 'Access denied';
  end if;

  select * into v_old from public.rooms
  where id = p_room_id and property_id = p_property_id
  for update;
  if not found then raise exception 'Room not found'; end if;

  update public.rooms
  set housekeeping_status = p_status,
      housekeeping_notes = nullif(trim(p_notes), ''),
      housekeeping_updated_at = now()
  where id = p_room_id and property_id = p_property_id
  returning * into v_new;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, old_data, new_data
  ) values (
    p_property_id, auth.uid(), 'room', p_room_id::text, 'housekeeping_status_changed',
    to_jsonb(v_old), to_jsonb(v_new)
  );

  return jsonb_build_object(
    'room_id', p_room_id,
    'status', v_new.housekeeping_status,
    'updated_at', v_new.housekeeping_updated_at
  );
end;
$$;

create or replace function public.record_booking_payment(
  p_property_id uuid,
  p_booking_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text default null,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_payment public.booking_payments%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if not exists (
    select 1 from public.property_users pu
    where pu.property_id = p_property_id
      and pu.user_id = auth.uid()
      and pu.status = 'active'
  ) then
    raise exception 'Access denied';
  end if;

  if not exists (
    select 1 from public.bookings b
    where b.id = p_booking_id and b.property_id = p_property_id
  ) then
    raise exception 'Booking not found';
  end if;

  insert into public.booking_payments(
    property_id, booking_id, amount, method, reference, notes, recorded_by
  ) values (
    p_property_id, p_booking_id, p_amount, trim(p_method),
    nullif(trim(p_reference), ''), nullif(trim(p_notes), ''), auth.uid()
  ) returning * into v_payment;

  insert into public.audit_log(
    property_id, actor_id, entity_type, entity_id, event_type, new_data
  ) values (
    p_property_id, auth.uid(), 'booking', p_booking_id::text, 'payment_recorded',
    to_jsonb(v_payment)
  );

  return to_jsonb(v_payment);
end;
$$;

create or replace function public.loji_mark_room_dirty_after_checkout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.room_id is not null
    and new.checked_out_at is not null
    and old.checked_out_at is null then
    update public.rooms
    set housekeeping_status = 'needs_cleaning',
        housekeeping_updated_at = now()
    where id = new.room_id;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_mark_room_dirty_after_checkout on public.bookings;
create trigger bookings_mark_room_dirty_after_checkout
after update of checked_out_at on public.bookings
for each row execute function public.loji_mark_room_dirty_after_checkout();

create or replace function public.get_property_operations_report(
  p_property_id uuid,
  p_from date,
  p_to date
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Invalid report date range';
  end if;

  if not exists (
    select 1 from public.property_users pu
    where pu.property_id = p_property_id
      and pu.user_id = auth.uid()
      and pu.status = 'active'
      and lower(pu.role::text) in ('owner','manager')
  ) then
    raise exception 'Access denied';
  end if;

  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'bookings', count(*),
    'room_nights', coalesce(sum(greatest(0, least(b.check_out, p_to) - greatest(b.check_in, p_from))), 0),
    'payments', coalesce((
      select sum(bp.amount)
      from public.booking_payments bp
      where bp.property_id = p_property_id
        and bp.created_at >= p_from::timestamptz
        and bp.created_at < (p_to + 1)::timestamptz
    ), 0)
  ) into v_result
  from public.bookings b
  where b.property_id = p_property_id
    and b.check_in <= p_to
    and b.check_out >= p_from
    and lower(coalesce(b.status::text, '')) not in ('cancelled','canceled');

  return v_result;
end;
$$;

revoke all on function public.update_room_housekeeping_status(uuid,uuid,text,text) from public;
revoke all on function public.record_booking_payment(uuid,uuid,numeric,text,text,text) from public;
revoke all on function public.get_property_operations_report(uuid,date,date) from public;
grant execute on function public.update_room_housekeeping_status(uuid,uuid,text,text) to authenticated;
grant execute on function public.record_booking_payment(uuid,uuid,numeric,text,text,text) to authenticated;
grant execute on function public.get_property_operations_report(uuid,date,date) to authenticated;

commit;
