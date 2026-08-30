"use client";

import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { PageHeader } from "@/components/shared/page-header";

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
    <Box component="section" sx={{ py: { xs: 2, sm: 3, lg: 4 } }}>
      <Container maxWidth="xl">
        <Stack spacing={{ xs: 2, sm: 3 }}>
          <PageHeader title={title} description={description} />

          {children ?? (
            <Paper
              variant="outlined"
              sx={{ display: "grid", minHeight: 280, p: { xs: 3, sm: 5 }, placeItems: "center" }}
            >
              <Stack spacing={1.25} sx={{ alignItems: "center", maxWidth: 420, textAlign: "center" }}>
                <Box
                  sx={{
                    alignItems: "center",
                    bgcolor: "action.selected",
                    borderRadius: 2,
                    color: "primary.main",
                    display: "grid",
                    height: 44,
                    placeItems: "center",
                    width: 44,
                  }}
                >
                  <InboxOutlinedIcon />
                </Box>
                <Typography sx={{ fontSize: ".9375rem", fontWeight: 700 }}>
                  Nothing to show yet
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Information for this section will appear here when it becomes available.
                </Typography>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
