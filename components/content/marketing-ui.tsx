import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import type { ReactNode } from "react";

export function MarketingGrid({
  children,
  columns = { xs: 1, sm: 2, lg: 3 },
}: {
  children: ReactNode;
  columns?: { xs: number; sm?: number; md?: number; lg?: number };
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: `repeat(${columns.xs}, minmax(0, 1fr))`,
          ...(columns.sm
            ? { sm: `repeat(${columns.sm}, minmax(0, 1fr))` }
            : {}),
          ...(columns.md
            ? { md: `repeat(${columns.md}, minmax(0, 1fr))` }
            : {}),
          ...(columns.lg
            ? { lg: `repeat(${columns.lg}, minmax(0, 1fr))` }
            : {}),
        },
      }}
    >
      {children}
    </Box>
  );
}

export function MarketingCard({
  action,
  description,
  icon,
  meta,
  title,
}: {
  action?: {
    href: string;
    label: ReactNode;
    external?: boolean;
    newTab?: boolean;
  };
  description: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 190,
        p: { xs: 2, sm: 2.5 },
        transition: "border-color 160ms ease, background-color 160ms ease",
        "&:hover": {
          borderColor:
            "color-mix(in srgb, var(--mui-palette-primary-main) 45%, var(--mui-palette-divider))",
          bgcolor: "action.hover",
        },
      }}
    >
      {icon ? (
        <Box
          aria-hidden="true"
          sx={{
            bgcolor:
              "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
            borderRadius: 1,
            color: "primary.main",
            display: "grid",
            height: 40,
            placeItems: "center",
            width: 40,
            "& .MuiSvgIcon-root": { fontSize: 23 },
          }}
        >
          {icon}
        </Box>
      ) : null}
      <Box sx={{ flex: 1, mt: icon ? 1.75 : 0 }}>
        {meta ? (
          <Typography color="primary.main" sx={{ mb: 0.65 }} variant="overline">
            {meta}
          </Typography>
        ) : null}
        <Typography component="h2" variant="h4">
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.72, mt: 0.85 }}>
          {description}
        </Typography>
      </Box>
      {action ? (
        <Button
          component={action.external ? "a" : Link}
          endIcon={<ArrowForwardRoundedIcon />}
          href={action.href}
          rel={action.newTab ? "noreferrer" : undefined}
          target={action.newTab ? "_blank" : undefined}
          sx={{ alignSelf: "flex-start", mt: 2, px: 0 }}
        >
          {action.label}
        </Button>
      ) : null}
    </Paper>
  );
}

export function MarketingCallout({
  action,
  description,
  title,
}: {
  action?: { href: string; label: ReactNode };
  description: ReactNode;
  title: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--mui-palette-primary-main) 9%, var(--mui-palette-background-paper)), var(--mui-palette-background-paper))",
        mt: 3,
        overflow: "hidden",
        p: { xs: 2, sm: 3 },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Box sx={{ maxWidth: 760 }}>
          <Typography component="h2" variant="h4">
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.72, mt: 0.75 }}>
            {description}
          </Typography>
        </Box>
        {action ? (
          <Button
            component={Link}
            endIcon={<ArrowForwardRoundedIcon />}
            href={action.href}
            sx={{ flexShrink: 0 }}
            variant="contained"
          >
            {action.label}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function MarketingStep({
  description,
  number,
  title,
}: {
  description: ReactNode;
  number: string;
  title: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.5, sm: 2.5 },
          gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "64px minmax(0, 1fr)" },
        }}
      >
        <Typography
          aria-hidden="true"
          color="primary.main"
          sx={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-.02em" }}
        >
          {number}
        </Typography>
        <Box>
          <Typography component="h2" variant="h4">
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.72, mt: 0.75 }}>
            {description}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
