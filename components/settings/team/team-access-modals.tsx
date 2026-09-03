"use client";

import { useState } from "react";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import {
  teamRoleDescription,
  teamRoleLabel,
} from "@/components/settings/team/team-access-roles";
import type {
  PendingStaffAccess,
  StaffMember,
  TeamRole,
} from "@/features/more/models/staff";

export type MemberAction =
  | "activate"
  | "change_role"
  | "remove"
  | "suspend";
export type PendingAccessAction = "remove";

export type MemberActionTarget = {
  action: MemberAction;
  member: StaffMember;
  propertyId: string;
};

export type PendingAccessActionTarget = {
  action: PendingAccessAction;
  access: PendingStaffAccess;
  propertyId: string;
};

export function AddTeamMemberAccessModal({
  assignableRoles,
  onClose,
  onSubmit,
  open,
}: {
  assignableRoles: TeamRole[];
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
  const defaultRole = assignableRoles.includes("receptionist")
    ? "receptionist"
    : (assignableRoles[0] ?? "receptionist");
  const selectedRole = assignableRoles.includes(role) ? role : defaultRole;

  const submit = async () => {
    if (!validEmail || submitting || !assignableRoles.includes(selectedRole))
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
        {t("Add teammate access", "Ongeza ruhusa ya mfanyakazi")}
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
                "Add their exact email and role. Existing Loji accounts activate immediately; otherwise they must sign in within 30 days.",
                "Weka barua pepe yao sahihi na jukumu. Akaunti zilizopo za Loji huwashwa mara moja; vinginevyo lazima waingie ndani ya siku 30.",
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
                      "They must sign in with this exact email within 30 days.",
                      "Lazima waingie kwa barua pepe hii hii ndani ya siku 30.",
                    )
              }
              label={t("Work email", "Barua pepe ya kazi")}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            <FormControl fullWidth>
              <InputLabel>
                {t("Property role", "Jukumu la biashara")}
              </InputLabel>
              <Select
                label={t("Property role", "Jukumu la biashara")}
                onChange={(event) => setRole(event.target.value as TeamRole)}
                value={selectedRole}
              >
                {assignableRoles.map((item) => (
                  <MenuItem key={item} value={item}>
                    {teamRoleLabel(item, t)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Alert severity="info" icon={false}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {teamRoleLabel(selectedRole, t)}
              </Typography>
              <Typography variant="caption">
                {teamRoleDescription(selectedRole, t)}
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
              !validEmail ||
              submitting ||
              !assignableRoles.includes(selectedRole)
            }
            startIcon={
              submitting ? <CircularProgress size={17} /> : <SendRoundedIcon />
            }
            type="submit"
            variant="contained"
          >
            {submitting
              ? t("Creating…", "Inaunda…")
              : t("Add access", "Ongeza ruhusa")}
          </Button>
        </DialogActions>
      </Box>
    </ResponsiveModal>
  );
}

export function MemberActionModal({
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
                      {teamRoleLabel(item, t)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Alert severity="info" icon={false}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {teamRoleLabel(role, t)}
                </Typography>
                <Typography variant="caption">
                  {teamRoleDescription(role, t)}
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

export function PendingAccessActionModal({
  onClose,
  onConfirm,
  pending,
  target,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  pending: boolean;
  target: PendingAccessActionTarget | null;
}) {
  const { t } = useLanguage();
  if (!target) return null;
  return (
    <ResponsiveModal maxWidth="xs" onClose={pending ? undefined : onClose} open>
      <DialogTitle>
        {t("Remove pending access?", "Ondoa ruhusa inayosubiri?")}
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" variant="body2">
          {t(
            `${target.access.email} will no longer receive automatic access when they sign in.`,
            `${target.access.email} hatapewa tena ruhusa moja kwa moja akiingia.`,
          )}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={onClose}>
          {t("Cancel", "Ghairi")}
        </Button>
        <Button
          color="error"
          disabled={pending}
          onClick={() => void onConfirm()}
          startIcon={
            pending ? (
              <CircularProgress size={17} />
            ) : (
              <DeleteOutlineRoundedIcon />
            )
          }
          variant="contained"
        >
          {t("Remove access", "Ondoa ruhusa")}
        </Button>
      </DialogActions>
    </ResponsiveModal>
  );
}
