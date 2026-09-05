"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
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
    icon: <BusinessOutlinedIcon />,
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
  const isOverview = pathname === "/settings";
  const capabilities = getWorkspaceCapabilities(session?.activeRole);
  const visibleDestinations = destinations.filter(
    (destination) =>
      !("capability" in destination) ||
      capabilities[destination.capability as keyof WorkspaceCapabilities],
  );

  if (isOverview) {
    return (
      <WorkspacePage maxWidth={980}>
        <Box sx={{ minWidth: 0 }}>{children}</Box>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage maxWidth={1240}>
      <Box
        sx={{
          display: "grid",
          gap: { xs: 2, lg: 3 },
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "208px minmax(0, 1fr)",
          },
        }}
      >
        <Paper
          component="nav"
          aria-label={t("Settings sections", "Sehemu za mipangilio")}
          variant="outlined"
          sx={{
            alignSelf: "start",
            borderRadius: 1,
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
                slotProps={{
                  primary: { sx: { fontSize: ".8125rem", fontWeight: 500 } },
                }}
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
                <ListItemIcon
                  sx={{
                    minWidth: 32,
                    "& .MuiSvgIcon-root": { fontSize: 20 },
                  }}
                >
                  {destination.icon}
                </ListItemIcon>
                <ListItemText
                  primary={t(destination.label[0], destination.label[1])}
                  slotProps={{
                    primary: { sx: { fontSize: ".8125rem", fontWeight: 500 } },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
        <Box sx={{ minWidth: 0 }}>{children}</Box>
      </Box>
    </WorkspacePage>
  );
}
