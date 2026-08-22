"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { SessionErrorScreen } from "@/components/shared/session-error-screen";
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

const drawerWidth = 232;

function imageFromProperty(
  property: Record<string, unknown> | null | undefined,
) {
  if (!property || !Array.isArray(property.images) || !property.images.length) {
    return undefined;
  }

  const first = property.images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) {
    return String((first as { url?: unknown }).url ?? "") || undefined;
  }
  return undefined;
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, error, refresh } = useAppSession();
  const { language, setLanguage, t } = useLanguage();
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
  const property = session.property as
    | Record<string, unknown>
    | null
    | undefined;
  const propertyImage = imageFromProperty(property);
  const propertyName = String(property?.name ?? "Your property");
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
        sx={{
          flex: 1,
          minWidth: 0,
          overflowX: "clip",
          pb: 0,
        }}
      >
        <Box
          sx={{
            alignItems: "center",
            bgcolor: "background.paper",
            backdropFilter: "blur(16px)",
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            height: { xs: 56, lg: 64 },
            justifyContent: "space-between",
            px: { xs: 1.5, sm: 2.5 },
            position: "sticky",
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
          }}
        >
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ alignItems: "center", minWidth: 0 }}
          >
            <IconButton
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              size="small"
              sx={{ display: { xs: "inline-flex", lg: "none" } }}
            >
              <MenuRoundedIcon />
            </IconButton>
            <Avatar
              src={propertyImage}
              variant="rounded"
              sx={{
                bgcolor: "primary.main",
                height: { xs: 30, sm: 34, lg: 36 },
                width: { xs: 30, sm: 34, lg: 36 },
              }}
            >
              <ApartmentRoundedIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                noWrap
                sx={{
                  fontSize: { xs: ".88rem", sm: "1rem", lg: "1.08rem" },
                  fontWeight: 700,
                  letterSpacing: "-.015em",
                  lineHeight: 1.2,
                }}
              >
                {propertyName}
              </Typography>
              <Typography noWrap color="text.secondary" variant="caption">
                {t("Property workspace", "Eneo la biashara")}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <TranslateRoundedIcon
              sx={{
                color: "text.secondary",
                display: { xs: "none", sm: "block" },
                fontSize: 18,
              }}
            />
            <Select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as "en" | "sw")
              }
              size="small"
              inputProps={{ "aria-label": t("Language", "Lugha") }}
              sx={{
                fontSize: ".78rem",
                fontWeight: 700,
                minWidth: { xs: 66, sm: 92 },
                "& .MuiSelect-select": { py: 0.75 },
              }}
            >
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="sw">SW</MenuItem>
            </Select>
          </Stack>
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
  return (
    <Box
      sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          height: 52,
          justifyContent: "space-between",
          px: 1.25,
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
          aria-label="Close navigation"
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
        <NavigationList
          items={workspaceDestinations}
          onNavigate={onClose}
          pathname={pathname}
        />

        {canManage ? (
          <Box sx={{ mt: 2 }}>
            <Typography
              color="text.secondary"
              component="p"
              variant="caption"
              sx={{ px: 1.25, pb: 0.75 }}
            >
              {t("Manage", "Usimamizi")}
            </Typography>
            <NavigationList
              items={managementDestinations}
              onNavigate={onClose}
              pathname={pathname}
            />
          </Box>
        ) : null}

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
          <Avatar
            src={avatar}
            sx={{ bgcolor: "text.primary", height: 30, width: 30 }}
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
          <Tooltip title="Sign out">
            <IconButton
              aria-label="Sign out"
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
                  sx: {
                    fontSize: "0.875rem",
                    fontWeight: selected ? 500 : 400,
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
