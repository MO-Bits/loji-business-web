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
import { BrandLockup } from "@/components/shared/brand-lockup";

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
                  "radial-gradient(circle at 82% 20%, rgba(82,139,255,.42), transparent 34%), #101828",
                borderRadius: { xs: "10px 10px 0 0", md: 2 },
                color: "#F8FAFC",
                display: { xs: "none", md: "flex" },
                justifyContent: "space-between",
                minHeight: 500,
                p: { md: 5, lg: 6 },
              }}
            >
              <BrandLockup color="#F8FAFC" priority symbolSize={34} textSize="1.05rem" />
              <Box>
                <Typography sx={{ fontSize: { md: "2.35rem", lg: "2.8rem" }, fontWeight: 750, letterSpacing: "-.05em", lineHeight: 1.04, maxWidth: 430 }}>
                  {t("Run every stay with confidence.", "Simamia kila ukaaji kwa uhakika.")}
                </Typography>
                <Typography sx={{ color: "rgba(226,232,240,.72)", fontSize: ".95rem", lineHeight: 1.65, mt: 2, maxWidth: 410 }}>
                  {t("Rooms, reservations, guests and staff—one focused workspace for your hospitality business.", "Vyumba, uhifadhi, wageni na wafanyakazi—eneo moja la kazi kwa biashara yako ya ukarimu.")}
                </Typography>
              </Box>
              <Typography sx={{ color: "rgba(226,232,240,.56)", fontSize: ".78rem" }}>
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

              <Stack
              direction="row"
              spacing={0.75}
                sx={{ alignItems: "center" }}
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
