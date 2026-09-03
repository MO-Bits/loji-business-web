"use client";

import type { ReactNode } from "react";
import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";

export function SectionCard({
  children,
  description,
  icon,
  kicker,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
          <Box
            sx={{
              alignItems: "center",
              bgcolor: "action.hover",
              borderRadius: 1,
              color: "primary.main",
              display: "flex",
              flexShrink: 0,
              height: 34,
              justifyContent: "center",
              mt: 0.1,
              width: 34,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography color="text.secondary" component="p" sx={{ fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>
              {kicker}
            </Typography>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mt: 0.15 }}>
              {title}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: ".8125rem", lineHeight: 1.5, mt: 0.4 }}>
              {description}
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>{children}</Box>
    </Paper>
  );
}

export function ActionPanel({
  actionLabel,
  amenities,
  beds,
  capacity,
  loading,
  name,
  onCancel,
  price,
  progress,
}: {
  actionLabel: string;
  amenities?: number;
  beds?: number;
  capacity?: number;
  loading: boolean;
  name?: string;
  onCancel: () => void;
  price?: string;
  progress?: number;
}) {
  const { locale, t } = useLanguage();
  const hasSummary = typeof progress === "number";

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={2}>
        {hasSummary ? (
          <>
            <Box>
              <Typography color="text.secondary" component="p" sx={{ fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>
                {t("Setup check", "Ukaguzi wa usanidi")}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                {name?.trim() || t("New room")}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: ".8125rem", mt: 0.25 }}>
                {t(`${progress} of 3 required areas are ready.`, `Sehemu ${progress} kati ya 3 zinazohitajika ziko tayari.`)}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: "action.hover", borderRadius: 999, height: 6, overflow: "hidden" }}>
              <Box sx={{ bgcolor: "primary.main", height: "100%", transition: "width 180ms ease", width: `${(progress / 3) * 100}%` }} />
            </Box>
            <Stack spacing={1.15}>
              <SummaryLine label={t("Nightly rate")} value={price ? `TZS ${Number(price).toLocaleString(locale)}` : t("Not set")} />
              <SummaryLine label={t("Guest capacity")} value={t(`${capacity ?? 0} guests`)} />
              <SummaryLine label={t("Beds")} value={`${beds ?? 0}`} />
              <SummaryLine label={t("Amenities")} value={t(`${amenities ?? 0} selected`)} />
            </Stack>
            <Divider />
          </>
        ) : null}
        <Stack
          direction={{ xs: "column-reverse", sm: "row", lg: "column-reverse" }}
          spacing={1}
          sx={{
            justifyContent: { sm: "flex-end", lg: "initial" },
            "& .MuiButton-root": { minWidth: { sm: 128, lg: "auto" } },
          }}
        >
          <Button disabled={loading} onClick={onCancel} variant="text">
            {t("Cancel")}
          </Button>
          <Button disabled={loading} type="submit" variant="contained">
            {loading ? t("Saving room…", "Inahifadhi chumba…") : actionLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", justifyContent: "space-between", minWidth: 0 }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontSize: ".8125rem", fontWeight: 700, minWidth: 0, overflowWrap: "anywhere", textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}
