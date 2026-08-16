"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";

export function InfoPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box component="main" sx={{ minHeight: "100dvh", py: { xs: 4, md: 8 } }}>
      <Container maxWidth="md">
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={3}>
            <Button
              component={Link}
              href="/login"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ alignSelf: "flex-start" }}
            >
              Back to sign in
            </Button>
            <Stack spacing={1}>
              <Typography
                variant="overline"
                color="primary.main"
                sx={{ fontWeight: 800 }}
              >
                {eyebrow}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>
                {title}
              </Typography>
            </Stack>
            <Typography
              color="text.secondary"
              sx={{ fontSize: "1.05rem", lineHeight: 1.8 }}
            >
              {children}
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
