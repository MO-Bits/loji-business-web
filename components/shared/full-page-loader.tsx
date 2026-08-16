"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { BrandWordmark } from "@/components/shared/brand-wordmark";

export function FullPageLoader() {
  return (
    <Box
      sx={{
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
        minHeight: "100dvh",
        px: 3,
      }}
    >
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <BrandWordmark priority sx={{ mb: 0.5, width: 168 }} />
        <CircularProgress size={30} thickness={3} />
        <Typography color="text.secondary">Preparing Loji Business…</Typography>
      </Stack>
    </Box>
  );
}
