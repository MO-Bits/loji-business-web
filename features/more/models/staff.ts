import { parseDatabaseDate } from "@/lib/date-time";

export type TeamRole = "owner" | "manager" | "receptionist" | "member";
export type TeamMemberStatus = "active" | "suspended";
export type PendingAccessStatus =
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

export type PendingStaffAccess = {
  id: string;
  email: string;
  role: TeamRole;
  status: PendingAccessStatus;
  createdAt: Date | null;
  expiresAt: Date | null;
  addedByName: string;
  allowedActions: {
    remove: boolean;
  };
};

export type TeamAccessCapabilities = {
  addStaffAccess: boolean;
  managePendingAccess: boolean;
  manageMembers: boolean;
  assignableRoles: TeamRole[];
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
    pendingAccess: number;
  };
  members: StaffMember[];
  pendingAccess: PendingStaffAccess[];
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

function pendingAccessStatus(value: unknown): PendingAccessStatus {
  const status = text(value).trim().toLowerCase();
  return ["pending", "accepted", "expired", "revoked", "cancelled"].includes(
    status,
  )
    ? (status as PendingAccessStatus)
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

function parsePendingAccess(value: unknown): PendingStaffAccess {
  const item = row(value);
  const allowed = stringList(item.allowed_actions);
  return {
    id: text(item.id ?? item.invitation_id),
    email: text(item.email),
    role: teamRole(item.role),
    status: pendingAccessStatus(item.status),
    createdAt: date(item.created_at),
    expiresAt: date(item.expires_at),
    addedByName:
      text(item.invited_by_name ?? item.created_by_name).trim() ||
      "Team administrator",
    allowedActions: {
      remove: allowed.includes("revoke") || allowed.includes("cancel"),
    },
  };
}

export function parseTeamAccessWorkspace(value: unknown): TeamAccessWorkspace {
  const root = row(value);
  const property = row(root.property);
  const capabilities = row(root.capabilities);
  const summary = row(root.summary);
  const members = rows(root.members ?? root.staff).map(parseMember);
  // The database currently returns `invitations`; keep accepting it while the
  // product presents this workflow as code-free pending email access.
  const pendingAccess = rows(root.pending_access ?? root.invitations).map(
    parsePendingAccess,
  );

  return {
    propertyId: text(property.id ?? root.property_id),
    propertyName: text(property.name ?? root.property_name),
    role: teamRole(root.role),
    capabilities: {
      addStaffAccess: bool(
        capabilities.add_staff_access ?? capabilities.invite_staff,
      ),
      managePendingAccess: bool(
        capabilities.manage_pending_access ?? capabilities.manage_invitations,
      ),
      manageMembers: bool(capabilities.manage_members),
      assignableRoles: roleList(
        capabilities.assignable_roles ?? capabilities.invite_roles,
      ),
    },
    summary: {
      total: number(summary.total) || members.length,
      active:
        number(summary.active) ||
        members.filter((member) => member.status === "active").length,
      suspended:
        number(summary.suspended) ||
        members.filter((member) => member.status === "suspended").length,
      pendingAccess:
        number(summary.pending_access ?? summary.pending_invitations) ||
        pendingAccess.filter((access) => access.status === "pending").length,
    },
    members,
    pendingAccess,
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

export function canRemovePendingAccess(
  _currentRole: string,
  access: PendingStaffAccess,
) {
  return access.allowedActions.remove;
}
