-- Preserve one successful SMS per booking while allowing failed or stale sends to retry.
alter table public.booking_sms_deliveries
  add column if not exists attempt_count integer not null default 1
  check (attempt_count > 0);

comment on column public.booking_sms_deliveries.attempt_count is
  'Number of reserved delivery attempts, including retries after a failed or stale send.';
