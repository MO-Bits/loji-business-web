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
import { useEffect, useRef, useState } from "react";

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
      data-legal-section={index}
      id={sectionId(index)}
      sx={{
        scrollMarginTop: { xs: 88, md: 24 },
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState(0);
  const localizedTitle = language === "sw" ? swTitle ?? title : title;
  const localizedIntroTitle =
    language === "sw" ? swIntroTitle ?? introTitle : introTitle;
  const localizedIntro = language === "sw" ? swIntro ?? intro : intro;

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    const updateActiveSection = () => {
      const sectionElements = Array.from(
        root.querySelectorAll<HTMLElement>("[data-legal-section]"),
      );
      const rootTop = root.getBoundingClientRect().top;
      const readingLine = rootTop + 104;
      let nextActive = 0;

      for (const element of sectionElements) {
        if (element.getBoundingClientRect().top <= readingLine) {
          nextActive = Number(element.dataset.legalSection ?? 0);
        } else {
          break;
        }
      }

      const reachedBottom =
        root.scrollHeight - root.scrollTop - root.clientHeight < 8;
      if (reachedBottom && sectionElements.length > 0) {
        nextActive = sectionElements.length - 1;
      }

      setActiveSection(nextActive);
    };

    updateActiveSection();
    root.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      root.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sections]);

  const openSection = (index: number) => {
    const root = contentRef.current;
    const section = root?.querySelector<HTMLElement>(
      `#${sectionId(index)}`,
    );
    if (!section) return;

    setActiveSection(index);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId(index)}`);
  };

  return (
    <Box
      component="main"
      sx={{
        bgcolor: "background.default",
        height: { xs: "auto", md: "calc(100dvh - 64px)" },
        minHeight: "calc(100dvh - 64px)",
      }}
    >
      <Container maxWidth="lg" sx={{ height: { md: "100%" } }}>
        <Box
          sx={{
            display: "grid",
            gap: { xs: 0, md: 5, lg: 8 },
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "240px minmax(0, 720px)",
            },
            height: { md: "100%" },
            justifyContent: "center",
            overflow: { md: "hidden" },
            py: { xs: 5, sm: 7, md: 0 },
          }}
        >
          <Box
            component="aside"
            sx={{
              display: { xs: "none", md: "block" },
              height: "100%",
              overflowY: "auto",
              overscrollBehavior: "contain",
              pr: 1.5,
              py: 5,
              scrollbarColor: "var(--mui-palette-divider) transparent",
              scrollbarWidth: "thin",
            }}
          >
            <Typography
              color="text.secondary"
              variant="overline"
              sx={{
                display: "block",
                fontWeight: 700,
                letterSpacing: ".1em",
                mb: 1.25,
              }}
            >
              {t("On this page", "Katika ukurasa huu")}
            </Typography>

            <Stack
              component="nav"
              aria-label={t("Page sections", "Sehemu za ukurasa")}
              spacing={0.35}
            >
              {sections.map((section, index) => {
                const active = activeSection === index;
                return (
                  <MuiLink
                    aria-current={active ? "location" : undefined}
                    href={`#${sectionId(index)}`}
                    key={section.title}
                    onClick={(event) => {
                      event.preventDefault();
                      openSection(index);
                    }}
                    underline="none"
                    sx={{
                      bgcolor: active ? "action.selected" : "transparent",
                      borderLeft: "2px solid",
                      borderColor: active ? "primary.main" : "divider",
                      borderRadius: "0 6px 6px 0",
                      color: active ? "primary.main" : "text.secondary",
                      cursor: "pointer",
                      display: "block",
                      fontSize: ".8rem",
                      fontWeight: active ? 700 : 500,
                      lineHeight: 1.35,
                      px: 1.25,
                      py: .7,
                      transition:
                        "background-color 150ms ease, color 150ms ease, border-color 150ms ease",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.main",
                        color: "text.primary",
                      },
                    }}
                  >
                    {language === "sw"
                      ? section.swTitle ?? section.title
                      : section.title}
                  </MuiLink>
                );
              })}
            </Stack>
          </Box>

          <Box
            ref={contentRef}
            sx={{
              height: { md: "100%" },
              overflowY: { md: "auto" },
              overscrollBehavior: { md: "contain" },
              pr: { md: 1.5 },
              py: { md: 5 },
              scrollBehavior: "smooth",
              scrollbarColor: "var(--mui-palette-divider) transparent",
              scrollbarWidth: "thin",
            }}
          >
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
                  fontWeight: 700,
                  letterSpacing: "-.015em",
                }}
              >
                {localizedIntroTitle}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  fontSize: { xs: ".96rem", sm: "1.03rem" },
                  lineHeight: 1.75,
                }}
              >
                {localizedIntro}
              </Typography>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: "center", color: "text.secondary" }}
              >
                <CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
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
                pb: 5,
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
