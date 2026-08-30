"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import type { ReactNode } from "react";

import { useLanguage } from "@/components/providers/language-provider";

export function MarketingPageShell({ eyebrow, title, description, children, cta = true }: { eyebrow: [string,string]; title: [string,string]; description: [string,string]; children: ReactNode; cta?: boolean }) {
  const { t } = useLanguage();
  return <Box component="main" sx={{ bgcolor: "background.default", minHeight: "100dvh" }}>
    <Box sx={{ background: "radial-gradient(circle at 78% 14%, color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent), transparent 32%)", borderBottom: "1px solid", borderColor: "divider" }}>
      <Container maxWidth="lg"><Stack spacing={2.25} sx={{ maxWidth: 760, py: { xs: 6, md: 8 } }}>
        <Chip label={t(...eyebrow)} color="primary" variant="outlined" sx={{ alignSelf: "flex-start", fontSize: ".7rem", fontWeight: 750, letterSpacing: ".07em" }} />
        <Typography component="h1" sx={{ fontSize: { xs: "2.25rem", sm: "3rem", md: "3.5rem" }, fontWeight: 750, letterSpacing: "-.05em", lineHeight: 1.04 }}>{t(...title)}</Typography>
        <Typography color="text.secondary" sx={{ fontSize: { xs: ".9375rem", sm: "1.05rem" }, lineHeight: 1.7, maxWidth: 680 }}>{t(...description)}</Typography>
        {cta && <Button component={Link} href="/login" endIcon={<ArrowForwardRoundedIcon />} variant="contained" size="large" sx={{ alignSelf: "flex-start", mt: 1, minHeight: 48, px: 2.5 }}>{t("Start with Loji Business", "Anza na Loji Business")}</Button>}
      </Stack></Container>
    </Box>
    <Container maxWidth="lg"><Box sx={{ py: { xs: 5, md: 7 } }}>{children}</Box></Container>
    <Box component="footer" sx={{ borderTop: "1px solid", borderColor: "divider", py: 3 }}><Container maxWidth="lg"><Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}><Typography color="text.secondary" variant="caption">© {new Date().getFullYear()} Loji Business</Typography><Stack direction="row" spacing={2}><Typography component={Link} href="/privacy" color="text.secondary" variant="caption" sx={{ textDecoration: "none" }}>{t("Privacy", "Faragha")}</Typography><Typography component={Link} href="/terms" color="text.secondary" variant="caption" sx={{ textDecoration: "none" }}>{t("Terms", "Masharti")}</Typography></Stack></Stack></Container></Box>
  </Box>;
}
