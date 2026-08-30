"use client";

import NextLink from "next/link";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";
import { useAuthController } from "@/features/auth/hooks/use-auth-controller";

import { GoogleMark } from "./google-mark";

export function LoginScreen() {
  const auth = useAuthController();
  const { t } = useLanguage();

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
        <Box
          id="login"
          sx={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            py: { xs: 4, sm: 6 },
          }}
        >
          <Stack
            component="section"
            spacing={2.75}
            sx={{
              maxWidth: 400,
              textAlign: "center",
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
                  mx: "auto",
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

              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: "center", justifyContent: "center" }}
              >
                <LockOutlinedIcon sx={{ color: "text.disabled", fontSize: 15 }} />
                <Typography color="text.secondary" variant="caption">
                  {t(
                    "Secure sign-in. No password to remember.",
                    "Kuingia salama. Hakuna nenosiri la kukumbuka.",
                  )}
                </Typography>
              </Stack>
            </Stack>

            <Typography
              color="text.secondary"
              variant="caption"
              sx={{ lineHeight: 1.7, px: { xs: 0.5, sm: 2 } }}
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

            <Stack direction="row" spacing={2} sx={{ justifyContent: "center" }}>
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
        onClose={auth.clearError}
        open={Boolean(auth.error)}
      >
        <Alert onClose={auth.clearError} severity="error" variant="filled">
          {auth.error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
