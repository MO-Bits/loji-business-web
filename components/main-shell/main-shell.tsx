"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { Avatar, BottomNavigation, BottomNavigationAction, Box, Button, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { SessionErrorScreen } from "@/components/shared/session-error-screen";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { AppStatus } from "@/features/session/models/app-status";
import { createClient } from "@/lib/supabase/client";
import { accountDestination, managementDestinations, mobileDestinations, type MainDestination, workspaceDestinations } from "./destinations";

const drawerWidth = 282;

function imageFromProperty(property: Record<string, unknown> | null | undefined) {
  if (!property || !Array.isArray(property.images) || !property.images.length) return undefined;
  const first = property.images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) return String((first as { url?: unknown }).url ?? "") || undefined;
  return undefined;
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, error, refresh } = useAppSession();

  useEffect(() => {
    if (!loading && session && session.status !== AppStatus.Ready) router.replace("/");
  }, [loading, router, session]);

  if (error) return <SessionErrorScreen error={error} onRetry={() => void refresh()} />;
  if (loading || !session || session.status !== AppStatus.Ready) return <FullPageLoader />;

  const canManage = ["owner", "manager"].includes(session.activeRole?.toLowerCase() ?? "");
  const property = session.property as Record<string, unknown> | null | undefined;
  const propertyName = typeof property?.name === "string" ? property.name : "Your property";
  const propertyType = typeof property?.type === "string" ? property.type : "Hospitality property";
  const propertyImage = imageFromProperty(property);
  const name = String(session.user?.user_metadata?.full_name ?? session.user?.user_metadata?.name ?? session.user?.email?.split("@")[0] ?? "Account");
  const avatar = typeof session.user?.user_metadata?.avatar_url === "string" ? session.user.user_metadata.avatar_url : undefined;

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return <Box sx={{ display: "flex", minHeight: "100dvh" }}>
    <Drawer variant="permanent" sx={{ display: { xs: "none", md: "block" }, flexShrink: 0, width: drawerWidth, "& .MuiDrawer-paper": { bgcolor: "background.paper", borderRightColor: "divider", boxSizing: "border-box", width: drawerWidth } }}>
      <Toolbar sx={{ minHeight: 82, px: 3 }}><BrandWordmark priority sx={{ width: 172 }} /></Toolbar>
      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ bgcolor: "#F2F6FB", border: "1px solid", borderColor: "#DFE8F2", borderRadius: 3, p: 1.5 }}>
          <Stack direction="row" spacing={1.3} alignItems="center">
            <Avatar variant="rounded" src={propertyImage} sx={{ bgcolor: "primary.main", borderRadius: 2, height: 44, width: 44 }}><ApartmentRoundedIcon /></Avatar>
            <Box sx={{ minWidth: 0 }}><Typography noWrap variant="body2" sx={{ fontWeight: 800 }}>{propertyName}</Typography><Typography noWrap color="text.secondary" variant="caption" sx={{ textTransform: "capitalize" }}>{propertyType}</Typography></Box>
          </Stack>
        </Box>
      </Box>
      <Divider />
      <Box sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0, overflowY: "auto", px: 1.5, py: 2 }}>
        <NavigationSection label="Workspace" items={workspaceDestinations} pathname={pathname} />
        {canManage && <NavigationSection label="Manage" items={managementDestinations} pathname={pathname} sx={{ mt: 2.5 }} />}
        <NavigationSection label="Profile" items={[accountDestination]} pathname={pathname} sx={{ mt: 2.5 }} />
        <Box sx={{ flex: 1 }} />
        <Box sx={{ px: .5, py: 1.5 }}><Button component={Link} href="/bookings/new" variant="contained" startIcon={<AddRoundedIcon />} fullWidth>New booking</Button></Box>
        <Divider sx={{ my: 1 }} />
        <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", px: 1, py: 1.25 }}>
          <Avatar src={avatar} sx={{ bgcolor: "#17202A", height: 40, width: 40 }}>{name[0]?.toUpperCase()}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap variant="body2" sx={{ fontWeight: 750 }}>{name}</Typography><Typography noWrap color="text.secondary" variant="caption" sx={{ textTransform: "capitalize" }}>{session.activeRole ?? "Member"}</Typography></Box>
          <Tooltip title="Sign out"><Button color="inherit" aria-label="Sign out" onClick={() => void signOut()} sx={{ minWidth: 40, px: 1 }}><LogoutRoundedIcon fontSize="small" /></Button></Tooltip>
        </Stack>
      </Box>
    </Drawer>

    <Box component="main" sx={{ flex: 1, minWidth: 0, overflowX: "hidden", pb: { xs: "calc(78px + env(safe-area-inset-bottom))", md: 0 } }}>
      <Box sx={{ alignItems: "center", bgcolor: "rgba(255,255,255,.94)", backdropFilter: "blur(18px)", borderBottom: 1, borderColor: "divider", display: { xs: "flex", md: "none" }, height: 66, justifyContent: "space-between", px: 2, position: "sticky", top: 0, zIndex: (theme) => theme.zIndex.appBar }}>
        <BrandWordmark priority sx={{ width: 146 }} />
        <Avatar src={propertyImage} sx={{ bgcolor: "primary.main", height: 36, width: 36 }}><ApartmentRoundedIcon fontSize="small" /></Avatar>
      </Box>
      {children}
    </Box>
    <MobileNavigation pathname={pathname} onNavigate={(path) => router.push(path)} />
  </Box>;
}

