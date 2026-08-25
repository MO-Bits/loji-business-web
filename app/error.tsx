"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Box sx={{ display: "grid", minHeight: "70dvh", p: 2, placeItems: "center" }}>
      <Paper variant="outlined" sx={{ maxWidth: 480, p: { xs: 3, sm: 4 }, textAlign: "center" }}>
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <ErrorOutlineRoundedIcon color="error" sx={{ fontSize: 44 }} />
          <Typography component="h1" variant="h5">Something went wrong</Typography>
          <Typography color="text.secondary">
            We could not complete this request. Your work remains safe; please try again.
          </Typography>
          <Button variant="contained" onClick={reset}>Try again</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
