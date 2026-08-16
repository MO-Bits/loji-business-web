"use client";

import { Box, Container, Paper, Skeleton, Stack } from "@mui/material";

export default function MainContentLoading() {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Box><Skeleton width={110} /><Skeleton height={48} width="min(360px, 80%)" /></Box>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" } }}>
          {[0, 1, 2, 3].map((item) => <Paper key={item} variant="outlined" sx={{ p: 2.5 }}><Skeleton width="55%" /><Skeleton height={36} width="35%" /></Paper>)}
        </Box>
        <Paper variant="outlined" sx={{ p: 3 }}><Skeleton height={32} width="30%" /><Skeleton height={72} /><Skeleton height={72} /></Paper>
      </Stack>
    </Container>
  );
}
