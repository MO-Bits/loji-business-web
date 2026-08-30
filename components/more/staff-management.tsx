"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
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
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
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
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { useLanguage } from "@/components/providers/language-provider";
import { trackEvent } from "@/lib/analytics";

export function StaffManagement() {
  const { t } = useLanguage();
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
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const visibleStaff = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return staff.filter((member) => {
      const matchesRole = roleFilter === "all" || member.role.toLowerCase() === roleFilter;
      const matchesQuery = !normalized || member.displayName.toLowerCase().includes(normalized) || member.email.toLowerCase().includes(normalized);
      return matchesRole && matchesQuery;
    });
  }, [query, roleFilter, staff]);
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
    <Container maxWidth="lg" sx={{ py: { xs: 1.75, sm: 2.5, lg: 3 } }}>
      <Stack spacing={{ xs: 1.5, sm: 2 }}>
        <Typography component="h1" variant="h4">
          {t("Staff", "Wafanyakazi")}
        </Typography>
        <Paper variant="outlined">
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={`${t("Staff", "Wafanyakazi")} (${staff.length})`} />
            <Tab
              label={`${t("Invitations", "Mialiko")} (${invitations.length})`}
            />
          </Tabs>
        </Paper>
        {tab === 0 ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search staff", "Tafuta wafanyakazi")}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl size="small" sx={{ minWidth: { sm: 180 } }}>
              <InputLabel>{t("Role", "Jukumu")}</InputLabel>
              <Select
                value={roleFilter}
                label={t("Role", "Jukumu")}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <MenuItem value="all">{t("All roles", "Majukumu yote")}</MenuItem>
                <MenuItem value="owner">{t("Owner", "Mmiliki")}</MenuItem>
                <MenuItem value="manager">{t("Manager", "Meneja")}</MenuItem>
                <MenuItem value="receptionist">{t("Receptionist", "Mapokezi")}</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        ) : null}
        {loading ? (
          <Stack spacing={1} aria-label={t("Loading staff", "Inapakia wafanyakazi")}>
            {[0, 1, 2, 3].map((item) => (
              <Paper key={item} variant="outlined" sx={{ alignItems: "center", display: "flex", gap: 1.5, p: 2 }}>
                <Skeleton height={42} variant="circular" width={42} />
                <Box sx={{ flex: 1 }}><Skeleton width="40%" /><Skeleton width="65%" /></Box>
                <Skeleton height={28} width={72} />
              </Paper>
            ))}
          </Stack>
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
            members={visibleStaff}
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
          trackEvent("staff_invited", { role });
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
      <Fab
        aria-label={t("Invite staff", "Alika mfanyakazi")}
        color="primary"
        disabled={!propertyId}
        onClick={() => setInviteOpen(true)}
        sx={{
          bottom: 18,
          display: { xs: "inline-flex", sm: "none" },
          position: "fixed",
          right: 18,
          zIndex: (theme) => theme.zIndex.speedDial,
        }}
      >
        <AddRoundedIcon />
      </Fab>
      <Fab
        aria-label={t("Invite staff", "Alika mfanyakazi")}
        color="primary"
        variant="extended"
        disabled={!propertyId}
        onClick={() => setInviteOpen(true)}
        sx={{
          bottom: 28,
          display: { xs: "none", sm: "inline-flex" },
          position: "fixed",
          right: 28,
          zIndex: (theme) => theme.zIndex.speedDial,
        }}
      >
        <AddRoundedIcon sx={{ mr: 1 }} />
        {t("Invite staff", "Alika mfanyakazi")}
      </Fab>
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
              (["manager", "receptionist"] as const).map((role) => (
                <MenuItem
                  key={role}
                  disabled={member.role === role}
                  onClick={() => {
                    setAnchor(null);
                    void action(
                      async () => { await changeStaffRole(supabase, member.id, role); },
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
  const { t } = useLanguage();
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
      <DialogTitle>{t("Invite staff member", "Alika mfanyakazi")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography color="text.secondary">
            {t(
              "Invite someone to join your property team. They will receive an invitation to accept.",
              "Alika mtu ajiunge na timu ya jengo lako. Atapokea mwaliko wa kukubali.",
            )}
          </Typography>
          <TextField
            label={t("Staff email address", "Barua pepe ya mfanyakazi")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            error={Boolean(email) && !valid}
            helperText={
              Boolean(email) && !valid
                ? t("Enter a valid email", "Weka barua pepe sahihi")
                : " "
            }
          />
          <FormControl fullWidth>
            <InputLabel>{t("Property role", "Jukumu")}</InputLabel>
            <Select
              value={role}
              label={t("Property role", "Jukumu")}
              onChange={(event) => setRole(event.target.value)}
            >
              <MenuItem value="manager">{t("Manager", "Meneja")}</MenuItem>
              <MenuItem value="receptionist">
                {t("Receptionist", "Mapokezi")}
              </MenuItem>
            </Select>
          </FormControl>
          <Alert severity="info" icon={false}>
            {role === "manager"
              ? t(
                  "Managers receive broad operational access for rooms, bookings and staff.",
                  "Mameneja hupata ruhusa pana za uendeshaji wa vyumba, uhifadhi na wafanyakazi.",
                )
              : t(
                  "Receptionists can manage daily bookings and guest operations without ownership access.",
                  "Wahudumu wa mapokezi husimamia uhifadhi na wageni bila ruhusa za umiliki.",
                )}
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t("Cancel", "Ghairi")}
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
          {loading
            ? t("Sending…", "Inatuma…")
            : t("Send invitation", "Tuma mwaliko")}
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
