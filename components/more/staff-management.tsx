"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Fab,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import {
  canDeleteInvitation,
  canManageStaff,
  type StaffInvitation,
  type StaffMember,
} from "@/features/more/models/staff";
import {
  changeStaffRole,
  deleteInvitation,
  getInvitations,
  getStaff,
  inviteStaff,
  removeStaff,
  updateStaffStatus,
} from "@/features/more/services/more-service";
import { formatLocalDateTime } from "@/lib/date-time";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveModal } from "@/components/shared/responsive-modal";

export function StaffManagement() {
  const router = useRouter();
  const { session } = useAppSession();
  const supabase = useMemo(() => createClient(), []);
  const propertyId = session?.activePropertyId;
  const currentRole = session?.activeRole ?? "";
  const currentUserId = session?.user?.id ?? "";
  const [tab, setTab] = useState(0);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const refresh = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const [nextStaff, nextInvitations] = await Promise.all([
        getStaff(supabase, propertyId),
        getInvitations(supabase, propertyId),
      ]);
      setStaff(nextStaff);
      setInvitations(nextInvitations);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load staff.",
      );
    } finally {
      setLoading(false);
    }
  }, [propertyId, supabase]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  const action = async (task: () => Promise<void>, success: string) => {
    try {
      await task();
      setMessage(success);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    }
  };
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 3.5, lg: 5 } }}>
      <Stack spacing={{ xs: 2.25, sm: 3 }}>
        <Button
          color="inherit"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => router.back()}
          sx={{ alignSelf: "flex-start" }}
        >
          Back
        </Button>
        <PageHeader
          eyebrow="Management"
          title="Staff"
          description="Manage access, roles, and invitations for your property team."
          action={
            <Fab
              color="primary"
              variant="extended"
              size="medium"
              disabled={!propertyId}
              onClick={() => setInviteOpen(true)}
            >
              <AddRoundedIcon sx={{ mr: 1 }} />
              Invite staff
            </Fab>
          }
        />
        <Paper variant="outlined">
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={`Current Staff (${staff.length})`} />
            <Tab label={`Invitations (${invitations.length})`} />
          </Tabs>
        </Paper>
        {loading ? (
          <Box sx={{ display: "grid", minHeight: 280, placeItems: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => void refresh()}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : tab === 0 ? (
          <StaffList
            members={staff}
            propertyId={propertyId ?? ""}
            currentRole={currentRole}
            currentUserId={currentUserId}
            action={action}
          />
        ) : (
          <InvitationList
            invitations={invitations}
            propertyId={propertyId ?? ""}
            currentRole={currentRole}
            action={action}
          />
        )}
      </Stack>
      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={async (email, role) => {
          if (!propertyId) return;
          await action(
            () => inviteStaff(supabase, propertyId, email, role),
            "Invitation sent successfully",
          );
          setInviteOpen(false);
        }}
      />
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
        onClose={() => setMessage(null)}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setMessage(null)}
          sx={{ fontWeight: 700 }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

function StaffList({
  members,
  propertyId,
  currentRole,
  currentUserId,
  action,
}: {
  members: StaffMember[];
  propertyId: string;
  currentRole: string;
  currentUserId: string;
  action: (task: () => Promise<void>, success: string) => Promise<void>;
}) {
  if (!members.length) return <Empty text="No staff members found" />;
  const groups = ["owner", "manager", "receptionist", "other"];
  return (
    <Stack spacing={3}>
      {groups.map((role) => {
        const list = members.filter(
          (member) =>
            member.role.toLowerCase() === role ||
            (role === "other" &&
              !groups.slice(0, 3).includes(member.role.toLowerCase())),
        );
        if (!list.length) return null;
        return (
          <Box key={role}>
            <Typography
              color="text.secondary"
              sx={{
                fontSize: ".76rem",
                fontWeight: 700,
                letterSpacing: ".1em",
                mb: 1,
              }}
            >
              {role === "other" ? "OTHER STAFF" : `${role.toUpperCase()}S`}
            </Typography>
            <Paper variant="outlined">
              {list.map((member, index) => (
                <Box key={member.id}>
                  {index > 0 && <Divider />}
                  <StaffRow
                    member={member}
                    manageable={canManageStaff(
                      currentUserId,
                      currentRole,
                      member,
                    )}
                    propertyId={propertyId}
                    action={action}
                  />
                </Box>
              ))}
            </Paper>
          </Box>
        );
      })}
    </Stack>
  );
}

function StaffRow({
  member,
  manageable,
  propertyId,
  action,
}: {
  member: StaffMember;
  manageable: boolean;
  propertyId: string;
  action: (task: () => Promise<void>, success: string) => Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const statusColor =
    member.status === "active"
      ? "success"
      : member.status === "suspended"
        ? "warning"
        : "default";
  return (
    <Stack
      direction="row"
      spacing={{ xs: 1.25, sm: 1.5 }}
      sx={{ alignItems: "center", p: { xs: 1.5, sm: 2 } }}
    >
      <Avatar sx={{ bgcolor: "primary.main" }}>
        {member.displayName[0]?.toUpperCase() || <PersonRoundedIcon />}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 700 }}>
          {member.displayName}
        </Typography>
        <Typography color="text.secondary" noWrap variant="caption">
          {member.email || member.phone || "No contact details"}
        </Typography>
      </Box>
      <Chip
        label={member.status.toUpperCase()}
        color={statusColor}
        size="small"
        sx={{ display: { xs: "none", sm: "inline-flex" } }}
      />
      {manageable && (
        <>
          <IconButton
            aria-label={`Manage ${member.displayName}`}
            onClick={(event) => setAnchor(event.currentTarget)}
          >
            <MoreVertRoundedIcon />
          </IconButton>
          <Menu
            anchorEl={anchor}
            open={Boolean(anchor)}
            onClose={() => setAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setAnchor(null);
                void action(
                  () =>
                    updateStaffStatus(
                      supabase,
                      propertyId,
                      member.userId,
                      member.status === "active" ? "suspended" : "active",
                    ),
                  member.status === "active"
                    ? "Staff suspended successfully"
                    : "Staff activated successfully",
                );
              }}
            >
              {member.status === "active" ? "Suspend" : "Activate"}
            </MenuItem>
            {member.role !== "owner" &&
              ["manager", "receptionist"].map((role) => (
                <MenuItem
                  key={role}
                  disabled={member.role === role}
                  onClick={() => {
                    setAnchor(null);
                    void action(
                      () => changeStaffRole(supabase, member.id, role),
                      "Staff role changed successfully",
                    );
                  }}
                >
                  Make {role}
                </MenuItem>
              ))}
            <MenuItem
              sx={{ color: "error.main" }}
              onClick={() => {
                setAnchor(null);
                setConfirmRemove(true);
              }}
            >
              Remove staff
            </MenuItem>
          </Menu>
          <ConfirmDialog
            open={confirmRemove}
            title="Remove staff member?"
            message={`${member.displayName} will lose access to this property.`}
            action="Remove"
            onClose={() => setConfirmRemove(false)}
            onConfirm={() => {
              setConfirmRemove(false);
              void action(
                () => removeStaff(supabase, propertyId, member.id),
                "Staff removed successfully",
              );
            }}
          />
        </>
      )}
    </Stack>
  );
}

