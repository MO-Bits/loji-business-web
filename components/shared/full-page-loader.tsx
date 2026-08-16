"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";

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
        <CircularProgress size={30} thickness={3} />
        <Typography color="text.secondary">Preparing Loji Business…</Typography>
      </Stack>
    </Box>
  );
}
