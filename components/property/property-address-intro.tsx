"use client";

import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { BrandWordmark } from "@/components/shared/brand-wordmark";

const steps = [
  {
    icon: SearchRoundedIcon,
    title: "Search your area",
    description: "Find your property, street, ward, or a nearby landmark.",
  },
  {
    icon: LocationOnRoundedIcon,
    title: "Place the pin",
    description: "Move the map pin to the exact entrance of your property.",
  },
  {
    icon: ExploreRoundedIcon,
    title: "Confirm the address",
    description: "Review the detected address before saving your location.",
  },
] as const;

export function PropertyAddressIntro() {
  return (
    <Box
      component="main"
      sx={{
        background:
          "radial-gradient(circle at 85% 5%, color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent), transparent 34%)",
        minHeight: "100dvh",
        py: { xs: 3, md: 7 },
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={{ xs: 4, md: 6 }}>
          <BrandWordmark priority sx={{ width: { xs: 168, sm: 205 } }} />

          <Box
            sx={{
              display: "grid",
              gap: { xs: 4, md: 6 },
              gridTemplateColumns: { xs: "1fr", md: "1.1fr .9fr" },
              alignItems: "center",
            }}
          >
            <Stack spacing={2.5}>
              <Box
                sx={{
                  alignItems: "center",
                  bgcolor:
                    "color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)",
                  borderRadius: 1,
                  color: "primary.main",
                  display: "flex",
                  height: 58,
                  justifyContent: "center",
                  width: 58,
                }}
              >
                <MapRoundedIcon fontSize="large" />
              </Box>

              <Box>
                <Typography
                  color="primary"
                  sx={{
                    fontSize: ".75rem",
                    fontWeight: 700,
                    letterSpacing: ".12em",
                    mb: 1,
                  }}
                >
                  PROPERTY LOCATION · STEP 3 OF 3
                </Typography>
                <Typography
                  component="h1"
                  variant="h2"
                  sx={{
                    fontSize: { xs: "2.6rem", sm: "3.7rem" },
                    letterSpacing: "-.055em",
                    lineHeight: 1.02,
                  }}
                >
                  Where is your property?
                </Typography>
              </Box>

              <Typography
                color="text.secondary"
                sx={{
                  fontSize: { xs: "1rem", sm: "1.15rem" },
                  lineHeight: 1.7,
                  maxWidth: 580,
                }}
              >
                Set the exact location guests and your team should use. You can
                search by place name, street, ward, or move the pin directly on
                the map.
              </Typography>

              <Button
                component={Link}
                href="/onboarding/property/address/map"
                size="large"
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  alignSelf: { xs: "stretch", sm: "flex-start" },
                  minHeight: 54,
                  px: 3.5,
                }}
              >
                Open location map
              </Button>
            </Stack>

            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, sm: 3 },
                background:
                  "color-mix(in srgb, var(--mui-palette-background-paper) 94%, transparent)",
              }}
            >
              <Stack spacing={1}>
                {steps.map(({ icon: Icon, title, description }, index) => (
                  <Stack
                    key={title}
                    direction="row"
                    spacing={2}
                    sx={{
                      alignItems: "flex-start",
                      borderBottom: index < steps.length - 1 ? 1 : 0,
                      borderColor: "divider",
                      py: 2,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: "primary.main",
                        borderRadius: 1,
                        color: "primary.contrastText",
                        display: "grid",
                        flexShrink: 0,
                        height: 44,
                        placeItems: "center",
                        width: 44,
                      }}
                    >
                      <Icon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
                      <Typography
                        color="text.secondary"
                        variant="body2"
                        sx={{ lineHeight: 1.55, mt: 0.35 }}
                      >
                        {description}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
