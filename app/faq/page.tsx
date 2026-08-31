"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";

import { FaqSection } from "@/components/content/faq-section";
import { useLanguage } from "@/components/providers/language-provider";

export default function FaqPage() {
  const { t } = useLanguage();

  return (
    <Box component="main" sx={{ bgcolor: "background.default", minHeight: "100dvh" }}>
      <Box
        component="section"
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          position: "relative",
          "&::before": {
            background: (theme) =>
              `radial-gradient(circle, ${theme.palette.primary.main} 0%, transparent 68%)`,
            content: '\"\"',
            height: 520,
            opacity: 0.09,
            position: "absolute",
            right: { xs: -280, md: -120 },
            top: -320,
            width: 520,
          },
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gap: { xs: 4, md: 7 },
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.15fr) minmax(300px, .65fr)" },
              py: { xs: 6, sm: 8, md: 10 },
              position: "relative",
            }}
          >
            <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
              <Chip
                icon={<HelpOutlineRoundedIcon />}
                label={t("LOJI BUSINESS HELP", "MSAADA WA LOJI BUSINESS")}
                color="primary"
                variant="outlined"
                sx={{ alignSelf: "flex-start", fontWeight: 700, letterSpacing: ".08em" }}
              />

              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "2.7rem", sm: "3.9rem", md: "4.65rem" },
                  fontWeight: 700,
                  letterSpacing: "-.06em",
                  lineHeight: .96,
                }}
              >
                {t("Answers, without the guesswork.", "Majibu wazi, bila kubahatisha.")}
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  fontSize: { xs: "1.02rem", sm: "1.18rem" },
                  lineHeight: 1.78,
                  maxWidth: 690,
                }}
              >
                {t(
                  "Everything you need to know about getting started, managing bookings, staff access, multiple properties and everyday operations with Loji Business.",
                  "Kila unachohitaji kujua kuhusu kuanza, kusimamia uhifadhi, ruhusa za wafanyakazi, biashara nyingi na shughuli za kila siku kupitia Loji Business.",
                )}
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ pt: 1 }}>
                <Button
                  component={Link}
                  href="/login"
                  endIcon={<ArrowForwardRoundedIcon />}
                  size="large"
                  variant="contained"
                  sx={{ minHeight: 50, px: 2.75 }}
                >
                  {t("Start with Loji Business", "Anza na Loji Business")}
                </Button>
                <Button
                  component={Link}
                  href="/learn-more"
                  size="large"
                  variant="text"
                  sx={{ minHeight: 50, px: 2 }}
                >
                  {t("Explore Loji Business", "Fahamu Loji Business")}
                </Button>
              </Stack>
            </Stack>

            <Paper
              variant="outlined"
              sx={{
                alignSelf: "end",
                bgcolor: "background.paper",
                borderRadius: 2,
                p: { xs: 2.5, sm: 3 },
              }}
            >
              <Stack spacing={2}>
                <Box
                  sx={{
                    bgcolor: "action.hover",
                    borderRadius: 1.5,
                    color: "primary.main",
                    display: "grid",
                    height: 48,
                    placeItems: "center",
                    width: 48,
                  }}
                >
                  <VerifiedUserRoundedIcon />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "1.05rem", fontWeight: 700 }}>
                    {t("Need direct support?", "Unahitaji msaada wa moja kwa moja?")}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.7, mt: .6 }} variant="body2">
                    {t(
                      "Our support contacts are available if your question is not covered below.",
                      "Mawasiliano yetu ya msaada yanapatikana ikiwa swali lako halijajibiwa hapa chini.",
                    )}
                  </Typography>
                </Box>
                <Divider />
                <Stack spacing={1.25}>
                  <MuiLink
                    href="mailto:lojipms@gmail.com"
                    underline="none"
                    sx={{ alignItems: "center", color: "text.primary", display: "flex", fontSize: ".9rem", fontWeight: 500, gap: 1.25 }}
                  >
                    <EmailRoundedIcon color="primary" fontSize="small" />
                    lojipms@gmail.com
                  </MuiLink>
                  <MuiLink
                    href="tel:+255772290005"
                    underline="none"
                    sx={{ alignItems: "center", color: "text.primary", display: "flex", fontSize: ".9rem", fontWeight: 500, gap: 1.25 }}
                  >
                    <PhoneRoundedIcon color="primary" fontSize="small" />
                    +255 772 290 005
                  </MuiLink>
                </Stack>
              </Stack>
            </Paper>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Box
          component="section"
          aria-labelledby="faq-list-heading"
          sx={{
            display: "grid",
            gap: { xs: 4, md: 7 },
            gridTemplateColumns: { xs: "1fr", md: "minmax(220px, .5fr) minmax(0, 1.5fr)" },
            py: { xs: 6, sm: 8, md: 10 },
          }}
        >
          <Stack spacing={1.4} sx={{ alignSelf: "start", position: { md: "sticky" }, top: { md: 96 } }}>
            <Typography color="primary.main" variant="overline" sx={{ fontWeight: 700, letterSpacing: ".14em" }}>
              {t("COMMON QUESTIONS", "MASWALI YA KAWAIDA")}
            </Typography>
            <Typography
              component="h2"
              id="faq-list-heading"
              sx={{ fontSize: { xs: "2rem", md: "2.55rem" }, fontWeight: 700, letterSpacing: "-.045em", lineHeight: 1.05 }}
            >
              {t("Everything important, in one place.", "Mambo muhimu, sehemu moja.")}
            </Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.75, maxWidth: 330 }}>
              {t(
                "Open any question to see a clear, practical answer. We keep this page updated as Loji Business grows.",
                "Fungua swali lolote kupata jibu rahisi na la vitendo. Tutasasisha ukurasa huu kadiri Loji Business inavyokua.",
              )}
            </Typography>
          </Stack>

          <FaqSection variant="plain" />
        </Box>

        <Paper
          component="section"
          sx={{
            bgcolor: "primary.main",
            borderRadius: 2,
            color: "primary.contrastText",
            mb: { xs: 7, md: 10 },
            overflow: "hidden",
            p: { xs: 3, sm: 4.5, md: 5.5 },
            position: "relative",
          }}
        >
          <Box
            sx={{
              alignItems: { md: "center" },
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
              position: "relative",
            }}
          >
            <Stack spacing={1.25} sx={{ maxWidth: 680 }}>
              <Typography component="h2" sx={{ fontSize: { xs: "1.8rem", sm: "2.35rem" }, fontWeight: 700, letterSpacing: "-.04em" }}>
                {t("Ready to run your property more clearly?", "Uko tayari kusimamia biashara yako kwa urahisi zaidi?")}
              </Typography>
              <Typography sx={{ lineHeight: 1.7, opacity: .86 }}>
                {t(
                  "Create your workspace, add your rooms and bring your team into one organised system.",
                  "Fungua eneo lako la kazi, ongeza vyumba na ilete timu yako katika mfumo mmoja uliopangwa.",
                )}
              </Typography>
            </Stack>
            <Button
              component={Link}
              href="/login"
              endIcon={<ArrowForwardRoundedIcon />}
              size="large"
              variant="contained"
              sx={{
                bgcolor: "background.paper",
                color: "text.primary",
                minHeight: 50,
                px: 2.75,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {t("Continue to sign in", "Endelea kuingia")}
            </Button>
          </Box>
        </Paper>
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
              <Typography component={Link} href="/learn-more" color="text.secondary" variant="caption" sx={{ textDecoration: "none" }}>
                {t("About", "Kuhusu")}
              </Typography>
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
