"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DevicesRoundedIcon from "@mui/icons-material/DevicesRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";

import {
  BackToSettingsButton,
  SettingsError,
  SettingsPageHeader,
  SettingsSection,
} from "./settings-shared";

function providerLabel(value: unknown) {
  if (typeof value !== "string" || !value) return "Email";
  if (value === "google") return "Google";
  if (value === "email") return "Email and password";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SecuritySettingsScreen() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
  const { session } = useAppSession();
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [endingOtherSessions, setEndingOtherSessions] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const requirements = [
    { met: password.length >= 8, text: t("At least 8 characters", "Angalau herufi 8") },
    { met: /[a-z]/.test(password), text: t("One lowercase letter", "Herufi moja ndogo") },
    { met: /[A-Z]/.test(password), text: t("One uppercase letter", "Herufi moja kubwa") },
    { met: /\d/.test(password), text: t("One number", "Namba moja") },
  ];
  const strongEnough = requirements.every((requirement) => requirement.met);
  const passwordsMatch = password.length > 0 && password === confirmation;

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    setPasswordError(null);
    if (!strongEnough || !passwordsMatch) return;

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmation("");
      setAttempted(false);
      feedback.success(t("Password updated.", "Nenosiri limesasishwa."));
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : t("Unable to update your password.", "Imeshindikana kusasisha nenosiri.");
      setPasswordError(message);
      feedback.error(message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const signOutOtherSessions = async () => {
    setEndingOtherSessions(true);
    setSessionError(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      feedback.success(
        t(
          "Other sessions signed out. This device stays signed in.",
          "Vipindi vingine vimeondolewa. Kifaa hiki kimeendelea kuwa ndani.",
        ),
      );
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : t("Unable to sign out other sessions.", "Imeshindikana kuondoa vipindi vingine.");
      setSessionError(message);
      feedback.error(message);
    } finally {
      setEndingOtherSessions(false);
    }
  };

  const signOutThisDevice = async () => {
    setSigningOut(true);
    setSessionError(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : t("Unable to sign out.", "Imeshindikana kutoka.");
      setSessionError(message);
      feedback.error(message);
      setSigningOut(false);
    }
  };

  const email = session?.user?.email ?? t("Signed-in account", "Akaunti iliyoingia");
  const provider = providerLabel(session?.user?.app_metadata?.provider);

  return (
    <Stack spacing={{ xs: 2.5, sm: 3 }}>
      <SettingsPageHeader
        action={<BackToSettingsButton />}
        description={t(
          "Protect access to your account and manage where you are signed in.",
          "Linda akaunti yako na dhibiti vifaa ambavyo umeingia.",
        )}
        icon={<SecurityOutlinedIcon />}
        title={t("Security", "Usalama")}
      />

      <SettingsSection
        description={t(
          "Set a strong password for your authenticated Loji Business account.",
          "Weka nenosiri imara kwa akaunti yako ya Loji Business.",
        )}
        title={t("Password", "Nenosiri")}
      >
        <Box component="form" noValidate onSubmit={(event) => void updatePassword(event)}>
          <Stack spacing={2} sx={{ p: { xs: 2, sm: 2.5 } }}>
            {passwordError ? <SettingsError message={passwordError} /> : null}
            <Alert severity="info">
              {t(
                "If you normally use Google sign-in, adding a password also lets you use email and password for this account.",
                "Ikiwa kwa kawaida unaingia kwa Google, kuweka nenosiri kutakuwezesha pia kuingia kwa barua pepe na nenosiri.",
              )}
            </Alert>
            <TextField
              autoComplete="new-password"
              error={attempted && !strongEnough}
              fullWidth
              label={t("New password", "Nenosiri jipya")}
              onChange={(event) => setPassword(event.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? t("Hide password", "Ficha nenosiri") : t("Show password", "Onyesha nenosiri")}
                        edge="end"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
                htmlInput: { maxLength: 128 },
              }}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <TextField
              autoComplete="new-password"
              error={attempted && !passwordsMatch}
              fullWidth
              helperText={
                attempted && !passwordsMatch
                  ? t("Passwords do not match.", "Manenosiri hayafanani.")
                  : " "
              }
              label={t("Confirm new password", "Thibitisha nenosiri jipya")}
              onChange={(event) => setConfirmation(event.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showConfirmation ? t("Hide password", "Ficha nenosiri") : t("Show password", "Onyesha nenosiri")}
                        edge="end"
                        onClick={() => setShowConfirmation((value) => !value)}
                      >
                        {showConfirmation ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
                htmlInput: { maxLength: 128 },
              }}
              type={showConfirmation ? "text" : "password"}
              value={confirmation}
            />
            <Box
              aria-label={t("Password requirements", "Masharti ya nenosiri")}
              sx={{
                bgcolor: "background.default",
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                display: "grid",
                gap: 0.75,
                gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
                p: 1.5,
              }}
            >
              {requirements.map((requirement) => (
                <Stack
                  direction="row"
                  key={requirement.text}
                  spacing={0.75}
                  sx={{ alignItems: "center", color: requirement.met ? "success.main" : "text.secondary" }}
                >
                  {requirement.met ? (
                    <CheckCircleRoundedIcon sx={{ fontSize: 17 }} />
                  ) : (
                    <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 17 }} />
                  )}
                  <Typography variant="caption">{requirement.text}</Typography>
                </Stack>
              ))}
            </Box>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
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
              {email}
            </Typography>
            <Button
              disabled={updatingPassword || !password || !confirmation}
              type="submit"
              variant="contained"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {updatingPassword ? t("Updating…", "Inasasisha…") : t("Update password", "Sasisha nenosiri")}
            </Button>
          </Stack>
        </Box>
      </SettingsSection>

      <SettingsSection
        description={t(
          "Review this account and end sessions you no longer recognize.",
          "Kagua akaunti hii na uondoe vipindi usivyovitambua.",
        )}
        title={t("Sign-in sessions", "Vipindi vya kuingia")}
      >
        <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
          {sessionError ? (
            <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 0 }}>
              <SettingsError message={sessionError} />
            </Box>
          ) : null}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: { sm: "center" }, px: { xs: 2, sm: 2.5 }, py: 2 }}
          >
            <Box
              aria-hidden="true"
              sx={{
                bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
                borderRadius: 2,
                color: "primary.main",
                display: "grid",
                flexShrink: 0,
                height: 40,
                placeItems: "center",
                width: 40,
              }}
            >
              <EmailOutlinedIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }} variant="body2">
                {email}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                {t("Sign-in method", "Njia ya kuingia")}: {provider}
              </Typography>
            </Box>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: { sm: "center" }, px: { xs: 2, sm: 2.5 }, py: 2 }}
          >
            <Box
              aria-hidden="true"
              sx={{
                bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
                borderRadius: 2,
                color: "primary.main",
                display: "grid",
                flexShrink: 0,
                height: 40,
                placeItems: "center",
                width: 40,
              }}
            >
              <DevicesRoundedIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }} variant="body2">
                {t("Other devices and browsers", "Vifaa na vivinjari vingine")}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                {t(
                  "End every other active session while keeping this device signed in.",
                  "Ondoa vipindi vingine vyote huku kifaa hiki kikiendelea kuwa ndani.",
                )}
              </Typography>
            </Box>
            <Button
              disabled={endingOtherSessions}
              onClick={() => void signOutOtherSessions()}
              variant="outlined"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {endingOtherSessions
                ? t("Signing out…", "Inaondoa…")
                : t("Sign out other sessions", "Ondoa vipindi vingine")}
            </Button>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: { sm: "center" }, px: { xs: 2, sm: 2.5 }, py: 2 }}
          >
            <Box
              aria-hidden="true"
              sx={{
                bgcolor: "color-mix(in srgb, var(--mui-palette-error-main) 10%, transparent)",
                borderRadius: 2,
                color: "error.main",
                display: "grid",
                flexShrink: 0,
                height: 40,
                placeItems: "center",
                width: 40,
              }}
            >
              <LogoutRoundedIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }} variant="body2">
                {t("This device", "Kifaa hiki")}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                {t(
                  "End only the session in this browser and return to sign in.",
                  "Ondoa kipindi cha kivinjari hiki na urudi kwenye ukurasa wa kuingia.",
                )}
              </Typography>
            </Box>
            <Button
              color="error"
              disabled={signingOut}
              onClick={() => void signOutThisDevice()}
              startIcon={<LogoutRoundedIcon />}
              variant="outlined"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {signingOut ? t("Signing out…", "Inaondoka…") : t("Sign out", "Ondoka")}
            </Button>
          </Stack>
        </Stack>
      </SettingsSection>
    </Stack>
  );
}
