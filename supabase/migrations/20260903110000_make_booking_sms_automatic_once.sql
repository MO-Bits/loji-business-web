-- Booking notifications are automatic system events, never a user-triggered resend.
-- The primary key makes the send claim atomic and prevents duplicate provider calls.
create table if not exists public.booking_sms_deliveries (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  provider_status integer,
  last_error text
);

alter table public.booking_sms_deliveries enable row level security;
revoke all on table public.booking_sms_deliveries from anon, authenticated;

create index if not exists booking_sms_deliveries_property_idx
  on public.booking_sms_deliveries (property_id, claimed_at desc);

comment on table public.booking_sms_deliveries is
  'Server-owned, one-time delivery claims for automatic booking SMS notifications.';
