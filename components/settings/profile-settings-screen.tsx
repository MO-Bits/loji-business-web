"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Avatar,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { Surface } from "@/components/shared/workspace-ui";
import type {
  ProfileUpdateInput,
  UserProfile,
} from "@/features/settings/models/user-profile";
import {
  getMyProfile,
  updateMyProfile,
} from "@/features/settings/services/settings-service";
import { createClient } from "@/lib/supabase/client";

import {
  SettingsError,
  SettingsFormSkeleton,
  SettingsPageHeader,
  SettingsSection,
} from "./settings-shared";

type FormErrors = Partial<Record<keyof ProfileUpdateInput, "required" | "short" | "long" | "phone">>;

const emptyForm: ProfileUpdateInput = { bio: "", displayName: "", phone: "" };

function profileForm(profile: UserProfile): ProfileUpdateInput {
  return {
    bio: profile.bio,
    displayName: profile.displayName,
    phone: profile.phone,
  };
}

function normalized(form: ProfileUpdateInput) {
  return {
    bio: form.bio.trim(),
    displayName: form.displayName.trim(),
    phone: form.phone.trim(),
  };
}

function validate(form: ProfileUpdateInput): FormErrors {
  const value = normalized(form);
  const errors: FormErrors = {};

  if (!value.displayName) errors.displayName = "required";
  else if (value.displayName.length < 2) errors.displayName = "short";
  else if (value.displayName.length > 100) errors.displayName = "long";

  if (value.phone.length > 32) errors.phone = "long";
  else if (value.phone && !/^[+()\d.\-\s]+$/.test(value.phone)) errors.phone = "phone";

  if (value.bio.length > 500) errors.bio = "long";
  return errors;
}

