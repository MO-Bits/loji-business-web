"use client";

import Link from "next/link";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

export default function NotFound() {
  return (
    <Box sx={{ display: "grid", minHeight: "100dvh", placeItems: "center", p: 3 }}>
      <Paper variant="outlined" sx={{ maxWidth: 480, p: { xs: 3, sm: 5 }, textAlign: "center" }}>
        <Stack spacing={2.5} sx={{ alignItems: "center" }}>
          <SearchOffRoundedIcon color="primary" sx={{ fontSize: 56 }} />
          <Box><Typography variant="h3">Page not found</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>The page may have moved or the address is incorrect.</Typography></Box>
          <Button component={Link} href="/dashboard" variant="contained">Back to dashboard</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
