"use client";

import { Box, Stack, Typography } from "@mui/material";

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
  return (
    <Stack
      component="header"
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 2, sm: 3 }}
      sx={{
        alignItems: { sm: "flex-end" },
        justifyContent: "space-between",
        mb: { xs: 0.25, sm: 0.5 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow ? (
          <Typography
            color="text.secondary"
            component="p"
            variant="overline"
            sx={{
              display: "block",
              fontSize: ".625rem",
              fontWeight: 700,
              letterSpacing: ".09em",
              mb: 0.5,
            }}
          >
            {eyebrow}
          </Typography>
        ) : null}

        <Typography
          component="h1"
          sx={{
            fontSize: { xs: "1.4rem", sm: "1.6rem" },
            fontWeight: 700,
            letterSpacing: "-.03em",
            lineHeight: 1.2,
            maxWidth: 760,
          }}
        >
          {title}
        </Typography>

        {description ? (
          <Typography
            color="text.secondary"
            sx={{
              fontSize: { xs: ".8125rem", sm: ".875rem" },
              lineHeight: 1.55,
              maxWidth: 680,
              mt: 0.75,
            }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>

      {action ? (
        <Box
          sx={{
            flexShrink: 0,
            pt: { sm: 0.25 },
            "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
          }}
        >
          {action}
        </Box>
      ) : null}
    </Stack>
  );
}
