"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Box, Button, Skeleton, Stack, Typography } from "@mui/material";

import { Surface } from "@/components/shared/workspace-ui";
import { useLanguage } from "@/components/providers/language-provider";

export function SettingsPageHeader({
  action,
  description,
  eyebrow,
  icon,
  title,
}: {
  action?: ReactNode;
  description: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", minWidth: 0 }}>
        {icon ? (
          <Box
            aria-hidden="true"
            sx={{
              alignItems: "center",
              bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 11%, transparent)",
              borderRadius: 2,
              color: "primary.main",
              display: "flex",
              flexShrink: 0,
              height: 44,
              justifyContent: "center",
              mt: 0.25,
              width: 44,
              "& .MuiSvgIcon-root": { fontSize: 22 },
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Box sx={{ minWidth: 0 }}>
          {eyebrow ? (
            <Typography color="primary.main" variant="overline">
              {eyebrow}
            </Typography>
          ) : null}
          <Typography component="h2" variant="h3">
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 640, mt: 0.65 }} variant="body1">
            {description}
          </Typography>
        </Box>
      </Stack>
      {action ? (
        <Box
          sx={{
            alignSelf: { xs: "stretch", sm: "auto" },
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

export function SettingsSection({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <Surface padding={false}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        sx={{
          alignItems: { sm: "center" },
          borderBottom: 1,
          borderColor: "divider",
          justifyContent: "space-between",
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.75, sm: 2 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h3" variant="h5">
            {title}
          </Typography>
          {description ? (
            <Typography color="text.secondary" sx={{ mt: 0.35 }} variant="body2">
              {description}
            </Typography>
          ) : null}
        </Box>
        {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
      </Stack>
      {children}
    </Surface>
  );
}

export function SettingsError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" onClick={onRetry} size="small">
            {t("Try again", "Jaribu tena")}
          </Button>
        ) : undefined
      }
    >
      {message}
    </Alert>
  );
}

export function SettingsFormSkeleton() {
  const { t } = useLanguage();
  return (
    <Stack aria-label={t("Loading settings", "Inapakia mipangilio")} spacing={2.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Skeleton height={44} variant="rounded" width={44} />
        <Box sx={{ flex: 1 }}>
          <Skeleton height={30} width="42%" />
          <Skeleton width="72%" />
        </Box>
      </Stack>
      <Surface>
        <Stack spacing={2}>
          <Skeleton height={56} variant="rounded" />
          <Skeleton height={56} variant="rounded" />
          <Skeleton height={112} variant="rounded" />
          <Skeleton height={44} sx={{ alignSelf: "flex-end" }} variant="rounded" width={148} />
        </Stack>
      </Surface>
    </Stack>
  );
}

export function BackToSettingsButton() {
  const { t } = useLanguage();
  return (
    <Button
      component={Link}
      href="/settings"
      size="small"
      startIcon={<ArrowBackRoundedIcon />}
      sx={{ display: { xs: "inline-flex", lg: "none" } }}
    >
      {t("All settings", "Mipangilio yote")}
    </Button>
  );
}
