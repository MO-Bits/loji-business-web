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
import BedOutlinedIcon from "@mui/icons-material/BedOutlined";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
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
import type { Membership, Property } from "@/features/session/models/app-session";
import { AppStatus } from "@/features/session/models/app-status";
import {
  getWorkspaceCapabilities,
  type WorkspaceCapabilities,
} from "@/features/session/permissions";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/providers/language-provider";
import { useDirtyNavigation } from "@/components/providers/unsaved-changes-provider";
import {
  accountDestination,
  businessDestinations,
  managementDestinations,
  operationsDestinations,
  requiredCapabilityForPath,
  settingsDestination,
  type MainDestination,
  visibleDestinations,
  workspaceDestinations,
} from "./destinations";
import { PropertySwitcher } from "./property-switcher";
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
    capabilities.canViewBookings && capabilities.canViewRooms;
  const routeAllowed =
    pathname === "/dashboard"
      ? dashboardAllowed
      : !requiredCapability || capabilities[requiredCapability];
  const homePath = dashboardAllowed ? "/dashboard" : "/settings/profile";

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
        dashboardAllowed={dashboardAllowed}
      />
    );
  }

  const propertyDefinition = getPropertyTypeDefinition(session.property?.type);
  const inventoryPlural = t(
    propertyDefinition.inventoryPlural[0],
    propertyDefinition.inventoryPlural[1],
  );
  const locationLabel = getLocationLabel(pathname, t, session.property?.type);
  const mobileNavValue = pathname.startsWith("/bookings")
    ? "/bookings"
    : pathname.startsWith("/rooms")
      ? "/rooms"
      : pathname.startsWith("/guests")
        ? "/guests"
        : pathname === "/dashboard"
          ? "/dashboard"
          : "menu";
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
      await switchProperty(propertyId);
      clearDrafts();
      router.refresh();
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
                aria-label={dashboardAllowed
                  ? t("Loji Business home", "Nyumbani Loji Business")
                  : t("Open my account", "Fungua akaunti yangu")}
                sx={{ display: "inline-flex", flexShrink: 0 }}
              >
                <BrandSymbol priority size={30} />
              </Box>
              <PropertySwitcher
                activePropertyId={session.activePropertyId}
                memberships={session.memberships}
                property={session.property}
                onSwitch={switchActiveProperty}
                placement="topbar"
              />
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

      <Paper
        component="nav"
        aria-label={t("Primary navigation", "Menyu kuu")}
        square
        elevation={0}
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
          value={mobileOpen ? "menu" : mobileNavValue}
          onChange={(_, value) => {
            if (value === "menu") {
              setMobileOpen(true);
              return;
            }
            void requestNavigation(() => {
              router.push(String(value));
            });
          }}
          sx={{
            borderTop: 1,
            borderColor: "divider",
            height: 64,
            px: 0.25,
            "& .MuiBottomNavigationAction-root": {
              color: "text.secondary",
              minWidth: 52,
              position: "relative",
              "&.Mui-selected": { color: "primary.main" },
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: ".6875rem",
              fontWeight: 500,
              mt: 0.25,
              "&.Mui-selected": { fontSize: ".6875rem", fontWeight: 700 },
            },
          }}
        >
          {dashboardAllowed ? (
            <BottomNavigationAction
              label={t("Home", "Nyumbani")}
              value="/dashboard"
              icon={mobileNavValue === "/dashboard" ? <HomeRoundedIcon /> : <HomeOutlinedIcon />}
            />
          ) : null}
          {capabilities.canViewBookings ? (
            <BottomNavigationAction
              label={t("Bookings", "Uhifadhi")}
              value="/bookings"
              icon={mobileNavValue === "/bookings" ? <EventNoteRoundedIcon /> : <EventNoteOutlinedIcon />}
            />
          ) : null}
          {capabilities.canViewRooms ? (
            <BottomNavigationAction
              label={inventoryPlural}
              value="/rooms"
              icon={mobileNavValue === "/rooms" ? <BedRoundedIcon /> : <BedOutlinedIcon />}
            />
          ) : null}
          {capabilities.canViewGuests ? (
            <BottomNavigationAction
              label={t("Guests", "Wageni")}
              value="/guests"
              icon={mobileNavValue === "/guests" ? <PeopleRoundedIcon /> : <PeopleOutlineRoundedIcon />}
            />
          ) : null}
          <BottomNavigationAction
            label={t("More", "Zaidi")}
            value="menu"
            icon={<MoreHorizRoundedIcon />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}

