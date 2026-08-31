"use client";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Alert, Box, Button, Skeleton, Stack, Typography } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { Surface, WorkspacePage } from "@/components/shared/workspace-ui";

export function DashboardLoading() {
  return (
    <WorkspacePage>
      <Stack spacing={{ xs: 2, sm: 2.5 }}>
        <Surface>
          <Stack spacing={1}>
            <Skeleton width={120} />
            <Skeleton height={46} width="min(540px, 80%)" />
            <Skeleton width="min(660px, 92%)" />
            <Skeleton width={240} />
          </Stack>
        </Surface>
        <Box
          sx={{
            display: "grid",
            gap: { xs: 1.25, sm: 1.5 },
            gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))" },
          }}
        >
          {[0, 1, 2, 3].map((item) => (
            <Skeleton height={132} key={item} variant="rounded" />
          ))}
        </Box>
        <Skeleton height={86} variant="rounded" />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1.3fr .8fr" } }}>
          <Skeleton height={430} variant="rounded" />
          <Skeleton height={430} variant="rounded" />
        </Box>
      </Stack>
    </WorkspacePage>
  );
}

export function DashboardError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  const { t } = useLanguage();
  return (
    <WorkspacePage maxWidth={720}>
      <Surface>
        <Stack spacing={2} sx={{ py: { xs: 2, sm: 4 } }}>
          <Alert severity="error">
            <Typography sx={{ fontWeight: 700 }}>
              {t("Unable to load the dashboard", "Imeshindikana kupakia dashibodi")}
            </Typography>
            <Typography sx={{ mt: 0.25 }} variant="body2">
              {message ?? t(
                "The current property overview is temporarily unavailable.",
                "Muhtasari wa biashara hii haupatikani kwa muda.",
              )}
            </Typography>
          </Alert>
          <Button
            onClick={onRetry}
            startIcon={<RefreshRoundedIcon />}
            sx={{ alignSelf: "flex-start" }}
            variant="contained"
          >
            {t("Try again", "Jaribu tena")}
          </Button>
        </Stack>
      </Surface>
    </WorkspacePage>
  );
}
