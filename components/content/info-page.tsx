"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import {
  alpha,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";

export type LegalSectionData = { title: string; content: string; swTitle?: string; swContent?: string };

function LegalSection({ title, content, swTitle, swContent }: LegalSectionData) {
  const { language } = useLanguage();
  const localizedTitle = language === "sw" ? swTitle ?? title : title;
  const localizedContent = language === "sw" ? swContent ?? content : content;
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 4,
            height: 20,
            mt: 0.25,
            borderRadius: 1,
            bgcolor: "primary.main",
            flexShrink: 0,
          }}
        />
        <Box>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            {localizedTitle}
          </Typography>
          <Typography
            component="div"
            color="text.secondary"
            sx={{ whiteSpace: "pre-line", lineHeight: 1.75 }}
          >
            {localizedContent}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export function LegalPage({
  kind,
  title,
  introTitle,
  intro,
  sections,
  swTitle,
  swIntroTitle,
  swIntro,
}: {
  kind: "terms" | "privacy";
  title: string;
  introTitle: string;
  intro: string;
  sections: LegalSectionData[];
  swTitle?: string;
  swIntroTitle?: string;
  swIntro?: string;
}) {
  const Icon = kind === "privacy" ? ShieldOutlinedIcon : VerifiedOutlinedIcon;
  const { t, language } = useLanguage();
  return (
    <Box component="main" sx={{ minHeight: "100dvh", py: { xs: 2, md: 5 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Button
              component={Link}
              href="/login"
              startIcon={<ArrowBackRoundedIcon />}
            >
              {t("Back", "Rudi")}
            </Button>
            <Divider orientation="vertical" flexItem />
            <Typography variant="h5" fontWeight={700}>
              {language === "sw" ? swTitle ?? title : title}
            </Typography>
          </Stack>
          <Paper
            variant="outlined"
            sx={(theme) => ({
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: 1,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.background.paper, 0.95)})`,
            })}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2.5}
              alignItems={{ sm: "center" }}
            >
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: 1,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  flexShrink: 0,
                }}
              >
                <Icon />
              </Box>
              <Box>
                <Typography variant="h6" color="primary.main" fontWeight={700}>
                  {language === "sw" ? swIntroTitle ?? introTitle : introTitle}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.75, lineHeight: 1.65 }}
                >
                  {language === "sw" ? swIntro ?? intro : intro}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mt: 1.5 }}
                >
                  <CalendarMonthRoundedIcon
                    color="primary"
                    sx={{ fontSize: 17 }}
                  />
                  <Typography variant="caption" fontWeight={700}>
                    {t("Effective Date: August 7, 2026", "Tarehe ya kuanza kutumika: 7 Agosti 2026")}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Paper>
          <Stack spacing={2}>
            {sections.map((section) => (
              <LegalSection key={section.title} {...section} />
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
