import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import {
  EmptyState,
  Surface,
  WorkspacePage,
} from "@/components/shared/workspace-ui";
import type { GuestProfile } from "@/features/guests/models/guest";

import type { Translate } from "./guest-edit-form-model";
import { GuestAvatar } from "./guest-shared";

export function GuestEditHeader({
  guest,
  onCancel,
}: {
  guest: GuestProfile;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Stack spacing={2}>
      <Button
        onClick={onCancel}
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ alignSelf: "flex-start" }}
      >
        {t("Guest profile", "Wasifu wa mgeni")}
      </Button>
      <Surface>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2, sm: 2.5 }}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center", minWidth: 0 }}
          >
            <GuestAvatar name={guest.name} size={58} />
            <Box sx={{ minWidth: 0 }}>
              <Typography color="primary.main" variant="overline">
                {t("Guest record", "Rekodi ya mgeni")}
              </Typography>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "1.45rem", sm: "1.75rem" },
                  fontWeight: 700,
                  letterSpacing: "-.035em",
                  lineHeight: 1.15,
                }}
              >
                {t("Edit guest", "Hariri mgeni")}
              </Typography>
              <Typography color="text.secondary" noWrap variant="body2">
                {guest.name}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <BadgeOutlinedIcon color="primary" fontSize="small" />
            <Typography color="text.secondary" variant="caption">
              {t(
                "Permission-checked guest data",
                "Taarifa za mgeni zilizokaguliwa ruhusa",
              )}
            </Typography>
          </Stack>
        </Stack>
      </Surface>
    </Stack>
  );
}

export function FormActions({
  dirty,
  onCancel,
  saving,
  t,
}: {
  dirty: boolean;
  onCancel: () => void;
  saving: boolean;
  t: Translate;
}) {
  return (
    <Surface padding={false}>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 2,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", minWidth: 0 }}
        >
          <NotesRoundedIcon color="action" fontSize="small" />
          <Typography color="text.secondary" variant="body2">
            {dirty
              ? t(
                  "You have unsaved changes.",
                  "Una mabadiliko ambayo hayajahifadhiwa.",
                )
              : t(
                  "This guest profile is up to date.",
                  "Wasifu huu wa mgeni umesasishwa.",
                )}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button disabled={saving} onClick={onCancel} variant="outlined">
            {t("Cancel", "Ghairi")}
          </Button>
          <Button
            disabled={saving || !dirty}
            startIcon={
              saving ? (
                <CircularProgress color="inherit" size={16} />
              ) : (
                <SaveRoundedIcon />
              )
            }
            type="submit"
            variant="contained"
          >
            {saving
              ? t("Saving changes…", "Inahifadhi mabadiliko…")
              : t("Save changes", "Hifadhi mabadiliko")}
          </Button>
        </Stack>
      </Stack>
    </Surface>
  );
}

export function GuestEditLoading() {
  const { t } = useLanguage();

  return (
    <WorkspacePage maxWidth={1080}>
      <Stack
        aria-label={t(
          "Loading guest editor",
          "Inapakia sehemu ya kuhariri mgeni",
        )}
        spacing={{ xs: 2, sm: 2.5 }}
      >
        <Skeleton height={36} width={150} />
        <Surface>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Skeleton height={58} variant="circular" width={58} />
            <Box sx={{ flex: 1 }}>
              <Skeleton height={31} width="34%" />
              <Skeleton width="24%" />
            </Box>
          </Stack>
        </Surface>
        {[0, 1, 2].map((item) => (
          <Surface key={item}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5}>
                <Skeleton height={40} variant="rounded" width={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="32%" />
                  <Skeleton width="68%" />
                </Box>
              </Stack>
              <Divider />
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)" },
                }}
              >
                <Skeleton height={56} variant="rounded" />
                <Skeleton height={56} variant="rounded" />
              </Box>
            </Stack>
          </Surface>
        ))}
      </Stack>
    </WorkspacePage>
  );
}

export function GuestEditState({
  actionHref,
  actionLabel,
  description,
  icon,
  onRetry,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  icon?: ReactNode;
  onRetry?: () => void;
  title: string;
}) {
  const { t } = useLanguage();
  return (
    <WorkspacePage maxWidth={760}>
      <Surface>
        <EmptyState
          actionHref={actionHref}
          actionLabel={actionLabel}
          description={description}
          icon={icon ?? <PersonOutlineRoundedIcon />}
          title={title}
        />
        {onRetry ? (
          <Button fullWidth onClick={onRetry} sx={{ mt: -3 }}>
            {t("Try again", "Jaribu tena")}
          </Button>
        ) : null}
      </Surface>
    </WorkspacePage>
  );
}
