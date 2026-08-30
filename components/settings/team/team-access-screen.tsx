"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PersonOffRoundedIcon from "@mui/icons-material/PersonOffRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import {
  EmptyState,
  LoadingRows,
  MetricCell,
  StatusPill,
  StickyMobileActionBar,
  Surface,
} from "@/components/shared/workspace-ui";
import {
  BackToSettingsButton,
  SettingsPageHeader,
} from "@/components/settings/settings-shared";
import type {
  StaffInvitation,
  StaffMember,
  TeamAccessWorkspace,
  TeamRole,
} from "@/features/more/models/staff";
import {
  changeStaffRole,
  getTeamAccessWorkspace,
  inviteStaff,
  removeStaff,
  resendStaffInvitation,
  revokeStaffInvitation,
  updateStaffStatus,
} from "@/features/more/services/more-service";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { formatLocalDateTime } from "@/lib/date-time";
import { createClient } from "@/lib/supabase/client";

type TeamTab = "members" | "invitations" | "roles";
type Translator = (english: string, swahili: string) => string;
type MemberAction = "activate" | "change_role" | "remove" | "suspend";
type InvitationAction = "resend" | "revoke";

type MemberActionTarget = {
  action: MemberAction;
  member: StaffMember;
  propertyId: string;
};

type InvitationActionTarget = {
  action: InvitationAction;
  invitation: StaffInvitation;
  propertyId: string;
};

const roleOrder: TeamRole[] = ["owner", "manager", "receptionist"];
const TEAM_PAGE_SIZE_OPTIONS = [10, 25, 50];

function roleLabel(role: TeamRole, t: Translator) {
  if (role === "owner") return t("Owner", "Mmiliki");
  if (role === "manager") return t("Manager", "Meneja");
  if (role === "receptionist") return t("Receptionist", "Mapokezi");
  return t("Member", "Mshiriki");
}

function roleDescription(role: TeamRole, t: Translator) {
  if (role === "owner") {
    return t(
      "Full control of operations, finance, property settings, and team access.",
      "Udhibiti kamili wa uendeshaji, fedha, mipangilio ya biashara na ruhusa za timu.",
    );
  }
  if (role === "manager") {
    return t(
      "Runs daily operations and can manage receptionist access, without financial reporting.",
      "Huendesha shughuli za kila siku na kusimamia ruhusa za mapokezi, bila taarifa za fedha.",
    );
  }
  return t(
    "Handles front-desk bookings, guests, arrivals, and room visibility.",
    "Hushughulikia nafasi, wageni, wanaowasili na mwonekano wa vyumba mapokezi.",
  );
}

function statusLabel(status: StaffMember["status"], t: Translator) {
  return status === "active"
    ? t("Active", "Hai")
    : t("Suspended", "Imesimamishwa");
}