function PermissionDeniedScreen({ dashboardAllowed }: { dashboardAllowed: boolean }) {
  const { t } = useLanguage();

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
          href={dashboardAllowed ? "/dashboard" : "/settings/profile"}
          sx={{ mt: 3 }}
          variant="contained"
        >
          {dashboardAllowed
            ? t("Return home", "Rudi nyumbani")
            : t("Open my account", "Fungua akaunti yangu")}
        </Button>
      </Paper>
    </Box>
  );
}

type SidebarContentProps = {
  activePropertyId?: string;
  avatar?: string;
  capabilities: WorkspaceCapabilities;
  dashboardAllowed: boolean;
  homePath: string;
  memberships: Membership[];
  name: string;
  onClose: () => void;
  onSignOut: () => Promise<void>;
  onSwitchProperty: (propertyId: string) => Promise<void>;
  pathname: string;
  property?: Property | null;
  role: string;
};

function SidebarContent({
  activePropertyId,
  avatar,
  capabilities,
  dashboardAllowed,
  homePath,
  memberships,
  name,
  onClose,
  onSignOut,
  onSwitchProperty,
  pathname,
  property,
  role,
}: SidebarContentProps) {
  const { t } = useLanguage();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const propertyDefinition = getPropertyTypeDefinition(property?.type);
  const contextualize = (items: MainDestination[]) =>
    items.map((item) =>
      item.path === "/rooms"
        ? {
            ...item,
            label: propertyDefinition.inventoryPlural[0],
            localizedLabel: propertyDefinition.inventoryPlural,
          }
        : item,
    );
  const operations = contextualize(visibleDestinations(operationsDestinations, capabilities));
  const business = contextualize(visibleDestinations(businessDestinations, capabilities));
  const management = contextualize(visibleDestinations(managementDestinations, capabilities));

  return (
    <Box
      sx={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        minHeight: 0,
        pb: { xs: "env(safe-area-inset-bottom)", md: 0 },
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          borderBottom: 1,
          borderColor: "divider",
          height: { xs: "calc(60px + env(safe-area-inset-top))", md: 60 },
          justifyContent: "space-between",
          px: 1.5,
          pt: { xs: "env(safe-area-inset-top)", md: 0 },
        }}
      >
        <Box
          component={Link}
          href={homePath}
          aria-label={dashboardAllowed
            ? t("Loji Business home", "Nyumbani Loji Business")
            : t("Open my account", "Fungua akaunti yangu")}
          onClick={onClose}
          sx={{ display: "inline-flex", p: 0.5, textDecoration: "none" }}
        >
          <BrandLockup symbolSize={28} textSize=".9375rem" />
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

      <Box sx={{ borderBottom: 1, borderColor: "divider", p: 1.25 }}>
        <PropertySwitcher
          activePropertyId={activePropertyId}
          memberships={memberships}
          property={property}
          onSwitch={onSwitchProperty}
          placement="sidebar"
        />
      </Box>

      <Box
        component="nav"
        aria-label={t("Workspace navigation", "Menyu ya eneo la kazi")}
        sx={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minHeight: 0,
          overflowY: "auto",
          px: 1,
          py: 1.5,
        }}
      >
        <NavigationSection
          items={contextualize(visibleDestinations(workspaceDestinations, capabilities)).filter(
            (item) => item.path !== "/dashboard" || dashboardAllowed,
          )}
          label={t("Workspace", "Eneo la kazi")}
          onNavigate={onClose}
          pathname={pathname}
        />
        {operations.length ? (
          <NavigationSection
            items={operations}
            label={t("Operations", "Shughuli")}
            onNavigate={onClose}
            pathname={pathname}
          />
        ) : null}
        {business.length ? (
          <NavigationSection
            items={business}
            label={t("Business", "Biashara")}
            onNavigate={onClose}
            pathname={pathname}
          />
        ) : null}
        {management.length ? (
          <NavigationSection
            items={management}
            label={t("Manage", "Usimamizi")}
            onNavigate={onClose}
            pathname={pathname}
          />
        ) : null}

        <Box sx={{ flex: 1, minHeight: 20 }} />

        <NavigationList
          items={[settingsDestination]}
          onNavigate={onClose}
          pathname={pathname}
        />

        <ListItemButton
          aria-expanded={preferencesOpen}
          onClick={() => setPreferencesOpen((open) => !open)}
          sx={{ borderRadius: 1, minHeight: 40, px: 1.25 }}
        >
          <ListItemIcon sx={{ color: "text.secondary", minWidth: 30 }}>
            <TuneRoundedIcon sx={{ fontSize: 19 }} />
          </ListItemIcon>
          <ListItemText
            primary={t("Preferences", "Mapendeleo")}
            slotProps={{ primary: { sx: { fontSize: ".8125rem", fontWeight: 500 } } }}
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
              bgcolor: "background.default",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              mt: 0.5,
              p: 1.25,
            }}
          >
            <Box>
              <Typography color="text.secondary" variant="caption" sx={{ display: "block", fontWeight: 500, mb: 0.6 }}>
                {t("Appearance", "Mwonekano")}
              </Typography>
              <ThemeModeSelect fullWidth />
            </Box>
            <Box>
              <Typography color="text.secondary" variant="caption" sx={{ display: "block", fontWeight: 500, mb: 0.6 }}>
                {t("Language", "Lugha")}
              </Typography>
              <TopBarLanguageSwitch fullWidth />
            </Box>
          </Stack>
        </Collapse>

        <Divider sx={{ my: 1 }} />
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: "center", borderRadius: 1, minHeight: 52, p: 0.5 }}
        >
          <Stack
            component={Link}
            direction="row"
            href={accountDestination.path}
            onClick={onClose}
            spacing={1}
            sx={{
              alignItems: "center",
              borderRadius: 1,
              color: "inherit",
              flex: 1,
              minWidth: 0,
              p: 0.5,
              textDecoration: "none",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Avatar src={avatar} sx={{ bgcolor: "primary.main", height: 32, width: 32 }}>
              {name[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: ".8125rem", fontWeight: 700 }}>
                {name}
              </Typography>
              <Typography color="text.secondary" noWrap variant="caption" sx={{ textTransform: "capitalize" }}>
                {role.replaceAll("_", " ")}
              </Typography>
            </Box>
          </Stack>
          <Tooltip title={t("Sign out", "Ondoka")}>
            <IconButton
              aria-label={t("Sign out", "Ondoka")}
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

function NavigationSection({
  items,
  label,
  onNavigate,
  pathname,
}: {
  items: MainDestination[];
  label: string;
  onNavigate: () => void;
  pathname: string;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        color="text.secondary"
        component="p"
        sx={{
          fontSize: ".6875rem",
          fontWeight: 700,
          letterSpacing: ".07em",
          mb: 0.5,
          px: 1.25,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Typography>
      <NavigationList items={items} onNavigate={onNavigate} pathname={pathname} />
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
              borderRadius: 1,
              columnGap: 1.1,
              mb: 0.2,
              minHeight: 40,
              px: 1.25,
              "&.Mui-selected": {
                bgcolor: "action.selected",
                color: "primary.main",
                "&:hover": { bgcolor: "action.selected" },
              },
            }}
          >
            <ListItemIcon
              sx={{
                alignItems: "center",
                color: selected ? "primary.main" : "text.secondary",
                justifyContent: "center",
                minWidth: 22,
                width: 22,
                "& .MuiSvgIcon-root": { fontSize: 20 },
              }}
            >
              {selected ? item.activeIcon : item.icon}
            </ListItemIcon>
            <ListItemText
              primary={t(...item.localizedLabel)}
              sx={{ m: 0 }}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: ".875rem",
                    fontWeight: selected ? 700 : 500,
                  },
                },
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
