import { parseDatabaseDate } from "@/lib/date-time";

export type TeamRole = "owner" | "manager" | "receptionist" | "member";
export type TeamMemberStatus = "active" | "suspended";
export type TeamInvitationStatus =
  "pending" | "accepted" | "expired" | "revoked" | "cancelled";

export type StaffMember = {
  id: string;
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role: TeamRole;
  status: TeamMemberStatus;
  joinedAt: Date | null;
  isCurrentUser: boolean;
  isOwner: boolean;
  assignableRoles: TeamRole[];
  allowedActions: {
    activate: boolean;
    changeRole: boolean;
    remove: boolean;
    suspend: boolean;
  };
};

export type StaffInvitation = {
  id: string;
  email: string;
  code: string;
  role: TeamRole;
  status: TeamInvitationStatus;
  createdAt: Date | null;
  expiresAt: Date | null;
  invitedByName: string;
  allowedActions: {
    resend: boolean;
    revoke: boolean;
  };
};

export type TeamAccessCapabilities = {
  inviteStaff: boolean;
  manageInvitations: boolean;
  manageMembers: boolean;
  inviteRoles: TeamRole[];
};

export type TeamAccessWorkspace = {
  propertyId: string;
  propertyName: string;
  role: TeamRole;
  capabilities: TeamAccessCapabilities;
  summary: {
    total: number;
    active: number;
    suspended: number;
    pendingInvitations: number;
  };
  members: StaffMember[];
  invitations: StaffInvitation[];
};

type Row = Record<string, unknown>;

const row = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};

const rows = (value: unknown) => (Array.isArray(value) ? value.map(row) : []);
const text = (value: unknown) => (value == null ? "" : String(value));
const number = (value: unknown) => Number(value ?? 0);
const bool = (value: unknown) => value === true;

const date = (value: unknown): Date | null => {
  if (!value) return null;
  const parsed = parseDatabaseDate(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function teamRole(value: unknown): TeamRole {
  const role = text(value).trim().toLowerCase();
  return role === "owner" || role === "manager" || role === "receptionist"
    ? role
    : "member";
}

function memberStatus(value: unknown): TeamMemberStatus {
  return text(value).trim().toLowerCase() === "active" ? "active" : "suspended";
}

function invitationStatus(value: unknown): TeamInvitationStatus {
  const status = text(value).trim().toLowerCase();
  return ["pending", "accepted", "expired", "revoked", "cancelled"].includes(
    status,
  )
    ? (status as TeamInvitationStatus)
    : "pending";
}

function stringList(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  return Object.entries(row(value))
    .filter(([, enabled]) => bool(enabled))
    .map(([name]) => name);
}

function roleList(value: unknown): TeamRole[] {
  return stringList(value)
    .map(teamRole)
    .filter((role): role is Exclude<TeamRole, "member"> => role !== "member");
}

function parseMember(value: unknown): StaffMember {
  const item = row(value);
  const profile = row(item.profile);
  const allowed = stringList(item.allowed_actions);
  const membershipId = text(item.membership_id ?? item.id);
  const userId = text(item.user_id ?? profile.user_id);

  return {
    id: membershipId,
    membershipId,
    userId,
    displayName:
      text(item.name ?? item.display_name ?? profile.display_name).trim() ||
      "Team member",
    email: text(item.email ?? profile.email),
    phone: text(item.phone ?? profile.phone),
    avatarUrl: text(item.image_url ?? item.avatar_url ?? profile.image_url),
    role: teamRole(item.role),
    status: memberStatus(item.status),
    joinedAt: date(item.joined_at ?? item.created_at),
    isCurrentUser: bool(item.is_current_user),
    isOwner: bool(item.is_owner) || teamRole(item.role) === "owner",
    assignableRoles: roleList(item.assignable_roles),
    allowedActions: {
      activate: allowed.includes("activate"),
      changeRole: allowed.includes("change_role"),
      remove: allowed.includes("remove"),
      suspend: allowed.includes("suspend"),
    },
  };
}

function parseInvitation(value: unknown): StaffInvitation {
  const item = row(value);
  const allowed = stringList(item.allowed_actions);
  return {
    id: text(item.id ?? item.invitation_id),
    email: text(item.email),
    code: text(item.code),
    role: teamRole(item.role),
    status: invitationStatus(item.status),
    createdAt: date(item.created_at),
    expiresAt: date(item.expires_at),
    invitedByName:
      text(item.invited_by_name ?? item.created_by_name).trim() ||
      "Team administrator",
    allowedActions: {
      resend: allowed.includes("resend"),
      revoke: allowed.includes("revoke") || allowed.includes("cancel"),
    },
  };
}

export function parseTeamAccessWorkspace(value: unknown): TeamAccessWorkspace {
  const root = row(value);
  const property = row(root.property);
  const capabilities = row(root.capabilities);
  const summary = row(root.summary);
  const members = rows(root.members ?? root.staff).map(parseMember);
  const invitations = rows(root.invitations).map(parseInvitation);

  return {
    propertyId: text(property.id ?? root.property_id),
    propertyName: text(property.name ?? root.property_name),
    role: teamRole(root.role),
    capabilities: {
      inviteStaff: bool(capabilities.invite_staff),
      manageInvitations: bool(capabilities.manage_invitations),
      manageMembers: bool(capabilities.manage_members),
      inviteRoles: roleList(capabilities.invite_roles),
    },
    summary: {
      total: number(summary.total) || members.length,
      active:
        number(summary.active) ||
        members.filter((member) => member.status === "active").length,
      suspended:
        number(summary.suspended) ||
        members.filter((member) => member.status === "suspended").length,
      pendingInvitations:
        number(summary.pending_invitations) ||
        invitations.filter((invitation) => invitation.status === "pending")
          .length,
    },
    members,
    invitations,
  };
}

/** Compatibility helpers for callers outside the Team & Access workspace. */
export function canManageStaff(
  _currentUserId: string,
  _currentRole: string,
  member: StaffMember,
) {
  return Object.values(member.allowedActions).some(Boolean);
}

export function canDeleteInvitation(
  _currentRole: string,
  invitation: StaffInvitation,
) {
  return invitation.allowedActions.revoke;
}
