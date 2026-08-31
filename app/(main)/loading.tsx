"use client";

import { Box, Skeleton, Stack, Typography } from "@mui/material";

import { Surface, WorkspacePage } from "@/components/shared/workspace-ui";
import { useLanguage } from "@/components/providers/language-provider";

export default function MainContentLoading() {
  const { t } = useLanguage();
  return (
    <WorkspacePage>
      <Box aria-busy="true" aria-live="polite" role="status">
        <Typography
          sx={{ border: 0, clip: "rect(0 0 0 0)", height: 1, m: -1, overflow: "hidden", p: 0, position: "absolute", width: 1 }}
        >
          {t("Loading workspace", "Inapakia eneo la kazi")}
        </Typography>
        <Stack spacing={{ xs: 2.5, sm: 3 }}>
          <Box>
            <Skeleton animation="wave" height={16} width={112} />
            <Skeleton animation="wave" height={42} sx={{ mt: 0.25, maxWidth: 360 }} width="72%" />
            <Skeleton animation="wave" height={20} sx={{ maxWidth: 520 }} width="88%" />
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: { xs: 1.5, sm: 2 },
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
            }}
          >
            {[0, 1, 2, 3].map((item) => (
              <Surface key={item} sx={{ minHeight: 132 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Skeleton animation="wave" height={32} variant="rounded" width={32} />
                    <Skeleton animation="wave" width="52%" />
                  </Stack>
                  <Skeleton animation="wave" height={38} width="42%" />
                  <Skeleton animation="wave" width="68%" />
                </Stack>
              </Surface>
            ))}
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: { xs: 2, lg: 3 },
              gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.45fr) minmax(300px, .75fr)" },
            }}
          >
            <Surface>
              <Skeleton animation="wave" height={28} width="34%" />
              <Skeleton animation="wave" sx={{ mt: 2 }} width="62%" />
              {[0, 1, 2].map((item) => (
                <Stack
                  direction="row"
                  key={item}
                  spacing={1.5}
                  sx={{ alignItems: "center", borderTop: 1, borderColor: "divider", mt: 1.5, pt: 1.5 }}
                >
                  <Skeleton animation="wave" height={40} variant="rounded" width={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton animation="wave" width="42%" />
                    <Skeleton animation="wave" width="64%" />
                  </Box>
                  <Skeleton animation="wave" height={28} variant="rounded" width={70} />
                </Stack>
              ))}
            </Surface>
            <Surface>
              <Skeleton animation="wave" height={28} width="58%" />
              <Skeleton animation="wave" sx={{ mt: 2 }} width="82%" />
              <Skeleton animation="wave" height={150} sx={{ mt: 1.5 }} variant="rounded" />
            </Surface>
          </Box>
        </Stack>
      </Box>
    </WorkspacePage>
  );
}
