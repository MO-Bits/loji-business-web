"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useLanguage } from "@/components/providers/language-provider";

export type StatusTone = "danger" | "info" | "neutral" | "success" | "warning";

const statusToneStyles: Record<StatusTone, SxProps<Theme>> = {
  neutral: {
    bgcolor: "color-mix(in srgb, var(--mui-palette-text-primary) 7%, transparent)",
    color: "text.secondary",
  },
  info: {
    bgcolor: "color-mix(in srgb, var(--mui-palette-info-main) 12%, transparent)",
    color: "info.main",
  },
  success: {
    bgcolor: "color-mix(in srgb, var(--mui-palette-success-main) 12%, transparent)",
    color: "success.main",
  },
  warning: {
    bgcolor: "color-mix(in srgb, var(--mui-palette-warning-main) 14%, transparent)",
    color: "warning.main",
  },
  danger: {
    bgcolor: "color-mix(in srgb, var(--mui-palette-error-main) 12%, transparent)",
    color: "error.main",
  },
};

export function WorkspacePage({
  children,
  maxWidth = 1440,
  sx,
}: {
  children: ReactNode;
  maxWidth?: number | string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={[
        {
          maxWidth,
          mx: "auto",
          px: { xs: 2, sm: 3, lg: 4 },
          py: { xs: 2.5, sm: 3, lg: 4 },
          width: "100%",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
}

export function Surface({
  children,
  padding = true,
  sx,
}: {
  children: ReactNode;
  padding?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <Paper
      variant="outlined"
      sx={[
        {
          bgcolor: "background.paper",
          borderColor: "divider",
          borderRadius: 3,
          overflow: "hidden",
          p: padding ? { xs: 2, sm: 2.5 } : 0,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Paper>
  );
}

export function SectionHeading({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}) {
  const { t } = useLanguage();
  const localizedDescription = typeof description === "string" ? t(description) : description;
  const localizedEyebrow = typeof eyebrow === "string" ? t(eyebrow) : eyebrow;
  const localizedTitle = typeof title === "string" ? t(title) : title;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      sx={{ alignItems: { sm: "flex-end" }, justifyContent: "space-between" }}
    >
      <Box sx={{ minWidth: 0 }}>
        {localizedEyebrow ? (
          <Typography color="primary.main" variant="overline">
            {localizedEyebrow}
          </Typography>
        ) : null}
        <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
          {localizedTitle}
        </Typography>
        {localizedDescription ? (
          <Typography color="text.secondary" sx={{ mt: 0.35 }} variant="body2">
            {localizedDescription}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Stack>
  );
}

export function MetricCell({
  caption,
  href,
  icon,
  label,
  tone = "neutral",
  value,
}: {
  caption?: ReactNode;
  href?: string;
  icon?: ReactNode;
  label: ReactNode;
  tone?: StatusTone;
  value: ReactNode;
}) {
  const { t } = useLanguage();
  const localizedCaption = typeof caption === "string" ? t(caption) : caption;
  const localizedLabel = typeof label === "string" ? t(label) : label;
  const content = (
    <Stack spacing={1.25} sx={{ height: "100%" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {icon ? (
          <Box
            sx={{
              alignItems: "center",
              borderRadius: 2,
              display: "inline-flex",
              height: 32,
              justifyContent: "center",
              width: 32,
              ...statusToneStyles[tone],
              "& .MuiSvgIcon-root": { fontSize: 18 },
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500 }}>
          {localizedLabel}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontSize: { xs: "1.5rem", sm: "1.75rem" },
          fontVariantNumeric: "tabular-nums",
          fontWeight: 700,
          letterSpacing: "-.035em",
          lineHeight: 1.05,
        }}
      >
        {value}
      </Typography>
      {localizedCaption ? (
        <Typography color="text.secondary" variant="caption">
          {localizedCaption}
        </Typography>
      ) : null}
    </Stack>
  );

  return (
    <Paper
      component={href ? Link : "div"}
      href={href}
      variant="outlined"
      sx={{
        borderColor: "divider",
        borderRadius: 3,
        color: "inherit",
        minHeight: 132,
        p: { xs: 1.75, sm: 2 },
        textDecoration: "none",
        transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
        ...(href
          ? {
              "&:hover": {
                borderColor: "primary.main",
                boxShadow: "0 8px 26px rgba(0,122,255,.08)",
                transform: "translateY(-1px)",
              },
            }
          : {}),
      }}
    >
      {content}
    </Paper>
  );
}

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  const { t } = useLanguage();
  return (
    <Chip
      label={t(label)}
      size="small"
      sx={{
        border: 0,
        fontSize: ".75rem",
        fontWeight: 500,
        ...statusToneStyles[tone],
      }}
    />
  );
}

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  icon,
  onAction,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: ReactNode;
  icon?: ReactNode;
  onAction?: () => void;
  title: ReactNode;
}) {
  const { t } = useLanguage();
  const localizedActionLabel = actionLabel ? t(actionLabel) : undefined;
  const localizedDescription = typeof description === "string" ? t(description) : description;
  const localizedTitle = typeof title === "string" ? t(title) : title;

  return (
    <Stack
      spacing={1.5}
      sx={{ alignItems: "center", px: 2, py: { xs: 5, sm: 7 }, textAlign: "center" }}
    >
      {icon ? (
        <Box
          sx={{
            bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
            borderRadius: "50%",
            color: "primary.main",
            display: "grid",
            height: 52,
            placeItems: "center",
            width: 52,
          }}
        >
          {icon}
        </Box>
      ) : null}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {localizedTitle}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 440, mt: 0.5 }} variant="body2">
          {localizedDescription}
        </Typography>
      </Box>
      {localizedActionLabel ? (
        <Button
          component={actionHref ? Link : "button"}
          href={actionHref}
          onClick={onAction}
          endIcon={actionHref ? <ArrowForwardRoundedIcon /> : undefined}
          variant="contained"
        >
          {localizedActionLabel}
        </Button>
      ) : null}
    </Stack>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
      {Array.from({ length: rows }, (_, index) => (
        <Stack
          direction="row"
          key={index}
          spacing={2}
          sx={{ alignItems: "center", minHeight: 72, px: { xs: 2, sm: 2.5 }, py: 1.5 }}
        >
          <Skeleton height={40} variant="rounded" width={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width={`${52 + (index % 3) * 9}%`} />
            <Skeleton width={`${34 + (index % 2) * 11}%`} />
          </Box>
          <Skeleton sx={{ display: { xs: "none", sm: "block" } }} width={96} />
        </Stack>
      ))}
    </Stack>
  );
}

export function InlineLoading({ label = "Loading" }: { label?: string }) {
  const { t } = useLanguage();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
      <CircularProgress size={16} />
      <Typography variant="body2">{t(label)}</Typography>
    </Stack>
  );
}

export function StickyMobileActionBar({ children }: { children: ReactNode }) {
  return (
    <Paper
      elevation={8}
      sx={{
        backdropFilter: "blur(18px)",
        bgcolor: "color-mix(in srgb, var(--mui-palette-background-paper) 92%, transparent)",
        borderRadius: 0,
        borderTop: 1,
        borderColor: "divider",
        bottom: "calc(64px + env(safe-area-inset-bottom))",
        display: { xs: "block", md: "none" },
        left: 0,
        p: 1.5,
        position: "fixed",
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar - 1,
      }}
    >
      {children}
    </Paper>
  );
}
