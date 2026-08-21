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
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";

import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { useAuthController } from "@/features/auth/hooks/use-auth-controller";

import { GoogleMark } from "./google-mark";

export function LoginScreen() {
  const auth = useAuthController();

  async function handleGoogleLogin() {
    await auth.signInWithGoogle();
  }

  return (
    <Box
      component="main"
      sx={{
        bgcolor: "background.default",
        display: "flex",
        minHeight: "100dvh",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          py: { xs: 3, sm: 4, md: 5 },
        }}
      >
        <BrandWordmark priority sx={{ width: { xs: 168, sm: 196 } }} />

        <Box
          sx={{
            alignItems: "center",
            display: "grid",
            flex: 1,
            gap: { xs: 5, md: 10 },
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 1.08fr) minmax(360px, .72fr)",
            },
            py: { xs: 6, sm: 8, md: 5 },
          }}
        >
          <Stack spacing={2.25} sx={{ maxWidth: 650 }}>
            <Typography component="h1" variant="h2">
              Run your property with clarity.
            </Typography>
            <Typography
              color="text.secondary"
              variant="h6"
              sx={{ fontWeight: 400, lineHeight: 1.55, maxWidth: 590 }}
            >
              Rooms, bookings, guests, and your team—managed from one simple
              hospitality workspace.
            </Typography>
            <Link
              component={NextLink}
              href="/learn-more"
              underline="hover"
              sx={{ alignSelf: "flex-start", fontWeight: 700 }}
            >
              See how it works
            </Link>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              borderColor: "divider",
              boxShadow: "0 18px 55px rgba(15,23,42,.07)",
              p: { xs: 3, sm: 4 },
            }}
          >
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography
                  component="h2"
                  variant="h5"
                  sx={{ fontWeight: 700, letterSpacing: "-.025em" }}
                >
                  Welcome back
                </Typography>
                <Typography color="text.secondary">
                  Sign in to continue to your workspace.
                </Typography>
              </Stack>

              <Button
                disabled={auth.loading}
                fullWidth
                onClick={() => void handleGoogleLogin()}
                size="large"
                startIcon={
                  auth.loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : (
                    <GoogleMark />
                  )
                }
                sx={{
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  color: "text.primary",
                  minHeight: 54,
                  "&:hover": {
                    bgcolor: "action.hover",
                    borderColor: "text.secondary",
                  },
                }}
                variant="outlined"
              >
                {auth.loading ? "Connecting…" : "Continue with Google"}
              </Button>

              <Stack alignItems="center" direction="row" spacing={1}>
                <LockOutlinedIcon
                  sx={{ color: "text.secondary", fontSize: 16 }}
                />
                <Typography color="text.secondary" variant="caption">
                  Secure sign-in. We never store your Google password.
                </Typography>
              </Stack>

              <Typography
                color="text.secondary"
                variant="caption"
                sx={{ lineHeight: 1.65 }}
              >
                By continuing, you agree to our{" "}
                <Link
                  component={NextLink}
                  href="/terms"
                  underline="hover"
                  sx={{ fontWeight: 700 }}
                >
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link
                  component={NextLink}
                  href="/privacy"
                  underline="hover"
                  sx={{ fontWeight: 700 }}
                >
                  Privacy Policy
                </Link>
                .
              </Typography>
            </Stack>
          </Paper>
        </Box>

        <Typography color="text.secondary" variant="caption">
          © {new Date().getFullYear()} Loji. Hospitality operations,
          simplified.
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
