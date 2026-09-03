"use client";

import { useState, type ReactNode } from "react";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  EmptyState,
  StatusPill,
  Surface,
} from "@/components/shared/workspace-ui";
import type {
  MemberAction,
  PendingAccessAction,
} from "@/components/settings/team/team-access-modals";
import {
  teamRoleDescription,
  teamRoleLabel,
  teamRoleOrder,
  type TeamAccessTranslator,
} from "@/components/settings/team/team-access-roles";
import type {
  PendingStaffAccess,
  StaffMember,
  TeamRole,
} from "@/features/more/models/staff";
import { formatLocalDate, formatLocalDateTime } from "@/lib/date-time";

const TEAM_PAGE_SIZE_OPTIONS = [10, 25, 50];

function statusLabel(status: StaffMember["status"], t: TeamAccessTranslator) {
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

export function TeamAccessFilterBar({
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
              : t("Search pending access", "Tafuta ruhusa inayosubiri")
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
                {teamRoleOrder.map((item) => (
                  <MenuItem key={item} value={item}>
                    {teamRoleLabel(item, t)}
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

export function MembersDirectory({
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
            "Try a different search or filter. New teammates appear after signing in with an approved email.",
            "Jaribu utafutaji au kichujio tofauti. Wafanyakazi wapya huonekana baada ya kuingia kwa barua pepe iliyoidhinishwa.",
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
                        {teamRoleLabel(member.role, t)}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        {member.isOwner
                          ? t(
                              "Protected owner access",
                              "Ruhusa ya mmiliki imelindwa",
                            )
                          : teamRoleDescription(member.role, t)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={statusLabel(member.status, t)}
                        tone={
                          member.status === "active" ? "success" : "warning"
                        }
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
                    value={teamRoleLabel(member.role, t)}
                  />
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      {t("Access", "Ruhusa")}
                    </Typography>
                    <Box sx={{ mt: 0.35 }}>
                      <StatusPill
                        label={statusLabel(member.status, t)}
                        tone={
                          member.status === "active" ? "success" : "warning"
                        }
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
                    : teamRoleDescription(member.role, t)}
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

export function PendingAccessDirectory({
  accessEntries,
  count,
  desktop,
  onAction,
  onAdd,
  onPageChange,
  onRowsPerPageChange,
  page,
  pendingKey,
  rowsPerPage,
}: {
  accessEntries: PendingStaffAccess[];
  count: number;
  desktop: boolean;
  onAction: (action: PendingAccessAction, access: PendingStaffAccess) => void;
  onAdd?: () => void;
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
          actionLabel={
            onAdd ? t("Add teammate", "Ongeza mfanyakazi") : undefined
          }
          description={t(
            "Add a teammate’s exact email. Pending access is available for 30 days and activates when they sign in.",
            "Weka barua pepe sahihi ya mfanyakazi. Ruhusa inayosubiri hudumu siku 30 na huwashwa akiingia.",
          )}
          icon={<EmailRoundedIcon />}
          onAction={onAdd}
          title={t(
            "No pending email access",
            "Hakuna ruhusa ya barua pepe inayosubiri",
          )}
        />
      </Surface>
    );
  }

  return (
    <>
      <Alert severity="info" icon={<EmailRoundedIcon />}>
        {t(
          "Pending access is matched to the exact email and must be claimed by sign-in within 30 days.",
          "Ruhusa inayosubiri inaunganishwa na barua pepe sahihi na lazima idaiwe kwa kuingia ndani ya siku 30.",
        )}
      </Alert>
      {desktop ? (
        <Surface padding={false}>
          <TableContainer>
            <Table
              aria-label={t(
                "Pending email access",
                "Ruhusa ya barua pepe inayosubiri",
              )}
            >
              <TableHead>
                <TableRow>
                  <TableCell>
                    {t("Teammate email", "Barua pepe ya mfanyakazi")}
                  </TableCell>
                  <TableCell>{t("Role", "Jukumu")}</TableCell>
                  <TableCell>{t("Activation", "Uwashaji")}</TableCell>
                  <TableCell>{t("Added", "Imeongezwa")}</TableCell>
                  <TableCell align="right">{t("Actions", "Hatua")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accessEntries.map((access) => (
                  <TableRow hover key={access.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {access.email}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        {t("Added by", "Imeongezwa na")} {access.addedByName}
                      </Typography>
                    </TableCell>
                    <TableCell>{teamRoleLabel(access.role, t)}</TableCell>
                    <TableCell>
                      <StatusPill
                        label={access.expiresAt
                          ? t(`Until ${formatLocalDate(access.expiresAt)}`, `Hadi ${formatLocalDate(access.expiresAt)}`)
                          : t("Within 30 days", "Ndani ya siku 30")}
                        tone="info"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography color="text.secondary" variant="body2">
                        {formatLocalDateTime(access.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ justifyContent: "flex-end" }}
                      >
                        <PendingAccessActionMenu
                          access={access}
                          onAction={onAction}
                          pending={Boolean(pendingKey?.endsWith(access.id))}
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
          {accessEntries.map((access) => (
            <Surface key={access.id}>
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
                      {access.email}
                    </Typography>
                    <Typography color="text.secondary" variant="caption">
                      {teamRoleLabel(access.role, t)} ·{" "}
                      {access.expiresAt
                        ? t(`Sign in by ${formatLocalDate(access.expiresAt)}`, `Aingie kabla ya ${formatLocalDate(access.expiresAt)}`)
                        : t("Sign in within 30 days", "Aingie ndani ya siku 30")}
                    </Typography>
                  </Box>
                  <PendingAccessActionMenu
                    access={access}
                    onAction={onAction}
                    pending={Boolean(pendingKey?.endsWith(access.id))}
                  />
                </Stack>
                <Typography color="text.secondary" variant="caption">
                  {t("Added", "Imeongezwa")}{" "}
                  {formatLocalDateTime(access.createdAt)}
                </Typography>
              </Stack>
            </Surface>
          ))}
        </Stack>
      )}
      <DirectoryPagination
        count={count}
        itemLabel="pending access entries"
        itemLabelSwahili="ruhusa zinazosubiri"
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageLabel={t("Access entries per page", "Ruhusa kwa ukurasa")}
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
        labelDisplayedRows={({ from, to, count: total }) =>
          t(
            `${from}–${to} of ${total} ${itemLabel}`,
            `${from}–${to} kati ya ${total} ${itemLabelSwahili}`,
          )
        }
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

function PendingAccessActionMenu({
  access,
  onAction,
  pending,
}: {
  access: PendingStaffAccess;
  onAction: (action: PendingAccessAction, access: PendingStaffAccess) => void;
  pending: boolean;
}) {
  const { t } = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!access.allowedActions.remove) return null;
  return (
    <>
      <IconButton
        aria-label={t(
          `Manage pending access for ${access.email}`,
          `Simamia ruhusa inayosubiri ya ${access.email}`,
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
        {access.allowedActions.remove ? (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onAction("remove", access);
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />
            {t("Remove pending access", "Ondoa ruhusa inayosubiri")}
          </MenuItem>
        ) : null}
      </Menu>
    </>
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
