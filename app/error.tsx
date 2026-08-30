"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";

import { AppStateScreen } from "@/components/session/app-state-screen";
import { useOnlineStatus } from "@/components/session/use-online-status";
import { useLanguage } from "@/components/providers/language-provider";

export default function ErrorPage({
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
              "We recorded the problem and kept your saved information safe. Try the request again or return home.",
              "Tumerekodi tatizo na taarifa ulizohifadhi ziko salama. Jaribu tena au rudi mwanzo.",
            )
          : t(
              "Reconnect to the internet, then try again. Any information already saved remains safe.",
              "Unganisha tena intaneti, kisha ujaribu tena. Taarifa zilizohifadhiwa ziko salama.",
            )
      }
      eyebrow={t("Workspace recovery", "Urejeshaji wa mfumo")}
      icon={isOnline ? <ErrorOutlineRoundedIcon /> : <WifiOffRoundedIcon />}
      primaryAction={{
        icon: <RefreshRoundedIcon />,
        label: t("Try again", "Jaribu tena"),
        onClick: reset,
      }}
      reference={error.digest}
      secondaryAction={{
        href: "/",
        icon: <HomeRoundedIcon />,
        label: t("Return home", "Rudi mwanzo"),
      }}
      title={
        isOnline
          ? t("We couldn’t complete that request", "Hatukuweza kukamilisha ombi hilo")
          : t("You appear to be offline", "Inaonekana huna intaneti")
      }
      tone={isOnline ? "error" : "offline"}
    />
  );
}
