"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import { FullPageLoader } from "@/components/shared/full-page-loader";
import { SessionErrorScreen } from "@/components/shared/session-error-screen";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { AppStatus } from "@/features/session/models/app-status";

import { mainDestinations } from "./destinations";

const drawerWidth = 248;

function notificationIcon(icon: React.ReactNode, unread: number) {
  return (
    <Badge
      badgeContent={unread > 99 ? "99+" : unread}
      color="error"
      invisible={unread < 1}
      max={99}
    >
      {icon}
    </Badge>
  );
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, error, refresh } = useAppSession();
  const unread = 0;

  const selectedIndex = Math.max(
    0,
    mainDestinations.findIndex((item) => item.match(pathname)),
  );

  useEffect(() => {
    if (!loading && session && session.status !== AppStatus.Ready) {
      router.replace("/");
    }
  }, [loading, router, session]);

  if (error) {
    return <SessionErrorScreen error={error} onRetry={() => void refresh()} />;
  }

  if (loading || !session || session.status !== AppStatus.Ready) {
    return <FullPageLoader />;
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          flexShrink: 0,
          width: drawerWidth,
          "& .MuiDrawer-paper": {
            borderRightColor: "divider",
            boxSizing: "border-box",
            width: drawerWidth,
          },
        }}
      >
        <Toolbar sx={{ minHeight: 76, px: 3 }}>
          <Stack spacing={0.1}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 850, letterSpacing: "-0.04em" }}
            >
              Loji Business
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Property workspace
            </Typography>
          </Stack>
        </Toolbar>

        <Divider />

        <List sx={{ px: 1.5, py: 2 }}>
          {mainDestinations.map((item, index) => {
            const selected = index === selectedIndex;
            const icon = selected ? item.activeIcon : item.icon;

            return (
              <ListItemButton
                component={Link}
                href={item.path}
                key={item.path}
                selected={selected}
                sx={{
                  borderRadius: 2.5,
                  mb: 0.5,
                  minHeight: 48,
                }}
              >
                <ListItemIcon sx={{ minWidth: 42 }}>
                  {item.showsUnread ? notificationIcon(icon, unread) : icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: selected ? 750 : 550 }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          pb: { xs: "calc(76px + env(safe-area-inset-bottom))", md: 0 },
        }}
      >
        {children}
      </Box>

      <PaperBottomNavigation
        selectedIndex={selectedIndex}
        unread={unread}
        onNavigate={(path) => router.push(path)}
      />
    </Box>
  );
}

function PaperBottomNavigation({
  selectedIndex,
  unread,
  onNavigate,
}: {
  selectedIndex: number;
  unread: number;
  onNavigate: (path: string) => void;
}) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        bottom: 0,
        display: { xs: "block", md: "none" },
        left: 0,
        pb: "env(safe-area-inset-bottom)",
        position: "fixed",
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation
        showLabels
        value={selectedIndex}
        onChange={(_, value: number) => {
          onNavigate(mainDestinations[value].path);
        }}
        sx={{ height: 68 }}
      >
        {mainDestinations.map((item, index) => {
          const icon = index === selectedIndex ? item.activeIcon : item.icon;

          return (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={item.showsUnread ? notificationIcon(icon, unread) : icon}
              sx={{
                minWidth: 0,
                px: 0.5,
                "& .MuiBottomNavigationAction-label": {
                  fontSize: "0.68rem",
                  fontWeight: index === selectedIndex ? 750 : 550,
                },
              }}
            />
          );
        })}
      </BottomNavigation>
    </Box>
  );
}
