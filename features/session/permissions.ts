export type WorkspaceRole = "owner" | "manager" | "receptionist" | "member";

export type WorkspaceCapabilities = {
  canCheckIn: boolean;
  canCheckout: boolean;
  canCreateBooking: boolean;
  canManageProperty: boolean;
  canManageRooms: boolean;
  canManageStaff: boolean;
  canRecordPayment: boolean;
  canViewFinance: boolean;
};

const roleCapabilities: Record<WorkspaceRole, WorkspaceCapabilities> = {
  owner: {
    canCheckIn: true,
    canCheckout: true,
    canCreateBooking: true,
    canManageProperty: true,
    canManageRooms: true,
    canManageStaff: true,
    canRecordPayment: true,
    canViewFinance: true,
  },
  manager: {
    canCheckIn: true,
    canCheckout: true,
    canCreateBooking: true,
    canManageProperty: true,
    canManageRooms: true,
    canManageStaff: true,
    canRecordPayment: false,
    canViewFinance: false,
  },
  receptionist: {
    canCheckIn: true,
    canCheckout: false,
    canCreateBooking: true,
    canManageProperty: false,
    canManageRooms: false,
    canManageStaff: false,
    canRecordPayment: false,
    canViewFinance: false,
  },
  member: {
    canCheckIn: false,
    canCheckout: false,
    canCreateBooking: false,
    canManageProperty: false,
    canManageRooms: false,
    canManageStaff: false,
    canRecordPayment: false,
    canViewFinance: false,
  },
};

export function normalizeWorkspaceRole(role?: string | null): WorkspaceRole {
  const normalized = role?.trim().toLowerCase();
  return normalized === "owner" || normalized === "manager" || normalized === "receptionist"
    ? normalized
    : "member";
}

export function getWorkspaceCapabilities(
  role?: string | null,
): WorkspaceCapabilities {
  return roleCapabilities[normalizeWorkspaceRole(role)];
}
