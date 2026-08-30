"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

import { BrandLockup } from "@/components/shared/brand-lockup";

type AppStateTone = "error" | "info" | "offline";

export type AppStateAction = {
  href?: string;
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
};

type AppStateScreenProps = {
  description: ReactNode;
  eyebrow?: ReactNode;
  icon: ReactNode;
  primaryAction?: AppStateAction;
  reference?: string;
  secondaryAction?: AppStateAction;
  title: ReactNode;
  tone?: AppStateTone;
  variant?: "page" | "workspace";
};

const toneStyles: Record<AppStateTone, SxProps<Theme>> = {
  error: {
    bgcolor:
      "color-mix(in srgb, var(--mui-palette-error-main) 10%, var(--mui-palette-background-paper))",
    color: "error.main",
  },
  info: {
    bgcolor:
      "color-mix(in srgb, var(--mui-palette-primary-main) 10%, var(--mui-palette-background-paper))",
    color: "primary.main",
  },
  offline: {
    bgcolor:
      "color-mix(in srgb, var(--mui-palette-warning-main) 12%, var(--mui-palette-background-paper))",
    color: "warning.dark",
  },
};

function ActionButton({
  action,
  primary,
}: {
  action: AppStateAction;
  primary: boolean;
}) {
  const sharedProps = {
    fullWidth: true,
    startIcon: action.icon,
    variant: primary ? ("contained" as const) : ("outlined" as const),
    sx: {
      minHeight: 44,
      minWidth: { sm: 144 },
      width: { sm: "auto" },
    },
  };

  if (action.href) {
    return (
      <Button component={Link} href={action.href} {...sharedProps}>
        {action.label}
      </Button>
    );
  }

  return (
    <Button onClick={action.onClick} type="button" {...sharedProps}>
      {action.label}
    </Button>
  );
}

/** Consistent, focus-managed recovery surface for route and workspace states. */
export function AppStateScreen({
  description,
  eyebrow,
  icon,
  primaryAction,
  reference,
  secondaryAction,
  title,
  tone = "error",
  variant = "page",
}: AppStateScreenProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const isWorkspace = variant === "workspace";

  return (
    <Box
      component={isWorkspace ? "section" : "main"}
      sx={{
        alignItems: "center",
        bgcolor: "background.default",
        display: "flex",
        justifyContent: "center",
        minHeight: isWorkspace
          ? { xs: "calc(100dvh - 144px)", md: "calc(100dvh - 112px)" }
          : "calc(100dvh - 68px)",
        p: { xs: 2, sm: 3, md: 4 },
        width: "100%",
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          bgcolor: "background.paper",
          borderColor: "divider",
          borderRadius: 3,
          maxWidth: 580,
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            background:
              "linear-gradient(90deg, var(--mui-palette-primary-main), color-mix(in srgb, var(--mui-palette-primary-main) 35%, transparent))",
            height: 3,
            inset: "0 0 auto",
            position: "absolute",
          }}
        />
        <Stack
          spacing={{ xs: 2.25, sm: 2.5 }}
          sx={{ alignItems: "center", p: { xs: 2.5, sm: 4, md: 4.5 }, textAlign: "center" }}
        >
          <BrandLockup priority symbolSize={30} textSize=".9375rem" />

          <Box
            sx={{
              alignItems: "center",
              borderRadius: 2.5,
              display: "grid",
              height: 52,
              placeItems: "center",
              width: 52,
              ...toneStyles[tone],
              "& .MuiSvgIcon-root": { fontSize: 27 },
            }}
          >
            {icon}
          </Box>

          <Box aria-live={tone === "info" ? "polite" : "assertive"}>
            {eyebrow ? (
              <Typography
                color="primary.main"
                component="p"
                sx={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}
              >
                {eyebrow}
              </Typography>
            ) : null}
            <Typography
              component="h1"
              ref={titleRef}
              tabIndex={-1}
              sx={{
                fontSize: { xs: "1.5rem", sm: "1.75rem" },
                fontWeight: 700,
                letterSpacing: "-.035em",
                lineHeight: 1.18,
                mt: eyebrow ? 0.75 : 0,
                outline: "none",
              }}
            >
              {title}
            </Typography>
            <Typography
              color="text.secondary"
              component="div"
              sx={{ fontSize: ".9375rem", lineHeight: 1.65, mx: "auto", mt: 1, maxWidth: 460 }}
            >
              {description}
            </Typography>
          </Box>

          {primaryAction || secondaryAction ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ justifyContent: "center", pt: 0.25, width: "100%" }}
            >
              {primaryAction ? <ActionButton action={primaryAction} primary /> : null}
              {secondaryAction ? <ActionButton action={secondaryAction} primary={false} /> : null}
            </Stack>
          ) : null}

          {reference ? (
            <Typography
              color="text.disabled"
              component="p"
              sx={{ fontSize: ".75rem", overflowWrap: "anywhere" }}
            >
              Reference: {reference}
            </Typography>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}
