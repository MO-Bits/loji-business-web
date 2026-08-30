"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";
import { EmptyState, Surface } from "@/components/shared/workspace-ui";
import { SettingsFormSkeleton, SettingsPageHeader } from "@/components/settings/settings-shared";

export function PropertyEditorHeader({
  description,
  icon,
  title,
}: {
  description: ReactNode;
  icon: ReactNode;
  title: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <SettingsPageHeader
      action={(
        <Button component={Link} href="/settings/property" startIcon={<ArrowBackRoundedIcon />} variant="outlined">
          {t("Property overview", "Muhtasari wa biashara")}
        </Button>
      )}
      description={description}
      eyebrow={t("Property settings", "Mipangilio ya biashara")}
      icon={icon}
      title={title}
    />
  );
}

export function PropertySettingsLoading() {
  return <SettingsFormSkeleton />;
}

export function PropertySettingsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <Stack spacing={2}>
      <Alert action={<Button color="inherit" onClick={onRetry}>{t("Try again", "Jaribu tena")}</Button>} severity="error">{message}</Alert>
      <Button component={Link} href="/settings" startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: "flex-start" }}>{t("Back to settings", "Rudi kwenye mipangilio")}</Button>
    </Stack>
  );
}

export function PropertyAccessDenied() {
  const { t } = useLanguage();
  return (
    <Surface padding={false}>
      <EmptyState
        actionHref="/settings/property"
        actionLabel={t("View property overview", "Tazama muhtasari wa biashara")}
        description={t("Only workspace owners and authorized managers can change these property settings.", "Ni wamiliki na mameneja wenye ruhusa pekee wanaoweza kubadili mipangilio hii.")}
        icon={<LockOutlinedIcon />}
        title={t("Editing access is restricted", "Ruhusa ya kuhariri imezuiwa")}
      />
    </Surface>
  );
}

export function PropertySettingLink({
  description,
  href,
  icon,
  meta,
  title,
}: {
  description: ReactNode;
  href?: string;
  icon: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
}) {
  const content = (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minHeight: 82, px: { xs: 2, sm: 2.5 }, py: 1.5 }}>
      <Box aria-hidden="true" sx={{ bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)", borderRadius: 2, color: "primary.main", display: "grid", flexShrink: 0, height: 40, placeItems: "center", width: 40, "& .MuiSvgIcon-root": { fontSize: 20 } }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.25 }} variant="caption">{description}</Typography>
        {meta ? <Typography color="primary.main" noWrap sx={{ display: "block", mt: 0.45, fontWeight: 500 }} variant="caption">{meta}</Typography> : null}
      </Box>
      {href ? <ArrowForwardRoundedIcon sx={{ color: "text.secondary", flexShrink: 0, fontSize: 20 }} /> : null}
    </Stack>
  );
  return href ? (
    <Box component={Link} href={href} sx={{ color: "inherit", display: "block", textDecoration: "none", "&:hover": { bgcolor: "action.hover" }, "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: -3 } }}>{content}</Box>
  ) : content;
}

export function EditorSaveBar({
  dirty,
  saving,
  submitLabel,
}: {
  dirty: boolean;
  saving: boolean;
  submitLabel?: string;
}) {
  const { t } = useLanguage();
  return (
    <Paper
      elevation={0}
      sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", bottom: { md: 20 }, p: 1.5, position: { md: "sticky" }, zIndex: 2 }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
        <Typography color="text.secondary" variant="caption">
          {dirty ? t("You have unsaved changes.", "Una mabadiliko ambayo hayajahifadhiwa.") : t("Everything is up to date.", "Kila kitu kimesasishwa.")}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button component={Link} disabled={saving} href="/settings/property" variant="text">{t("Cancel", "Ghairi")}</Button>
          <Button disabled={saving || !dirty} startIcon={<SaveRoundedIcon />} type="submit" variant="contained">
            {saving ? t("Saving…", "Inahifadhi…") : (submitLabel ?? t("Save changes", "Hifadhi mabadiliko"))}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