function initials(member: StaffMember) {
  const value = member.displayName || member.email;
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function hasMemberActions(member: StaffMember) {
  return Object.values(member.allowedActions).some(Boolean);
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.focus();
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Copy is not supported by this browser.");
}

export function TeamAccessScreen() {
  const { t } = useLanguage();
  const theme = useTheme();
  const isDirectoryDesktop = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: false,
  });
  const showHeaderInvite = useMediaQuery(theme.breakpoints.up("sm"), {
    defaultMatches: false,
  });
  const feedback = useAppFeedback();
  const { session, loading: sessionLoading } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const propertyId = session?.activePropertyId;
  const localCapabilities = getWorkspaceCapabilities(session?.activeRole);
  const requestId = useRef(0);
  const activePropertyId = useRef<string | undefined>(undefined);
  const [workspaceState, setWorkspace] = useState<TeamAccessWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ propertyId?: string; message: string } | null>(null);
  const [tab, setTab] = useState<TeamTab>("members");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<TeamRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<
    StaffMember["status"] | "all"
  >("all");
  const [memberPage, setMemberPage] = useState(0);
  const [memberRowsPerPage, setMemberRowsPerPage] = useState(10);
  const [invitationPage, setInvitationPage] = useState(0);
  const [invitationRowsPerPage, setInvitationRowsPerPage] = useState(10);
  const [invitePropertyId, setInvitePropertyId] = useState<string | null>(null);
  const [memberAction, setMemberAction] = useState<MemberActionTarget | null>(
    null,
  );
  const [invitationAction, setInvitationAction] =
    useState<InvitationActionTarget | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const workspace = workspaceState && workspaceState.propertyId === propertyId ? workspaceState : null;
  const error = errorState && errorState.propertyId === propertyId ? errorState.message : null;
  const dataLoading = loading || Boolean(workspaceState && workspaceState.propertyId !== propertyId);
  const inviteOpen = Boolean(propertyId && invitePropertyId === propertyId);
  const activeMemberAction = memberAction?.propertyId === propertyId ? memberAction : null;
  const activeInvitationAction = invitationAction?.propertyId === propertyId ? invitationAction : null;

  useEffect(() => {
    activePropertyId.current = propertyId;
    return () => {
      activePropertyId.current = undefined;
    };
  }, [propertyId]);

  const refresh = useCallback(
    async (silent = false) => {
      if (!propertyId) return;
      const requestPropertyId = propertyId;
      const currentRequest = ++requestId.current;
      if (!silent) setLoading(true);
      setErrorState(null);
      setWorkspace((current) => current?.propertyId === requestPropertyId ? current : null);
      try {
        const nextWorkspace = await getTeamAccessWorkspace(client, requestPropertyId);
        if (currentRequest === requestId.current && activePropertyId.current === requestPropertyId) setWorkspace(nextWorkspace);
      } catch (cause) {
        if (currentRequest === requestId.current && activePropertyId.current === requestPropertyId) {
          setErrorState({
            propertyId: requestPropertyId,
            message: cause instanceof Error
              ? cause.message
              : t(
                  "Unable to load team access.",
                  "Imeshindikana kupakia ruhusa za timu.",
                ),
          });
        }
      } finally {
        if (currentRequest === requestId.current && activePropertyId.current === requestPropertyId) setLoading(false);
      }
    },
    [client, propertyId, t],
  );

  useEffect(() => {
    if (sessionLoading) return;
    const timer = window.setTimeout(() => {
      setInvitePropertyId(null);
      setMemberAction(null);
      setInvitationAction(null);
      setPendingKey(null);
      setMemberPage(0);
      setInvitationPage(0);
      if (!localCapabilities.canManageStaff || !propertyId) {
        requestId.current += 1;
        setWorkspace(null);
        setLoading(false);
        return;
      }
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [localCapabilities.canManageStaff, propertyId, refresh, sessionLoading]);

  const runAction = useCallback(
    async (key: string, task: () => Promise<unknown>, success: string) => {
      if (!propertyId || pendingKey) return false;
      const actionPropertyId = propertyId;
      setPendingKey(key);
      try {
        await task();
        if (activePropertyId.current !== actionPropertyId) return false;
        feedback.success(success);
        await refresh(true);
        return true;
      } catch (cause) {
        if (activePropertyId.current === actionPropertyId) {
          feedback.error(
            cause instanceof Error
              ? cause.message
              : t(
                  "The action could not be completed.",
                  "Hatua haikuweza kukamilika.",
                ),
          );
        }
        return false;
      } finally {
        if (activePropertyId.current === actionPropertyId) setPendingKey(null);
      }
    },
    [feedback, pendingKey, propertyId, refresh, t],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleMembers = useMemo(
    () =>
      workspace?.members.filter((member) => {
        const matchesQuery =
          !normalizedQuery ||
          member.displayName.toLowerCase().includes(normalizedQuery) ||
          member.email.toLowerCase().includes(normalizedQuery) ||
          member.phone.toLowerCase().includes(normalizedQuery);
        const matchesRole = roleFilter === "all" || member.role === roleFilter;
        const matchesStatus =
          statusFilter === "all" || member.status === statusFilter;
        return matchesQuery && matchesRole && matchesStatus;
      }) ?? [],
    [normalizedQuery, roleFilter, statusFilter, workspace?.members],
  );
  const visibleInvitations = useMemo(
    () =>
      workspace?.invitations.filter(
        (invitation) =>
          !normalizedQuery ||
          invitation.email.toLowerCase().includes(normalizedQuery) ||
          invitation.invitedByName.toLowerCase().includes(normalizedQuery) ||
          invitation.code.toLowerCase().includes(normalizedQuery),
      ) ?? [],
    [normalizedQuery, workspace?.invitations],
  );
  const safeMemberPage = Math.min(
    memberPage,
    Math.max(0, Math.ceil(visibleMembers.length / memberRowsPerPage) - 1),
  );
  const pagedMembers = useMemo(
    () => visibleMembers.slice(
      safeMemberPage * memberRowsPerPage,
      (safeMemberPage + 1) * memberRowsPerPage,
    ),
    [memberRowsPerPage, safeMemberPage, visibleMembers],
  );
  const safeInvitationPage = Math.min(
    invitationPage,
    Math.max(0, Math.ceil(visibleInvitations.length / invitationRowsPerPage) - 1),
  );
  const pagedInvitations = useMemo(
    () => visibleInvitations.slice(
      safeInvitationPage * invitationRowsPerPage,
      (safeInvitationPage + 1) * invitationRowsPerPage,
    ),
    [invitationRowsPerPage, safeInvitationPage, visibleInvitations],
  );

  const submitInvite = async (email: string, role: TeamRole) => {
    if (!propertyId) return false;
    const success = await runAction(
      `invite:${email}`,
      () => inviteStaff(client, propertyId, email, role),
      t(
        "Invitation created. Share its code with the teammate.",
        "Mwaliko umeundwa. Shiriki msimbo wake na mshiriki wa timu.",
      ),
    );
    if (success) {
      setInvitePropertyId(null);
      setTab("invitations");
      setQuery("");
      setInvitationPage(0);
    }
    return success;
  };

  const confirmMemberAction = async (role?: TeamRole) => {
    if (!activeMemberAction || !propertyId) return;
    const { action, member } = activeMemberAction;
    const tasks: Record<MemberAction, () => Promise<unknown>> = {
      activate: () =>
        updateStaffStatus(client, propertyId, member.userId, "active"),
      change_role: () =>
        changeStaffRole(client, propertyId, member.userId, role ?? member.role),
      remove: () => removeStaff(client, propertyId, member.membershipId),
      suspend: () =>
        updateStaffStatus(client, propertyId, member.userId, "suspended"),
    };
    const messages: Record<MemberAction, string> = {
      activate: t("Team member activated.", "Mshiriki wa timu amewezeshwa."),
      change_role: t(
        "Team member role updated.",
        "Jukumu la mshiriki limesasishwa.",
      ),
      remove: t("Team member removed.", "Mshiriki wa timu ameondolewa."),
      suspend: t("Team member suspended.", "Mshiriki wa timu amesimamishwa."),
    };
    const success = await runAction(
      `${action}:${member.membershipId}`,
      tasks[action],
      messages[action],
    );
    if (success) setMemberAction(null);
  };

  const confirmInvitationAction = async () => {
    if (!activeInvitationAction || !propertyId) return;
    const { action, invitation } = activeInvitationAction;
    const success = await runAction(
      `${action}:${invitation.id}`,
      action === "resend"
        ? () => resendStaffInvitation(client, propertyId, invitation.id)
        : () => revokeStaffInvitation(client, propertyId, invitation.id),
      action === "resend"
        ? t(
            "Invitation renewed with a new code.",
            "Mwaliko umefanywa upya kwa msimbo mpya.",
          )
        : t("Invitation revoked.", "Mwaliko umebatilishwa."),
    );
    if (success) setInvitationAction(null);
  };

  const copyInvitationCode = async (invitation: StaffInvitation) => {
    try {
      await copyText(invitation.code);
      feedback.success(
        t("Invitation code copied.", "Msimbo wa mwaliko umenakiliwa."),
      );
    } catch (cause) {
      feedback.error(
        cause instanceof Error
          ? cause.message
          : t("Unable to copy code.", "Imeshindikana kunakili msimbo."),
      );
    }
  };

  const shareInvitation = async (invitation: StaffInvitation) => {
    const message = t(
      `You have been invited to ${workspace?.propertyName || "Loji Business"} as ${roleLabel(invitation.role, t)}. Sign in with ${invitation.email} and use invitation code ${invitation.code}.`,
      `Umealikwa kwenye ${workspace?.propertyName || "Loji Business"} kama ${roleLabel(invitation.role, t)}. Ingia kwa ${invitation.email} na utumie msimbo wa mwaliko ${invitation.code}.`,
    );
    try {
      if (navigator.share) {
        await navigator.share({
          text: message,
          title: t("Loji Business invitation", "Mwaliko wa Loji Business"),
        });
      } else {
        await copyText(message);
        feedback.success(
          t("Invitation message copied.", "Ujumbe wa mwaliko umenakiliwa."),
        );
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      feedback.error(
        cause instanceof Error
          ? cause.message
          : t(
              "Unable to share invitation.",
              "Imeshindikana kushiriki mwaliko.",
            ),
      );
    }
  };

  if (sessionLoading) {
    return (
      <Surface padding={false}>
        <LoadingRows rows={6} />
      </Surface>
    );
  }

  if (!localCapabilities.canManageStaff) {
    return (
      <Stack spacing={2.5}>
        <BackToSettingsButton />
        <SettingsPageHeader
          description={t(
            "Team access is limited to property owners and managers.",
            "Ruhusa za timu zinapatikana kwa wamiliki na mameneja wa biashara pekee.",
          )}
          icon={<GroupsRoundedIcon />}
          title={t("Team & access", "Timu na ruhusa")}
        />
        <Surface padding={false}>
          <EmptyState
            description={t(
              "Ask a property owner to review your assigned role.",
              "Mwombe mmiliki wa biashara akague jukumu ulilopewa.",
            )}
            icon={<ShieldOutlinedIcon />}
            title={t(
              "Administrator access required",
              "Ruhusa ya msimamizi inahitajika",
            )}
          />
        </Surface>
      </Stack>
    );
  }

  if (!propertyId) {
    return (
      <Alert severity="info">
        {t(
          "Select a property to manage its team.",
          "Chagua biashara ili usimamie timu yake.",
        )}
      </Alert>
    );
  }

  const canInvite = workspace?.capabilities.inviteStaff ?? false;
  const summary = workspace?.summary;

  return (
    <Stack
      spacing={{ xs: 2.25, sm: 3 }}
      sx={{ pb: canInvite ? { xs: 9, sm: 0 } : 0 }}
    >
      <BackToSettingsButton />
      <SettingsPageHeader
        action={
          canInvite && showHeaderInvite ? (
            <Button
              onClick={() => propertyId && setInvitePropertyId(propertyId)}
              startIcon={<AddRoundedIcon />}
              variant="contained"
            >
              {t("Invite teammate", "Alika mshiriki")}
            </Button>
          ) : undefined
        }
        description={t(
          "Give every teammate the access they need, and nothing they do not.",
          "Mpe kila mshiriki ruhusa anazohitaji pekee.",
        )}
        eyebrow={
          workspace?.propertyName ||
          t("Workspace administration", "Usimamizi wa biashara")
        }
        icon={<GroupsRoundedIcon />}
        title={t("Team & access", "Timu na ruhusa")}
      />

      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.25, sm: 1.5 },
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
        }}
      >
        <MetricCell
          caption={t("Across this property", "Katika biashara hii")}
          icon={<GroupsRoundedIcon />}
          label={t("Team members", "Washiriki wa timu")}
          tone="info"
          value={summary?.total ?? 0}
        />
        <MetricCell
          caption={t("Can access the workspace", "Wanaweza kufikia mfumo")}
          icon={<CheckRoundedIcon />}
          label={t("Active", "Hai")}
          tone="success"
          value={summary?.active ?? 0}
        />
        <MetricCell
          caption={t(
            "Access temporarily blocked",
            "Ruhusa imesimamishwa kwa muda",
          )}
          icon={<PersonOffRoundedIcon />}
          label={t("Suspended", "Waliosimamishwa")}
          tone={summary?.suspended ? "warning" : "neutral"}
          value={summary?.suspended ?? 0}
        />
        <MetricCell
          caption={t("Waiting to be accepted", "Inasubiri kukubaliwa")}
          icon={<EmailRoundedIcon />}
          label={t("Pending invites", "Mialiko inayosubiri")}
          tone={summary?.pendingInvitations ? "warning" : "neutral"}
          value={summary?.pendingInvitations ?? 0}
        />
      </Box>

      <Surface padding={false}>
        <Tabs
          aria-label={t("Team access sections", "Sehemu za ruhusa za timu")}
          onChange={(_, next: TeamTab) => {
            setTab(next);
            setQuery("");
            setMemberPage(0);
            setInvitationPage(0);
          }}
          scrollButtons="auto"
          sx={{ px: { xs: 0.75, sm: 1.25 } }}
          value={tab}
          variant="scrollable"
        >
          <Tab
            label={`${t("Members", "Washiriki")} · ${workspace?.members.length ?? 0}`}
            value="members"
          />
          <Tab
            label={`${t("Invitations", "Mialiko")} · ${workspace?.invitations.length ?? 0}`}
            value="invitations"
          />
          <Tab
            label={t("Roles & permissions", "Majukumu na ruhusa")}
            value="roles"
          />
        </Tabs>
      </Surface>

      {error ? (
        <Alert
          action={
            <Button
              color="inherit"
              onClick={() => void refresh()}
              startIcon={<RefreshRoundedIcon />}
            >
              {t("Try again", "Jaribu tena")}
            </Button>
          }
          severity="error"
        >
          {error}
        </Alert>
      ) : null}

      {tab !== "roles" ? (
        <FilterBar
          onQueryChange={(value) => {
            setQuery(value);
            setMemberPage(0);
            setInvitationPage(0);
          }}
          onRoleChange={(value) => {
            setRoleFilter(value);
            setMemberPage(0);
          }}
          onStatusChange={(value) => {
            setStatusFilter(value);
            setMemberPage(0);
          }}
          query={query}
          role={roleFilter}
          showMemberFilters={tab === "members"}
          status={statusFilter}
        />
      ) : null}

      {dataLoading && !workspace ? (
        <Surface padding={false}>
          <LoadingRows rows={6} />
        </Surface>
      ) : tab === "members" ? (
        <MembersDirectory
          count={visibleMembers.length}
          desktop={isDirectoryDesktop}
          members={pagedMembers}
          onAction={(action, member) => propertyId && setMemberAction({ action, member, propertyId })}
          onPageChange={setMemberPage}
          onRowsPerPageChange={(value) => {
            setMemberRowsPerPage(value);
            setMemberPage(0);
          }}
          page={safeMemberPage}
          pendingKey={pendingKey}
          rowsPerPage={memberRowsPerPage}
        />
      ) : tab === "invitations" ? (
        <InvitationsDirectory
          count={visibleInvitations.length}
          desktop={isDirectoryDesktop}
          invitations={pagedInvitations}
          onAction={(action, invitation) =>
            propertyId && setInvitationAction({ action, invitation, propertyId })
          }
          onCopy={(invitation) => void copyInvitationCode(invitation)}
          onInvite={canInvite ? () => propertyId && setInvitePropertyId(propertyId) : undefined}
          onPageChange={setInvitationPage}
          onRowsPerPageChange={(value) => {
            setInvitationRowsPerPage(value);
            setInvitationPage(0);
          }}
          onShare={(invitation) => void shareInvitation(invitation)}
          page={safeInvitationPage}
          pendingKey={pendingKey}
          rowsPerPage={invitationRowsPerPage}
        />
      ) : (
        <RolesAndPermissions currentRole={workspace?.role ?? "member"} />
      )}

      <InviteTeamMemberModal
        inviteRoles={workspace?.capabilities.inviteRoles ?? []}
        onClose={() => setInvitePropertyId(null)}
        onSubmit={submitInvite}
        open={inviteOpen}
      />
      <MemberActionModal
        key={
          activeMemberAction
            ? `${activeMemberAction.action}:${activeMemberAction.member.membershipId}`
            : "closed"
        }
        onClose={() => setMemberAction(null)}
        onConfirm={confirmMemberAction}
        pending={Boolean(
          activeMemberAction &&
          pendingKey?.endsWith(activeMemberAction.member.membershipId),
        )}
        target={activeMemberAction}
      />
      <InvitationActionModal
        onClose={() => setInvitationAction(null)}
        onConfirm={confirmInvitationAction}
        pending={Boolean(
          activeInvitationAction &&
          pendingKey?.endsWith(activeInvitationAction.invitation.id),
        )}
        target={activeInvitationAction}
      />

      {canInvite && !showHeaderInvite ? (
        <Box>
          <StickyMobileActionBar>
            <Button
              fullWidth
              onClick={() => propertyId && setInvitePropertyId(propertyId)}
              startIcon={<AddRoundedIcon />}
              variant="contained"
            >
              {t("Invite teammate", "Alika mshiriki")}
            </Button>
          </StickyMobileActionBar>
        </Box>
      ) : null}
    </Stack>
  );
}

function FilterBar({
  onQueryChange,
  onRoleChange,
  onStatusChange,
  query,
  role,
  showMemberFilters,
  status,
}: {
  onQueryChange: (value: string) => void;
  onRoleChange: (value: TeamRole | "all") => void;
  onStatusChange: (value: StaffMember["status"] | "all") => void;
  query: string;
  role: TeamRole | "all";
  showMemberFilters: boolean;
  status: StaffMember["status"] | "all";
}) {
  const { t } = useLanguage();
  return (
    <Surface>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
        <TextField
          fullWidth
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={
            showMemberFilters
              ? t(
                  "Search by name, email, or phone",
                  "Tafuta kwa jina, barua pepe au simu",
                )
              : t("Search invitations", "Tafuta mialiko")
          }
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          value={query}
        />
        {showMemberFilters ? (
          <>
            <FormControl size="small" sx={{ minWidth: { md: 170 } }}>
              <InputLabel>{t("Role", "Jukumu")}</InputLabel>
              <Select
                label={t("Role", "Jukumu")}
                onChange={(event) =>
                  onRoleChange(event.target.value as TeamRole | "all")
                }
                value={role}
              >
                <MenuItem value="all">
                  {t("All roles", "Majukumu yote")}
                </MenuItem>
                {roleOrder.map((item) => (
                  <MenuItem key={item} value={item}>
                    {roleLabel(item, t)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { md: 170 } }}>
              <InputLabel>{t("Access", "Ruhusa")}</InputLabel>
              <Select
                label={t("Access", "Ruhusa")}
                onChange={(event) =>
                  onStatusChange(
                    event.target.value as StaffMember["status"] | "all",
                  )
                }
                value={status}
              >
                <MenuItem value="all">
                  {t("All access", "Ruhusa zote")}
                </MenuItem>
                <MenuItem value="active">{t("Active", "Hai")}</MenuItem>
                <MenuItem value="suspended">
                  {t("Suspended", "Imesimamishwa")}
                </MenuItem>
              </Select>
            </FormControl>
          </>
        ) : null}
      </Stack>
    </Surface>
  );
}

function MembersDirectory({
  count,
  desktop,
  members,
  onAction,
  onPageChange,
  onRowsPerPageChange,
  page,
  pendingKey,
  rowsPerPage,
}: {
  count: number;
  desktop: boolean;
  members: StaffMember[];
  onAction: (action: MemberAction, member: StaffMember) => void;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  page: number;
  pendingKey: string | null;
  rowsPerPage: number;
}) {
  const { t } = useLanguage();
  if (!count) {
    return (
      <Surface padding={false}>
        <EmptyState
          description={t(
            "Try a different search or filter. New teammates appear after accepting an invitation.",
            "Jaribu utafutaji au kichujio tofauti. Washiriki wapya huonekana baada ya kukubali mwaliko.",
          )}
          icon={<GroupsRoundedIcon />}
          title={t("No team members found", "Hakuna washiriki waliopatikana")}
        />
      </Surface>
    );
  }

  return (
    <Stack spacing={1.25}>
      {desktop ? (
        <Surface padding={false}>
        <TableContainer>
          <Table aria-label={t("Team members", "Washiriki wa timu")}>
            <TableHead>
              <TableRow>
                <TableCell>{t("Team member", "Mshiriki wa timu")}</TableCell>
                <TableCell>{t("Role", "Jukumu")}</TableCell>
                <TableCell>{t("Access", "Ruhusa")}</TableCell>
                <TableCell>{t("Joined", "Alijiunga")}</TableCell>
                <TableCell align="right">{t("Actions", "Hatua")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow hover key={member.membershipId}>
                  <TableCell>
                    <MemberIdentity member={member} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {roleLabel(member.role, t)}
                    </Typography>
                    <Typography color="text.secondary" variant="caption">
                      {member.isOwner
                        ? t(
                            "Protected owner access",
                            "Ruhusa ya mmiliki imelindwa",
                          )
                        : roleDescription(member.role, t)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      label={statusLabel(member.status, t)}
                      tone={member.status === "active" ? "success" : "warning"}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography color="text.secondary" variant="body2">
                      {formatLocalDateTime(member.joinedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <MemberActionMenu
                      member={member}
                      onAction={onAction}
                      pending={Boolean(
                        pendingKey?.endsWith(member.membershipId),
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </Surface>
      ) : (
        <Stack spacing={1.25}>
        {members.map((member) => (
          <Surface key={member.membershipId}>
            <Stack spacing={1.75}>
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ alignItems: "flex-start" }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <MemberIdentity member={member} />
                </Box>
                <MemberActionMenu
                  member={member}
                  onAction={onAction}
                  pending={Boolean(pendingKey?.endsWith(member.membershipId))}
                />
              </Stack>
              <Divider />
              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                }}
              >
                <LabeledValue
                  label={t("Role", "Jukumu")}
                  value={roleLabel(member.role, t)}
                />
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    {t("Access", "Ruhusa")}
                  </Typography>
                  <Box sx={{ mt: 0.35 }}>
                    <StatusPill
                      label={statusLabel(member.status, t)}
                      tone={member.status === "active" ? "success" : "warning"}
                    />
                  </Box>
                </Box>
              </Box>
              <Typography color="text.secondary" variant="caption">
                {member.isOwner
                  ? t(
                      "Owner access cannot be changed here.",
                      "Ruhusa ya mmiliki haiwezi kubadilishwa hapa.",
                    )
                  : roleDescription(member.role, t)}
              </Typography>
            </Stack>
          </Surface>
        ))}
        </Stack>
      )}
      <DirectoryPagination
        count={count}
        itemLabel="team members"
        itemLabelSwahili="washiriki wa timu"
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageLabel={t("Members per page", "Washiriki kwa ukurasa")}
      />
    </Stack>
  );
}

function MemberIdentity({ member }: { member: StaffMember }) {
  const { t } = useLanguage();
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{ alignItems: "center", minWidth: 0 }}
    >
      <Avatar
        alt={member.displayName}
        src={member.avatarUrl || undefined}
        sx={{
          bgcolor: "primary.main",
          fontSize: ".875rem",
          fontWeight: 700,
          height: 40,
          width: 40,
        }}
      >
        {initials(member)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: "center", flexWrap: "wrap" }}
        >
          <Typography noWrap variant="body2" sx={{ fontWeight: 700 }}>
            {member.displayName}
          </Typography>
          {member.isCurrentUser ? (
            <Chip label={t("You", "Wewe")} size="small" variant="outlined" />
          ) : null}
        </Stack>
        <Typography
          color="text.secondary"
          noWrap
          variant="caption"
          sx={{ display: "block" }}
        >
          {member.email ||
            member.phone ||
            t("No contact details", "Hakuna mawasiliano")}
        </Typography>
      </Box>
    </Stack>
  );
}

function MemberActionMenu({
  member,
  onAction,
  pending,
}: {
  member: StaffMember;
  onAction: (action: MemberAction, member: StaffMember) => void;
  pending: boolean;
}) {
  const { t } = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!hasMemberActions(member)) {
    return member.isCurrentUser || member.isOwner ? (
      <Tooltip
        title={
          member.isCurrentUser
            ? t(
                "You cannot change your own access.",
                "Huwezi kubadilisha ruhusa yako mwenyewe.",
              )
            : t("Owner access is protected.", "Ruhusa ya mmiliki imelindwa.")
        }
      >
        <ShieldOutlinedIcon color="disabled" fontSize="small" />
      </Tooltip>
    ) : null;
  }
  return (
    <>
      <IconButton
        aria-label={t(
          `Manage ${member.displayName}`,
          `Simamia ${member.displayName}`,
        )}
        disabled={pending}
        onClick={(event) => setAnchor(event.currentTarget)}
        size="small"
      >
        {pending ? <CircularProgress size={18} /> : <MoreVertRoundedIcon />}
      </IconButton>
      <Menu
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        open={Boolean(anchor)}
      >
        {member.allowedActions.changeRole ? (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onAction("change_role", member);
            }}
          >
            <AdminPanelSettingsRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />
            {t("Change role", "Badili jukumu")}
          </MenuItem>
        ) : null}
        {member.allowedActions.suspend ? (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onAction("suspend", member);
            }}
          >
            <BlockRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />
            {t("Suspend access", "Simamisha ruhusa")}
          </MenuItem>
        ) : null}
        {member.allowedActions.activate ? (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onAction("activate", member);
            }}
          >
            <CheckRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />
            {t("Activate access", "Wezesha ruhusa")}
          </MenuItem>
        ) : null}
        {member.allowedActions.remove ? (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onAction("remove", member);
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />
            {t("Remove from property", "Ondoa kwenye biashara")}
          </MenuItem>
        ) : null}
      </Menu>
    </>
  );
}

