"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PersonOffRoundedIcon from "@mui/icons-material/PersonOffRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import {
  Alert,
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import {
  EmptyState,
  LoadingRows,
  MetricCell,
  StickyMobileActionBar,
  Surface,
} from "@/components/shared/workspace-ui";
import {
  BackToSettingsButton,
  SettingsPageHeader,
} from "@/components/settings/settings-shared";
import {
  MembersDirectory,
  PendingAccessDirectory,
  TeamAccessFilterBar,
} from "@/components/settings/team/team-access-directory";
import {
  AddTeamMemberAccessModal,
  MemberActionModal,
  PendingAccessActionModal,
  type MemberAction,
  type MemberActionTarget,
  type PendingAccessActionTarget,
} from "@/components/settings/team/team-access-modals";
import { TeamAccessRoles } from "@/components/settings/team/team-access-roles";
import type {
  StaffMember,
  TeamAccessWorkspace,
  TeamRole,
} from "@/features/more/models/staff";
import {
  addStaffAccess,
  changeStaffRole,
  getTeamAccessWorkspace,
  removeStaff,
  removePendingStaffAccess,
  updateStaffStatus,
} from "@/features/more/services/more-service";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { createClient } from "@/lib/supabase/client";

type TeamTab = "members" | "pending_access" | "roles";
export function TeamAccessScreen() {
  const { t } = useLanguage();
  const theme = useTheme();
  const isDirectoryDesktop = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: false,
  });
  const showHeaderAddAccess = useMediaQuery(theme.breakpoints.up("sm"), {
    defaultMatches: false,
  });
  const feedback = useAppFeedback();
  const { session, loading: sessionLoading } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const propertyId = session?.activePropertyId;
  const localCapabilities = getWorkspaceCapabilities(session?.activeRole);
  const requestId = useRef(0);
  const activePropertyId = useRef<string | undefined>(undefined);
  const [workspaceState, setWorkspace] = useState<TeamAccessWorkspace | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{
    propertyId?: string;
    message: string;
  } | null>(null);
  const [tab, setTab] = useState<TeamTab>("members");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<TeamRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<
    StaffMember["status"] | "all"
  >("all");
  const [memberPage, setMemberPage] = useState(0);
  const [memberRowsPerPage, setMemberRowsPerPage] = useState(10);
  const [pendingAccessPage, setPendingAccessPage] = useState(0);
  const [pendingAccessRowsPerPage, setPendingAccessRowsPerPage] = useState(10);
  const [addAccessPropertyId, setAddAccessPropertyId] = useState<string | null>(
    null,
  );
  const [memberAction, setMemberAction] = useState<MemberActionTarget | null>(
    null,
  );
  const [pendingAccessAction, setPendingAccessAction] =
    useState<PendingAccessActionTarget | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const workspace =
    workspaceState && workspaceState.propertyId === propertyId
      ? workspaceState
      : null;
  const error =
    errorState && errorState.propertyId === propertyId
      ? errorState.message
      : null;
  const dataLoading =
    loading ||
    Boolean(workspaceState && workspaceState.propertyId !== propertyId);
  const addAccessOpen = Boolean(
    propertyId && addAccessPropertyId === propertyId,
  );
  const activeMemberAction =
    memberAction?.propertyId === propertyId ? memberAction : null;
  const activePendingAccessAction =
    pendingAccessAction?.propertyId === propertyId ? pendingAccessAction : null;

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
      setWorkspace((current) =>
        current?.propertyId === requestPropertyId ? current : null,
      );
      try {
        const nextWorkspace = await getTeamAccessWorkspace(
          client,
          requestPropertyId,
        );
        if (
          currentRequest === requestId.current &&
          activePropertyId.current === requestPropertyId
        )
          setWorkspace(nextWorkspace);
      } catch (cause) {
        if (
          currentRequest === requestId.current &&
          activePropertyId.current === requestPropertyId
        ) {
          setErrorState({
            propertyId: requestPropertyId,
            message:
              cause instanceof Error
                ? cause.message
                : t(
                    "Unable to load team access.",
                    "Imeshindikana kupakia ruhusa za timu.",
                  ),
          });
        }
      } finally {
        if (
          currentRequest === requestId.current &&
          activePropertyId.current === requestPropertyId
        )
          setLoading(false);
      }
    },
    [client, propertyId, t],
  );

  useEffect(() => {
    if (sessionLoading) return;
    const timer = window.setTimeout(() => {
      setAddAccessPropertyId(null);
      setMemberAction(null);
      setPendingAccessAction(null);
      setPendingKey(null);
      setMemberPage(0);
      setPendingAccessPage(0);
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
    async (key: string, task: () => Promise<unknown>, success: string | (() => string)) => {
      if (!propertyId || pendingKey) return false;
      const actionPropertyId = propertyId;
      setPendingKey(key);
      try {
        await task();
        if (activePropertyId.current !== actionPropertyId) return false;
        feedback.success(typeof success === "function" ? success() : success);
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
  const visiblePendingAccess = useMemo(
    () =>
      workspace?.pendingAccess.filter(
        (access) =>
          !normalizedQuery ||
          access.email.toLowerCase().includes(normalizedQuery) ||
          access.addedByName.toLowerCase().includes(normalizedQuery),
      ) ?? [],
    [normalizedQuery, workspace?.pendingAccess],
  );
  const safeMemberPage = Math.min(
    memberPage,
    Math.max(0, Math.ceil(visibleMembers.length / memberRowsPerPage) - 1),
  );
  const pagedMembers = useMemo(
    () =>
      visibleMembers.slice(
        safeMemberPage * memberRowsPerPage,
        (safeMemberPage + 1) * memberRowsPerPage,
      ),
    [memberRowsPerPage, safeMemberPage, visibleMembers],
  );
  const safePendingAccessPage = Math.min(
    pendingAccessPage,
    Math.max(
      0,
      Math.ceil(visiblePendingAccess.length / pendingAccessRowsPerPage) - 1,
    ),
  );
  const pagedPendingAccess = useMemo(
    () =>
      visiblePendingAccess.slice(
        safePendingAccessPage * pendingAccessRowsPerPage,
        (safePendingAccessPage + 1) * pendingAccessRowsPerPage,
      ),
    [pendingAccessRowsPerPage, safePendingAccessPage, visiblePendingAccess],
  );

  const submitAccess = async (email: string, role: TeamRole) => {
    if (!propertyId) return false;
    const access = { status: "pending" as "active" | "pending" };
    const success = await runAction(
      `add-access:${email}`,
      async () => {
        const result = await addStaffAccess(client, propertyId, email, role);
        access.status = result.status === "active" ? "active" : "pending";
      },
      () => access.status === "active"
        ? t(
            "Access activated immediately for this Loji account.",
            "Ruhusa imewashwa mara moja kwa akaunti hii ya Loji.",
          )
        : t(
            "Pending email access saved for 30 days. It will activate when the teammate signs in.",
            "Ruhusa ya barua pepe inayosubiri imehifadhiwa kwa siku 30. Itawashwa mfanyakazi akiingia.",
          ),
    );
    if (success) {
      setAddAccessPropertyId(null);
      setTab(access.status === "active" ? "members" : "pending_access");
      setQuery("");
      setPendingAccessPage(0);
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

  const confirmPendingAccessAction = async () => {
    if (!activePendingAccessAction || !propertyId) return;
    const { access } = activePendingAccessAction;
    const success = await runAction(
      `remove-access:${access.id}`,
      () => removePendingStaffAccess(client, propertyId, access.id),
      t(
        "Pending email access removed.",
        "Ruhusa ya barua pepe inayosubiri imeondolewa.",
      ),
    );
    if (success) setPendingAccessAction(null);
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

  const canAddAccess = workspace?.capabilities.addStaffAccess ?? false;
  const summary = workspace?.summary;

  return (
    <Stack
      spacing={{ xs: 2.25, sm: 3 }}
      sx={{ pb: canAddAccess ? { xs: 9, sm: 0 } : 0 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <BackToSettingsButton />
        <Button component={Link} href="/activity" startIcon={<HistoryRoundedIcon />} variant="text">
          {t("View activity", "Tazama historia")}
        </Button>
      </Stack>
      <SettingsPageHeader
        action={
          canAddAccess && showHeaderAddAccess ? (
            <Button
              onClick={() => propertyId && setAddAccessPropertyId(propertyId)}
              startIcon={<AddRoundedIcon />}
              variant="contained"
            >
              {t("Add teammate", "Ongeza mfanyakazi")}
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
          display: { xs: "none", sm: "grid" },
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
          caption={t(
            "Activates on their next sign-in",
            "Itawashwa akiingia kwenye akaunti",
          )}
          icon={<EmailRoundedIcon />}
          label={t("Pending access", "Ruhusa inayosubiri")}
          tone={summary?.pendingAccess ? "warning" : "neutral"}
          value={summary?.pendingAccess ?? 0}
        />
      </Box>

      <Surface padding={false}>
        <Tabs
          aria-label={t("Team access sections", "Sehemu za ruhusa za timu")}
          onChange={(_, next: TeamTab) => {
            setTab(next);
            setQuery("");
            setMemberPage(0);
            setPendingAccessPage(0);
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
            label={`${t("Pending access", "Ruhusa inayosubiri")} · ${workspace?.pendingAccess.length ?? 0}`}
            value="pending_access"
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
        <TeamAccessFilterBar
          onQueryChange={(value) => {
            setQuery(value);
            setMemberPage(0);
            setPendingAccessPage(0);
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
          onAction={(action, member) =>
            propertyId && setMemberAction({ action, member, propertyId })
          }
          onPageChange={setMemberPage}
          onRowsPerPageChange={(value) => {
            setMemberRowsPerPage(value);
            setMemberPage(0);
          }}
          page={safeMemberPage}
          pendingKey={pendingKey}
          rowsPerPage={memberRowsPerPage}
        />
      ) : tab === "pending_access" ? (
        <PendingAccessDirectory
          accessEntries={pagedPendingAccess}
          count={visiblePendingAccess.length}
          desktop={isDirectoryDesktop}
          onAction={(action, access) =>
            propertyId && setPendingAccessAction({ action, access, propertyId })
          }
          onAdd={
            canAddAccess
              ? () => propertyId && setAddAccessPropertyId(propertyId)
              : undefined
          }
          onPageChange={setPendingAccessPage}
          onRowsPerPageChange={(value) => {
            setPendingAccessRowsPerPage(value);
            setPendingAccessPage(0);
          }}
          page={safePendingAccessPage}
          pendingKey={pendingKey}
          rowsPerPage={pendingAccessRowsPerPage}
        />
      ) : (
        <TeamAccessRoles currentRole={workspace?.role ?? "member"} />
      )}

      <AddTeamMemberAccessModal
        assignableRoles={workspace?.capabilities.assignableRoles ?? []}
        onClose={() => setAddAccessPropertyId(null)}
        onSubmit={submitAccess}
        open={addAccessOpen}
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
      <PendingAccessActionModal
        onClose={() => setPendingAccessAction(null)}
        onConfirm={confirmPendingAccessAction}
        pending={Boolean(
          activePendingAccessAction &&
          pendingKey?.endsWith(activePendingAccessAction.access.id),
        )}
        target={activePendingAccessAction}
      />

      {canAddAccess && !showHeaderAddAccess ? (
        <Box>
          <StickyMobileActionBar>
            <Button
              fullWidth
              onClick={() => propertyId && setAddAccessPropertyId(propertyId)}
              startIcon={<AddRoundedIcon />}
              variant="contained"
            >
              {t("Add teammate", "Ongeza mfanyakazi")}
            </Button>
          </StickyMobileActionBar>
        </Box>
      ) : null}
    </Stack>
  );
}
