"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { BrandSymbol } from "@/components/shared/brand-symbol";
import { SessionErrorScreen } from "@/components/shared/session-error-screen";
import { ThemeModeSelect } from "@/components/shared/theme-mode-select";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { AppStatus } from "@/features/session/models/app-status";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/providers/language-provider";
import {
  accountDestination,
  managementDestinations,
  type MainDestination,
  workspaceDestinations,
} from "./destinations";
import { PropertySwitcher } from "./property-switcher";
import { TopBarLanguageSwitch } from "./top-bar-language-switch";

const drawerWidth = 232;

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, error, refresh, switchProperty } = useAppSession();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const canManage = ["owner", "manager"].includes(
    session.activeRole?.toLowerCase() ?? "",
  );
  const name = String(
    session.user?.user_metadata?.full_name ??
      session.user?.user_metadata?.name ??
      session.user?.email?.split("@")[0] ??
      "Account",
  );
  const avatar =
    typeof session.user?.user_metadata?.avatar_url === "string"
      ? session.user.user_metadata.avatar_url
      : undefined;

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const switchActiveProperty = async (propertyId: string) => {
    await switchProperty(propertyId);
    router.refresh();
  };

  const sidebar = (
    <SidebarContent
      avatar={avatar}
      canManage={canManage}
      name={name}
      onClose={() => setMobileOpen(false)}
      onSignOut={signOut}
      pathname={pathname}
      role={session.activeRole ?? "Member"}
    />
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          bgcolor: "primary.main",
          color: "primary.contrastText",
          left: 12,
          px: 2,
          py: 1,
          position: "fixed",
          top: -80,
          zIndex: 9999,
          "&:focus": { top: 12 },
        }}
      >
        {t("Skip to content", "Ruka hadi maudhui")}
      </Box>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          flexShrink: 0,
          width: drawerWidth,
          "& .MuiDrawer-paper": {
            bgcolor: "background.paper",
            borderRightColor: "divider",
            boxSizing: "border-box",
            width: drawerWidth,
          },
        }}
      >
        {sidebar}
      </Drawer>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            bgcolor: "background.paper",
            boxSizing: "border-box",
            width: "min(88vw, 300px)",
          },
        }}
      >
        {sidebar}
      </Drawer>

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{ flex: 1, minWidth: 0, overflowX: "clip", pb: 0 }}
      >
        <Box
          sx={{
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
            position: "sticky",
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
          }}
        >
          <Box
            sx={{
              alignItems: "center",
              display: "flex",
              height: 64,
              justifyContent: "space-between",
              px: { xs: 2.25, sm: 3, lg: 2.5 },
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                display: { xs: "flex", lg: "none" },
                flex: 1,
                minWidth: 0,
              }}
            >
              <Box
                component={Link}
                href="/dashboard"
                aria-label={t("Loji Business home", "Nyumbani Loji Business")}
                sx={{ display: "inline-flex", flexShrink: 0 }}
              >
                <BrandSymbol priority size={34} />
              </Box>
              <PropertySwitcher
                activePropertyId={session.activePropertyId}
                memberships={session.memberships}
                property={session.property}
                onSwitch={switchActiveProperty}
              />
            </Stack>

            <Box
              sx={{
                display: { xs: "none", lg: "flex" },
                flex: 1,
                minWidth: 0,
              }}
            >
              <PropertySwitcher
                activePropertyId={session.activePropertyId}
                memberships={session.memberships}
                property={session.property}
                onSwitch={switchActiveProperty}
              />
            </Box>

            <Stack
              direction="row"
              spacing={{ xs: 0.5, sm: 1, lg: 1 }}
              sx={{ alignItems: "center", flexShrink: 0 }}
            >
              <TopBarLanguageSwitch />
              <IconButton
                aria-label={t("Open navigation", "Fungua menyu")}
                onClick={() => setMobileOpen(true)}
                sx={{
                  color: "primary.main",
                  display: { xs: "inline-flex", lg: "none" },
                  height: 48,
                  width: 48,
                  "& .MuiSvgIcon-root": {
                    fontSize: 32,
                  },
                }}
              >
                <MenuRoundedIcon />
              </IconButton>
            </Stack>
          </Box>

        </Box>

        {children}
      </Box>
    </Box>
  );
}

type SidebarContentProps = {
  avatar?: string;
  canManage: boolean;
  name: string;
  onClose: () => void;
  onSignOut: () => Promise<void>;
  pathname: string;
  role: string;
};

