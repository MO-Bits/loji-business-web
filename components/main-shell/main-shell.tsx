"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import {
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
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
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { SessionErrorScreen } from "@/components/shared/session-error-screen";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { AppStatus } from "@/features/session/models/app-status";
import { createClient } from "@/lib/supabase/client";
import {
  accountDestination,
  managementDestinations,
  mobileDestinations,
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
      propertyImage={propertyImage}
      propertyName={propertyName}
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
          overflowX: "hidden",
          pb: { xs: "calc(78px + env(safe-area-inset-bottom))", lg: 0 },
        }}
      >
        <Box
          sx={{
            alignItems: "center",
            bgcolor: "background.paper",
            backdropFilter: "blur(16px)",
            borderBottom: 1,
            borderColor: "divider",
            display: { xs: "flex", lg: "none" },
            height: 60,
            justifyContent: "space-between",
            px: { xs: 1.5, sm: 2.5 },
            position: "sticky",
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <IconButton
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              size="small"
            >
              <MenuRoundedIcon />
            </IconButton>
            <BrandWordmark priority sx={{ width: { xs: 122, sm: 136 } }} />
          </Stack>
          <Avatar
            src={propertyImage}
            sx={{ bgcolor: "primary.main", height: 32, width: 32 }}
          >
            <ApartmentRoundedIcon sx={{ fontSize: 17 }} />
          </Avatar>
        </Box>

        {children}
      </Box>

      <MobileNavigation
        pathname={pathname}
        onNavigate={(path) => router.push(path)}
      />
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
  propertyImage?: string;
  propertyName: string;
  role: string;
};

function SidebarContent({
  avatar,
  canManage,
  name,
  onClose,
  onSignOut,
  pathname,
  propertyImage,
  propertyName,
  role,
}: SidebarContentProps) {
  return (
    <Box sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          height: 60,
          justifyContent: "space-between",
          px: 2,
        }}
      >
        <BrandWordmark priority sx={{ width: 132 }} />
        <IconButton
          aria-label="Close navigation"
          onClick={onClose}
          size="small"
          sx={{ display: { xs: "inline-flex", lg: "none" } }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ px: 1.25 }}>
        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: "center",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            minHeight: 48,
            px: 1.25,
            py: 0.75,
          }}
        >
          <Avatar
            src={propertyImage}
            variant="rounded"
            sx={{ bgcolor: "primary.main", height: 30, width: 30 }}
          >
            <ApartmentRoundedIcon sx={{ fontSize: 17 }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap variant="body2" sx={{ fontWeight: 500 }}>
              {propertyName}
            </Typography>
            <Typography noWrap color="text.secondary" variant="caption">
              Workspace
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box
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
        <Button
          component={Link}
          href="/bookings/new"
          onClick={onClose}
          startIcon={<AddRoundedIcon />}
          variant="outlined"
          sx={{
            justifyContent: "flex-start",
            mb: 1.5,
            "& .MuiButton-startIcon": { mr: 1.25 },
          }}
        >
          New booking
        </Button>

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
              Manage
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
              primary={item.label}
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

function MobileNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: (path: string) => void;
}) {
  const match = mobileDestinations.findIndex((item) => item.match(pathname));
  const selected = pathname.startsWith("/more/")
    ? mobileDestinations.length - 1
    : Math.max(0, match);

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        backdropFilter: "blur(18px)",
        borderTop: 1,
        borderColor: "divider",
        bottom: 0,
        display: { xs: "block", lg: "none" },
        left: 0,
        pb: "env(safe-area-inset-bottom)",
        position: "fixed",
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation
        showLabels
        value={selected}
        onChange={(_, value: number) =>
          onNavigate(mobileDestinations[value].path)
        }
        sx={{ height: 68, maxWidth: 720, mx: "auto" }}
      >
        {mobileDestinations.map((item, index) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label === "My account" ? "Account" : item.label}
            icon={index === selected ? item.activeIcon : item.icon}
            sx={{
              minWidth: 0,
              px: 0.5,
              color: index === selected ? "primary.main" : "text.secondary",
            }}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}