export function ProfileSettingsScreen() {
  const supabase = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileUpdateInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      getMyProfile(supabase)
        .then((value) => {
          if (!active) return;
          setProfile(value);
          setForm(profileForm(value));
        })
        .catch((cause) => {
          if (!active) return;
          setError(cause instanceof Error ? cause.message : t("Unable to load your profile.", "Imeshindikana kupakia wasifu wako."));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [reloadKey, supabase, t]);

  const errors = validate(form);
  const dirty = profile
    ? JSON.stringify(normalized(form)) !== JSON.stringify(normalized(profileForm(profile)))
    : false;

  const errorText = (field: keyof ProfileUpdateInput) => {
    if (!attempted || !errors[field]) return " ";
    const issue = errors[field];
    if (issue === "required") return t("Enter your display name.", "Weka jina lako.");
    if (issue === "short") return t("Use at least 2 characters.", "Tumia angalau herufi 2.");
    if (issue === "phone") return t("Enter a valid phone number.", "Weka namba sahihi ya simu.");
    if (field === "bio") return t("Keep your bio under 500 characters.", "Maelezo yawe chini ya herufi 500.");
    if (field === "phone") return t("Keep the phone number under 32 characters.", "Namba ya simu iwe chini ya herufi 32.");
    return t("Keep your name under 100 characters.", "Jina liwe chini ya herufi 100.");
  };

  const updateField = (field: keyof ProfileUpdateInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(errors).length || !dirty) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await updateMyProfile(supabase, normalized(form));
      setProfile(updated);
      setForm(profileForm(updated));
      setAttempted(false);
      feedback.success(t("Profile saved.", "Wasifu umehifadhiwa."));
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : t("Unable to save your profile.", "Imeshindikana kuhifadhi wasifu wako.");
      setError(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SettingsFormSkeleton />;

  if (!profile) {
    return (
      <Stack spacing={2.5}>
        <SettingsPageHeader
          backHref="/settings"
          description={t(
            "Update the identity and contact details your team sees.",
            "Sasisha utambulisho na mawasiliano yanayoonekana kwa timu yako.",
          )}
          icon={<AccountCircleOutlinedIcon />}
          title={t("Profile", "Wasifu")}
        />
        <SettingsError
          message={error ?? t("Your profile could not be found.", "Wasifu wako haujapatikana.")}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      </Stack>
    );
  }

  const displayName = profile.displayName || profile.email || t("Loji user", "Mtumiaji wa Loji");

  return (
    <Stack spacing={{ xs: 2.5, sm: 3 }}>
      <SettingsPageHeader
        action={<BackToSettingsButton />}
        description={t(
          "Update the identity and contact details your team sees.",
          "Sasisha utambulisho na mawasiliano yanayoonekana kwa timu yako.",
        )}
        icon={<AccountCircleOutlinedIcon />}
        title={t("Profile", "Wasifu")}
      />

      {error ? <SettingsError message={error} /> : null}

      <Surface>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
          <Avatar
            src={profile.imageUrl || undefined}
            sx={{
              bgcolor: "primary.main",
              fontSize: "1.35rem",
              fontWeight: 700,
              height: 64,
              width: 64,
            }}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="p" variant="h5">
              {displayName}
            </Typography>
            <Typography color="text.secondary" noWrap variant="body2">
              {profile.email || t("No email address", "Hakuna anwani ya barua pepe")}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "success.main" }}>
            <CheckRoundedIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontWeight: 500 }} variant="caption">
              {t("Authenticated account", "Akaunti iliyothibitishwa")}
            </Typography>
          </Stack>
        </Stack>
      </Surface>

      <Box component="form" noValidate onSubmit={(event) => void submit(event)}>
        <SettingsSection
          description={t(
            "These details are shared across every property you can access.",
            "Taarifa hizi zinatumika kwenye kila biashara unayoweza kufikia.",
          )}
          title={t("Personal details", "Taarifa binafsi")}
        >
          <Stack spacing={2} sx={{ p: { xs: 2, sm: 2.5 } }}>
            <TextField
              autoComplete="name"
              error={attempted && Boolean(errors.displayName)}
              fullWidth
              helperText={errorText("displayName")}
              label={t("Display name", "Jina linaloonekana")}
              onChange={(event) => updateField("displayName", event.target.value)}
              required
              slotProps={{ htmlInput: { maxLength: 100 } }}
              value={form.displayName}
            />
            <TextField
              autoComplete="email"
              fullWidth
              helperText={t(
                "Your sign-in email is managed by the authentication service.",
                "Barua pepe ya kuingia inadhibitiwa na huduma ya uthibitishaji.",
              )}
              label={t("Email address", "Anwani ya barua pepe")}
              slotProps={{
                input: {
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
                inputLabel: { shrink: true },
              }}
              value={profile.email}
            />
            <TextField
              autoComplete="tel"
              error={attempted && Boolean(errors.phone)}
              fullWidth
              helperText={errorText("phone")}
              label={t("Phone number", "Namba ya simu")}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+255 7xx xxx xxx"
              slotProps={{ htmlInput: { inputMode: "tel", maxLength: 32 } }}
              value={form.phone}
            />
            <TextField
              error={attempted && Boolean(errors.bio)}
              fullWidth
              helperText={
                attempted && errors.bio
                  ? errorText("bio")
                  : t(
                      `${form.bio.length}/500 · Optional`,
                      `${form.bio.length}/500 · Si lazima`,
                    )
              }
              label={t("Short bio", "Maelezo mafupi")}
              minRows={4}
              multiline
              onChange={(event) => updateField("bio", event.target.value)}
              placeholder={t(
                "Share your role or responsibilities with your team.",
                "Eleza jukumu au majukumu yako kwa timu.",
              )}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              value={form.bio}
            />
          </Stack>
          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1.25}
            sx={{
              alignItems: { sm: "center" },
              borderTop: 1,
              borderColor: "divider",
              justifyContent: "space-between",
              px: { xs: 2, sm: 2.5 },
              py: 1.75,
            }}
          >
            <Typography color="text.secondary" variant="caption">
              {dirty
                ? t("You have unsaved changes.", "Una mabadiliko ambayo hayajahifadhiwa.")
                : t("Your profile is up to date.", "Wasifu wako umesasishwa.")}
            </Typography>
            <Button
              disabled={saving || !dirty}
              fullWidth={false}
              startIcon={<SaveRoundedIcon />}
              type="submit"
              variant="contained"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {saving ? t("Saving…", "Inahifadhi…") : t("Save changes", "Hifadhi mabadiliko")}
            </Button>
          </Stack>
        </SettingsSection>
      </Box>
    </Stack>
  );
}
