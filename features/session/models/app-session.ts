import type { User } from "@supabase/supabase-js";

import { AppStatus, AppStep } from "./app-status";

export type Membership = {
  id?: string;
  property_id?: string;
  role?: string;
  [key: string]: unknown;
};

export type Property = {
  id?: string;
  name?: string;
  type?: string;
  address?: string;
  [key: string]: unknown;
};

export type AppSession = {
  user: User | null;
  status: AppStatus;
  step: AppStep;
  message?: string;
  memberships: Membership[];
  activePropertyId?: string;
  activeRole?: string;
  property?: Property | null;
};
