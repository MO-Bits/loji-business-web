"use client";

import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useRef, useState } from "react";

import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { useAuthController } from "@/features/auth/hooks/use-auth-controller";
import { createClient } from "@/lib/supabase/client";

import { OnboardingFrame } from "./onboarding-frame";

type Invitation = {
  formatted_address?: string;
  property_name?: string;
  role?: string;
};

type RpcResponse = {
  invitation?: Invitation;
  message?: string;
  status?: string;
};

function resultObject(value: unknown): RpcResponse {
  return value && typeof value === "object" ? (value as RpcResponse) : {};
}

export function InvitationOnboarding() {
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const auth = useAuthController();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [reviewedToken, setReviewedToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestId = useRef(0);
  const normalizedToken = token.trim().toUpperCase();

  async function loadInvitation() {
    if (normalizedToken.length !== 8) {
      setMessage(
        t(
          "Enter the complete 8-character invitation code.",
          "Weka msimbo kamili wa mwaliko wenye herufi 8.",
        ),
      );
      return;
    }

    const candidate = normalizedToken;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setMessage(null);
    setInvitation(null);
    setReviewedToken(null);
    try {
      const { data, error } = await supabase.rpc(
        "get_invitation_details" as never,
        { p_token: candidate } as never,
      );
      if (currentRequest !== requestId.current) return;
      if (error) throw error;
      const result = resultObject(data);
      if (result.status !== "success") {
        throw new Error(result.message || "Invalid invitation code.");
      }
      setInvitation(result.invitation ?? {});
      setReviewedToken(candidate);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      setMessage(
        error instanceof Error
          ? error.message
          : t(
              "Unable to check this invitation.",
              "Imeshindikana kukagua mwaliko huu.",
            ),
      );
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }

  async function respond(
    action: "accept_property_invitation" | "reject_property_invitation",
  ) {
    if (!reviewedToken) {
      setInvitation(null);
      setMessage(t("Review the invitation code again.", "Kagua tena msimbo wa mwaliko."));
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc(
        action as never,
        { p_token: reviewedToken } as never,
      );
      if (error) throw error;
      const result = resultObject(data);
      const accepted = action === "accept_property_invitation";
      const expectedStatus = accepted
        ? result.status === "success"
        : result.status === "rejected" || result.status === "success";

      if (!expectedStatus) {
        throw new Error(result.message || "Unable to update the invitation.");
      }

      setInvitation(null);
      setReviewedToken(null);
      if (accepted) {
        feedback.success(
          t(
            "Invitation accepted. Welcome to the team!",
            "Mwaliko umekubaliwa. Karibu kwenye timu!",
          ),
        );
        window.setTimeout(() => window.location.replace("/"), 500);
      } else {
        setToken("");
        setMessage(
          result.message || t("Invitation declined.", "Mwaliko umekataliwa."),
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t(
              "Unable to update the invitation.",
              "Imeshindikana kusasisha mwaliko.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    const error = await auth.signOut();
    if (error) {
      setMessage(error);
      return;
    }
    window.location.replace("/login");
  }

  return (
    <>
      <OnboardingFrame
        action={
          <Button
            color="inherit"
            disabled={auth.loading || loading}
            onClick={() => void signOut()}
            startIcon={<LogoutRoundedIcon />}
          >
            {t("Sign out", "Toka")}
          </Button>
        }
        description={t(
          "Enter the private code sent by the property owner or manager. We will show the workspace and role before you join.",
          "Weka msimbo wa siri uliotumwa na mmiliki au meneja. Tutaonyesha biashara na jukumu kabla hujajiunga.",
        )}
        eyebrow={t("Team invitation", "Mwaliko wa timu")}
        icon={<ConfirmationNumberRoundedIcon />}
        panelDescription={t(
          "Codes contain 8 letters or numbers",
          "Misimbo ina herufi au namba 8",
        )}
        panelTitle={t(
          "Enter your invitation code",
          "Weka msimbo wa mwaliko",
        )}
        step={1}
        steps={[
          t("Invitation code", "Msimbo wa mwaliko"),
          t("Confirm access", "Thibitisha ruhusa"),
          t("Open workspace", "Fungua sehemu ya kazi"),
        ]}
        title={t("Join your property team.", "Jiunge na timu ya biashara yako.")}
      >
        <Alert icon={<InfoRoundedIcon />} severity="info">
          <Typography sx={{ fontWeight: 700 }} variant="body2">
            {t("Need a code?", "Unahitaji msimbo?")}
          </Typography>
          <Typography variant="body2">
            {t(
              "Ask the staff member who invited you to share the current code.",
              "Mwombe aliyekualika akutumie msimbo unaotumika sasa.",
            )}
          </Typography>
        </Alert>

        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void loadInvitation();
          }}
        >
          <Stack spacing={2}>
            <TextField
              autoComplete="one-time-code"
              autoFocus
              fullWidth
              label={t("Invitation code", "Msimbo wa mwaliko")}
              disabled={loading}
              onChange={(event) => {
                requestId.current += 1;
                setReviewedToken(null);
                setInvitation(null);
                setToken(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 8),
                );
              }}
              placeholder="AB12CD34"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <ConfirmationNumberRoundedIcon color="primary" />
                    </InputAdornment>
                  ),
                },
                htmlInput: {
                  maxLength: 8,
                  spellCheck: false,
                  style: {
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 700,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                  },
                },
              }}
              value={token}
            />
            <Button
              disabled={loading || normalizedToken.length !== 8}
              fullWidth
              size="large"
              type="submit"
              variant="contained"
            >
              {loading ? (
                <CircularProgress color="inherit" size={22} />
              ) : (
                t("Review invitation", "Kagua mwaliko")
              )}
            </Button>
          </Stack>
        </Box>
      </OnboardingFrame>

      <ResponsiveModal
        maxWidth="xs"
        onClose={loading ? undefined : () => {
          setInvitation(null);
          setReviewedToken(null);
        }}
        open={Boolean(invitation)}
      >
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void respond("accept_property_invitation");
          }}
        >
          <DialogTitle>{t("Property invitation", "Mwaliko wa biashara")}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5}>
            <Paper
              elevation={0}
              sx={{
                background:
                  "linear-gradient(145deg, var(--mui-palette-primary-dark), var(--mui-palette-primary-main))",
                color: "primary.contrastText",
                p: 3,
              }}
            >
              <BusinessRoundedIcon sx={{ fontSize: 34 }} />
              <Typography sx={{ fontWeight: 700, mt: 1 }} variant="h4">
                {invitation?.property_name || t("Property", "Biashara")}
              </Typography>
              <Typography sx={{ mt: 0.75, opacity: 0.82 }} variant="body2">
                {invitation?.formatted_address ||
                  t("Address not added yet", "Anwani haijawekwa bado")}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <PersonRoundedIcon color="primary" />
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    {t("Your assigned role", "Jukumu lako")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>
                    {invitation?.role || t("Staff", "Mfanyakazi")}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              color="inherit"
              disabled={loading}
              onClick={() => void respond("reject_property_invitation")}
              type="button"
            >
              {t("Decline", "Kataa")}
            </Button>
            <Button disabled={loading} type="submit" variant="contained">
              {loading ? (
                <CircularProgress color="inherit" size={20} />
              ) : (
                t("Accept invitation", "Kubali mwaliko")
              )}
            </Button>
          </DialogActions>
        </Box>
      </ResponsiveModal>

      <Snackbar
        autoHideDuration={5000}
        onClose={() => setMessage(null)}
        open={Boolean(message)}
      >
        <Alert onClose={() => setMessage(null)} severity="info" variant="filled">
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
