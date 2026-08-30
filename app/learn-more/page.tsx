"use client";

import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import GroupWorkRoundedIcon from "@mui/icons-material/GroupWorkRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";

import { FaqSection } from "@/components/content/faq-section";
import {
  CloudOperationsIllustration,
  ConnectedTeamIllustration,
  HospitalityHeroIllustration,
} from "@/components/content/learn-more-illustrations";
import { useLanguage } from "@/components/providers/language-provider";

const reasons = [
  {
    icon: HubRoundedIcon,
    title: "One unified workspace",
    swTitle: "Eneo moja la kazi",
    description:
      "Keep owners, front desk and operations working from the same live information—without scattered notebooks or spreadsheets.",
    swDescription:
      "Wamiliki, mapokezi na waendeshaji hutumia taarifa zilezile za moja kwa moja—bila madaftari au majedwali yaliyotawanyika.",
  },
  {
    icon: AdminPanelSettingsRoundedIcon,
    title: "Clear permissions",
    swTitle: "Ruhusa zilizo wazi",
    description:
      "Give every team member the access they need while protecting sensitive property and financial information.",
    swDescription:
      "Mpe kila mfanyakazi ufikiaji anaohitaji huku ukilinda taarifa nyeti za jengo na fedha.",
  },
  {
    icon: VerifiedUserRoundedIcon,
    title: "Built for local hospitality",
    swTitle: "Imeundwa kwa biashara za hapa",
    description:
      "A practical workflow for independent hotels, lodges, guesthouses and growing accommodation businesses.",
    swDescription:
      "Mtiririko wa kazi unaofaa hoteli, lodge, nyumba za wageni na biashara za malazi zinazokua.",
  },
];

const features = [
  {
    icon: MeetingRoomRoundedIcon,
    title: "Rooms",
    swTitle: "Vyumba",
    description: "See availability, occupancy, pricing and room condition quickly.",
    swDescription: "Ona upatikanaji, matumizi, bei na hali ya chumba kwa haraka.",
  },
  {
    icon: CalendarMonthRoundedIcon,
    title: "Bookings",
    swTitle: "Uhifadhi",
    description: "Create stays, manage walk-ins and avoid scheduling conflicts.",
    swDescription: "Unda makazi, hudumia wageni wa moja kwa moja na epuka migongano.",
  },
  {
    icon: PersonAddAltRoundedIcon,
    title: "Guests",
    swTitle: "Wageni",
    description: "Keep guest details organised for a smooth, professional arrival.",
    swDescription: "Panga taarifa za wageni kwa mapokezi rahisi na ya kitaalamu.",
  },
  {
    icon: GroupWorkRoundedIcon,
    title: "Team",
    swTitle: "Timu",
    description: "Invite staff, assign responsibility and maintain accountability.",
    swDescription: "Alika wafanyakazi, gawa majukumu na dumisha uwajibikaji.",
  },
  {
    icon: InsightsRoundedIcon,
    title: "Insights",
    swTitle: "Takwimu",
    description: "Understand occupancy, revenue and daily property performance.",
    swDescription: "Elewa matumizi ya vyumba, mapato na utendaji wa kila siku.",
  },
  {
    icon: CloudDoneRoundedIcon,
    title: "Cloud access",
    swTitle: "Ufikiaji wa wingu",
    description: "Work securely from the front desk, office or away from the property.",
    swDescription: "Fanya kazi kwa usalama ukiwa mapokezi, ofisini au mbali na jengo.",
  },
];

