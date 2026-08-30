"use client";

import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { BrandLockup } from "@/components/shared/brand-lockup";

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
        bgcolor: "background.default",
        display: "flex",
        justifyContent: "center",
        minHeight: "100dvh",
        p: { xs: 2, sm: 3 },
      }}
    >
      <Paper variant="outlined" sx={{ maxWidth: 500, overflow: "hidden", width: "100%" }}>
        <Stack spacing={2.5} sx={{ alignItems: "flex-start", p: { xs: 2.5, sm: 4 } }}>
          <BrandLockup symbolSize={30} textSize=".9375rem" />
          <Box
            sx={{
              alignItems: "center",
              bgcolor: "color-mix(in srgb, var(--mui-palette-error-main) 10%, var(--mui-palette-background-paper))",
              borderRadius: 2,
              color: "error.main",
              display: "grid",
              height: 44,
              placeItems: "center",
              width: 44,
            }}
          >
            <ErrorOutlineRoundedIcon />
          </Box>
          <Box>
            <Typography component="h1" sx={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-.02em" }}>
              We couldn’t open your workspace
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: ".875rem", lineHeight: 1.65, mt: 0.75 }}>
              Check your connection and try again. Your saved information is safe.
            </Typography>
            {process.env.NODE_ENV === "development" ? (
              <Typography color="text.disabled" sx={{ fontSize: ".75rem", mt: 1.25 }}>
                {error.message}
              </Typography>
            ) : null}
          </Box>
          <Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={onRetry}>
            Try again
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
