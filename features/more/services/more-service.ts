import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import type { StaffInvitation, StaffMember } from "../models/staff";
import { parseDatabaseDate } from "@/lib/date-time";

function rpcMessage(value: Json, fallback: string) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (value.success === false || ("status" in value && value.status !== "success")) {
      throw new Error(typeof value.message === "string" ? value.message : fallback);
    }
  }
}

export async function getStaff(supabase: SupabaseClient<Database>, propertyId: string): Promise<StaffMember[]> {
  const { data: memberships, error } = await supabase.from("property_users").select("id,user_id,role,status").eq("property_id", propertyId);
  if (error) throw new Error(error.message);
  if (!memberships.length) return [];
  const { data: profiles, error: profileError } = await supabase.from("user_profiles").select("user_id,display_name,email,phone").in("user_id", memberships.map((item) => item.user_id));
  if (profileError) throw new Error(profileError.message);
  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
  return memberships.map((member) => {
    const profile = profileMap.get(member.user_id);
    return { id: member.id, userId: member.user_id, displayName: profile?.display_name ?? "Unknown", email: profile?.email ?? "", phone: profile?.phone ?? "", role: member.role ?? "other", status: member.status ?? "inactive" };
  });
}

export async function getInvitations(supabase: SupabaseClient<Database>, propertyId: string): Promise<StaffInvitation[]> {
  const { data, error } = await supabase.from("property_invitations").select("id,email,role,status,token,created_at").eq("property_id", propertyId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((item) => ({ id: item.id, email: item.email, role: item.role, status: item.status ?? "pending", token: item.token ?? "", createdAt: item.created_at ? parseDatabaseDate(item.created_at) : null }));
}

async function rpc(supabase: SupabaseClient<Database>, name: "remove_staff" | "delete_property_invitation" | "invite_staff", args: Record<string, string>, fallback: string) {
  const { data, error } = await supabase.rpc(name, args as never);
  if (error) throw new Error(error.message);
  rpcMessage(data, fallback);
}

export async function updateStaffStatus(supabase: SupabaseClient<Database>, propertyId: string, userId: string, status: string) {
  const { error } = await supabase.rpc("update_staff_status", { p_property_id: propertyId, p_staff_user_id: userId, p_status: status });
  if (error) throw new Error(error.message);
}

export async function changeStaffRole(
  supabase: SupabaseClient<Database>,
  propertyUserId: string,
  role: "manager" | "receptionist",
) {
  const { data: membership, error: membershipError } = await supabase
    .from("property_users")
    .select("property_id,user_id")
    .eq("id", propertyUserId)
    .single();

  if (membershipError) throw new Error(membershipError.message);

  const { data, error } = await supabase.rpc("change_staff_role", {
    p_property_id: membership.property_id,
    p_staff_user_id: membership.user_id,
    p_role: role,
  } as never);

  if (error) throw new Error(error.message);
  return data;
}

export const removeStaff = (client: SupabaseClient<Database>, propertyId: string, propertyUserId: string) => rpc(client, "remove_staff", { p_property_id: propertyId, p_property_user_id: propertyUserId }, "Failed to remove staff");
export const deleteInvitation = (client: SupabaseClient<Database>, propertyId: string, invitationId: string) => rpc(client, "delete_property_invitation", { p_property_id: propertyId, p_invitation_id: invitationId }, "Failed to delete invitation");
export const inviteStaff = (client: SupabaseClient<Database>, propertyId: string, email: string, role: string) => rpc(client, "invite_staff", { p_property_id: propertyId, p_email: email, p_role: role }, "Failed to send invitation");

export async function getMyAccount(supabase: SupabaseClient<Database>, propertyId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile, error }, { data: membership, error: membershipError }] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("property_users").select("role,status,created_at").eq("property_id", propertyId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (membershipError) throw new Error(membershipError.message);
  return profile ? { ...profile, role: membership?.role, status: membership?.status, joined_at: membership?.created_at } : null;
}

export async function getProperty(supabase: SupabaseClient<Database>, propertyId: string) {
  const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