function InvitationsDirectory({
  count,
  desktop,
  invitations,
  onAction,
  onCopy,
  onInvite,
  onPageChange,
  onRowsPerPageChange,
  onShare,
  page,
  pendingKey,
  rowsPerPage,
}: {
  count: number;
  desktop: boolean;
  invitations: StaffInvitation[];
  onAction: (action: InvitationAction, invitation: StaffInvitation) => void;
  onCopy: (invitation: StaffInvitation) => void;
  onInvite?: () => void;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onShare: (invitation: StaffInvitation) => void;
  page: number;
  pendingKey: string | null;
  rowsPerPage: number;
}) {
  const { t } = useLanguage();
  if (!count) {
    return (
      <Surface padding={false}>
        <EmptyState
          actionLabel={
            onInvite ? t("Invite teammate", "Alika mshiriki") : undefined
          }
          description={t(
            "Create an invitation, then copy or share its one-time access code.",
            "Unda mwaliko, kisha nakili au shiriki msimbo wake wa ruhusa.",
          )}
          icon={<EmailRoundedIcon />}
          onAction={onInvite}
          title={t("No pending invitations", "Hakuna mialiko inayosubiri")}
        />
      </Surface>
    );
  }

  return (
    <>
      <Alert severity="info" icon={<KeyRoundedIcon />}>
        {t(
          "Invitation codes are visible only to authorized administrators. Share them with the invited email address through a trusted channel.",
          "Misimbo ya mialiko inaonekana kwa wasimamizi walioidhinishwa pekee. Ishiriki na mwenye barua pepe iliyoalikwa kupitia njia salama.",
        )}
      </Alert>
      {desktop ? (
        <Surface padding={false}>
        <TableContainer>
          <Table aria-label={t("Pending invitations", "Mialiko inayosubiri")}>
            <TableHead>
              <TableRow>
                <TableCell>
                  {t("Invited teammate", "Mshiriki aliyealikwa")}
                </TableCell>
                <TableCell>{t("Role", "Jukumu")}</TableCell>
                <TableCell>
                  {t("Invitation code", "Msimbo wa mwaliko")}
                </TableCell>
                <TableCell>{t("Expires", "Unaisha")}</TableCell>
                <TableCell align="right">{t("Actions", "Hatua")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow hover key={invitation.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {invitation.email}
                    </Typography>
                    <Typography color="text.secondary" variant="caption">
                      {t("Invited by", "Amealika")} {invitation.invitedByName}
                    </Typography>
                  </TableCell>
                  <TableCell>{roleLabel(invitation.role, t)}</TableCell>
                  <TableCell>
                    <InvitationCode code={invitation.code} />
                  </TableCell>
                  <TableCell>
                    <Typography color="text.secondary" variant="body2">
                      {formatLocalDateTime(invitation.expiresAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ justifyContent: "flex-end" }}
                    >
                      {invitation.code ? (
                        <>
                          <Tooltip title={t("Copy code", "Nakili msimbo")}>
                            <IconButton
                              aria-label={t(
                                "Copy invitation code",
                                "Nakili msimbo wa mwaliko",
                              )}
                              onClick={() => onCopy(invitation)}
                              size="small"
                            >
                              <ContentCopyRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            title={t("Share invitation", "Shiriki mwaliko")}
                          >
                            <IconButton
                              aria-label={t(
                                "Share invitation",
                                "Shiriki mwaliko",
                              )}
                              onClick={() => onShare(invitation)}
                              size="small"
                            >
                              <ShareRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : null}
                      <InvitationActionMenu
                        invitation={invitation}
                        onAction={onAction}
                        pending={Boolean(pendingKey?.endsWith(invitation.id))}
                      />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </Surface>
      ) : (
        <Stack spacing={1.25}>
        {invitations.map((invitation) => (
          <Surface key={invitation.id}>
            <Stack spacing={1.75}>
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ alignItems: "flex-start" }}
              >
                <Avatar
                  sx={{
                    bgcolor:
                      "color-mix(in srgb, var(--mui-palette-primary-main) 11%, transparent)",
                    color: "primary.main",
                    height: 40,
                    width: 40,
                  }}
                >
                  <EmailRoundedIcon fontSize="small" />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap variant="body2" sx={{ fontWeight: 700 }}>
                    {invitation.email}
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    {roleLabel(invitation.role, t)} · {t("Expires", "Unaisha")}{" "}
                    {formatLocalDateTime(invitation.expiresAt)}
                  </Typography>
                </Box>
                <InvitationActionMenu
                  invitation={invitation}
                  onAction={onAction}
                  pending={Boolean(pendingKey?.endsWith(invitation.id))}
                />
              </Stack>
              <Box>
                <Typography color="text.secondary" variant="caption">
                  {t("Invitation code", "Msimbo wa mwaliko")}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <InvitationCode code={invitation.code} />
                </Box>
              </Box>
              {invitation.code ? (
                <Stack direction="row" spacing={1}>
                  <Button
                    fullWidth
                    onClick={() => onCopy(invitation)}
                    startIcon={<ContentCopyRoundedIcon />}
                    variant="outlined"
                  >
                    {t("Copy code", "Nakili msimbo")}
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => onShare(invitation)}
                    startIcon={<ShareRoundedIcon />}
                    variant="contained"
                  >
                    {t("Share", "Shiriki")}
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          </Surface>
        ))}
        </Stack>
      )}
      <DirectoryPagination
        count={count}
        itemLabel="invitations"
        itemLabelSwahili="mialiko"
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageLabel={t("Invitations per page", "Mialiko kwa ukurasa")}
      />
    </>
  );
}

function DirectoryPagination({
  count,
  itemLabel,
  itemLabelSwahili,
  onPageChange,
  onRowsPerPageChange,
  page,
  rowsPerPage,
  rowsPerPageLabel,
}: {
  count: number;
  itemLabel: string;
  itemLabelSwahili: string;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  page: number;
  rowsPerPage: number;
  rowsPerPageLabel: string;
}) {
  const { t } = useLanguage();
  if (count <= TEAM_PAGE_SIZE_OPTIONS[0]) return null;

  return (
    <Surface padding={false}>
      <TablePagination
        component="div"
        count={count}
        labelDisplayedRows={({ from, to, count: total }) => t(
          `${from}–${to} of ${total} ${itemLabel}`,
          `${from}–${to} kati ya ${total} ${itemLabelSwahili}`,
        )}
        labelRowsPerPage={rowsPerPageLabel}
        onPageChange={(_, nextPage) => onPageChange(nextPage)}
        onRowsPerPageChange={(event) =>
          onRowsPerPageChange(Number(event.target.value))
        }
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={TEAM_PAGE_SIZE_OPTIONS}
        sx={{
          "& .MuiTablePagination-selectLabel": {
            display: { xs: "none", sm: "block" },
          },
          "& .MuiTablePagination-spacer": {
            display: { xs: "none", sm: "block" },
          },
          "& .MuiTablePagination-toolbar": {
            px: { xs: 1, sm: 2 },
          },
        }}
      />
    </Surface>
  );
}

function InvitationCode({ code }: { code: string }) {
  const { t } = useLanguage();
  return code ? (
    <Chip
      label={code}
      size="small"
      sx={{
        bgcolor:
          "color-mix(in srgb, var(--mui-palette-primary-main) 9%, transparent)",
        color: "primary.dark",
        fontFamily: "monospace",
        fontSize: ".8125rem",
        fontWeight: 700,
        letterSpacing: ".12em",
      }}
    />
  ) : (
    <Typography color="text.secondary" variant="caption">
      {t("Code unavailable", "Msimbo haupatikani")}
    </Typography>
  );
}

function InvitationActionMenu({
  invitation,
  onAction,
  pending,
}: {
  invitation: StaffInvitation;
  onAction: (action: InvitationAction, invitation: StaffInvitation) => void;
  pending: boolean;
}) {
  const { t } = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!invitation.allowedActions.resend && !invitation.allowedActions.revoke)
    return null;
  return (
    <>
      <IconButton
        aria-label={t(
          `Manage invitation for ${invitation.email}`,
          `Simamia mwaliko wa ${invitation.email}`,
        )}
        disabled={pending}
        onClick={(event) => setAnchor(event.currentTarget)}
        size="small"
      >
        {pending ? <CircularProgress size={18} /> : <MoreVertRoundedIcon />}
      </IconButton>
      <Menu
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        open={Boolean(anchor)}
      >
        {invitation.allowedActions.resend ? (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onAction("resend", invitation);
            }}
          >
            <RefreshRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />
            {t("Renew invitation", "Fanya mwaliko upya")}
          </MenuItem>
        ) : null}
        {invitation.allowedActions.revoke ? (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onAction("revoke", invitation);
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />
            {t("Revoke invitation", "Batilisha mwaliko")}
          </MenuItem>
        ) : null}
      </Menu>
    </>
  );
}

