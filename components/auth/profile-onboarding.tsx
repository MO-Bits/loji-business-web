"use client";

import { useEffect, useMemo, useState } from "react";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import {
  Alert,
  Button,
  CircularProgress,
  LinearProgress,
  Stack,
  TextField,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { getMyProfile, updateMyProfile } from "@/features/settings/services/settings-service";
import { createClient } from "@/lib/supabase/client";

import { OnboardingFrame } from "./onboarding-frame";

export function ProfileOnboarding() {
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          setDisplayName(profile.displayName || fallbackName);
          setPhone(profile.phone);
          setBio(profile.bio);
          setEmail(profile.email || user?.email || "");
        })
        .catch((caught) => {
          if (active) setError(caught instanceof Error ? caught.message : "Unable to load your profile.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [supabase]);

  const save = async () => {
    const name = displayName.trim();
    if (name.length < 2) {
      setError(t("Enter a name with at least 2 characters.", "Weka jina lenye angalau herufi 2."));
      return;
    }
    if (phone.trim().length > 32 || bio.trim().length > 500) {
      setError(t("Check the phone and bio lengths, then try again.", "Kagua urefu wa simu na maelezo, kisha jaribu tena."));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateMyProfile(supabase, { displayName: name, phone, bio });
      window.location.replace("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save your profile.");
      setSaving(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/login");
  };

  return (
    <OnboardingFrame
      action={
        <Button
          color="inherit"
          disabled={saving}
          onClick={() => void signOut()}
          startIcon={<LogoutRoundedIcon />}
          type="button"
        >
          {t("Sign out", "Toka")}
        </Button>
      }
      description={t(
        "Your profile appears on staff access, payments and the property activity record.",
        "Wasifu wako unaonekana kwenye ruhusa za timu, malipo na historia ya shughuli.",
      )}
      eyebrow={t("Account setup", "Usanidi wa akaunti")}
      icon={<PersonRoundedIcon />}
      panelDescription={t("Step 1 of 3", "Hatua ya 1 kati ya 3")}
      panelTitle={t("Create your profile", "Unda wasifu wako")}
      step={1}
      steps={[
        t("Personal profile", "Wasifu binafsi"),
        t("Property details", "Taarifa za biashara"),
        t("Location & finish", "Eneo na kumaliza"),
      ]}
      title={t(
        "First, tell your team who you are.",
        "Kwanza, iambie timu yako wewe ni nani.",
      )}
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
                  disabled={loading || saving}
                  fullWidth
                  label={t("Display name", "Jina linaloonekana")}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  value={displayName}
                />
                <TextField disabled fullWidth label={t("Email", "Barua pepe")} value={email} />
                <TextField
                  autoComplete="tel"
                  disabled={loading || saving}
                  fullWidth
                  helperText={t("Optional · used by your property team", "Si lazima · hutumiwa na timu yako")}
                  label={t("Phone number", "Namba ya simu")}
                  onChange={(event) => setPhone(event.target.value)}
                  slotProps={{ htmlInput: { inputMode: "tel", maxLength: 32 } }}
                  value={phone}
                />
                <TextField
                  disabled={loading || saving}
                  fullWidth
                  helperText={`${bio.length}/500`}
                  label={t("Short bio", "Maelezo mafupi")}
                  minRows={3}
                  multiline
                  onChange={(event) => setBio(event.target.value.slice(0, 500))}
                  placeholder={t("Example: Property owner and operations lead", "Mfano: Mmiliki na kiongozi wa uendeshaji")}
                  value={bio}
                />
                <Button
                  disabled={loading || saving || displayName.trim().length < 2}
                  fullWidth
                  size="large"
                  type="submit"
                  variant="contained"
                >
                  {saving ? <CircularProgress color="inherit" size={22} /> : t("Save and continue", "Hifadhi na endelea")}
                </Button>
      </Stack>
    </OnboardingFrame>
  );
}
