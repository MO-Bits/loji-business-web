"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import NextLink from "next/link";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";
import { useAuthController } from "@/features/auth/hooks/use-auth-controller";
import { BrandLockup } from "@/components/shared/brand-lockup";

import { GoogleMark } from "./google-mark";

export function LoginScreen({ initialError = null }: { initialError?: string | null }) {
  const auth = useAuthController();
  const { t } = useLanguage();
  const [callbackError, setCallbackError] = useState(initialError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const visibleError = auth.error || callbackError;
  const normalizedEmail = email.trim().toLowerCase();
  const emailIsValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail);

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCallbackError(null);
    setResetSent(false);
    if (!emailIsValid || !password) {
      setCallbackError(
        t(
          "Enter a valid email address and password.",
          "Weka barua pepe sahihi na nenosiri.",
        ),
      );
      return;
    }
    const error = await auth.signInWithPassword(normalizedEmail, password);
    if (!error) window.location.replace("/");
  };

  const sendPasswordReset = async () => {
    setCallbackError(null);
    setResetSent(false);
    if (!emailIsValid) {
      setCallbackError(
        t(
          "Enter your account email before requesting a reset link.",
          "Weka barua pepe ya akaunti kabla ya kuomba kiungo cha kubadili nenosiri.",
        ),
      );
      return;
    }
    const error = await auth.requestPasswordReset(normalizedEmail);
    if (!error) setResetSent(true);
  };

  return (
    <Box
      component="main"
      sx={{
        bgcolor: "background.default",
        minHeight: "calc(100dvh - 64px)",
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          display: "grid",
          gridTemplateRows: "1fr auto",
          minHeight: "calc(100dvh - 64px)",
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
        }}
      >
        <Box id="login" sx={{ display: "grid", placeItems: "center", py: { xs: 3, sm: 5 } }}>
          <Box
            sx={{
              display: "grid",
              gap: { xs: 0, md: 5 },
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, .95fr) minmax(360px, .75fr)" },
              maxWidth: 1060,
              overflow: "hidden",
              width: "100%",
            }}
          >
            <Stack
              spacing={3}
              sx={{
                background:
                  "radial-gradient(circle at 88% 12%, rgba(100,210,255,.42), transparent 32%), linear-gradient(145deg, #07162C 0%, #0A3B73 58%, #007AFF 150%)",
                borderRadius: 3,
                color: "#F8FAFC",
                display: { xs: "none", md: "flex" },
                justifyContent: "space-between",
                minHeight: 560,
                overflow: "hidden",
                p: { md: 5, lg: 6 },
                position: "relative",
              }}
            >
              <BrandLockup color="#F8FAFC" priority symbolSize={34} textSize="1.05rem" />
              <Stack spacing={3.5} sx={{ position: "relative", zIndex: 1 }}>
                <Box>
                <Typography sx={{ fontSize: { md: "2.35rem", lg: "2.8rem" }, fontWeight: 700, letterSpacing: "-.05em", lineHeight: 1.04, maxWidth: 430 }}>
                  {t("Run every stay with confidence.", "Simamia kila ukaaji kwa uhakika.")}
                </Typography>
                <Typography sx={{ color: "rgba(235,245,255,.76)", fontSize: ".9375rem", lineHeight: 1.65, mt: 2, maxWidth: 410 }}>
                  {t("Rooms, reservations, guests and staff—one focused workspace for your hospitality business.", "Vyumba, uhifadhi, wageni na wafanyakazi—eneo moja la kazi kwa biashara yako ya ukarimu.")}
                </Typography>
                </Box>
                <Box
                  aria-hidden
                  sx={{
                    backdropFilter: "blur(20px)",
                    bgcolor: "rgba(255,255,255,.10)",
                    border: "1px solid rgba(255,255,255,.18)",
                    borderRadius: 2.5,
                    boxShadow: "0 24px 56px rgba(0,0,0,.18)",
                    p: 2,
                  }}
                >
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ color: "rgba(255,255,255,.68)", fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
                        {t("Today at a glance", "Muhtasari wa leo")}
                      </Typography>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 700, mt: 0.35 }}>
                        {t("Property operations", "Uendeshaji wa biashara")}
                      </Typography>
                    </Box>
                    <Box sx={{ bgcolor: "rgba(255,255,255,.14)", borderRadius: 2, display: "grid", height: 34, placeItems: "center", width: 34 }}>
                      <EventAvailableRoundedIcon sx={{ fontSize: 18 }} />
                    </Box>
                  </Stack>
                  <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", mt: 2 }}>
                    <LoginCapability
                      detail={t("Arrivals & stays", "Wanaowasili na ukaaji")}
                      icon={<EventAvailableRoundedIcon />}
                      label={t("Bookings", "Uhifadhi")}
                    />
                    <LoginCapability
                      detail={t("Ready & occupied", "Tayari na vilivyotumika")}
                      icon={<BedRoundedIcon />}
                      label={t("Rooms", "Vyumba")}
                    />
                    <LoginCapability
                      detail={t("Balances & receipts", "Salio na risiti")}
                      icon={<PaymentsRoundedIcon />}
                      label={t("Finance", "Fedha")}
                    />
                  </Box>
                </Box>
              </Stack>
              <Typography sx={{ color: "rgba(235,245,255,.58)", fontSize: ".75rem" }}>
                {t("Built for lodges, hotels and guesthouses.", "Imeundwa kwa lodge, hoteli na guesthouse.")}
              </Typography>
            </Stack>
          <Stack
            component="section"
            spacing={2.75}
            sx={{
              alignSelf: "center",
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: { xs: 2, md: 2 },
              boxShadow: { md: "0 22px 60px rgba(16,24,40,.09)" },
              maxWidth: { xs: 440, md: "none" },
              p: { xs: 2.5, sm: 3.5, md: 4 },
              textAlign: "left",
              width: "100%",
            }}
          >
            <Stack spacing={1.25}>
              <Typography
                component="h1"
                sx={{
                  color: "text.primary",
                  fontSize: { xs: "1.75rem", sm: "2rem" },
                  fontWeight: 700,
                  letterSpacing: "-.035em",
                  lineHeight: 1.12,
                }}
              >
                {t("Welcome back", "Karibu tena")}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  fontSize: ".875rem",
                  lineHeight: 1.6,
                  maxWidth: 340,
                }}
              >
                {t(
                  "Sign in to continue managing your property, bookings and team.",
                  "Ingia kuendelea kusimamia biashara yako, uhifadhi na timu.",
                )}
              </Typography>
            </Stack>

            <Stack spacing={1.25}>
              <Button
                disabled={auth.loading}
                fullWidth
                aria-busy={auth.activeAction === "google"}
                onClick={() => void auth.signInWithGoogle()}
                size="large"
                startIcon={
                  auth.activeAction === "google" ? (
                    <CircularProgress color="inherit" size={19} />
                  ) : (
                    <GoogleMark />
                  )
                }
                sx={{
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  borderRadius: 1,
                  color: "text.primary",
                  fontSize: ".875rem",
                  fontWeight: 500,
                  minHeight: 48,
                  textTransform: "none",
                  transition:
                    "border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                  "&:hover": {
                    bgcolor: "action.hover",
                    borderColor: "color-mix(in srgb, var(--mui-palette-primary-main) 34%, var(--mui-palette-divider))",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, .07)",
                  },
                }}
                variant="outlined"
              >
                {auth.activeAction === "google"
                  ? t("Signing in…", "Inaingia…")
                  : t("Continue with Google", "Endelea na Google")}
              </Button>

              <Divider>
                <Typography color="text.secondary" variant="caption">
                  {t("or use your email", "au tumia barua pepe")}
                </Typography>
              </Divider>

              <Box component="form" noValidate onSubmit={(event) => void submitPassword(event)}>
                <Stack spacing={1.25}>
                  <TextField
                    autoComplete="email"
                    fullWidth
                    label={t("Email address", "Barua pepe")}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    size="small"
                    type="email"
                    value={email}
                  />
                  <TextField
                    autoComplete="current-password"
                    fullWidth
                    label={t("Password", "Nenosiri")}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    size="small"
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showPassword
                                ? t("Hide password", "Ficha nenosiri")
                                : t("Show password", "Onyesha nenosiri")}
                              edge="end"
                              onClick={() => setShowPassword((visible) => !visible)}
                              size="small"
                              type="button"
                            >
                              {showPassword
                                ? <VisibilityOffOutlinedIcon fontSize="small" />
                                : <VisibilityOutlinedIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                      htmlInput: { maxLength: 128 },
                    }}
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <Button
                    aria-busy={auth.activeAction === "password"}
                    disabled={auth.loading}
                    fullWidth
                    startIcon={auth.activeAction === "password"
                      ? <CircularProgress color="inherit" size={18} />
                      : <LockOutlinedIcon />}
                    type="submit"
                    variant="contained"
                  >
                    {auth.activeAction === "password"
                      ? t("Signing in…", "Inaingia…")
                      : t("Sign in with password", "Ingia kwa nenosiri")}
                  </Button>
                  <Button
                    disabled={auth.loading}
                    onClick={() => void sendPasswordReset()}
                    size="small"
                    sx={{ alignSelf: "flex-start", px: 0.5 }}
                    type="button"
                    variant="text"
                  >
                    {auth.activeAction === "passwordReset"
                      ? t("Sending reset link…", "Inatuma kiungo…")
                      : t("Forgot password?", "Umesahau nenosiri?")}
                  </Button>
                </Stack>
              </Box>

              {resetSent ? (
                <Alert severity="success">
                  {t(
                    "If an account exists for that email, a password reset link is on its way.",
                    "Ikiwa akaunti ipo kwa barua pepe hiyo, kiungo cha kubadili nenosiri kimetumwa.",
                  )}
                </Alert>
              ) : null}

              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <LockOutlinedIcon sx={{ color: "text.disabled", fontSize: 15 }} />
                <Typography color="text.secondary" variant="caption">
                  {t(
                    "Secure sign-in with Google or your account password.",
                    "Ingia salama kwa Google au nenosiri la akaunti.",
                  )}
                </Typography>
              </Stack>
            </Stack>

            <Typography
              color="text.secondary"
              variant="caption"
              sx={{ lineHeight: 1.7 }}
            >
              {t("By continuing, you agree to the", "Kwa kuendelea, unakubali")}{" "}
              <Link
                component={NextLink}
                href="/terms"
                underline="hover"
                sx={{ color: "text.primary", fontWeight: 500 }}
              >
                {t("Terms", "Masharti")}
              </Link>{" "}
              {t("and", "na")}{" "}
              <Link
                component={NextLink}
                href="/privacy"
                underline="hover"
                sx={{ color: "text.primary", fontWeight: 500 }}
              >
                {t("Privacy Policy", "Sera ya faragha")}
              </Link>
              .
            </Typography>

            <Stack direction="row" spacing={2}>
              <Link
                component={NextLink}
                href="/learn-more"
                underline="hover"
                sx={{
                  color: "text.secondary",
                  fontSize: ".8125rem",
                  fontWeight: 500,
                }}
              >
                {t("About", "Kuhusu")}
              </Link>
              <Link
                component={NextLink}
                href="/faq"
                underline="hover"
                sx={{
                  color: "text.secondary",
                  fontSize: ".8125rem",
                  fontWeight: 500,
                }}
              >
                {t("FAQs", "Maswali")}
              </Link>
            </Stack>
          </Stack>
          </Box>
        </Box>

        <Typography
          color="text.secondary"
          component="footer"
          sx={{
            fontSize: ".75rem",
            pb: { xs: 0.5, sm: 0 },
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} Loji Business
        </Typography>
      </Container>

      <Snackbar
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
        autoHideDuration={6000}
        onClose={() => {
          auth.clearError();
          setCallbackError(null);
        }}
        open={Boolean(visibleError)}
      >
        <Alert
          onClose={() => {
            auth.clearError();
            setCallbackError(null);
          }}
          severity="error"
          variant="filled"
        >
          {visibleError}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function LoginCapability({
  detail,
  icon,
  label,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Box sx={{ bgcolor: "rgba(3,17,35,.24)", borderRadius: 2, minWidth: 0, p: 1.25 }}>
      <Box sx={{ color: "rgba(255,255,255,.7)", display: "flex", "& .MuiSvgIcon-root": { fontSize: 16 } }}>{icon}</Box>
      <Typography noWrap sx={{ fontSize: ".75rem", fontWeight: 700, mt: 1 }}>
        {label}
      </Typography>
      <Typography sx={{ color: "rgba(255,255,255,.62)", fontSize: ".625rem", lineHeight: 1.35, mt: 0.25 }}>
        {detail}
      </Typography>
    </Box>
  );
}
