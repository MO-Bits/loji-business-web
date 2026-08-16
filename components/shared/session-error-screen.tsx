"use client";

import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

export function SessionErrorScreen({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <Box
      sx={{
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
        minHeight: "100dvh",
        p: 3,
      }}
    >
      <Paper variant="outlined" sx={{ maxWidth: 480, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
          <ErrorOutlineRoundedIcon color="error" sx={{ fontSize: 38 }} />
          <Typography variant="h5" fontWeight={700}>
            We couldn’t open Loji Business
          </Typography>
          <Typography color="text.secondary">
            Check your connection and try again. Your information is safe.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {error.message}
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshRoundedIcon />}
            onClick={onRetry}
          >
            Try again
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
