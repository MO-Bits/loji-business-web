"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  createStaffAccess,
  MAX_ONBOARDING_STAFF,
  staffRoles,
  type SetupStaffRole,
  type StaffAccessDraft,
} from "@/features/onboarding/models/business-setup";

export function StaffAccessStep({
  staff,
  onChange,
}: {
  staff: StaffAccessDraft[];
  onChange: (staff: StaffAccessDraft[]) => void;
}) {
  const { t } = useLanguage();

  const update = (id: string, patch: Partial<StaffAccessDraft>) => {
    onChange(staff.map((member) => (member.id === id ? { ...member, ...patch } : member)));
  };

  return (
    <Stack spacing={2}>
      <Alert icon={<EmailRoundedIcon />} severity="info" variant="outlined">
        {t(
          "Each staff email can belong to one property. Existing Loji accounts receive access immediately; otherwise access stays pending for 30 days.",
          "Kila barua pepe ya mfanyakazi inaweza kuwa ya biashara moja tu. Akaunti zilizopo za Loji hupata ruhusa mara moja; nyingine husubiri kwa siku 30.",
        )}
      </Alert>

      {staff.length ? (
        staff.map((member, index) => (
          <Box
            key={member.id}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2.5,
              p: { xs: 2, sm: 2.5 },
            }}
          >
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
            >
              <Typography sx={{ fontWeight: 700 }}>
                {t(`Teammate ${index + 1}`, `Mfanyakazi ${index + 1}`)}
              </Typography>
              <IconButton
                aria-label={t("Remove teammate", "Ondoa mfanyakazi")}
                onClick={() => onChange(staff.filter((item) => item.id !== member.id))}
                size="small"
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "minmax(0,1.25fr) minmax(180px,.75fr)" },
              }}
            >
              <TextField
                autoComplete="email"
                fullWidth
                label={t("Work email", "Barua pepe ya kazi")}
                onChange={(event) =>
                  update(member.id, { email: event.target.value.slice(0, 254) })
                }
                placeholder="mfanyakazi@example.com"
                required
                slotProps={{ htmlInput: { inputMode: "email", maxLength: 254 } }}
                type="email"
                value={member.email}
              />
              <TextField
                fullWidth
                label={t("Role", "Jukumu")}
                onChange={(event) =>
                  update(member.id, { role: event.target.value as SetupStaffRole })
                }
                select
                value={member.role}
              >
                {staffRoles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {t(role.label[0], role.label[1])}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Typography color="text.secondary" sx={{ mt: 1.25 }} variant="caption">
              {t(
                staffRoles.find((role) => role.value === member.role)?.description[0] ?? "",
                staffRoles.find((role) => role.value === member.role)?.description[1] ?? "",
              )}
            </Typography>
          </Box>
        ))
      ) : (
        <Box
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2.5,
            p: { xs: 2.5, sm: 3.5 },
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>
            {t("You can start on your own", "Unaweza kuanza mwenyewe")}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
            {t(
              "Adding staff now is optional. You can also add them later from Team & access.",
              "Kuongeza wafanyakazi sasa si lazima. Unaweza kuwaongeza baadaye kwenye Timu na ruhusa.",
            )}
          </Typography>
        </Box>
      )}

      <Button
        disabled={staff.length >= MAX_ONBOARDING_STAFF}
        onClick={() => onChange([...staff, createStaffAccess()])}
        startIcon={<AddRoundedIcon />}
        sx={{ alignSelf: "flex-start" }}
        variant="outlined"
      >
        {t("Add teammate", "Ongeza mfanyakazi")}
      </Button>
    </Stack>
  );
}
