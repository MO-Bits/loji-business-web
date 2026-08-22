"use client";

import NextLink from "next/link";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Link,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";

import { HospitalityHeroIllustration } from "@/components/content/learn-more-illustrations";
import { useLanguage } from "@/components/providers/language-provider";
import { BrandSymbol } from "@/components/shared/brand-symbol";
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { useAuthController } from "@/features/auth/hooks/use-auth-controller";

import { GoogleMark } from "./google-mark";

export function LoginScreen() {
  const auth = useAuthController();
  const { language, setLanguage, t } = useLanguage();

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
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        aria-hidden
        sx={{
          bgcolor: "primary.main",
          borderRadius: "50%",
          filter: "blur(2px)",
          height: 360,
          opacity: 0.045,
          position: "absolute",
          right: -150,
          top: -160,
          width: 360,
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minWidth: 0,
          py: { xs: 2.25, sm: 3, md: 4 },
        }}
      >
        <Stack
          component="header"
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1.1} sx={{ alignItems: "center" }}>
            <BrandSymbol priority size={36} />
            <BrandWordmark priority sx={{ width: { xs: 146, sm: 172 } }} />
          </Stack>

          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <TranslateRoundedIcon
              sx={{ color: "text.secondary", display: { xs: "none", sm: "block" }, fontSize: 18 }}
            />
            <Select
              value={language}
              onChange={(event) => setLanguage(event.target.value as "en" | "sw")}
              size="small"
              inputProps={{ "aria-label": t("Language", "Lugha") }}
              sx={{
                bgcolor: "background.paper",
                fontSize: ".78rem",
                fontWeight: 700,
                minWidth: { xs: 66, sm: 96 },
                "& .MuiSelect-select": { py: .75 },
              }}
            >
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="sw">SW</MenuItem>
            </Select>
          </Stack>
        </Stack>

        <Box
          sx={{
            alignItems: "center",
            display: "grid",
            flex: 1,
            gap: { xs: 4, sm: 5, md: 8 },
            gridTemplateColumns: {
              xs: "minmax(0,1fr)",
              md: "minmax(0,1.05fr) minmax(360px,.7fr)",
            },
            py: { xs: 4, sm: 5, md: 3 },
          }}
        >
          <Stack spacing={{ xs: 2.5, md: 3 }} sx={{ minWidth: 0 }}>
            <Box sx={{ maxWidth: 630 }}>
              <Typography
                color="primary.main"
                variant="overline"
                sx={{ fontWeight: 800, letterSpacing: ".12em" }}
              >
                {t("HOSPITALITY OPERATIONS", "USIMAMIZI WA MALAZI")}
              </Typography>
              <Typography
                component="h1"
                variant="h2"
                sx={{
                  fontSize: { xs: "2.35rem", sm: "3.25rem", md: "3.75rem" },
                  lineHeight: { xs: 1.08, md: 1.04 },
                  mt: 1,
                }}
              >
                {t(
                  "Run your property with clarity.",
                  "Simamia jengo lako kwa uwazi.",
                )}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  fontSize: { xs: "1rem", sm: "1.1rem" },
                  lineHeight: 1.7,
                  maxWidth: 570,
                  mt: 2,
                }}
              >
                {t(
                  "Rooms, bookings, guests and your team—organized in one focused workspace.",
                  "Vyumba, uhifadhi, wageni na timu yako—vimepangwa katika eneo moja la kazi.",
                )}
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1, sm: 2.5 }}
            >
              {[
                t("Live room status", "Hali ya vyumba mubashara"),
                t("Faster check-ins", "Uingizaji wa haraka"),
                t("Secure team access", "Ufikiaji salama wa timu"),
              ].map((label) => (
                <Stack key={label} direction="row" spacing={.75} sx={{ alignItems: "center" }}>
                  <CheckCircleRoundedIcon color="success" sx={{ fontSize: 18 }} />
                  <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>
                    {label}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <HospitalityHeroIllustration
              sx={{
                display: { xs: "none", md: "block" },
                maxWidth: 430,
                mt: 1,
              }}
            />
          </Stack>

          <Paper
            component="section"
            variant="outlined"
            sx={{
              bgcolor: "background.paper",
              borderColor: "divider",
              borderRadius: 1,
              boxShadow: "0 24px 70px rgba(15,23,42,.09)",
              mx: { xs: "auto", md: 0 },
              overflow: "hidden",
              p: { xs: 2.5, sm: 3.5, md: 4 },
              width: "100%",
            }}
          >
            <Stack spacing={3}>
              <Box>
                <Typography
                  color="primary.main"
                  variant="caption"
                  sx={{ fontWeight: 800, letterSpacing: ".1em" }}
                >
                  {t("YOUR WORKSPACE", "ENEO LAKO LA KAZI")}
                </Typography>
                <Typography component="h2" variant="h5" sx={{ mt: .75 }}>
                  {t("Welcome back", "Karibu tena")}
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.6, mt: .75 }}>
                  {t(
                    "Use your business Google account to continue.",
                    "Tumia akaunti yako ya Google ya biashara kuendelea.",
                  )}
                </Typography>
              </Box>

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
                  fontWeight: 700,
                  minHeight: 54,
                  "&:hover": {
                    bgcolor: "action.hover",
                    borderColor: "primary.main",
                  },
                }}
                variant="outlined"
              >
                {auth.loading
                  ? t("Connecting…", "Inaunganisha…")
                  : t("Continue with Google", "Endelea na Google")}
              </Button>

              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                <LockOutlinedIcon sx={{ color: "success.main", fontSize: 17, mt: .15 }} />
                <Typography color="text.secondary" variant="caption" sx={{ lineHeight: 1.55 }}>
                  {t(
                    "Secure authentication. Loji never receives or stores your Google password.",
                    "Uthibitishaji salama. Loji haipokei wala kuhifadhi nenosiri lako la Google.",
                  )}
                </Typography>
              </Stack>

              <Divider />

              <Typography color="text.secondary" variant="caption" sx={{ lineHeight: 1.65 }}>
                {t("By continuing, you agree to our", "Kwa kuendelea, unakubali")}{" "}
                <Link component={NextLink} href="/terms" underline="hover" sx={{ fontWeight: 700 }}>
                  {t("Terms of Use", "Masharti ya matumizi")}
                </Link>{" "}
                {t("and", "na")}{" "}
                <Link component={NextLink} href="/privacy" underline="hover" sx={{ fontWeight: 700 }}>
                  {t("Privacy Policy", "Sera ya faragha")}
                </Link>.
              </Typography>

              <Button
                component={NextLink}
                href="/learn-more"
                color="inherit"
                size="small"
                sx={{ alignSelf: "center", color: "text.secondary" }}
              >
                {t("Explore Loji Business", "Fahamu Loji Business")}
              </Button>
            </Stack>
          </Paper>
        </Box>

        <Typography color="text.secondary" variant="caption">
          © {new Date().getFullYear()} Loji · {t("Hospitality operations, simplified.", "Usimamizi wa malazi, umerahisishwa.")}
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
