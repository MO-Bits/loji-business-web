"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import { FullPageLoader } from "@/components/shared/full-page-loader";
import { AppStateScreen } from "@/components/session/app-state-screen";
import { useOnlineStatus } from "@/components/session/use-online-status";
import { useLanguage } from "@/components/providers/language-provider";
import { AppStatus, AppStep } from "@/features/session/models/app-status";
import { useAppSession } from "@/features/session/hooks/use-app-session";

function destinationFor(status: AppStatus, step: AppStep): string {
  if (status === AppStatus.Unauthenticated) {
    return "/login";
  }

  if (status === AppStatus.Inactive) {
    return "/inactive";
  }

  if (status === AppStatus.Ready) {
    return "/dashboard";
  }

  switch (step) {
    case AppStep.Login:
      return "/login";
    case AppStep.Profile:
      return "/onboarding/profile";
    case AppStep.Invitation:
      return "/";
    case AppStep.PropertyBasic:
      return "/onboarding/property";
    case AppStep.PropertyAddress:
      return "/onboarding/property";
    case AppStep.Done:
      return "/dashboard";
  }
}

export function AppGate() {
  const router = useRouter();
  const { session, error, refresh } = useAppSession();
  const isOnline = useOnlineStatus();
  const { t } = useLanguage();

  useEffect(() => {
    if (session) {
      const destination = destinationFor(session.status, session.step);
      router.prefetch(destination);
      router.replace(destination);
    }
  }, [router, session]);

  useEffect(() => {
    if (error) Sentry.captureException(error);
  }, [error]);

  if (error) {
    return (
      <AppStateScreen
        description={
          isOnline
            ? t(
                "We couldn’t confirm your session. Try again, or return to sign in if the problem continues.",
                "Hatukuweza kuthibitisha kipindi chako. Jaribu tena, au rudi kuingia ikiwa tatizo litaendelea.",
              )
            : t(
                "Reconnect to the internet so we can securely confirm your workspace access.",
                "Unganisha tena intaneti ili tuweze kuthibitisha ufikiaji wako wa mfumo kwa usalama.",
              )
        }
        eyebrow={t("Secure access", "Ufikiaji salama")}
        icon={isOnline ? <ErrorOutlineRoundedIcon /> : <WifiOffRoundedIcon />}
        primaryAction={{
          icon: <RefreshRoundedIcon />,
          label: t("Try again", "Jaribu tena"),
          onClick: () => void refresh(),
        }}
        secondaryAction={{
          href: "/login",
          icon: <LoginRoundedIcon />,
          label: t("Return to sign in", "Rudi kuingia"),
        }}
        title={
          isOnline
            ? t("We couldn’t open your workspace", "Hatukuweza kufungua mfumo wako")
            : t("You appear to be offline", "Inaonekana huna intaneti")
        }
        tone={isOnline ? "error" : "offline"}
      />
    );
  }

  return <FullPageLoader />;
}
