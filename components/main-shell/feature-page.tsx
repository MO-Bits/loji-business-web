"use client";

import { Box, Container, Paper, Stack, Typography } from "@mui/material";

export function FeaturePage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Stack spacing={0.75}>
            <Typography variant="h4">{title}</Typography>
            <Typography color="text.secondary">{description}</Typography>
          </Stack>

          {children ?? (
            <Paper variant="outlined" sx={{ minHeight: 300, p: 3 }}>
              <Typography color="text.secondary">
                This area is ready for the Flutter screen conversion.
              </Typography>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