function SidebarContent({
  avatar,
  canManage,
  name,
  onClose,
  onSignOut,
  pathname,
  role,
}: SidebarContentProps) {
  const { t } = useLanguage();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", height: 52, justifyContent: "space-between", px: 1.25 }}
      >
        <Box
          component={Link}
          href="/dashboard"
          aria-label="Loji Business home"
          onClick={onClose}
          sx={{ display: "inline-flex", p: 0.5 }}
        >
          <BrandLockup symbolSize={28} textSize=".92rem" />
        </Box>
        <IconButton
          aria-label={t("Close navigation", "Funga menyu")}
          onClick={onClose}
          size="small"
          sx={{ display: { xs: "inline-flex", lg: "none" } }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box
        sx={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minHeight: 0,
          overflowY: "auto",
          px: 1.25,
          py: { xs: 1, lg: 1.5 },
        }}
      >
        <NavigationList items={workspaceDestinations} onNavigate={onClose} pathname={pathname} />

        {canManage ? (
          <Box sx={{ mt: 2 }}>
            <Typography color="text.secondary" component="p" variant="caption" sx={{ px: 1.25, pb: 0.75 }}>
              {t("Manage", "Usimamizi")}
            </Typography>
            <NavigationList items={managementDestinations} onNavigate={onClose} pathname={pathname} />
          </Box>
        ) : null}

        <Box sx={{ mt: 2 }}>
          <ListItemButton
            aria-expanded={preferencesOpen}
            onClick={() => setPreferencesOpen((open) => !open)}
            sx={{ borderRadius: 1, minHeight: 36, px: 1.25 }}
          >
            <ListItemIcon sx={{ minWidth: 26 }}>
              <TuneRoundedIcon sx={{ color: "text.secondary", fontSize: 17 }} />
            </ListItemIcon>
            <ListItemText
              primary={t("Preferences", "Mapendeleo")}
              slotProps={{ primary: { variant: "caption", color: "text.secondary" } }}
            />
            <ExpandMoreRoundedIcon
              sx={{
                color: "text.secondary",
                fontSize: 18,
                transform: preferencesOpen ? "rotate(180deg)" : "none",
                transition: "transform 160ms ease",
              }}
            />
          </ListItemButton>

          <Collapse in={preferencesOpen} timeout="auto" unmountOnExit>
            <Stack
              spacing={1.25}
              sx={{
                bgcolor: "action.hover",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                mt: 0.5,
                p: 1.25,
              }}
            >
              <Box>
                <Typography color="text.secondary" display="block" variant="caption" sx={{ fontWeight: 600, mb: 0.6 }}>
                  {t("Appearance", "Mwonekano")}
                </Typography>
                <ThemeModeSelect fullWidth />
              </Box>
            </Stack>
          </Collapse>
        </Box>

        <Box sx={{ flex: 1, minHeight: 24 }} />
        <Divider sx={{ mb: 1 }} />

        <Stack
          component={Link}
          href={accountDestination.path}
          onClick={onClose}
          direction="row"
          spacing={1.1}
          sx={{
            alignItems: "center",
            borderRadius: 1,
            color: "inherit",
            minHeight: 48,
            px: 1,
            py: 0.75,
            textDecoration: "none",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Avatar src={avatar} sx={{ bgcolor: "text.primary", height: 30, width: 30 }}>
            {name[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap variant="body2" sx={{ fontWeight: 500 }}>
              {name}
            </Typography>
            <Typography noWrap color="text.secondary" variant="caption" sx={{ textTransform: "capitalize" }}>
              {role}
            </Typography>
          </Box>
          <Tooltip title={t("Sign out", "Ondoka")}>
            <IconButton
              aria-label={t("Sign out", "Ondoka")}
              color="inherit"
              onClick={(event) => {
                event.preventDefault();
                void onSignOut();
              }}
              size="small"
            >
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}

function NavigationList({
  items,
  onNavigate,
  pathname,
}: {
  items: MainDestination[];
  onNavigate: () => void;
  pathname: string;
}) {
  const { t } = useLanguage();
  const labels: Record<string, [string, string]> = {
    "/dashboard": ["Home", "Nyumbani"],
    "/bookings": ["Bookings", "Uhifadhi"],
    "/rooms": ["Rooms", "Vyumba"],
    "/more/property": ["Property", "Jengo"],
    "/more/staff": ["Staff", "Wafanyakazi"],
  };

  return (
    <List disablePadding>
      {items.map((item) => {
        const selected = item.match(pathname);
        return (
          <ListItemButton
            component={Link}
            href={item.path}
            key={item.path}
            onClick={onNavigate}
            selected={selected}
            sx={{
              alignItems: "center",
              borderRadius: 1,
              columnGap: 1.25,
              mb: 0.25,
              minHeight: 38,
              px: 1.25,
              "&.Mui-selected": {
                bgcolor: "action.selected",
                color: "text.primary",
                "&:hover": { bgcolor: "action.selected" },
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: selected ? "text.primary" : "text.secondary",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 20,
                width: 20,
                "& .MuiSvgIcon-root": { fontSize: 19 },
              }}
            >
              {selected ? item.activeIcon : item.icon}
            </ListItemIcon>
            <ListItemText
              primary={labels[item.path] ? t(...labels[item.path]) : item.label}
              sx={{ m: 0 }}
              slotProps={{
                primary: {
                  sx: { fontSize: "0.875rem", fontWeight: selected ? 500 : 400 },
                },
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
