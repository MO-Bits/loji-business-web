import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database.types";

import type {
  AppSession,
  Membership,
  Property,
} from "../models/app-session";
import { AppStatus, AppStep } from "../models/app-status";

type SessionPayload = Record<string, Json | undefined>;

function isObject(value: unknown): value is SessionPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStep(value: unknown): AppStep {
  switch (value) {
    case "profile":
      return AppStep.Profile;
    case "property_basic":
      return AppStep.PropertyBasic;
    case "property_address":
      return AppStep.PropertyAddress;
    case "invitation":
      return AppStep.Invitation;
    case "done":
      return AppStep.Done;
    default:
      return AppStep.Profile;
  }
}

async function getCurrentUser(
  supabase: SupabaseClient<Database>,
): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function evaluateAppSession(
  supabase: SupabaseClient<Database>,
): Promise<AppSession> {
  const { data: raw, error } = await supabase.rpc("get_app_session");

  if (error) {
    throw new Error(error.message);
  }

  if (!isObject(raw)) {
    throw new Error("The server returned an invalid application session.");
  }

  const status = raw.status;

  if (status === "unauthenticated") {
    return {
      user: null,
      status: AppStatus.Unauthenticated,
      step: AppStep.Login,
      memberships: [],
    };
  }

  const user = await getCurrentUser(supabase);

  if (status === "inactive") {
    return {
      user,
      status: AppStatus.Inactive,
      step: AppStep.Login,
      message: typeof raw.message === "string" ? raw.message : undefined,
      memberships: [],
    };
  }

  if (status === "ready") {
    const memberships = Array.isArray(raw.memberships)
      ? (raw.memberships.filter(isObject) as Membership[])
      : [];

    const property = isObject(raw.property)
      ? (raw.property as Property)
      : null;

    return {
      user,
      status: AppStatus.Ready,
      step: AppStep.Done,
      memberships,
      activePropertyId:
        typeof raw.active_property_id === "string"
          ? raw.active_property_id
          : undefined,
      activeRole:
        typeof raw.active_role === "string" ? raw.active_role : undefined,
      property,
    };
  }

  return {
    user,
    status: AppStatus.Onboarding,
    step: parseStep(raw.step),
    memberships: [],
  };
}
