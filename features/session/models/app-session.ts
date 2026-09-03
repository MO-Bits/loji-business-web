import type { User } from "@supabase/supabase-js";

import { AppStatus, AppStep } from "./app-status";

export type Membership = {
  id?: string;
  property?: Property | null;
  property_id?: string;
  role?: string;
  [key: string]: unknown;
};

export type Property = {
  formatted_address?: string;
  business_date?: string;
  businessDate?: string;
  id?: string;
  images?: unknown[];
  name?: string;
  payment_methods?: unknown[];
  paymentMethods?: unknown[];
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