export default function LearnMorePage() {
  const { language, t } = useLanguage();
  const localized = <T extends { title: string; swTitle: string; description: string; swDescription: string }>(
    item: T,
  ) => ({
    title: language === "sw" ? item.swTitle : item.title,
    description: language === "sw" ? item.swDescription : item.description,
  });

  return (
    <Box component="main" sx={{ bgcolor: "background.default", minHeight: "100dvh" }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 8, md: 13 }} sx={{ pb: { xs: 7, md: 11 }, pt: { xs: 6, sm: 8, md: 10 } }}>
          <Box
            component="section"
            sx={{
              alignItems: "center",
              display: "grid",
              gap: { xs: 5, md: 8 },
              gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) minmax(380px,.9fr)" },
            }}
          >
            <Stack spacing={3} sx={{ maxWidth: 650 }}>
              <Typography
                color="primary.main"
                variant="overline"
                sx={{ fontWeight: 700, letterSpacing: ".14em" }}
              >
                {t("HOSPITALITY, SIMPLIFIED", "MALAZI, YAMERAHISISHWA")}
              </Typography>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "2.55rem", sm: "3.65rem", md: "4.3rem" },
                  fontWeight: 700,
                  letterSpacing: "-.06em",
                  lineHeight: .98,
                }}
              >
                {t(
                  "A calmer way to run your property.",
                  "Njia rahisi zaidi ya kusimamia jengo lako.",
                )}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  fontSize: { xs: "1.04rem", sm: "1.18rem" },
                  lineHeight: 1.72,
                  maxWidth: 590,
                }}
              >
                {t(
                  "Loji Business brings rooms, bookings, guests and your team into one clear workspace—so daily operations stay organised.",
                  "Loji Business huleta vyumba, uhifadhi, wageni na timu yako katika eneo moja lililo wazi—ili shughuli za kila siku zibaki zimepangwa.",
                )}
              </Typography>
              <Button
                component={Link}
                href="/login"
                endIcon={<ArrowForwardRoundedIcon />}
                size="large"
                variant="contained"
                sx={{ alignSelf: "flex-start", minHeight: 48, px: 2.5 }}
              >
                {t("Start with Loji", "Anza na Loji")}
              </Button>
            </Stack>

            <HospitalityHeroIllustration
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                mx: "auto",
                overflow: "hidden",
              }}
            />
          </Box>

          <Box component="section">
            <Stack spacing={1.25} sx={{ mb: { xs: 4, md: 5 }, maxWidth: 650 }}>
              <Typography component="h2" variant="h3">
                {t("Built around real operations", "Imejengwa kwa shughuli halisi")}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: "1.05rem", lineHeight: 1.7 }}>
                {t(
                  "Less switching between tools. Less uncertainty. More time serving guests.",
                  "Kupunguza kubadilisha zana. Kupunguza sintofahamu. Kuongeza muda wa kuwahudumia wageni.",
                )}
              </Typography>
            </Stack>

            <Box
              sx={{
                alignItems: "center",
                display: "grid",
                gap: { xs: 4, md: 7 },
                gridTemplateColumns: { xs: "1fr", md: ".85fr 1.15fr" },
              }}
            >
              <ConnectedTeamIllustration
                sx={{ borderRadius: 2, mx: "auto", maxWidth: 470, overflow: "hidden" }}
              />
              <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
                {reasons.map((item) => {
                  const Icon = item.icon;
                  const copy = localized(item);
                  return (
                    <Stack
                      direction="row"
                      key={item.title}
                      spacing={2}
                      sx={{ alignItems: "flex-start", py: 2.5 }}
                    >
                      <Box
                        sx={{
                          bgcolor: "action.hover",
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          color: "primary.main",
                          display: "grid",
                          flexShrink: 0,
                          height: 42,
                          placeItems: "center",
                          width: 42,
                        }}
                      >
                        <Icon fontSize="small" />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "1.02rem", fontWeight: 700 }}>
                          {copy.title}
                        </Typography>
                        <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.7, mt: .5 }}>
                          {copy.description}
                        </Typography>
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          </Box>

          <Box component="section">
            <Stack spacing={1.25} sx={{ mb: { xs: 4, md: 5 }, maxWidth: 650 }}>
              <Typography component="h2" variant="h3">
                {t("Everything in its place", "Kila kitu mahali pake")}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: "1.05rem", lineHeight: 1.7 }}>
                {t(
                  "The essential tools your team needs, presented simply.",
                  "Zana muhimu ambazo timu yako inahitaji, zimewasilishwa kwa urahisi.",
                )}
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              {features.map((item) => {
                const Icon = item.icon;
                const copy = localized(item);
                return (
                  <Grid key={item.title} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        borderRadius: 1,
                        height: "100%",
                        p: { xs: 2.5, sm: 3 },
                        transition: "border-color 180ms ease, transform 180ms ease",
                        "&:hover": {
                          borderColor: "primary.main",
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <Icon color="primary" sx={{ fontSize: 26 }} />
                      <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, mt: 2 }}>
                        {copy.title}
                      </Typography>
                      <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.7, mt: .75 }}>
                        {copy.description}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          <FaqSection />

          <Paper
            component="section"
            variant="outlined"
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              p: { xs: 3, sm: 5, md: 6 },
            }}
          >
            <Box
              sx={{
                alignItems: "center",
                display: "grid",
                gap: { xs: 5, md: 8 },
                gridTemplateColumns: { xs: "1fr", md: "1fr .85fr" },
              }}
            >
              <Stack spacing={2.5}>
                <Typography component="h2" variant="h3">
                  {t(
                    "Your property. Your team. One clear view.",
                    "Jengo lako. Timu yako. Mwonekano mmoja wazi.",
                  )}
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
                  {t(
                    "Whether you run a boutique guesthouse or a growing hotel, Loji Business helps your team stay coordinated and serve every guest professionally.",
                    "Iwe una nyumba ndogo ya wageni au hoteli inayokua, Loji Business husaidia timu yako kushirikiana na kumhudumia kila mgeni kitaalamu.",
                  )}
                </Typography>
                <Button
                  component={Link}
                  href="/login"
                  endIcon={<ArrowForwardRoundedIcon />}
                  variant="contained"
                  sx={{ alignSelf: "flex-start" }}
                >
                  {t("Continue to sign in", "Endelea kuingia")}
                </Button>
              </Stack>
              <CloudOperationsIllustration
                sx={{ borderRadius: 2, mx: "auto", overflow: "hidden" }}
              />
            </Box>
          </Paper>
        </Stack>
      </Container>

      <Box component="footer" sx={{ borderTop: "1px solid", borderColor: "divider", py: 3 }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
          >
            <Typography color="text.secondary" variant="caption">
              © {new Date().getFullYear()} Loji Business
            </Typography>
            <Stack direction="row" spacing={2}>
              <Typography component={Link} href="/privacy" color="text.secondary" variant="caption" sx={{ textDecoration: "none" }}>
                {t("Privacy", "Faragha")}
              </Typography>
              <Typography component={Link} href="/terms" color="text.secondary" variant="caption" sx={{ textDecoration: "none" }}>
                {t("Terms", "Masharti")}
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
