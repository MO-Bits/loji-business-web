"use client";

import { Box, Stack, Typography } from "@mui/material";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2, sm: 3 }} sx={{ alignItems: { sm: "flex-end" }, justifyContent: "space-between" }}><Box>{eyebrow && <Typography color="primary.main" sx={{ fontSize: ".7rem", fontWeight: 850, letterSpacing: ".13em", mb: .7 }}>{eyebrow.toUpperCase()}</Typography>}<Typography variant="h4">{title}</Typography><Typography color="text.secondary" sx={{ fontSize: { xs: ".9rem", sm: "1rem" }, lineHeight: 1.55, maxWidth: 650, mt: .65 }}>{description}</Typography></Box>{action && <Box sx={{ flexShrink: 0, "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } } }}>{action}</Box>}</Stack>;
}
