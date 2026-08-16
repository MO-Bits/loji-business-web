export type StaffMember = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
};

export type StaffInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  createdAt: Date | null;
};

export function canManageStaff(currentUserId: string, currentRole: string, member: StaffMember) {
  if (currentUserId === member.userId) return false;
  if (currentRole.toLowerCase() === "owner") return member.role.toLowerCase() !== "owner";
  if (currentRole.toLowerCase() === "manager") return member.role.toLowerCase() === "receptionist";
  return false;
}

export function canDeleteInvitation(currentRole: string, invitation: StaffInvitation) {
  return invitation.status.toLowerCase() === "pending" && ["owner", "manager"].includes(currentRole.toLowerCase());
}
