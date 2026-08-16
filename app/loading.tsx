"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";

export default function Loading() {
  return (
    <Box sx={{ display: "grid", minHeight: "100dvh", placeItems: "center", p: 3 }}>
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <CircularProgress size={34} thickness={4} />
        <Typography color="text.secondary">Loading Loji Business…</Typography>
      </Stack>
    </Box>
  );
}
