"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

const foundations = [
  {
    icon: <DashboardRoundedIcon />,
    title: "Next.js + MUI",
    description:
      "A responsive App Router foundation ready for Loji Business screens and flows.",
  },
  {
    icon: <StorageRoundedIcon />,
    title: "Shared Supabase backend",
    description:
      "Browser and server clients are prepared for the same database, storage and RPCs.",
  },
  {
    icon: <SecurityRoundedIcon />,
    title: "RLS-first security",
    description:
      "Requests will run with the signed-in user's session so existing policies continue to apply.",
  },
];

export default function Home() {
  return (
    <Box component="main" sx={{ minHeight: "100dvh", py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 4, md: 6 }}>
          <Stack spacing={2} sx={{ maxWidth: 760 }}>
            <Chip
              icon={<CheckCircleRoundedIcon />}
              label="Project foundation ready"
              color="success"
              variant="outlined"
              sx={{ alignSelf: "flex-start" }}
            />

            <Typography variant="h1">
              Loji Business,
              <Box component="span" sx={{ color: "primary.main" }}>
                {" "}now on the web.
              </Box>
            </Typography>

            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680 }}>
              We will convert each Flutter flow into a fast, responsive Next.js
              experience while keeping the same Supabase RPCs and business rules.
            </Typography>

            <Button
              variant="contained"
              size="large"
              disableElevation
              sx={{ alignSelf: "flex-start", mt: 1 }}
            >
              Ready for the first flow
            </Button>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {foundations.map((item) => (
              <Paper key={item.title} variant="outlined" sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      alignItems: "center",
                      bgcolor: "primary.light",
                      borderRadius: 2.5,
                      color: "primary.main",
                      display: "flex",
                      height: 48,
                      justifyContent: "center",
                      width: 48,
                    }}
                  >
                    {item.icon}
                  </Box>

                  <Typography variant="h6">{item.title}</Typography>
                  <Typography color="text.secondary">
                    {item.description}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
