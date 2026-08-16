"use client";

import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import { Box, Button, Container, Divider, List, ListItemButton, ListItemIcon, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { useAppSession } from "@/features/session/hooks/use-app-session";

function MoreItem({ icon, title, subtitle, href }: { icon: React.ReactNode; title: string; subtitle: string; href: string }) {
  return <ListItemButton onClick={() => window.location.assign(href)} sx={{ borderRadius: 2, py: 1.5 }}><ListItemIcon sx={{ color: "primary.main", minWidth: 44 }}>{icon}</ListItemIcon><ListItemText primary={title} secondary={subtitle} primaryTypographyProps={{ fontWeight: 700 }} /><ChevronRightRoundedIcon color="action" /></ListItemButton>;
}

export function MoreScreen() {
  const { session } = useAppSession();
  const canManage = ["owner", "manager"].includes(session?.activeRole?.toLowerCase() ?? "");
  const logout = async () => { await createClient().auth.signOut(); window.location.replace("/login"); };
  return <Box component="main" sx={{ py: { xs: 2, md: 5 } }}><Container maxWidth="md"><Stack spacing={3}>
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}><Button color="inherit" startIcon={<ArrowBackRoundedIcon />} onClick={() => window.history.back()}>Back</Button><Typography variant="h4">More</Typography></Stack>
    <Box><Typography color="text.secondary" sx={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: ".1em", mb: 1, px: 1 }}>ACCOUNT</Typography><Paper variant="outlined"><List disablePadding><MoreItem icon={<PersonOutlineRoundedIcon />} title="My Account" subtitle="Profile, preferences and security" href="/more/account" /></List></Paper></Box>
    {canManage && <Box><Typography color="text.secondary" sx={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: ".1em", mb: 1, px: 1 }}>MANAGEMENT</Typography><Paper variant="outlined"><List disablePadding><MoreItem icon={<ApartmentRoundedIcon />} title="Property" subtitle="Details, amenities and overview" href="/more/property" /><Divider /><MoreItem icon={<GroupsRoundedIcon />} title="Staff" subtitle="Users, invitations and permissions" href="/more/staff" /></List></Paper></Box>}
    <Button color="error" variant="outlined" startIcon={<LogoutRoundedIcon />} onClick={() => void logout()}>Log out</Button>
  </Stack></Container></Box>;
}
