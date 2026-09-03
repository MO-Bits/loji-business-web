import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  parseTeamAccessWorkspace,
  type TeamAccessWorkspace,
  type TeamMemberStatus,
  type TeamRole,
} from "../models/staff";

type RpcResponse = {
  data: unknown;
  error: { message: string } | null;
};

type JsonRpc = (
  name: string,
  args?: Record<string, unknown>,
) => PromiseLike<RpcResponse>;

function resultObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function callTeamRpc(
  client: SupabaseClient<Database>,
  name: string,
  args: Record<string, unknown>,
  fallback: string,
) {
  const call = client.rpc.bind(client) as unknown as JsonRpc;
  const { data, error } = await call(name, args);
  if (error) throw new Error(error.message);
  const result = resultObject(data);
  if (result.success === false) {
    throw new Error(
      typeof result.message === "string" ? result.message : fallback,
    );
  }
  return result;
}

export async function getTeamAccessWorkspace(
  client: SupabaseClient<Database>,
  propertyId: string,
): Promise<TeamAccessWorkspace> {
  const result = await callTeamRpc(
    client,
    "get_team_access_workspace",
    { p_property_id: propertyId },
    "Unable to load team access.",
  );
  return parseTeamAccessWorkspace(result);
}

export async function updateStaffStatus(
  client: SupabaseClient<Database>,
  propertyId: string,
  userId: string,
  status: TeamMemberStatus,
) {
  return callTeamRpc(
    client,
    "update_staff_status",
    {
      p_property_id: propertyId,
      p_staff_user_id: userId,
      p_status: status,
    },
    "Unable to update team member access.",
  );
}

export async function changeStaffRole(
  client: SupabaseClient<Database>,
  propertyId: string,
  staffUserId: string,
  role: TeamRole,
) {
  return callTeamRpc(
    client,
    "change_staff_role",
    {
      p_property_id: propertyId,
      p_staff_user_id: staffUserId,
      p_role: role,
    },
    "Unable to change team member role.",
  );
}

export function removeStaff(
  client: SupabaseClient<Database>,
  propertyId: string,
  propertyUserId: string,
) {
  return callTeamRpc(
    client,
    "remove_staff",
    {
      p_property_id: propertyId,
      p_property_user_id: propertyUserId,
    },
    "Unable to remove team member.",
  );
}

export function addStaffAccess(
  client: SupabaseClient<Database>,
  propertyId: string,
  email: string,
  role: TeamRole,
) {
  return callTeamRpc(
    client,
    "invite_staff",
    {
      p_property_id: propertyId,
      p_email: email.trim(),
      p_role: role,
    },
    "Unable to add email access.",
  );
}

export function removePendingStaffAccess(
  client: SupabaseClient<Database>,
  propertyId: string,
  pendingAccessId: string,
) {
  return callTeamRpc(
    client,
    "cancel_staff_invitation",
    {
      p_property_id: propertyId,
      p_invitation_id: pendingAccessId,
    },
    "Unable to remove pending access.",
  );
}
