"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import BedOutlinedIcon from "@mui/icons-material/BedOutlined";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
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

const drawerWidth = 240;

function getLocationLabel(
  pathname: string,
  translate: (english: string, swahili: string) => string,
) {
  if (pathname === "/dashboard") return translate("Home", "Nyumbani");
  if (pathname === "/bookings/new")
    return translate("New booking", "Uhifadhi mpya");
  if (pathname.startsWith("/bookings/"))
    return translate("Booking details", "Maelezo ya uhifadhi");
  if (pathname === "/bookings") return translate("Bookings", "Uhifadhi");
  if (pathname === "/rooms/new") return translate("Add room", "Ongeza chumba");
  if (pathname.endsWith("/edit") && pathname.startsWith("/rooms/"))
    return translate("Edit room", "Hariri chumba");
  if (pathname.startsWith("/rooms/"))
    return translate("Room details", "Maelezo ya chumba");
  if (pathname === "/rooms") return translate("Rooms", "Vyumba");
  if (pathname === "/updates") return translate("Updates", "Maboresho");
  if (pathname === "/more") return translate("Menu", "Menyu");
  if (pathname === "/more/property") return translate("Property", "Jengo");
  if (pathname === "/more/staff") return translate("Staff", "Wafanyakazi");
  if (pathname === "/more/account")
    return translate("My account", "Akaunti yangu");
  return translate("Workspace", "Eneo la kazi");
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, error, refresh, switchProperty } = useAppSession();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNavValue = pathname.startsWith("/bookings")
    ? "/bookings"
    : pathname.startsWith("/rooms")
      ? "/rooms"
      : pathname === "/dashboard"
        ? "/dashboard"
        : "menu";
  const locationLabel = getLocationLabel(pathname, t);

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
          borderRadius: 1,
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
          display: { xs: "none", md: "block" },
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
          display: { xs: "block", md: "none" },
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
        sx={{
          flex: 1,
          minWidth: 0,
          overflowX: "clip",
          pb: { xs: 9, md: 0 },
          pt: "64px",
          "& .MuiFab-root": {
            "@media (max-width: 959.95px)": {
              bottom: "calc(76px + env(safe-area-inset-bottom)) !important",
            },
          },
        }}
      >
        <Box
          sx={{
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
            left: { xs: 0, md: `${drawerWidth}px` },
            position: "fixed",
            right: 0,
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
              px: { xs: 2, sm: 3, md: 2.5 },
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                display: { xs: "flex", md: "none" },
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

            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: "center",
                display: { xs: "none", md: "flex" },
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
              <Divider flexItem orientation="vertical" sx={{ my: 1.75 }} />
              <Typography
                color="text.secondary"
                noWrap
                variant="body2"
                sx={{ fontWeight: 500 }}
              >
                {locationLabel}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={{ xs: 0.5, sm: 1 }}
              sx={{ alignItems: "center", flexShrink: 0 }}
            >
              <TopBarLanguageSwitch />
            </Stack>
          </Box>
        </Box>

        {children}
      </Box>

      <Paper
        component="nav"
        aria-label={t("Primary navigation", "Menyu kuu")}
        square
        elevation={8}
        sx={{
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
          value={mobileNavValue}
          onChange={(_, value) => {
            if (value === "menu") {
              setMobileOpen(true);
              return;
            }
            router.push(String(value));
          }}
          sx={{
            borderTop: 1,
            borderColor: "divider",
            height: 64,
            px: 0.5,
            "& .MuiBottomNavigationAction-root": {
              minWidth: 56,
              position: "relative",
              transition: "color 160ms ease, transform 160ms ease",
              "&::before": {
                bgcolor: "primary.main",
                borderRadius: 99,
                content: '""',
                height: 3,
                opacity: 0,
                position: "absolute",
                top: 0,
                transform: "scaleX(.45)",
                transition: "opacity 160ms ease, transform 160ms ease",
                width: 24,
              },
              "&.Mui-selected": {
                transform: "translateY(-1px)",
                "&::before": { opacity: 1, transform: "scaleX(1)" },
              },
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: ".75rem",
              fontWeight: 500,
              mt: 0.25,
            },
          }}
        >
          <BottomNavigationAction
            label={t("Home", "Nyumbani")}
            value="/dashboard"
            icon={
              mobileNavValue === "/dashboard" ? (
                <HomeRoundedIcon />
              ) : (
                <HomeOutlinedIcon />
              )
            }
          />
          <BottomNavigationAction
            label={t("Bookings", "Uhifadhi")}
            value="/bookings"
            icon={
              mobileNavValue === "/bookings" ? (
                <CalendarMonthRoundedIcon />
              ) : (
                <CalendarMonthOutlinedIcon />
              )
            }
          />
          <BottomNavigationAction
            label={t("Rooms", "Vyumba")}
            value="/rooms"
            icon={
              mobileNavValue === "/rooms" ? (
                <BedRoundedIcon />
              ) : (
                <BedOutlinedIcon />
              )
            }
          />
          <BottomNavigationAction
            label={t("Menu", "Menyu")}
            value="menu"
            icon={
              mobileNavValue === "menu" ? (
                <MenuRoundedIcon />
              ) : (
                <MenuOutlinedIcon />
              )
            }
          />
        </BottomNavigation>
      </Paper>
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
        sx={{
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          height: 64,
          justifyContent: "space-between",
          px: 1.5,
        }}
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
          sx={{ display: { xs: "inline-flex", md: "none" } }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box
        aria-label={t("Primary navigation", "Menyu kuu")}
        component="nav"
        sx={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minHeight: 0,
          overflowY: "auto",
          px: 1.25,
          py: 1.5,
        }}
      >
        <NavigationList items={workspaceDestinations} onNavigate={onClose} pathname={pathname} />

        {canManage ? (
          <Box sx={{ mt: 2 }}>
            <Typography
              color="text.secondary"
              component="p"
              variant="overline"
              sx={{ px: 1.25, pb: 0.75 }}
            >
              {t("Manage", "Usimamizi")}
            </Typography>
            <NavigationList items={managementDestinations} onNavigate={onClose} pathname={pathname} />
          </Box>
        ) : null}

        <Box sx={{ mt: 2 }}>
          <ListItemButton
            aria-expanded={preferencesOpen}
            onClick={() => setPreferencesOpen((open) => !open)}
            sx={{ borderRadius: 1, minHeight: 40, px: 1.25 }}
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
                <Typography
                  color="text.secondary"
                  variant="caption"
                  sx={{ display: "block", fontWeight: 500, mb: 0.6 }}
                >
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
          direction="row"
          spacing={1.1}
          sx={{
            alignItems: "center",
            borderRadius: 1,
            minHeight: 48,
            px: 1,
            py: 0.75,
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Stack
            aria-current={
              pathname === accountDestination.path ? "page" : undefined
            }
            component={Link}
            direction="row"
            href={accountDestination.path}
            onClick={onClose}
            spacing={1.1}
            sx={{
              alignItems: "center",
              color: "inherit",
              flex: 1,
              minWidth: 0,
              textDecoration: "none",
            }}
          >
            <Avatar
              src={avatar}
              sx={{ bgcolor: "text.primary", height: 32, width: 32 }}
            >
              {name[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap variant="body2" sx={{ fontWeight: 500 }}>
                {name}
              </Typography>
              <Typography
                noWrap
                color="text.secondary"
                variant="caption"
                sx={{ textTransform: "capitalize" }}
              >
                {role}
              </Typography>
            </Box>
          </Stack>
          <Tooltip title={t("Sign out", "Ondoka")}>
            <IconButton
              aria-label={t("Sign out", "Ondoka")}
              color="inherit"
              onClick={() => void onSignOut()}
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
            aria-current={selected ? "page" : undefined}
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
              minHeight: 40,
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