function RolesAndPermissions({ currentRole }: { currentRole: TeamRole }) {
  const { t } = useLanguage();
  const capabilities = [
    {
      label: t("Bookings & guests", "Nafasi na wageni"),
      owner: t("Full", "Kamili"),
      manager: t("Full", "Kamili"),
      receptionist: t("Front desk", "Mapokezi"),
    },
    {
      label: t("Check-in & checkout", "Kuingia na kutoka"),
      owner: t("Full", "Kamili"),
      manager: t("Full", "Kamili"),
      receptionist: t("Check-in", "Kuingiza"),
    },
    {
      label: t("Rooms & property", "Vyumba na biashara"),
      owner: t("Manage", "Simamia"),
      manager: t("Manage", "Simamia"),
      receptionist: t("View", "Tazama"),
    },
    {
      label: t("Team access", "Ruhusa za timu"),
      owner: t("All roles", "Majukumu yote"),
      manager: t("Receptionists", "Mapokezi"),
      receptionist: "—",
    },
    {
      label: t("Payments & finance", "Malipo na fedha"),
      owner: t("Full", "Kamili"),
      manager: "—",
      receptionist: "—",
    },
    {
      label: t("Reports", "Ripoti"),
      owner: t("Full", "Kamili"),
      manager: "—",
      receptionist: "—",
    },
  ];
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            lg: "repeat(3,minmax(0,1fr))",
          },
        }}
      >
        {roleOrder.map((role) => (
          <Surface
            key={role}
            sx={{
              borderColor: currentRole === role ? "primary.main" : "divider",
            }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Box
                  sx={{
                    bgcolor:
                      "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
                    borderRadius: 2,
                    color: "primary.main",
                    display: "grid",
                    height: 40,
                    placeItems: "center",
                    width: 40,
                  }}
                >
                  {role === "owner" ? (
                    <KeyRoundedIcon />
                  ) : role === "manager" ? (
                    <AdminPanelSettingsRoundedIcon />
                  ) : (
                    <GroupsRoundedIcon />
                  )}
                </Box>
                {currentRole === role ? (
                  <StatusPill
                    label={t("Your role", "Jukumu lako")}
                    tone="info"
                  />
                ) : null}
              </Stack>
              <Box>
                <Typography component="h3" variant="h5">
                  {roleLabel(role, t)}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                  variant="body2"
                >
                  {roleDescription(role, t)}
                </Typography>
              </Box>
            </Stack>
          </Surface>
        ))}
      </Box>

      <Surface padding={false}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: { xs: 2, sm: 2.5 },
            py: 2,
          }}
        >
          <Typography component="h3" variant="h5">
            {t("Capability matrix", "Jedwali la uwezo")}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.35 }} variant="body2">
            {t(
              "A practical overview of what each property role can access.",
              "Muhtasari wa kile kila jukumu linaweza kufikia kwenye biashara.",
            )}
          </Typography>
        </Box>
        <TableContainer>
          <Table
            aria-label={t(
              "Role capability matrix",
              "Jedwali la uwezo wa majukumu",
            )}
            sx={{ minWidth: 620 }}
          >
            <TableHead>
              <TableRow>
                <TableCell>{t("Workspace area", "Sehemu ya mfumo")}</TableCell>
                <TableCell>{t("Owner", "Mmiliki")}</TableCell>
                <TableCell>{t("Manager", "Meneja")}</TableCell>
                <TableCell>{t("Receptionist", "Mapokezi")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {capabilities.map((capability) => (
                <TableRow key={capability.label}>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {capability.label}
                  </TableCell>
                  <CapabilityCell value={capability.owner} />
                  <CapabilityCell value={capability.manager} />
                  <CapabilityCell value={capability.receptionist} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Surface>
      <Alert severity="info" icon={<ShieldOutlinedIcon />}>
        {t(
          "Every administrative action is checked again by the server. Interface visibility is never the only access control.",
          "Kila hatua ya usimamizi hukaguliwa tena na seva. Mwonekano wa kitufe pekee si ulinzi wa ruhusa.",
        )}
      </Alert>
    </Stack>
  );
}

function CapabilityCell({ value }: { value: string }) {
  return (
    <TableCell>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
        {value !== "—" ? (
          <CheckRoundedIcon color="success" sx={{ fontSize: 18 }} />
        ) : null}
        <Typography
          color={value === "—" ? "text.disabled" : "text.primary"}
          variant="body2"
        >
          {value}
        </Typography>
      </Stack>
    </TableCell>
  );
}

function InviteTeamMemberModal({
  inviteRoles,
  onClose,
  onSubmit,
  open,
}: {
  inviteRoles: TeamRole[];
  onClose: () => void;
  onSubmit: (email: string, role: TeamRole) => Promise<boolean>;
  open: boolean;
}) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("receptionist");
  const [submitting, setSubmitting] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail);
  const defaultRole = inviteRoles.includes("receptionist")
    ? "receptionist"
    : (inviteRoles[0] ?? "receptionist");
  const selectedRole = inviteRoles.includes(role) ? role : defaultRole;

  const submit = async () => {
    if (!validEmail || submitting || !inviteRoles.includes(selectedRole))
      return;
    setSubmitting(true);
    try {
      const success = await onSubmit(normalizedEmail, selectedRole);
      if (success) {
        setEmail("");
        setRole(defaultRole);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      maxWidth="sm"
      onClose={submitting ? undefined : onClose}
      open={open}
    >
      <DialogTitle>
        {t("Invite a teammate", "Alika mshiriki wa timu")}
      </DialogTitle>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <DialogContent>
          <Stack spacing={2.25} sx={{ pt: 0.75 }}>
            <Typography color="text.secondary" variant="body2">
              {t(
                "Create a pending invitation for their email address. You will receive a short code to share securely.",
                "Unda mwaliko unaosubiri kwa barua pepe yao. Utapata msimbo mfupi wa kushiriki kwa usalama.",
              )}
            </Typography>
            <TextField
              autoFocus
              error={Boolean(email) && !validEmail}
              fullWidth
              helperText={
                Boolean(email) && !validEmail
                  ? t("Enter a valid email address.", "Weka barua pepe sahihi.")
                  : t(
                      "They must sign in with this exact email.",
                      "Lazima waingie kwa barua pepe hii hii.",
                    )
              }
              label={t("Work email", "Barua pepe ya kazi")}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            <FormControl fullWidth>
              <InputLabel>{t("Property role", "Jukumu la biashara")}</InputLabel>
              <Select
                label={t("Property role", "Jukumu la biashara")}
                onChange={(event) => setRole(event.target.value as TeamRole)}
                value={selectedRole}
              >
                {inviteRoles.map((item) => (
                  <MenuItem key={item} value={item}>
                    {roleLabel(item, t)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Alert severity="info" icon={false}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {roleLabel(selectedRole, t)}
              </Typography>
              <Typography variant="caption">
                {roleDescription(selectedRole, t)}
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={submitting} onClick={onClose} type="button">
            {t("Cancel", "Ghairi")}
          </Button>
          <Button
            disabled={
              !validEmail || submitting || !inviteRoles.includes(selectedRole)
            }
            startIcon={
              submitting ? <CircularProgress size={17} /> : <SendRoundedIcon />
            }
            type="submit"
            variant="contained"
          >
            {submitting
              ? t("Creating…", "Inaunda…")
              : t("Create invitation", "Unda mwaliko")}
          </Button>
        </DialogActions>
      </Box>
    </ResponsiveModal>
  );
}

function MemberActionModal({
  onClose,
  onConfirm,
  pending,
  target,
}: {
  onClose: () => void;
  onConfirm: (role?: TeamRole) => Promise<void>;
  pending: boolean;
  target: MemberActionTarget | null;
}) {
  const { t } = useLanguage();
  const [role, setRole] = useState<TeamRole>(
    target?.member.role ?? "receptionist",
  );

  if (!target) return null;
  const { action, member } = target;
  const titles: Record<MemberAction, string> = {
    activate: t("Activate team member?", "Wezesha mshiriki wa timu?"),
    change_role: t("Change team member role", "Badili jukumu la mshiriki"),
    remove: t("Remove team member?", "Ondoa mshiriki wa timu?"),
    suspend: t("Suspend team member?", "Simamisha mshiriki wa timu?"),
  };
  const descriptions: Record<MemberAction, string> = {
    activate: t(
      `${member.displayName} will regain access to this property immediately.`,
      `${member.displayName} atapata tena ruhusa ya biashara hii mara moja.`,
    ),
    change_role: t(
      "Their workspace access will update immediately after you confirm.",
      "Ruhusa zao za mfumo zitabadilika mara moja baada ya kuthibitisha.",
    ),
    remove: t(
      `${member.displayName} will lose access to this property. Historical activity remains in the audit log.`,
      `${member.displayName} atapoteza ruhusa ya biashara hii. Historia ya shughuli itabaki kwenye kumbukumbu.`,
    ),
    suspend: t(
      `${member.displayName} will be unable to access this property until reactivated.`,
      `${member.displayName} hataweza kufikia biashara hii hadi atakapowezeshwa tena.`,
    ),
  };
  const roleChanged =
    role !== member.role && member.assignableRoles.includes(role);

  return (
    <ResponsiveModal maxWidth="xs" onClose={pending ? undefined : onClose} open>
      <DialogTitle>{titles[action]}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography color="text.secondary" variant="body2">
            {descriptions[action]}
          </Typography>
          {action === "change_role" ? (
            <>
              <FormControl fullWidth>
                <InputLabel>{t("New role", "Jukumu jipya")}</InputLabel>
                <Select
                  label={t("New role", "Jukumu jipya")}
                  onChange={(event) => setRole(event.target.value as TeamRole)}
                  value={role}
                >
                  {member.assignableRoles.map((item) => (
                    <MenuItem key={item} value={item}>
                      {roleLabel(item, t)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Alert severity="info" icon={false}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {roleLabel(role, t)}
                </Typography>
                <Typography variant="caption">
                  {roleDescription(role, t)}
                </Typography>
              </Alert>
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={onClose}>
          {t("Cancel", "Ghairi")}
        </Button>
        <Button
          color={
            action === "remove"
              ? "error"
              : action === "suspend"
                ? "warning"
                : "primary"
          }
          disabled={pending || (action === "change_role" && !roleChanged)}
          onClick={() =>
            void onConfirm(action === "change_role" ? role : undefined)
          }
          startIcon={pending ? <CircularProgress size={17} /> : undefined}
          variant="contained"
        >
          {action === "change_role"
            ? t("Update role", "Sasisha jukumu")
            : action === "activate"
              ? t("Activate", "Wezesha")
              : action === "suspend"
                ? t("Suspend", "Simamisha")
                : t("Remove", "Ondoa")}
        </Button>
      </DialogActions>
    </ResponsiveModal>
  );
}

function InvitationActionModal({
  onClose,
  onConfirm,
  pending,
  target,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  pending: boolean;
  target: InvitationActionTarget | null;
}) {
  const { t } = useLanguage();
  if (!target) return null;
  const renew = target.action === "resend";
  return (
    <ResponsiveModal maxWidth="xs" onClose={pending ? undefined : onClose} open>
      <DialogTitle>
        {renew
          ? t("Renew invitation?", "Fanya mwaliko upya?")
          : t("Revoke invitation?", "Batilisha mwaliko?")}
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" variant="body2">
          {renew
            ? t(
                `The current code for ${target.invitation.email} will stop working and a new code will be created for seven more days.`,
                `Msimbo wa sasa wa ${target.invitation.email} utaacha kufanya kazi na msimbo mpya utaundwa kwa siku saba zaidi.`,
              )
            : t(
                `${target.invitation.email} will no longer be able to use this invitation code.`,
                `${target.invitation.email} hataweza tena kutumia msimbo huu wa mwaliko.`,
              )}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={onClose}>
          {t("Cancel", "Ghairi")}
        </Button>
        <Button
          color={renew ? "primary" : "error"}
          disabled={pending}
          onClick={() => void onConfirm()}
          startIcon={
            pending ? (
              <CircularProgress size={17} />
            ) : renew ? (
              <RefreshRoundedIcon />
            ) : (
              <DeleteOutlineRoundedIcon />
            )
          }
          variant="contained"
        >
          {renew
            ? t("Renew invitation", "Fanya mwaliko upya")
            : t("Revoke", "Batilisha")}
        </Button>
      </DialogActions>
    </ResponsiveModal>
  );
}

function LabeledValue({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography noWrap sx={{ mt: 0.25, fontWeight: 700 }} variant="body2">
        {value}
      </Typography>
    </Box>
  );
}
