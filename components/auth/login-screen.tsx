"use client";

import { useState } from "react";
import NextLink from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  IconButton,
  Link,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";

import { useAuthController } from "@/features/auth/hooks/use-auth-controller";

import { GoogleMark } from "./google-mark";

export function LoginScreen() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const auth = useAuthController();

  async function handleGoogleLogin() {
    await auth.signInWithGoogle();
  }

  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          px: { xs: 3, sm: 5 },
          py: { xs: 4, md: 6 },
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 800, letterSpacing: "0.08em" }}
        >
          LOJI
        </Typography>

        <Box
          sx={{
            alignItems: "center",
            display: "grid",
            flex: 1,
            gap: { xs: 5, md: 8 },
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.25fr) minmax(340px, .75fr)" },
            py: { xs: 7, md: 5 },
          }}
        >
          <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
            <Typography
              component="h1"
              sx={{
                background: "linear-gradient(110deg, #1E88E5, #7E57C2)",
                backgroundClip: "text",
                color: "transparent",
                fontSize: "clamp(3rem, 8vw, 6.8rem)",
                fontWeight: 900,
                letterSpacing: "-0.065em",
                lineHeight: 0.92,
              }}
            >
              Loji Business
            </Typography>

            <Typography
              variant="h4"
              component="p"
              sx={{ maxWidth: 650, lineHeight: 1.15 }}
            >
              Everything you need to run your{" "}
              <Box component="span" sx={{ fontWeight: 900 }}>
                hospitality business.
              </Box>
            </Typography>

            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 680, fontWeight: 550 }}
            >
              Manage rooms, reservations, guests, and your team from one
              powerful workspace.{" "}
              <Link component={NextLink} href="/learn-more" underline="hover" sx={{ fontWeight: 800 }}>
                Learn more
              </Link>
            </Typography>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              display: { xs: "none", md: "block" },
              p: 4,
            }}
          >
            <Stack spacing={3}>
              <Box
                sx={{
                  alignItems: "center",
                  bgcolor: "primary.main",
                  borderRadius: 3,
                  color: "primary.contrastText",
                  display: "flex",
                  height: 58,
                  justifyContent: "center",
                  width: 58,
                }}
              >
                <LockOutlinedIcon />
              </Box>
              <Stack spacing={1}>
                <Typography variant="h5" sx={{ fontWeight: 750 }}>
                  Your workspace is ready
                </Typography>
                <Typography color="text.secondary">
                  Sign in securely to continue managing your property.
                </Typography>
              </Stack>
              <Button
                fullWidth
                size="large"
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => setDialogOpen(true)}
              >
                Get started
              </Button>
            </Stack>
          </Paper>
        </Box>

        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <Button
            fullWidth
            size="large"
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ display: { md: "none" }, maxWidth: 520, minHeight: 56 }}
          >
            Get started
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: "center" }}
          >
            By continuing, you agree to Loji Business{" "}
            <Link component={NextLink} href="/terms" underline="hover" sx={{ fontWeight: 700 }}>
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link component={NextLink} href="/privacy" underline="hover" sx={{ fontWeight: 700 }}>
              Privacy Policy
            </Link>
            .
          </Typography>
        </Stack>
      </Container>

      <Dialog
        open={dialogOpen}
        onClose={() => !auth.loading && setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              m: 2,
            },
          },
        }}
      >
        <DialogContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={3}>
            <Stack
              direction="row"
              sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
            >
              <Box
                sx={{
                  alignItems: "center",
                  bgcolor: "primary.main",
                  borderRadius: 3,
                  color: "primary.contrastText",
                  display: "flex",
                  height: 56,
                  justifyContent: "center",
                  width: 56,
                }}
              >
                <LockOutlinedIcon />
              </Box>
              <IconButton
                aria-label="Close sign in"
                disabled={auth.loading}
                onClick={() => setDialogOpen(false)}
              >
                <CloseRoundedIcon />
              </IconButton>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="h5" sx={{ fontWeight: 750 }}>
                Continue to Loji Business
              </Typography>
              <Typography color="text.secondary">
                Choose your Google account to access your workspace.
              </Typography>
            </Stack>

            <Button
              fullWidth
              size="large"
              variant="outlined"
              disabled={auth.loading}
              startIcon={
                auth.loading ? <CircularProgress size={20} /> : <GoogleMark />
              }
              onClick={handleGoogleLogin}
              sx={{ minHeight: 54, color: "text.primary", borderColor: "divider" }}
            >
              {auth.loading ? "Opening Google…" : "Continue with Google"}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={Boolean(auth.error)}
        autoHideDuration={6000}
        onClose={auth.clearError}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" onClose={auth.clearError}>
          {auth.error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
