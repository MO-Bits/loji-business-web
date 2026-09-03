"use client";

import {
  Fragment,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import {
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { BrandSymbol } from "@/components/shared/brand-symbol";
import { SessionErrorScreen } from "@/components/shared/session-error-screen";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { AppStatus } from "@/features/session/models/app-status";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/providers/language-provider";
import { useDirtyNavigation } from "@/components/providers/unsaved-changes-provider";
import { requiredCapabilityForPath } from "./destinations";
import { MobileNavigation } from "./mobile-navigation";
import { SidebarContent } from "./sidebar-content";
import { TopBarLanguageSwitch } from "./top-bar-language-switch";
import { getPropertyTypeDefinition } from "@/features/property/property-type";

const drawerWidth = 248;

function getLocationLabel(
  pathname: string,
  translate: (english: string, swahili: string) => string,
  propertyType?: string,
) {
  const inventory = getPropertyTypeDefinition(propertyType);
  const singular = translate(inventory.inventorySingular[0], inventory.inventorySingular[1]);
  const plural = translate(inventory.inventoryPlural[0], inventory.inventoryPlural[1]);
  if (pathname === "/dashboard") return translate("Home", "Nyumbani");
  if (pathname.startsWith("/calendar")) return translate("Calendar", "Kalenda");
  if (pathname === "/bookings/new") return translate("New booking", "Uhifadhi mpya");
  if (pathname.startsWith("/bookings/")) return translate("Booking details", "Maelezo ya uhifadhi");
  if (pathname === "/bookings") return translate("Bookings", "Uhifadhi");
  if (pathname === "/rooms/new") return translate(`Add ${singular}`, `Ongeza ${singular}`);
  if (pathname.endsWith("/edit") && pathname.startsWith("/rooms/")) return translate(`Edit ${singular}`, `Hariri ${singular}`);
  if (pathname.startsWith("/rooms/")) return translate(`${singular} details`, `Maelezo ya ${singular}`);
  if (pathname === "/rooms") return plural;
  if (pathname.startsWith("/guests/")) return translate("Guest profile", "Taarifa za mgeni");
  if (pathname.startsWith("/guests")) return translate("Guests", "Wageni");
  if (pathname.startsWith("/operations")) return translate("Operations", "Shughuli");
  if (pathname.startsWith("/front-desk")) return translate("Front Desk", "Mapokezi");
  if (pathname.startsWith("/finance")) return translate("Finance", "Fedha");
  if (pathname.startsWith("/reports")) return translate("Reports", "Ripoti");
  if (pathname.startsWith("/activity")) return translate("Activity", "Matukio");
  if (pathname.startsWith("/notifications")) return translate("Notifications", "Arifa");
  if (pathname.startsWith("/settings/property")) return translate("Property", "Biashara");
  if (pathname.startsWith("/settings/team")) return translate("Team & access", "Timu na ruhusa");
  if (pathname.startsWith("/settings")) return translate("Settings", "Mipangilio");
  if (pathname === "/more/property") return translate("Property", "Biashara");
  if (pathname === "/more/staff") return translate("Team & access", "Timu na ruhusa");
  if (pathname === "/more/account") return translate("My account", "Akaunti yangu");
  if (pathname === "/more") return translate("Settings", "Mipangilio");
  return translate("Workspace", "Eneo la kazi");
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, error, refresh, switchProperty } = useAppSession();
  const { t } = useLanguage();
  const {
    clearDrafts,
    hasUnsavedChanges,
    requestNavigation,
  } = useDirtyNavigation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const capabilities = getWorkspaceCapabilities(session?.activeRole);
  const requiredCapability = requiredCapabilityForPath(pathname);
  const dashboardAllowed =
    session?.activeRole === "owner" && capabilities.canViewBookings && capabilities.canViewRooms;
  const routeAllowed =
    pathname === "/dashboard"
      ? dashboardAllowed
      : !requiredCapability || capabilities[requiredCapability];
  const homePath = session?.activeRole === "receptionist" || session?.activeRole === "manager"
    ? "/front-desk"
    : dashboardAllowed ? "/dashboard" : "/settings/profile";

  const guardInternalLink = (event: ReactMouseEvent<HTMLElement>) => {
    if (
      !hasUnsavedChanges ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    ) {
      return;
    }

    const anchor = event.target.closest("a[href]");
    if (
      !(anchor instanceof HTMLAnchorElement) ||
      anchor.hasAttribute("download") ||
      anchor.getAttribute("aria-disabled") === "true" ||
      (anchor.target && anchor.target !== "_self")
    ) {
      return;
    }

    const destination = new URL(anchor.href, window.location.href);
    const current = new URL(window.location.href);
    if (
      destination.origin !== current.origin ||
      (destination.pathname === current.pathname &&
        destination.search === current.search)
    ) {
      return;
    }

    event.preventDefault();
    void requestNavigation(() => {
      router.push(
        `${destination.pathname}${destination.search}${destination.hash}`,
      );
    });
  };

  useEffect(() => {
    if (!loading && session && session.status !== AppStatus.Ready) {
      router.replace("/");
    }
  }, [loading, router, session]);

  if (error) {
    return <SessionErrorScreen error={error} onRetry={() => void refresh()} />;
  }
  if (
    loading ||
    !session ||
    session.status !== AppStatus.Ready
  ) {
    return <FullPageLoader />;
  }

  if (!routeAllowed) {
    return (
      <PermissionDeniedScreen
        homePath={homePath}
      />
    );
  }

  const propertyDefinition = getPropertyTypeDefinition(session.property?.type);
  const inventoryPlural = t(
    propertyDefinition.inventoryPlural[0],
    propertyDefinition.inventoryPlural[1],
  );
  const locationLabel = getLocationLabel(pathname, t, session.property?.type);
  const name = String(
    session.user?.user_metadata?.full_name ??
      session.user?.user_metadata?.name ??
      session.user?.email?.split("@")[0] ??
      t("Account", "Akaunti"),
  );
  const avatar =
    typeof session.user?.user_metadata?.avatar_url === "string"
      ? session.user.user_metadata.avatar_url
      : undefined;
  const pageOwnsBookingAction = [
    "/dashboard",
    "/bookings",
    "/calendar",
    "/guests",
    "/operations",
    "/front-desk",
    "/rooms",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));

  const signOut = async () => {
    await requestNavigation(async () => {
      await createClient().auth.signOut();
      clearDrafts();
      router.replace("/login");
      router.refresh();
    });
  };

  const switchActiveProperty = async (propertyId: string) => {
    await requestNavigation(async () => {
      const nextMembership = session.memberships.find(
        (membership) => membership.property_id === propertyId,
      );
      const nextRole = nextMembership?.role;
      const nextCapabilities = getWorkspaceCapabilities(nextRole);
      const nextDashboardAllowed =
        nextRole === "owner" &&
        nextCapabilities.canViewBookings &&
        nextCapabilities.canViewRooms;
      const nextRouteAllowed =
        pathname === "/dashboard"
          ? nextDashboardAllowed
          : !requiredCapability || nextCapabilities[requiredCapability];
      const nextHomePath =
        nextRole === "manager" || nextRole === "receptionist"
          ? "/front-desk"
          : nextDashboardAllowed
            ? "/dashboard"
            : "/settings/profile";

      await switchProperty(propertyId);
      clearDrafts();
      if (nextRouteAllowed) {
        router.refresh();
      } else {
        router.replace(nextHomePath);
      }
    });
  };

  const sidebar = (
    <SidebarContent
      activePropertyId={session.activePropertyId}
      avatar={avatar}
      capabilities={capabilities}
      dashboardAllowed={dashboardAllowed}
      homePath={homePath}
      memberships={session.memberships}
      name={name}
      onClose={() => setMobileOpen(false)}
      onSignOut={signOut}
      onSwitchProperty={switchActiveProperty}
      pathname={pathname}
      property={session.property}
      role={session.activeRole ?? "member"}
    />
  );

  return (
    <Box
      onClickCapture={guardInternalLink}
      sx={{ bgcolor: "background.default", display: "flex", minHeight: "100dvh" }}
    >
      <Box
        component="a"
        href="#main-content"
        sx={{
          bgcolor: "primary.main",
          borderRadius: 1,
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
          display: { xs: "none", md: "block" },
          flexShrink: 0,
          width: drawerWidth,
          "& .MuiDrawer-paper": {
            bgcolor: "background.paper",
            borderRight: 1,
            borderColor: "divider",
            boxSizing: "border-box",
            color: "text.primary",
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
            color: "text.primary",
            width: "min(90vw, 328px)",
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
          pb: { xs: "calc(72px + env(safe-area-inset-bottom))", md: 0 },
          pt: { xs: "calc(56px + env(safe-area-inset-top))", md: "60px" },
          "& .MuiFab-root": {
            "@media (max-width: 899.95px)": {
              bottom: "calc(76px + env(safe-area-inset-bottom)) !important",
            },
          },
        }}
      >
        <Box
          component="header"
          sx={{
            backdropFilter: "saturate(150%) blur(18px)",
            bgcolor:
              "color-mix(in srgb, var(--mui-palette-background-paper) 92%, transparent)",
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
              height: { xs: "calc(56px + env(safe-area-inset-top))", md: 60 },
              justifyContent: "space-between",
              pt: { xs: "env(safe-area-inset-top)", md: 0 },
              px: { xs: 2, sm: 3, md: 3 },
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
                href={homePath}
                aria-label={homePath === "/settings/profile"
                  ? t("Open my account", "Fungua akaunti yangu")
                  : t("Loji Business home", "Nyumbani Loji Business")}
                sx={{
                  alignItems: "center",
                  display: "inline-flex",
                  flexShrink: 0,
                  justifyContent: "center",
                  minHeight: 44,
                  minWidth: 44,
                }}
              >
                <BrandSymbol priority size={30} />
              </Box>
              <Typography noWrap sx={{ fontSize: ".9375rem", fontWeight: 700 }}>{locationLabel}</Typography>
            </Stack>

            <Typography
              noWrap
              sx={{
                display: { xs: "none", md: "block" },
                fontSize: ".875rem",
                fontWeight: 700,
                letterSpacing: "-.01em",
              }}
            >
              {locationLabel}
            </Typography>

            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexShrink: 0 }}>
              {capabilities.canCreateBooking && !pageOwnsBookingAction ? (
                <Button
                  component={Link}
                  href="/bookings/new"
                  size="small"
                  startIcon={<AddRoundedIcon />}
                  sx={{ display: { xs: "none", sm: "inline-flex" } }}
                  variant="contained"
                >
                  {t("New booking", "Uhifadhi mpya")}
                </Button>
              ) : null}
              {capabilities.canViewNotifications ? (
                <Tooltip title={t("Notifications", "Arifa")}>
                  <IconButton
                    aria-label={t("Open notifications", "Fungua arifa")}
                    component={Link}
                    href="/notifications"
                    size="small"
                    sx={{ display: { xs: "none", md: "inline-flex" } }}
                  >
                    <NotificationsNoneRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <TopBarLanguageSwitch compact />
              </Box>
              <Tooltip title={t("My account", "Akaunti yangu")}>
                <IconButton
                  aria-label={t("Open my account", "Fungua akaunti yangu")}
                  component={Link}
                  href="/settings/profile"
                  size="small"
                  sx={{ p: 0.25 }}
                >
                  <Avatar src={avatar} sx={{ bgcolor: "primary.main", height: 32, width: 32 }}>
                    {name[0]?.toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Box>

        <Fragment key={session.activePropertyId}>{children}</Fragment>
      </Box>

      <MobileNavigation
        capabilities={capabilities}
        dashboardAllowed={dashboardAllowed}
        inventoryLabel={inventoryPlural}
        menuOpen={mobileOpen}
        onNavigate={(path) => {
          void requestNavigation(() => {
            router.push(path);
          });
        }}
        onOpenMenu={() => setMobileOpen(true)}
        pathname={pathname}
        role={session.activeRole}
      />
    </Box>
  );
}

function PermissionDeniedScreen({ homePath }: { homePath: string }) {
  const { t } = useLanguage();
  const accountHome = homePath === "/settings/profile";
  const frontDeskHome = homePath === "/front-desk";

  return (
    <Box
      component="main"
      sx={{
        bgcolor: "background.default",
        display: "grid",
        minHeight: "100dvh",
        p: 2,
        placeItems: "center",
      }}
    >
      <Paper
        variant="outlined"
        sx={{ maxWidth: 460, p: { xs: 3, sm: 4 }, textAlign: "center", width: "100%" }}
      >
        <Box
          sx={{
            bgcolor:
              "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
            borderRadius: 2,
            color: "primary.main",
            display: "grid",
            height: 48,
            mx: "auto",
            placeItems: "center",
            width: 48,
          }}
        >
          <LockRoundedIcon />
        </Box>
        <Typography component="h1" sx={{ mt: 2 }} variant="h3">
          {t("You do not have access to this page", "Huna ruhusa ya kufungua ukurasa huu")}
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.7, mt: 1 }}>
          {t(
            "Your workspace role does not include this area. Ask an owner or manager if your responsibilities have changed.",
            "Jukumu lako kwenye biashara halijumuishi sehemu hii. Wasiliana na mmiliki au meneja ikiwa majukumu yako yamebadilika.",
          )}
        </Typography>
        <Button
          component={Link}
          href={homePath}
          sx={{ mt: 3 }}
          variant="contained"
        >
          {accountHome
            ? t("Open my account", "Fungua akaunti yangu")
            : frontDeskHome
              ? t("Open Front Desk", "Fungua Mapokezi")
              : t("Return home", "Rudi nyumbani")}
        </Button>
      </Paper>
    </Box>
  );
}
