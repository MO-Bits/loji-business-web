"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";

import { AppStateScreen } from "@/components/session/app-state-screen";
import { useOnlineStatus } from "@/components/session/use-online-status";
import { useLanguage } from "@/components/providers/language-provider";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isOnline = useOnlineStatus();
  const { t } = useLanguage();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <AppStateScreen
      description={
        isOnline
          ? t(
              "This section stopped before it could finish loading. Your saved changes are safe.",
              "Sehemu hii ilisimama kabla haijamaliza kupakia. Mabadiliko uliyohifadhi yako salama.",
            )
          : t(
              "Reconnect to the internet, then retry this section.",
              "Unganisha tena intaneti, kisha ujaribu sehemu hii tena.",
            )
      }
      eyebrow={t("Workspace status", "Hali ya mfumo")}
      icon={isOnline ? <ErrorOutlineRoundedIcon /> : <WifiOffRoundedIcon />}
      primaryAction={{
        icon: <RefreshRoundedIcon />,
        label: t("Try again", "Jaribu tena"),
        onClick: reset,
      }}
      reference={error.digest}
      secondaryAction={{
        href: "/dashboard",
        icon: <DashboardRoundedIcon />,
        label: t("Open dashboard", "Fungua dashibodi"),
      }}
      title={
        isOnline
          ? t("This section couldn’t load", "Sehemu hii haikuweza kupakia")
          : t("You appear to be offline", "Inaonekana huna intaneti")
      }
      tone={isOnline ? "error" : "offline"}
      variant="workspace"
    />
  );
}
