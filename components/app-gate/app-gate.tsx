"use client";

import { useEffect } from "react";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { SessionErrorScreen } from "@/components/shared/session-error-screen";
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
      return "/onboarding/invitation";
    case AppStep.PropertyBasic:
      return "/onboarding/property";
    case AppStep.PropertyAddress:
      return "/onboarding/property/address";
    case AppStep.Done:
      return "/dashboard";
  }
}

export function AppGate() {
  const { session, error, refresh } = useAppSession();

  useEffect(() => {
    if (session) {
      window.location.replace(destinationFor(session.status, session.step));
    }
  }, [session]);

  if (error) {
    return <SessionErrorScreen error={error} onRetry={() => void refresh()} />;
  }

  return <FullPageLoader />;
}
