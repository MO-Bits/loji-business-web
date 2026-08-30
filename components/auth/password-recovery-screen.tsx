"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requirements = [
    { met: password.length >= 8, label: t("At least 8 characters", "Angalau herufi 8") },
    { met: /[a-z]/.test(password), label: t("One lowercase letter", "Herufi moja ndogo") },
    { met: /[A-Z]/.test(password), label: t("One uppercase letter", "Herufi moja kubwa") },
    { met: /\d/.test(password), label: t("One number", "Namba moja") },
  ];
  const strongEnough = requirements.every((requirement) => requirement.met);
  const passwordsMatch = password.length > 0 && password === confirmation;

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (cancelled) return;
      const ready = Boolean(data.user) && !authError;
      setSessionReady(ready);
      setCheckingSession(false);
      if (!ready) {
        setError(
          t(
            "This password reset link is invalid or has expired. Request a new link from the sign-in page.",
            "Kiungo hiki cha kubadili nenosiri si sahihi au muda wake umeisha. Omba kiungo kipya kwenye ukurasa wa kuingia.",
          ),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, t]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    setError(null);
    if (!sessionReady || !strongEnough || !passwordsMatch) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirmation("");
      setAttempted(false);
      setCompleted(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t(
              "Unable to update your password.",
              "Imeshindikana kusasisha nenosiri.",
            ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="main" sx={{ bgcolor: "background.default", minHeight: "100dvh" }}>
      <Container
        maxWidth="sm"
        sx={{ display: "grid", minHeight: "100dvh", p: { xs: 2, sm: 3 }, placeItems: "center" }}
      >
        <Stack spacing={2.5} sx={{ maxWidth: 520, width: "100%" }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <BrandLockup priority symbolSize={32} textSize="1rem" />
          </Box>

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Stack spacing={1.25} sx={{ p: { xs: 2.5, sm: 3.5 }, pb: 2.5 }}>
              <Box
                aria-hidden="true"
                sx={{ bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)", borderRadius: 2, color: "primary.main", display: "grid", height: 44, placeItems: "center", width: 44 }}
              >
                <LockResetRoundedIcon />
              </Box>
              <Typography component="h1" variant="h3">
                {completed
                  ? t("Password updated", "Nenosiri limesasishwa")
                  : t("Choose a new password", "Chagua nenosiri jipya")}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {completed
                  ? t(
                      "Your new password is ready. Continue to your Loji Business workspace.",
                      "Nenosiri lako jipya liko tayari. Endelea kwenye eneo lako la kazi la Loji Business.",
                    )
                  : t(
                      "Use a strong, unique password for this account.",
                      "Tumia nenosiri imara na la kipekee kwa akaunti hii.",
                    )}
              </Typography>
            </Stack>

            {checkingSession ? (
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", borderTop: 1, borderColor: "divider", p: { xs: 2.5, sm: 3.5 } }}>
                <CircularProgress size={20} />
                <Typography color="text.secondary" variant="body2">
                  {t("Checking your reset link…", "Inakagua kiungo chako…")}
                </Typography>
              </Stack>
            ) : completed ? (
              <Stack sx={{ borderTop: 1, borderColor: "divider", p: { xs: 2.5, sm: 3.5 } }}>
                <Button onClick={() => router.replace("/")} variant="contained">
                  {t("Continue to workspace", "Endelea kwenye eneo la kazi")}
                </Button>
              </Stack>
            ) : sessionReady ? (
              <Box component="form" noValidate onSubmit={(event) => void submit(event)}>
                <Stack spacing={2} sx={{ borderTop: 1, borderColor: "divider", p: { xs: 2.5, sm: 3.5 } }}>
                  {error ? <Alert severity="error">{error}</Alert> : null}
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
                              onClick={() => setShowPassword((visible) => !visible)}
                              type="button"
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
                    helperText={attempted && !passwordsMatch
                      ? t("Passwords do not match.", "Manenosiri hayafanani.")
                      : " "}
                    label={t("Confirm new password", "Thibitisha nenosiri jipya")}
                    onChange={(event) => setConfirmation(event.target.value)}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showConfirmation ? t("Hide password", "Ficha nenosiri") : t("Show password", "Onyesha nenosiri")}
                              edge="end"
                              onClick={() => setShowConfirmation((visible) => !visible)}
                              type="button"
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
                  <Box sx={{ bgcolor: "background.default", border: 1, borderColor: "divider", borderRadius: 2, display: "grid", gap: 0.75, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, p: 1.5 }}>
                    {requirements.map((requirement) => (
                      <Stack direction="row" key={requirement.label} spacing={0.75} sx={{ alignItems: "center", color: requirement.met ? "success.main" : "text.secondary" }}>
                        {requirement.met
                          ? <CheckCircleRoundedIcon sx={{ fontSize: 17 }} />
                          : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 17 }} />}
                        <Typography variant="caption">{requirement.label}</Typography>
                      </Stack>
                    ))}
                  </Box>
                  <Button disabled={saving} type="submit" variant="contained">
                    {saving
                      ? t("Updating password…", "Inasasisha nenosiri…")
                      : t("Update password", "Sasisha nenosiri")}
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Stack spacing={2} sx={{ borderTop: 1, borderColor: "divider", p: { xs: 2.5, sm: 3.5 } }}>
                {error ? <Alert severity="error">{error}</Alert> : null}
                <Button component={Link} href="/login" variant="contained">
                  {t("Return to sign in", "Rudi kuingia")}
                </Button>
              </Stack>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
