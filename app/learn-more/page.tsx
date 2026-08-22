"use client";

import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import GroupWorkRoundedIcon from "@mui/icons-material/GroupWorkRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import { Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";

import {
  CloudOperationsIllustration,
  ConnectedTeamIllustration,
  HospitalityHeroIllustration,
} from "@/components/content/learn-more-illustrations";
import { BrandSymbol } from "@/components/shared/brand-symbol";

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
  return (
    <Box component="main" sx={{ bgcolor: "background.default", minHeight: "100dvh", py: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 5, md: 9 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Button component={Link} href="/login" startIcon={<ArrowBackRoundedIcon />}>Back to sign in</Button>
            <BrandSymbol size={34} />
          </Stack>

          <Box component="section" sx={{ alignItems: "center", display: "grid", gap: { xs: 4, md: 7 }, gridTemplateColumns: { xs: "1fr", md: "minmax(0,1.02fr) minmax(380px,.98fr)" } }}>
            <Stack spacing={2.5}>
              <Chip label="HOSPITALITY REINVENTED" color="primary" variant="outlined" sx={{ alignSelf: "flex-start", fontWeight: 700, letterSpacing: 1 }} />
              <Typography component="h1" variant="h2">The smarter way to run your hotel, lodge and guesthouse.</Typography>
              <Typography color="text.secondary" variant="h6" sx={{ fontWeight: 400, lineHeight: 1.65 }}>Loji Business is a modern cloud-based operational suite for accommodation providers. Connect your front desk, management, owners, rooms, guests, and bookings in one focused workspace.</Typography>
              <Button component={Link} href="/login" size="large" variant="contained" sx={{ alignSelf: "flex-start", mt: 1 }}>Get started</Button>
            </Stack>
            <HospitalityHeroIllustration sx={{ mx: "auto", maxWidth: 590 }} />
          </Box>

          <Box component="section">
            <Box sx={{ mb: { xs: 3, md: 4 } }}>
              <Typography component="h2" variant="h4">Why Loji Business exists</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Designed to remove friction from every layer of your hospitality operation.</Typography>
            </Box>
            <Box sx={{ alignItems: "center", display: "grid", gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: "1fr", md: ".85fr 1.15fr" } }}>
              <ConnectedTeamIllustration sx={{ mx: "auto", maxWidth: 500 }} />
              <Stack spacing={1.5}>
                {reasons.map((item) => (
                  <Paper key={item.title} variant="outlined" sx={{ borderRadius: 1, p: { xs: 2.25, sm: 2.75 } }}>
                    <Stack direction="row" spacing={2}>
                      <Box sx={{ bgcolor: "primary.main", borderRadius: 1, color: "primary.contrastText", display: "grid", flexShrink: 0, height: 44, placeItems: "center", width: 44 }}>{item.icon}</Box>
                      <Box><Typography variant="h6">{item.title}</Typography><Typography color="text.secondary" sx={{ lineHeight: 1.65, mt: .5 }}>{item.description}</Typography></Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Box>

          <Box component="section">
            <Box sx={{ mb: { xs: 3, md: 4 } }}>
              <Typography component="h2" variant="h4">Everything your property needs</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>A practical toolkit designed for efficient daily management.</Typography>
            </Box>
            <Grid container spacing={2}>
              {features.map((item) => (
                <Grid key={item.title} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Paper variant="outlined" sx={{ borderRadius: 1, height: "100%", p: 2.75, transition: "border-color .2s ease, transform .2s ease", "&:hover": { borderColor: "primary.light", transform: "translateY(-2px)" } }}>
                    <Box sx={{ bgcolor: "rgba(30,136,229,.09)", borderRadius: 1, color: "primary.main", display: "grid", height: 42, mb: 2, placeItems: "center", width: 42 }}>{item.icon}</Box>
                    <Typography fontWeight={750} variant="subtitle1">{item.title}</Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.65, mt: .75 }}>{item.description}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Paper component="section" variant="outlined" sx={{ borderRadius: 1, overflow: "hidden", p: { xs: 3, sm: 4, md: 5 } }}>
            <Box sx={{ alignItems: "center", display: "grid", gap: { xs: 4, md: 6 }, gridTemplateColumns: { xs: "1fr", md: "1fr .9fr" } }}>
              <Stack spacing={2}>
                <Typography component="h2" variant="h4">Your property. Your team. One platform.</Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>Whether you operate a boutique guesthouse or a multi-branch hotel, Loji Business gives your team professional tools to simplify operations and serve guests better.</Typography>
                <Button component={Link} href="/login" variant="contained" sx={{ alignSelf: "flex-start" }}>Get started</Button>
              </Stack>
              <CloudOperationsIllustration sx={{ mx: "auto", maxWidth: 470 }} />
            </Box>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