function InvitationList({
  invitations,
  propertyId,
  currentRole,
  action,
}: {
  invitations: StaffInvitation[];
  propertyId: string;
  currentRole: string;
  action: (task: () => Promise<void>, success: string) => Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [deleteTarget, setDeleteTarget] = useState<StaffInvitation | null>(
    null,
  );
  if (!invitations.length) return <Empty text="No staff invitations found" />;
  return (
    <Paper variant="outlined">
      {invitations.map((invitation, index) => (
        <Box key={invitation.id}>
          {index > 0 && <Divider />}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "center" }, p: 2 }}
          >
            <Avatar>
              <EmailRoundedIcon />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: 700 }}>
                {invitation.email}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                {invitation.role} ·{" "}
                {invitation.createdAt
                  ? formatLocalDateTime(invitation.createdAt)
                  : ""}
              </Typography>
              <Box
                sx={{
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  display: "inline-flex",
                  mt: 1,
                  px: 1.25,
                  py: 0.6,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: "monospace",
                    fontSize: ".82rem",
                    fontWeight: 700,
                    letterSpacing: ".08em",
                  }}
                >
                  CODE · {invitation.token || "Unavailable"}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={invitation.status.toUpperCase()}
              color={invitation.status === "pending" ? "warning" : "default"}
              size="small"
            />
            {canDeleteInvitation(currentRole, invitation) && (
              <IconButton
                color="error"
                aria-label="Delete invitation"
                onClick={() => setDeleteTarget(invitation)}
              >
                <DeleteOutlineRoundedIcon />
              </IconButton>
            )}
          </Stack>
        </Box>
      ))}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete invitation?"
        message={`The invitation for ${deleteTarget?.email ?? "this email"} will be permanently deleted.`}
        action="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target)
            void action(
              () => deleteInvitation(supabase, propertyId, target.id),
              "Invitation deleted successfully",
            );
        }}
      />
    </Paper>
  );
}

function InviteDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string, role: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("receptionist");
  const [loading, setLoading] = useState(false);
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  return (
    <ResponsiveModal
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
    >
      <DialogTitle>Invite Staff Member</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography color="text.secondary">
            Invite someone to join your property team. They will receive an
            invitation to accept.
          </Typography>
          <TextField
            label="Staff email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            error={Boolean(email) && !valid}
            helperText={Boolean(email) && !valid ? "Enter a valid email" : " "}
          />
          <FormControl fullWidth>
            <InputLabel>Property role</InputLabel>
            <Select
              value={role}
              label="Property role"
              onChange={(event) => setRole(event.target.value)}
            >
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="receptionist">Receptionist</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={
            loading ? <CircularProgress size={18} /> : <SendRoundedIcon />
          }
          disabled={!valid || loading}
          onClick={async () => {
            setLoading(true);
            try {
              await onSubmit(email.trim(), role);
              setEmail("");
              setRole("receptionist");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Sending…" : "Send Invitation"}
        </Button>
      </DialogActions>
    </ResponsiveModal>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  action,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  action: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ResponsiveModal open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          {action}
        </Button>
      </DialogActions>
    </ResponsiveModal>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 5, textAlign: "center" }}>
      <Typography color="text.secondary">{text}</Typography>
    </Paper>
  );
}