function NavigationSection({ label, items, pathname, sx }: { label: string; items: MainDestination[]; pathname: string; sx?: object }) {
  return <Box sx={sx}><Typography color="text.secondary" sx={{ fontSize: ".67rem", fontWeight: 800, letterSpacing: ".12em", mb: .7, px: 1.5 }}>{label.toUpperCase()}</Typography><List disablePadding>{items.map((item) => {
    const selected = item.match(pathname);
    return <ListItemButton component={Link} href={item.path} key={item.path} selected={selected} sx={{ borderRadius: 2.5, mb: .4, minHeight: 46, px: 1.5, "&.Mui-selected": { bgcolor: "#EAF3FF", color: "primary.dark", "&:hover": { bgcolor: "#E1EEFD" } } }}><ListItemIcon sx={{ color: selected ? "primary.main" : "text.secondary", minWidth: 40 }}>{selected ? item.activeIcon : item.icon}</ListItemIcon><ListItemText primary={item.label} primaryTypographyProps={{ fontSize: ".93rem", fontWeight: selected ? 780 : 570 }} /></ListItemButton>;
  })}</List></Box>;
}

function MobileNavigation({ pathname, onNavigate }: { pathname: string; onNavigate: (path: string) => void }) {
  const match = mobileDestinations.findIndex((item) => item.match(pathname));
  const selected = pathname.startsWith("/more/") ? mobileDestinations.length - 1 : Math.max(0, match);
  return <Box sx={{ bgcolor: "rgba(255,255,255,.96)", backdropFilter: "blur(18px)", borderTop: 1, borderColor: "divider", bottom: 0, boxShadow: "0 -8px 30px rgba(17,24,39,.07)", display: { xs: "block", md: "none" }, left: 0, pb: "env(safe-area-inset-bottom)", position: "fixed", right: 0, zIndex: (theme) => theme.zIndex.appBar }}><BottomNavigation showLabels value={selected} onChange={(_, value: number) => onNavigate(mobileDestinations[value].path)} sx={{ height: 70 }}>{mobileDestinations.map((item, index) => <BottomNavigationAction key={item.path} label={item.label === "My account" ? "Account" : item.label} icon={index === selected ? item.activeIcon : item.icon} sx={{ minWidth: 0, px: .5, color: index === selected ? "primary.main" : "text.secondary", "& .MuiBottomNavigationAction-label": { fontSize: ".65rem", fontWeight: index === selected ? 780 : 570 } }} />)}</BottomNavigation></Box>;
}
