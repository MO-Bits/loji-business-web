export type WorkspaceRole = "owner" | "manager" | "receptionist" | "member";

export type WorkspaceCapabilities = {
  canCheckIn: boolean;
  canCheckout: boolean;
  canCreateBooking: boolean;
  canManageProperty: boolean;
  canManageRooms: boolean;
  canManageStaff: boolean;
  canRecordPayment: boolean;
  canReversePayment: boolean;
  canViewActivity: boolean;
  canViewBookings: boolean;
  canViewCalendar: boolean;
  canViewFinance: boolean;
  canViewGuests: boolean;
  canViewNotifications: boolean;
  canViewOperations: boolean;
  canViewReports: boolean;
  canViewRooms: boolean;
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
    canReversePayment: true,
    canViewActivity: true,
    canViewBookings: true,
    canViewCalendar: true,
    canViewFinance: true,
    canViewGuests: true,
    canViewNotifications: true,
    canViewOperations: true,
    canViewReports: true,
    canViewRooms: true,
  },
  manager: {
    canCheckIn: true,
    canCheckout: true,
    canCreateBooking: true,
    canManageProperty: true,
    canManageRooms: true,
    canManageStaff: true,
    canRecordPayment: true,
    canReversePayment: true,
    canViewActivity: true,
    canViewBookings: true,
    canViewCalendar: true,
    canViewFinance: true,
    canViewGuests: true,
    canViewNotifications: true,
    canViewOperations: true,
    canViewReports: false,
    canViewRooms: true,
  },
  receptionist: {
    canCheckIn: true,
    canCheckout: false,
    canCreateBooking: true,
    canManageProperty: false,
    canManageRooms: false,
    canManageStaff: false,
    canRecordPayment: true,
    canReversePayment: false,
    canViewActivity: false,
    canViewBookings: true,
    canViewCalendar: true,
    canViewFinance: false,
    canViewGuests: true,
    canViewNotifications: true,
    canViewOperations: true,
    canViewReports: false,
    canViewRooms: true,
  },
  member: {
    canCheckIn: false,
    canCheckout: false,
    canCreateBooking: false,
    canManageProperty: false,
    canManageRooms: false,
    canManageStaff: false,
    canRecordPayment: false,
    canReversePayment: false,
    canViewActivity: false,
    canViewBookings: false,
    canViewCalendar: false,
    canViewFinance: false,
    canViewGuests: false,
    canViewNotifications: false,
    canViewOperations: false,
    canViewReports: false,
    canViewRooms: false,
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
