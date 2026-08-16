"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import { alpha, Box, Button, Container, Divider, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";

export type LegalSectionData = { title: string; content: string };

function LegalSection({ title, content }: LegalSectionData) {
  return <Paper component="section" variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{ width: 4, height: 20, mt: .25, borderRadius: 4, bgcolor: "primary.main", flexShrink: 0 }} />
      <Box><Typography variant="h6" sx={{ mb: 1.5 }}>{title}</Typography><Typography component="div" color="text.secondary" sx={{ whiteSpace: "pre-line", lineHeight: 1.75 }}>{content}</Typography></Box>
    </Stack>
  </Paper>;
}

export function LegalPage({ kind, title, introTitle, intro, sections }: { kind: "terms" | "privacy"; title: string; introTitle: string; intro: string; sections: LegalSectionData[] }) {
  const Icon = kind === "privacy" ? ShieldOutlinedIcon : VerifiedOutlinedIcon;
  return <Box component="main" sx={{ minHeight: "100dvh", py: { xs: 2, md: 5 } }}><Container maxWidth="md"><Stack spacing={3}>
    <Stack direction="row" alignItems="center" spacing={1.5}><Button component={Link} href="/login" startIcon={<ArrowBackRoundedIcon />}>Back</Button><Divider orientation="vertical" flexItem /><Typography variant="h5" fontWeight={800}>{title}</Typography></Stack>
    <Paper variant="outlined" sx={(theme) => ({ p: { xs: 2.5, sm: 3.5 }, borderRadius: 4, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, .12)}, ${alpha(theme.palette.background.paper, .95)})` })}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}><Box sx={{ width: 54, height: 54, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "primary.main", color: "primary.contrastText", flexShrink: 0 }}><Icon /></Box><Box><Typography variant="h6" color="primary.main" fontWeight={800}>{introTitle}</Typography><Typography color="text.secondary" sx={{ mt: .75, lineHeight: 1.65 }}>{intro}</Typography><Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}><CalendarMonthRoundedIcon color="primary" sx={{ fontSize: 17 }} /><Typography variant="caption" fontWeight={700}>Effective Date: August 7, 2026</Typography></Stack></Box></Stack>
    </Paper>
    <Stack spacing={2}>{sections.map((section) => <LegalSection key={section.title} {...section} />)}</Stack>
  </Stack></Container></Box>;
}
