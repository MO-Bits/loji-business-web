-- Cover the reversal approver foreign key for audit lookups and user deletion
-- checks without indexing the null values on ordinary payment entries.
create index if not exists payments_approved_by_idx
  on public.payments(approved_by)
  where approved_by is not null;
