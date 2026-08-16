"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { Avatar, BottomNavigation, BottomNavigationAction, Box, Button, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { SessionErrorScreen } from "@/components/shared/session-error-screen";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { AppStatus } from "@/features/session/models/app-status";
import { createClient } from "@/lib/supabase/client";
import { accountDestination, managementDestinations, mobileDestinations, type MainDestination, workspaceDestinations } from "./destinations";

const drawerWidth = 264;

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const { session, loading, error, refresh } = useAppSession();
  useEffect(() => { if (!loading && session && session.status !== AppStatus.Ready) router.replace("/"); }, [loading, router, session]);
  if (error) return <SessionErrorScreen error={error} onRetry={() => void refresh()} />;
  if (loading || !session || session.status !== AppStatus.Ready) return <FullPageLoader />;
  const canManage = ["owner", "manager"].includes(session.activeRole?.toLowerCase() ?? "");
  const name = String(session.user?.user_metadata?.full_name ?? session.user?.user_metadata?.name ?? session.user?.email?.split("@")[0] ?? "Account");
  const avatar = typeof session.user?.user_metadata?.avatar_url === "string" ? session.user.user_metadata.avatar_url : undefined;
  const signOut = async () => { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); };
  return <Box sx={{ display: "flex", minHeight: "100dvh" }}>
    <Drawer variant="permanent" sx={{ display: { xs: "none", md: "block" }, flexShrink: 0, width: drawerWidth, "& .MuiDrawer-paper": { background: "linear-gradient(180deg, var(--mui-palette-background-paper) 0%, color-mix(in srgb, var(--mui-palette-primary-main) 3%, var(--mui-palette-background-paper)) 100%)", borderRightColor: "divider", boxSizing: "border-box", width: drawerWidth } }}>
      <Toolbar sx={{ minHeight: 88, px: 2.5 }}><Stack spacing={0.25}><BrandWordmark priority sx={{ width: 178 }} /><Typography variant="caption" color="text.secondary">Property workspace</Typography></Stack></Toolbar>
      <Divider />
      <Box sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0, overflowY: "auto", px: 1.5, py: 2 }}><NavigationSection label="Workspace" items={workspaceDestinations} pathname={pathname} />{canManage && <NavigationSection label="Management" items={managementDestinations} pathname={pathname} sx={{ mt: 2 }} />}<NavigationSection label="Account" items={[accountDestination]} pathname={pathname} sx={{ mt: 2 }} /><Box sx={{ flex: 1 }} />
        <Divider sx={{ my: 1.5 }} /><Stack direction="row" spacing={1.2} sx={{ alignItems: "center", px: 1, py: 1 }}><Avatar src={avatar} sx={{ bgcolor: "primary.main", height: 38, width: 38 }}>{name[0]?.toUpperCase()}</Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap variant="body2" sx={{ fontWeight: 750 }}>{name}</Typography><Typography noWrap color="text.secondary" variant="caption" sx={{ textTransform: "capitalize" }}>{session.activeRole ?? "Member"}</Typography></Box><Tooltip title="Sign out"><Button color="inherit" aria-label="Sign out" onClick={() => void signOut()} sx={{ minWidth: 42, px: 1 }}><LogoutRoundedIcon fontSize="small" /></Button></Tooltip></Stack>
      </Box>
    </Drawer>
    <Box component="main" sx={{ flex: 1, minWidth: 0, overflowX: "hidden", pb: { xs: "calc(76px + env(safe-area-inset-bottom))", md: 0 } }}><Box sx={{ alignItems: "center", bgcolor: "color-mix(in srgb, var(--mui-palette-background-paper) 94%, transparent)", backdropFilter: "blur(14px)", borderBottom: 1, borderColor: "divider", display: { xs: "flex", md: "none" }, height: 64, px: 2, position: "sticky", top: 0, zIndex: (theme) => theme.zIndex.appBar }}><BrandWordmark priority sx={{ width: 154 }} /></Box>{children}</Box>
    <MobileNavigation pathname={pathname} onNavigate={(path) => router.push(path)} />
  </Box>;
}

function NavigationSection({ label, items, pathname, sx }: { label: string; items: MainDestination[]; pathname: string; sx?: object }) { return <Box sx={sx}><Typography color="text.secondary" sx={{ fontSize: ".68rem", fontWeight: 800, letterSpacing: ".11em", mb: .7, px: 1.5 }}>{label.toUpperCase()}</Typography><List disablePadding>{items.map((item) => { const selected = item.match(pathname); return <ListItemButton component={Link} href={item.path} key={item.path} selected={selected} sx={{ borderRadius: 2.5, mb: .4, minHeight: 46, px: 1.5, "&.Mui-selected": { bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 11%, transparent)", color: "primary.main", "&:hover": { bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 15%, transparent)" } } }}><ListItemIcon sx={{ color: selected ? "primary.main" : "text.secondary", minWidth: 40 }}>{selected ? item.activeIcon : item.icon}</ListItemIcon><ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: selected ? 750 : 580 }} /></ListItemButton>; })}</List></Box>; }

function MobileNavigation({ pathname, onNavigate }: { pathname: string; onNavigate: (path: string) => void }) { const match = mobileDestinations.findIndex((item) => item.match(pathname)); const selected = pathname.startsWith("/more/") ? mobileDestinations.length - 1 : Math.max(0, match); return <Box sx={{ bgcolor: "color-mix(in srgb, var(--mui-palette-background-paper) 94%, transparent)", backdropFilter: "blur(16px)", borderTop: 1, borderColor: "divider", bottom: 0, boxShadow: "0 -10px 30px rgba(16,24,40,.07)", display: { xs: "block", md: "none" }, left: 0, pb: "env(safe-area-inset-bottom)", position: "fixed", right: 0, zIndex: (theme) => theme.zIndex.appBar }}><BottomNavigation showLabels value={selected} onChange={(_, value: number) => onNavigate(mobileDestinations[value].path)} sx={{ height: 68 }}>{mobileDestinations.map((item, index) => <BottomNavigationAction key={item.path} label={item.label === "My account" ? "Account" : item.label} icon={index === selected ? item.activeIcon : item.icon} sx={{ minWidth: 0, px: .5, "& .MuiBottomNavigationAction-label": { fontSize: ".66rem", fontWeight: index === selected ? 750 : 550 } }} />)}</BottomNavigation></Box>; }
