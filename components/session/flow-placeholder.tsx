"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

export function FlowPlaceholder({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  const router = useRouter();
  return (
    <Box
      component="main"
      sx={{
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
        minHeight: "100dvh",
        p: 3,
      }}
    >
      <Paper variant="outlined" sx={{ maxWidth: 560, p: { xs: 3, sm: 5 }, width: "100%" }}>
        <Stack spacing={2.5}>
          <Chip
            icon={<CheckCircleRoundedIcon />}
            label={eyebrow}
            color="primary"
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
          />
          <Typography variant="h4">{title}</Typography>
          <Typography color="text.secondary">{description}</Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => router.replace("/")}
            sx={{ alignSelf: "flex-start" }}
          >
            Recheck session
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
