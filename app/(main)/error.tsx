"use client";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Alert, Box, Button, Container, Stack, Typography } from "@mui/material";

export default function MainError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 10 } }}>
      <Stack spacing={2}>
        <Typography variant="h4">This section could not load</Typography>
        <Alert severity="error">{error.message || "An unexpected error occurred."}</Alert>
        <Box><Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={reset}>Try again</Button></Box>
      </Stack>
    </Container>
  );
}
