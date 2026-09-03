"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { useLanguage } from "@/components/providers/language-provider";

export function FullPageLoader() {
  const { t } = useLanguage();
  return (
    <Box
      aria-live="polite"
      role="status"
      sx={{
        alignItems: "center",
        bgcolor: "background.default",
        display: "flex",
        justifyContent: "center",
        minHeight: "100dvh",
        px: 3,
      }}
    >
      <Stack spacing={1.75} sx={{ alignItems: "center" }}>
        <BrandLockup priority textSize="1.125rem" />
        <CircularProgress size={24} thickness={3.4} />
        <Typography color="text.secondary" sx={{ fontSize: ".8125rem", fontWeight: 500 }}>
          {t("Preparing your workspace…", "Inaandaa eneo lako la kazi…")}
        </Typography>
      </Stack>
    </Box>
  );
}
