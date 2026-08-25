"use client";

import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import {
  Box,
  Container,
  Divider,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";


export type LegalSectionData = {
  title: string;
  content: string;
  swTitle?: string;
  swContent?: string;
};

function sectionId(index: number) {
  return `section-${index + 1}`;
}

function LegalSection({
  section,
  index,
}: {
  section: LegalSectionData;
  index: number;
}) {
  const { language } = useLanguage();
  const title =
    language === "sw" ? section.swTitle ?? section.title : section.title;
  const content =
    language === "sw"
      ? section.swContent ?? section.content
      : section.content;

  return (
    <Box
      component="section"
      id={sectionId(index)}
      sx={{
        scrollMarginTop: 88,
        py: { xs: 3.25, sm: 4 },
      }}
    >
      <Typography
        component="h2"
        sx={{
          color: "text.primary",
          fontSize: { xs: "1.13rem", sm: "1.25rem" },
          fontWeight: 700,
          letterSpacing: "-.015em",
          lineHeight: 1.35,
          mb: 1.5,
        }}
      >
        {title}
      </Typography>
      <Typography
        component="div"
        color="text.secondary"
        sx={{
          fontSize: { xs: ".94rem", sm: "1rem" },
          lineHeight: 1.82,
          maxWidth: "72ch",
          whiteSpace: "pre-line",
        }}
      >
        {content}
      </Typography>
    </Box>
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
  const localizedTitle = language === "sw" ? swTitle ?? title : title;
  const localizedIntroTitle =
    language === "sw" ? swIntroTitle ?? introTitle : introTitle;
  const localizedIntro = language === "sw" ? swIntro ?? intro : intro;

  return (
    <Box
      component="main"
      sx={{ bgcolor: "background.default", minHeight: "100dvh" }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "grid",
            gap: { xs: 0, md: 7, lg: 10 },
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "220px minmax(0, 720px)",
            },
            justifyContent: "center",
            py: { xs: 5, sm: 7, md: 9 },
          }}
        >
          <Box
            component="aside"
            sx={{
              alignSelf: "start",
              display: { xs: "none", md: "block" },
              position: "sticky",
              top: 92,
            }}
          >
            <Typography
              color="text.secondary"
              variant="overline"
              sx={{ fontWeight: 700, letterSpacing: ".1em" }}
            >
              {t("On this page", "Katika ukurasa huu")}
            </Typography>
            <Stack
              component="nav"
              aria-label={t("Page sections", "Sehemu za ukurasa")}
              spacing={0.35}
              sx={{ mt: 1.25 }}
            >
              {sections.map((section, index) => (
                <MuiLink
                  href={`#${sectionId(index)}`}
                  key={section.title}
                  underline="none"
                  sx={{
                    borderLeft: "2px solid",
                    borderColor: "divider",
                    color: "text.secondary",
                    fontSize: ".78rem",
                    lineHeight: 1.35,
                    pl: 1.25,
                    py: .45,
                    transition: "color 150ms ease, border-color 150ms ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      color: "text.primary",
                    },
                  }}
                >
                  {language === "sw"
                    ? section.swTitle ?? section.title
                    : section.title}
                </MuiLink>
              ))}
            </Stack>
          </Box>

          <Box>
            <Stack spacing={2.25} sx={{ mb: { xs: 3, sm: 4 } }}>
              <Box
                sx={{
                  alignItems: "center",
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  color: "primary.main",
                  display: "grid",
                  height: 48,
                  placeItems: "center",
                  width: 48,
                }}
              >
                <Icon />
              </Box>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "2.25rem", sm: "3.25rem" },
                  fontWeight: 700,
                  letterSpacing: "-.05em",
                  lineHeight: 1.05,
                }}
              >
                {localizedTitle}
              </Typography>
              <Typography
                color="text.primary"
                sx={{
                  fontSize: { xs: "1.05rem", sm: "1.2rem" },
                  fontWeight: 600,
                  letterSpacing: "-.015em",
                }}
              >
                {localizedIntroTitle}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ fontSize: { xs: ".96rem", sm: "1.03rem" }, lineHeight: 1.75 }}
              >
                {localizedIntro}
              </Typography>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: "center", color: "text.secondary" }}
              >
                <CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {t(
                    "Effective 7 August 2026",
                    "Inaanza kutumika 7 Agosti 2026",
                  )}
                </Typography>
              </Stack>
            </Stack>

            <Divider />

            <Box>
              {sections.map((section, index) => (
                <Box key={section.title}>
                  <LegalSection section={section} index={index} />
                  {index < sections.length - 1 ? <Divider /> : null}
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                borderTop: "1px solid",
                borderColor: "divider",
                mt: 3,
                pt: 3,
              }}
            >
              <Typography color="text.secondary" variant="caption">
                {t(
                  "Questions about this document? Contact lojipms@gmail.com.",
                  "Una swali kuhusu waraka huu? Wasiliana kupitia lojipms@gmail.com.",
                )}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
