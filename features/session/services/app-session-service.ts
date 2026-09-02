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

function parseProperty(value: unknown): Property | null {
  return isObject(value) ? (value as Property) : null;
}

function parseMembership(value: unknown): Membership | null {
  if (!isObject(value)) return null;

  return {
    ...value,
    id: typeof value.id === "string" ? value.id : undefined,
    property: parseProperty(value.property),
    property_id:
      typeof value.property_id === "string" ? value.property_id : undefined,
    role: typeof value.role === "string" ? value.role : undefined,
  } as Membership;
}

async function getCurrentUser(
  supabase: SupabaseClient<Database>,
): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Unable to verify the authenticated user: ${error.message}`);
  }

  return user;
}

export async function evaluateAppSession(
  supabase: SupabaseClient<Database>,
): Promise<AppSession> {
  const initial = await supabase.rpc("get_app_session");

  if (initial.error) {
    throw new Error(initial.error.message);
  }

  let raw = initial.data;

  if (!isObject(raw)) {
    throw new Error("The server returned an invalid application session.");
  }

  if (raw.step === "invitation" || raw.has_pending_invitation === true) {
    const { error: claimError } = await supabase.rpc(
      "claim_email_property_access",
    );
    if (claimError) throw new Error(claimError.message);

    const refreshed = await supabase.rpc("get_app_session");
    if (refreshed.error) throw new Error(refreshed.error.message);
    if (!isObject(refreshed.data)) {
      throw new Error("The server returned an invalid application session.");
    }
    raw = refreshed.data;
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
  if (!user) {
    throw new Error("The authenticated user could not be verified. Sign in again to continue.");
  }
  const memberships = Array.isArray(raw.memberships)
    ? raw.memberships
        .map(parseMembership)
        .filter((membership): membership is Membership => Boolean(membership))
    : [];
  const property = parseProperty(raw.property);
  const activePropertyId =
    typeof raw.active_property_id === "string"
      ? raw.active_property_id
      : undefined;
  const activeRole =
    typeof raw.active_role === "string" ? raw.active_role : undefined;

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
    return {
      user,
      status: AppStatus.Ready,
      step: AppStep.Done,
      memberships,
      activePropertyId,
      activeRole,
      property,
    };
  }

  return {
    user,
    status: AppStatus.Onboarding,
    step: parseStep(raw.step),
    memberships,
    activePropertyId,
    activeRole,
    property,
  };
}
