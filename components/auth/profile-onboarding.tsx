"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { Alert, LinearProgress, Stack, TextField } from "@mui/material";

import { SetupShell } from "@/components/onboarding/setup-shell";
import { useLanguage } from "@/components/providers/language-provider";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { SessionErrorScreen } from "@/components/shared/session-error-screen";
import { setupStepSlugs } from "@/features/onboarding/models/business-setup";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { AppStatus, AppStep } from "@/features/session/models/app-status";
import { normalizeWorkspaceRole } from "@/features/session/permissions";
import {
  getMyProfile,
  updateMyProfile,
} from "@/features/settings/services/settings-service";
import { createClient } from "@/lib/supabase/client";

export function ProfileOnboarding() {
  const router = useRouter();
  const sessionState = useAppSession();
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = sessionState.session;
  const profileSetupAllowed = session?.status === AppStatus.Onboarding &&
    session.step === AppStep.Profile && Boolean(session.user);

  useEffect(() => {
    if (sessionState.loading || sessionState.error || profileSetupAllowed) return;
    if (!session?.user || session.status === AppStatus.Unauthenticated) {
      router.replace("/login");
      return;
    }
    if (session.status === AppStatus.Inactive) {
      router.replace("/inactive");
      return;
    }
    if (session.status === AppStatus.Ready) {
      const role = normalizeWorkspaceRole(session.activeRole);
      router.replace(role === "owner" ? "/dashboard" : role === "manager" || role === "receptionist" ? "/front-desk" : "/settings/profile");
      return;
    }
    router.replace(
      session.step === AppStep.PropertyBasic || session.step === AppStep.PropertyAddress
        ? "/onboarding/property"
        : "/",
    );
  }, [profileSetupAllowed, router, session, sessionState.error, sessionState.loading]);

  useEffect(() => {
    if (!profileSetupAllowed) return;
    let active = true;
    const timer = window.setTimeout(() => {
      Promise.all([getMyProfile(supabase), supabase.auth.getUser()])
        .then(([profile, authResult]) => {
          if (!active) return;
          const user = authResult.data.user;
          const fallbackName = String(
            user?.user_metadata?.full_name ??
              user?.user_metadata?.name ??
              user?.email?.split("@")[0] ??
              "",
          );
          setDisplayName((profile.displayName || fallbackName).slice(0, 100));
          setPhone(profile.phone);
          setBio(profile.bio);
          setEmail(profile.email || user?.email || "");
        })
        .catch((caught) => {
          if (!active) return;
          setError(
            caught instanceof Error
              ? caught.message
              : t("Unable to load your profile.", "Imeshindikana kupakia wasifu wako."),
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [profileSetupAllowed, supabase, t]);

  const save = async () => {
    const name = displayName.trim();
    if (loading || saving) return;
    if (name.length < 2) {
      setError(
        t(
          "Enter a name with at least 2 characters.",
          "Weka jina lenye angalau herufi 2.",
        ),
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateMyProfile(supabase, { displayName: name, phone, bio });
      window.location.replace("/");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("Unable to save your profile.", "Imeshindikana kuhifadhi wasifu wako."),
      );
      setSaving(false);
    }
  };

  const signOut = async () => {
    if (saving) return;
    setSaving(true);
    await supabase.auth.signOut();
    window.location.replace("/login");
  };

  if (sessionState.error) {
    return <SessionErrorScreen error={sessionState.error} onRetry={() => void sessionState.refresh()} />;
  }
  if (sessionState.loading || !profileSetupAllowed) return <FullPageLoader />;

  return (
    <SetupShell
      description={t(
        "This name identifies you to staff in Loji Business. Your sign-in email cannot be changed here.",
        "Jina hili linakutambulisha kwa wafanyakazi ndani ya Loji Business. Barua pepe ya kuingia haiwezi kubadilishwa hapa.",
      )}
      icon={<PersonRoundedIcon />}
      loading={loading || saving}
      nextDisabled={displayName.trim().length < 2}
      onNext={() => void save()}
      onSignOut={() => void signOut()}
      step={1}
      title={t("What should your team call you?", "Timu yako ikuitaje?")}
      totalSteps={setupStepSlugs.length + 1}
    >
      <Stack
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        spacing={2.5}
      >
        {loading ? <LinearProgress /> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField
          autoComplete="name"
          autoFocus
          disabled={loading || saving}
          fullWidth
          label={t("Your name", "Jina lako")}
          onChange={(event) => {
            setDisplayName(event.target.value.slice(0, 100));
            setError(null);
          }}
          required
          slotProps={{ htmlInput: { maxLength: 100 } }}
          value={displayName}
        />
        <TextField
          disabled
          fullWidth
          label={t("Sign-in email", "Barua pepe ya kuingia")}
          value={email}
        />
      </Stack>
    </SetupShell>
  );
}
