"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { createClient } from "@/lib/supabase/client";

const features = [
  [ApartmentRoundedIcon, "Property Presence", "Define your space with photos and essential amenities."],
  [EventAvailableRoundedIcon, "Smart Bookings", "Manage guest arrivals and stay logistics effortlessly."],
  [GroupsRoundedIcon, "Team Collaboration", "Invite your staff and streamline operational access."],
] as const;

export function PropertySetupIntro() {
  const router = useRouter();
  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <Box component="main" sx={{ minHeight: "100dvh", py: { xs: 3, md: 7 } }}>
      <Container maxWidth="md">
        <Stack spacing={{ xs: 4, md: 6 }}>
          <Stack spacing={2} sx={{ maxWidth: 680 }}>
            <Typography color="primary" sx={{ fontWeight: 800, letterSpacing: ".08em" }}>
              LOJI BUSINESS
            </Typography>
            <Typography variant="h1" sx={{ fontSize: { xs: "2.7rem", md: "4.5rem" } }}>
              Setup your property.
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: "1.15rem", lineHeight: 1.7 }}>
              Bring your hospitality business to life with a few simple steps. Designed to save you time.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {features.map(([Icon, title, description]) => (
              <Paper key={title} variant="outlined" sx={{ flex: 1, p: 3 }}>
                <Stack spacing={2}>
                  <Box sx={{ bgcolor: "primary.main", borderRadius: 3, color: "primary.contrastText", display: "grid", height: 52, placeItems: "center", width: 52 }}>
                    <Icon />
                  </Box>
                  <Typography variant="h6">{title}</Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>{description}</Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button component={Link} href="/onboarding/property/basic" variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />}>
              Continue
            </Button>
            <Button variant="text" color="inherit" startIcon={<LogoutRoundedIcon />} onClick={signOut}>
              Sign out
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
