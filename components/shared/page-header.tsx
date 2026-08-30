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
      spacing={{ xs: 1.5, sm: 3 }}
      sx={{
        alignItems: { sm: "center" },
        justifyContent: "space-between",
        minWidth: 0,
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
              fontSize: ".6875rem",
              fontWeight: 700,
              letterSpacing: ".07em",
              mb: 0.4,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </Typography>
        ) : null}

        <Typography
          component="h1"
          sx={{
            fontSize: { xs: "1.5rem", sm: "1.75rem" },
            fontWeight: 700,
            letterSpacing: "-.025em",
            lineHeight: 1.22,
            maxWidth: 760,
          }}
        >
          {title}
        </Typography>

        {description ? (
          <Typography
            color="text.secondary"
            sx={{
              fontSize: ".875rem",
              lineHeight: 1.6,
              maxWidth: 680,
              mt: 0.55,
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
