"use client";

import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import GroupWorkRoundedIcon from "@mui/icons-material/GroupWorkRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import { alpha, Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";

const reasons = [
  { icon: <HubRoundedIcon />, title: "One unified workspace", description: "Bridge the communication gap between owners, front-desk managers, and maintenance staff. Keep live bookings, room statuses, and guest ledgers synchronized without paperwork." },
  { icon: <AdminPanelSettingsRoundedIcon />, title: "Granular permissions & control", description: "Assign role-based access so staff can handle daily check-ins securely while sensitive reports remain restricted to ownership." },
  { icon: <VerifiedUserRoundedIcon />, title: "Tailored for African hospitality", description: "Built around local operational needs for independent lodges, guesthouses, hotels, and growing multi-branch businesses." },
];

const features = [
  { icon: <MeetingRoomRoundedIcon />, title: "Smart room management", description: "Track availability, occupancy, pricing, and room status at a glance." },
  { icon: <CalendarMonthRoundedIcon />, title: "Advanced bookings", description: "Create reservations, handle walk-ins, extend stays, and prevent scheduling conflicts." },
  { icon: <PersonAddAltRoundedIcon />, title: "Guest experience", description: "Maintain organized guest records for a faster, professional check-in workflow." },
  { icon: <GroupWorkRoundedIcon />, title: "Team & staffing", description: "Invite coworkers, delegate responsibilities, and keep clear operational visibility." },
  { icon: <InsightsRoundedIcon />, title: "Performance insights", description: "Understand revenue, occupancy trends, and property performance with confidence." },
  { icon: <CloudDoneRoundedIcon />, title: "Cloud synchronized", description: "Access property records securely from any device, on-site or away." },
];

export default function LearnMorePage() {
  return <Box component="main" sx={{ minHeight: "100dvh", py: { xs: 2, md: 5 } }}><Container maxWidth="lg"><Stack spacing={{ xs: 4, md: 7 }}>
    <Button component={Link} href="/login" startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: "flex-start" }}>Back to sign in</Button>
    <Paper variant="outlined" sx={(theme) => ({ p: { xs: 3, md: 6 }, borderRadius: 5, overflow: "hidden", position: "relative", background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, .16)}, ${theme.palette.background.paper} 62%)` })}>
      <Box sx={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", bgcolor: "primary.main", opacity: .06, right: -80, top: -110 }} />
      <Stack spacing={2.5} sx={{ position: "relative", maxWidth: 820 }}><Chip label="HOSPITALITY REINVENTED" color="primary" variant="outlined" sx={{ alignSelf: "flex-start", letterSpacing: 1 }} /><Typography variant="h2">The smarter way to run your hotel, lodge and guesthouse.</Typography><Typography variant="h6" color="text.secondary" fontWeight={450} sx={{ lineHeight: 1.7 }}>Loji Business is a modern cloud-based operational suite for accommodation providers. Connect your front desk, management, owners, rooms, guests, and bookings in one focused workspace.</Typography></Stack>
    </Paper>
    <Stack spacing={2.5}><Box><Typography variant="h4">Why Loji Business exists</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Designed to remove friction from every layer of your hospitality operation.</Typography></Box>{reasons.map((item) => <Paper key={item.title} variant="outlined" sx={{ p: 3, borderRadius: 4 }}><Stack direction={{ xs: "column", sm: "row" }} spacing={2.5}><Box sx={{ width: 50, height: 50, borderRadius: 3, bgcolor: "primary.main", color: "primary.contrastText", display: "grid", placeItems: "center", flexShrink: 0 }}>{item.icon}</Box><Box><Typography variant="h6">{item.title}</Typography><Typography color="text.secondary" sx={{ mt: .75 }}>{item.description}</Typography></Box></Stack></Paper>)}</Stack>
    <Stack spacing={2.5}><Box><Typography variant="h4">Everything your property needs</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>A practical toolkit designed for efficient daily management.</Typography></Box><Grid container spacing={2}>{features.map((item) => <Grid key={item.title} size={{ xs: 12, md: 6 }}><Paper variant="outlined" sx={{ p: 3, borderRadius: 4, height: "100%" }}><Stack direction="row" spacing={2}><Box color="primary.main">{item.icon}</Box><Box flex={1}><Stack direction="row" justifyContent="space-between"><Typography variant="subtitle1" fontWeight={800}>{item.title}</Typography><ArrowOutwardRoundedIcon color="disabled" fontSize="small" /></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>{item.description}</Typography></Box></Stack></Paper></Grid>)}</Grid></Stack>
    <Paper sx={(theme) => ({ p: { xs: 3, md: 5 }, borderRadius: 5, textAlign: "center", background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, .18)}, ${alpha(theme.palette.secondary.main, .12)})` })}><HotelRoundedIcon color="primary" sx={{ fontSize: 44 }} /><Typography variant="h4" sx={{ mt: 2 }}>Your property. Your team. One platform.</Typography><Typography color="text.secondary" sx={{ maxWidth: 700, mx: "auto", mt: 1.5 }}>Whether you operate a boutique guesthouse or a multi-branch hotel, Loji Business gives your team professional tools to simplify operations and serve guests better.</Typography><Button component={Link} href="/login" variant="contained" sx={{ mt: 3 }}>Get started</Button></Paper>
  </Stack></Container></Box>;
}
