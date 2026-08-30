"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { BrandSymbol } from "@/components/shared/brand-symbol";

export function FullPageLoader() {
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
        <Box
          sx={{
            alignItems: "center",
            bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, var(--mui-palette-background-paper))",
            borderRadius: 3,
            display: "grid",
            height: 72,
            placeItems: "center",
            width: 72,
          }}
        >
          <BrandSymbol priority size={42} />
        </Box>
        <CircularProgress size={24} thickness={3.4} />
        <Typography color="text.secondary" sx={{ fontSize: ".8125rem", fontWeight: 500 }}>
          Preparing your workspace…
        </Typography>
      </Stack>
    </Box>
  );
}
