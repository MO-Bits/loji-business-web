"use client";

import { Box, Stack, Typography } from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  const { t } = useLanguage();
  const localizedEyebrow = eyebrow ? t(eyebrow) : undefined;
  const localizedTitle = t(title);
  const localizedDescription = description ? t(description) : undefined;

  return (
    <Stack
      component="header"
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 1.25, sm: 2.5 }}
      sx={{
        alignItems: { sm: "center" },
        justifyContent: "space-between",
        minWidth: 0,
      }}
    >
      <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0 }}>
        {localizedEyebrow ? (
          <Typography
            color="text.secondary"
            component="p"
            variant="overline"
            sx={{
              display: "block",
              fontSize: ".6875rem",
              fontWeight: 600,
              letterSpacing: ".07em",
              mb: 0.4,
              textTransform: "uppercase",
            }}
          >
            {localizedEyebrow}
          </Typography>
        ) : null}

        <Typography
          component="h1"
          sx={{
            fontSize: { xs: "1.375rem", sm: "1.625rem" },
            fontWeight: 700,
            letterSpacing: "-.025em",
            lineHeight: 1.22,
            maxWidth: 760,
          }}
        >
          {localizedTitle}
        </Typography>

        {localizedDescription ? (
          <Typography
            color="text.secondary"
            sx={{
              fontSize: ".875rem",
              lineHeight: 1.6,
              maxWidth: 680,
              mt: 0.4,
            }}
          >
            {localizedDescription}
          </Typography>
        ) : null}
      </Box>

      {action ? (
        <Box
          sx={{
            flexShrink: 0,
            alignSelf: { xs: "stretch", sm: "center" },
            "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
          }}
        >
          {action}
        </Box>
      ) : null}
    </Stack>
  );
}
