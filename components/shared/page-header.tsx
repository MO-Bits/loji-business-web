"use client";

import { Box, Stack, Typography } from "@mui/material";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
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
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow ? (
          <Typography
            color="primary.main"
            component="p"
            variant="overline"
            sx={{ display: "block", mb: 0.25 }}
          >
            {eyebrow}
          </Typography>
        ) : null}

        <Typography component="h1" variant="h4">
          {title}
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            fontSize: { xs: "0.9rem", sm: "1rem" },
            lineHeight: 1.55,
            maxWidth: 640,
            mt: 0.5,
          }}
        >
          {description}
        </Typography>
      </Box>

      {action ? (
        <Box
          sx={{
            flexShrink: 0,
            "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
          }}
        >
          {action}
        </Box>
      ) : null}
    </Stack>
  );
}
