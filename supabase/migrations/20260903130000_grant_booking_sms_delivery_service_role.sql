-- Edge Functions use the service role to own automatic delivery claims.
-- Explicit table privileges are still required even though the role bypasses RLS.
grant select, insert, update, delete
  on table public.booking_sms_deliveries
  to service_role;
