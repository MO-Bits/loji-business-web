"use client";

import { Box, Stack, Typography } from "@mui/material";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} sx={{ alignItems: { sm: "flex-end" }, justifyContent: "space-between" }}><Box>{eyebrow && <Typography color="primary.main" sx={{ fontSize: ".7rem", fontWeight: 850, letterSpacing: ".13em", mb: .8 }}>{eyebrow.toUpperCase()}</Typography>}<Typography variant="h4">{title}</Typography><Typography color="text.secondary" sx={{ fontSize: { xs: ".92rem", sm: "1rem" }, lineHeight: 1.6, maxWidth: 650, mt: .75 }}>{description}</Typography></Box>{action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}</Stack>;
}
