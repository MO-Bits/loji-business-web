"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useLanguage } from "@/components/providers/language-provider";

export function MarketingPageShell({
  eyebrow,
  title,
  description,
  children,
  cta = true,
}: {
  eyebrow: [string, string];
  title: [string, string];
  description: [string, string];
  children: ReactNode;
  cta?: boolean;
}) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const secondaryHref = pathname === "/features" ? "/how-it-works" : "/features";
  const secondaryLabel =
    pathname === "/features"
      ? t("See how it works", "Ona jinsi inavyofanya kazi")
      : t("Explore features", "Angalia vipengele");
  return (
    <Box component="main" sx={{ bgcolor: "background.default", minHeight: "100dvh" }}>
      <Box
        sx={{
          background:
            "radial-gradient(circle at 82% 8%, color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent), transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--mui-palette-background-paper) 98%, var(--mui-palette-primary-main)) 0%, var(--mui-palette-background-default) 100%)",
          borderBottom: 1,
          borderColor: "divider",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          aria-hidden
          sx={{
            background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--mui-palette-primary-main) 8%, transparent), transparent)",
            height: 1,
            left: 0,
            pointerEvents: "none",
            position: "absolute",
            right: 0,
            top: 0,
          }}
        />
        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Stack spacing={2} sx={{ maxWidth: 760, py: { xs: 6, sm: 8, md: 9 } }}>
            <Typography color="primary.main" variant="overline">
              {t(...eyebrow)}
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "2rem", sm: "2.625rem", md: "3.25rem" },
                fontWeight: 700,
                letterSpacing: "-.052em",
                lineHeight: 1.02,
              }}
            >
              {t(...title)}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ fontSize: { xs: ".9375rem", sm: "1.0625rem" }, lineHeight: 1.72, maxWidth: 680 }}
            >
              {t(...description)}
            </Typography>
            {cta ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { sm: "center" }, pt: 0.75 }}>
                <Button
                  component={Link}
                  endIcon={<ArrowForwardRoundedIcon />}
                  href="/login"
                  size="large"
                  sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, minHeight: 48, px: 2.5 }}
                  variant="contained"
                >
                  {t("Start with Loji Business", "Anza na Loji Business")}
                </Button>
                <Button component={Link} href={secondaryHref} size="large" sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}>
                  {secondaryLabel}
                </Button>
              </Stack>
            ) : null}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Box sx={{ py: { xs: 4, sm: 5, md: 6 } }}>{children}</Box>
      </Container>

      <Box component="footer" sx={{ bgcolor: "background.paper", borderTop: 1, borderColor: "divider", py: 3 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Typography color="text.secondary" variant="caption">
              © {new Date().getFullYear()} Loji Business
            </Typography>
            <Stack direction="row" spacing={2.25} sx={{ flexWrap: "wrap" }}>
              <Typography component={Link} href="/help" color="text.secondary" variant="caption" sx={{ textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                {t("Help", "Msaada")}
              </Typography>
              <Typography component={Link} href="/privacy" color="text.secondary" variant="caption" sx={{ textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                {t("Privacy", "Faragha")}
              </Typography>
              <Typography component={Link} href="/terms" color="text.secondary" variant="caption" sx={{ textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                {t("Terms", "Masharti")}
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
