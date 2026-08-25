"use client";

import NextLink from "next/link";
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
          px: { xs: 2.25, sm: 3.5 },
          py: { xs: 2, sm: 2.5 },
        }}
      >
        <Box
          id="login"
          sx={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            py: { xs: 5, sm: 7 },
          }}
        >
          <Stack
            component="section"
            spacing={3.5}
            sx={{
              maxWidth: 420,
              textAlign: "center",
              width: "100%",
            }}
          >
            <Box>
              <Typography
                component="h1"
                sx={{
                  color: "text.primary",
                  fontSize: { xs: "2rem", sm: "2.4rem" },
                  fontWeight: 700,
                  letterSpacing: "-.045em",
                  lineHeight: 1.08,
                }}
              >
                {t("Welcome back", "Karibu tena")}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  fontSize: { xs: ".95rem", sm: "1rem" },
                  lineHeight: 1.65,
                  mt: 1.25,
                }}
              >
                {t(
                  "Sign in to manage your property.",
                  "Ingia ili kusimamia jengo lako.",
                )}
              </Typography>
            </Box>

            <Button
              disabled={auth.loading}
              fullWidth
              onClick={() => void auth.signInWithGoogle()}
              size="large"
              startIcon={
                auth.loading ? (
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
                fontSize: ".92rem",
                fontWeight: 600,
                minHeight: 52,
                textTransform: "none",
                transition:
                  "border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "text.secondary",
                  boxShadow: "0 4px 14px rgba(15, 23, 42, .06)",
                },
              }}
              variant="outlined"
            >
              {auth.loading
                ? t("Signing in…", "Inaingia…")
                : t("Continue with Google", "Endelea na Google")}
            </Button>

            <Typography
              color="text.secondary"
              variant="caption"
              sx={{ lineHeight: 1.65, px: { xs: 1, sm: 2 } }}
            >
              {t("By continuing, you agree to the", "Kwa kuendelea, unakubali")}{" "}
              <Link
                component={NextLink}
                href="/terms"
                underline="hover"
                sx={{ color: "text.primary", fontWeight: 600 }}
              >
                {t("Terms", "Masharti")}
              </Link>{" "}
              {t("and", "na")}{" "}
              <Link
                component={NextLink}
                href="/privacy"
                underline="hover"
                sx={{ color: "text.primary", fontWeight: 600 }}
              >
                {t("Privacy Policy", "Sera ya faragha")}
              </Link>
              .
            </Typography>

            <Link
              component={NextLink}
              href="/learn-more"
              underline="hover"
              sx={{
                alignSelf: "center",
                color: "text.secondary",
                fontSize: ".78rem",
                fontWeight: 600,
              }}
            >
              {t("Learn more", "Fahamu zaidi")}
            </Link>
          </Stack>
        </Box>

        <Typography
          color="text.secondary"
          component="footer"
          sx={{
            fontSize: ".72rem",
            pb: { xs: 0.5, sm: 0 },
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} Loji
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
