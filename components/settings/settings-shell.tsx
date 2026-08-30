"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { WorkspacePage } from "@/components/shared/workspace-ui";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import {
  getWorkspaceCapabilities,
  type WorkspaceCapabilities,
} from "@/features/session/permissions";

const destinations = [
  {
    href: "/settings/profile",
    icon: <AccountCircleOutlinedIcon />,
    label: ["Profile", "Wasifu"] as const,
    match: (path: string) => path.startsWith("/settings/profile"),
  },
  {
    href: "/settings/appearance",
    icon: <DarkModeOutlinedIcon />,
    label: ["Appearance", "Mwonekano"] as const,
    match: (path: string) => path.startsWith("/settings/appearance"),
  },
  {
    href: "/settings/security",
    icon: <SecurityOutlinedIcon />,
    label: ["Security", "Usalama"] as const,
    match: (path: string) => path.startsWith("/settings/security"),
  },
  {
    capability: "canManageProperty" as const,
    href: "/settings/property",
    icon: <ApartmentOutlinedIcon />,
    label: ["Property", "Biashara"] as const,
    match: (path: string) => path.startsWith("/settings/property"),
  },
  {
    capability: "canManageStaff" as const,
    href: "/settings/team",
    icon: <GroupsOutlinedIcon />,
    label: ["Team", "Timu"] as const,
    match: (path: string) => path.startsWith("/settings/team"),
  },
];

export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { session } = useAppSession();
  const capabilities = getWorkspaceCapabilities(session?.activeRole);
  const visibleDestinations = destinations.filter(
    (destination) =>
      !("capability" in destination) ||
      capabilities[destination.capability as keyof WorkspaceCapabilities],
  );

  return (
    <WorkspacePage maxWidth={1240}>
      <Stack spacing={{ xs: 2.5, sm: 3, lg: 3.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
          <Box
            aria-hidden="true"
            sx={{
              alignItems: "center",
              bgcolor: "primary.main",
              borderRadius: 2.25,
              boxShadow: "0 8px 22px rgba(0,122,255,.2)",
              color: "primary.contrastText",
              display: "flex",
              flexShrink: 0,
              height: 48,
              justifyContent: "center",
              mt: 0.15,
              width: 48,
            }}
          >
            <SettingsRoundedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="primary.main" variant="overline">
              {t("Personal preferences", "Mapendeleo binafsi")}
            </Typography>
            <Typography component="h1" variant="h2">
              {t("Settings", "Mipangilio")}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 680, mt: 0.5 }} variant="body1">
              {t(
                "Manage your profile, experience, and account security in one place.",
                "Dhibiti wasifu, matumizi ya mfumo na usalama wa akaunti yako sehemu moja.",
              )}
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gap: { xs: 2.5, lg: 3.5 },
            gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "224px minmax(0, 1fr)" },
          }}
        >
          <Paper
            component="nav"
            aria-label={t("Settings sections", "Sehemu za mipangilio")}
            variant="outlined"
            sx={{
              alignSelf: "start",
              overflow: { xs: "auto", lg: "hidden" },
              position: { lg: "sticky" },
              top: { lg: 84 },
            }}
          >
            <List
              disablePadding
              sx={{
                display: { xs: "flex", lg: "block" },
                minWidth: "max-content",
                p: { xs: 0.75, lg: 1 },
              }}
            >
              <ListItemButton
                component={Link}
                href="/settings"
                selected={pathname === "/settings"}
                sx={{
                  borderRadius: 1.5,
                  minHeight: 44,
                  minWidth: { xs: 116, lg: 0 },
                  px: 1.25,
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SettingsRoundedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary={t("Overview", "Muhtasari")}
                  slotProps={{ primary: { sx: { fontSize: ".8125rem", fontWeight: 500 } } }}
                />
              </ListItemButton>
              {visibleDestinations.map((destination) => (
                <ListItemButton
                  component={Link}
                  href={destination.href}
                  key={destination.href}
                  selected={destination.match(pathname)}
                  sx={{
                    borderRadius: 1.5,
                    minHeight: 44,
                    minWidth: { xs: 116, lg: 0 },
                    px: 1.25,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, "& .MuiSvgIcon-root": { fontSize: 20 } }}>
                    {destination.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={t(destination.label[0], destination.label[1])}
                    slotProps={{ primary: { sx: { fontSize: ".8125rem", fontWeight: 500 } } }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
          <Box sx={{ minWidth: 0 }}>{children}</Box>
        </Box>
      </Stack>
    </WorkspacePage>
  );
}
