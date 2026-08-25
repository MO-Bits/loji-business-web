"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import {
  Box,
  Button,
  Chip,
  Container,
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
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 6, md: 8 }} sx={{ pb: { xs: 7, md: 10 }, pt: { xs: 5, sm: 7, md: 8 } }}>
          <Box
            component="section"
            sx={{
              alignItems: "end",
              display: "grid",
              gap: { xs: 3, md: 6 },
              gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) auto" },
            }}
          >
            <Stack spacing={2.25} sx={{ maxWidth: 760 }}>
              <Chip
                icon={<HelpOutlineRoundedIcon />}
                label={t("HELP CENTRE", "KITUO CHA MSAADA")}
                color="primary"
                variant="outlined"
                sx={{ alignSelf: "flex-start", fontWeight: 800, letterSpacing: ".08em" }}
              />

              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "2.55rem", sm: "3.7rem", md: "4.25rem" },
                  fontWeight: 750,
                  letterSpacing: "-.055em",
                  lineHeight: .98,
                }}
              >
                {t("Frequently asked questions", "Maswali yanayoulizwa mara kwa mara")}
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  fontSize: { xs: "1rem", sm: "1.15rem" },
                  lineHeight: 1.75,
                  maxWidth: 680,
                }}
              >
                {t(
                  "Clear answers about Loji Business, property setup, bookings, staff access, multiple properties and everyday use.",
                  "Majibu ya wazi kuhusu Loji Business, kusanidi biashara, uhifadhi, ruhusa za wafanyakazi, majengo mengi na matumizi ya kila siku.",
                )}
              </Typography>
            </Stack>

            <Button
              component={Link}
              href="/login"
              endIcon={<ArrowForwardRoundedIcon />}
              size="large"
              variant="contained"
              sx={{ justifySelf: { md: "end" }, minHeight: 48, px: 2.5 }}
            >
              {t("Start with Loji Business", "Anza na Loji Business")}
            </Button>
          </Box>

          <FaqSection />
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
