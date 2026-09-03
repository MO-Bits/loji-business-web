"use client";

import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import {
  Alert,
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { StatusPill, Surface } from "@/components/shared/workspace-ui";
import type { TeamRole } from "@/features/more/models/staff";

export type TeamAccessTranslator = (
  english: string,
  swahili: string,
) => string;

export const teamRoleOrder: TeamRole[] = [
  "owner",
  "manager",
  "receptionist",
];

export function teamRoleLabel(role: TeamRole, t: TeamAccessTranslator) {
  if (role === "owner") return t("Owner", "Mmiliki");
  if (role === "manager") return t("Manager", "Meneja");
  if (role === "receptionist") return t("Receptionist", "Mapokezi");
  return t("Member", "Mshiriki");
}

export function teamRoleDescription(role: TeamRole, t: TeamAccessTranslator) {
  if (role === "owner") {
    return t(
      "Full control of operations, finance, property settings, and team access.",
      "Udhibiti kamili wa uendeshaji, fedha, mipangilio ya biashara na ruhusa za timu.",
    );
  }
  if (role === "manager") {
    return t(
      "Runs daily operations, finance and reports, and can manage receptionist access.",
      "Huendesha shughuli za kila siku, fedha na ripoti, na kusimamia ruhusa za mapokezi.",
    );
  }
  return t(
    "Handles front-desk bookings, guests, booking payments, housekeeping status, and checkout after balances are settled.",
    "Hushughulikia uhifadhi, wageni, malipo ya uhifadhi, hali ya usafi na kutoka baada ya salio kulipwa.",
  );
}

export function TeamAccessRoles({ currentRole }: { currentRole: TeamRole }) {
  const { t } = useLanguage();
  const capabilities = [
    {
      label: t("Bookings & guests", "Uhifadhi na wageni"),
      owner: t("Full", "Kamili"),
      manager: t("Full", "Kamili"),
      receptionist: t("Front desk", "Mapokezi"),
    },
    {
      label: t("Check-in & checkout", "Kuingia na kutoka"),
      owner: t("Full", "Kamili"),
      manager: t("Full", "Kamili"),
      receptionist: t(
        "Check-in · settled checkout",
        "Kuingiza · kutoka bila salio",
      ),
    },
    {
      label: t("Rooms & property", "Vyumba na biashara"),
      owner: t("Manage", "Simamia"),
      manager: t("Manage", "Simamia"),
      receptionist: t("View · housekeeping", "Tazama · usafi"),
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
      manager: t("Full", "Kamili"),
      receptionist: t("Booking payments", "Malipo ya uhifadhi"),
    },
    {
      label: t("Reports", "Ripoti"),
      owner: t("Full", "Kamili"),
      manager: t("Full", "Kamili"),
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
        {teamRoleOrder.map((role) => (
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
                  {teamRoleLabel(role, t)}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                  variant="body2"
                >
                  {teamRoleDescription(role, t)}
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
