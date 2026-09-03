"use client";

import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { useAuthController } from "@/features/auth/hooks/use-auth-controller";

export function InactiveUserScreen() {
  const auth = useAuthController();
  const { t } = useLanguage();

  async function signOut() {
    const error = await auth.signOut();
    if (!error) window.location.replace("/login");
  }

  return (
    <Box
      component="main"
      sx={{
        background:
          "radial-gradient(circle at 88% 3%, color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent), transparent 32%)",
        bgcolor: "background.default",
        minHeight: "100dvh",
      }}
    >
      <Box
        component="header"
        sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: { xs: 64, sm: 72 },
            }}
          >
            <BrandLockup priority symbolSize={32} textSize="1rem" />
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <LockOutlinedIcon sx={{ color: "text.secondary", fontSize: 17 }} />
              <Typography
                color="text.secondary"
                sx={{ display: { xs: "none", sm: "block" } }}
                variant="caption"
              >
                {t("Secure account status", "Hali salama ya akaunti")}
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5, md: 8 } }}>
        <Paper
          variant="outlined"
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "minmax(300px, .82fr) minmax(430px, 1.18fr)",
            },
            mx: "auto",
            overflow: "hidden",
            width: "min(100%, 1040px)",
          }}
        >
          <Box
            sx={{
              background:
                "radial-gradient(circle at 92% 8%, rgba(100,210,255,.42), transparent 34%), linear-gradient(145deg, #001E3C 0%, #0055B3 68%, #007AFF 130%)",
              color: "common.white",
              display: "flex",
              minHeight: { md: 560 },
              p: { xs: 3, sm: 4, md: 5 },
            }}
          >
            <Stack
              spacing={{ xs: 5, md: 8 }}
              sx={{ justifyContent: "space-between", width: "100%" }}
            >
              <Stack spacing={3}>
                <Box
                  sx={{
                    bgcolor: "rgba(255,255,255,.12)",
                    border: "1px solid rgba(255,255,255,.2)",
                    borderRadius: 2,
                    display: "grid",
                    height: 58,
                    placeItems: "center",
                    width: 58,
                  }}
                >
                  <LockOutlinedIcon sx={{ fontSize: 29 }} />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,.72)",
                      fontWeight: 700,
                      letterSpacing: ".12em",
                    }}
                    variant="overline"
                  >
                    {t("WORKSPACE STATUS", "HALI YA SEHEMU YA KAZI")}
                  </Typography>
                  <Typography
                    component="h1"
                    sx={{
                      color: "common.white",
                      fontSize: { xs: "2rem", sm: "2.4rem" },
                      fontWeight: 700,
                      letterSpacing: "-.045em",
                      lineHeight: 1.08,
                      mt: 1,
                    }}
                  >
                    {t("Access temporarily paused", "Ufikiaji umesitishwa kwa muda")}
                  </Typography>
                  <Typography
                    sx={{ color: "rgba(255,255,255,.76)", lineHeight: 1.7, mt: 2 }}
                  >
                    {t(
                      "Your account is safe, but it is not currently connected to an active property membership.",
                      "Akaunti yako iko salama, lakini kwa sasa haijaunganishwa na uanachama hai wa biashara.",
                    )}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                <CheckCircleRoundedIcon sx={{ color: "#66D4A6", fontSize: 21 }} />
                <Typography
                  sx={{ color: "rgba(255,255,255,.8)", fontWeight: 500 }}
                  variant="body2"
                >
                  {t(
                    "Your property and booking data remain protected",
                    "Taarifa za biashara na uhifadhi zinaendelea kulindwa",
                  )}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ bgcolor: "background.paper", p: { xs: 3, sm: 4.5, md: 6 } }}>
            <Stack spacing={{ xs: 3, sm: 4 }}>
              <Box>
                <Typography component="h2" variant="h3">
                  {t("Restore workspace access", "Rudisha ufikiaji wa sehemu ya kazi")}
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7, mt: 1 }}>
                  {t(
                    "Complete these two checks to return to your property workspace.",
                    "Kamilisha ukaguzi huu miwili ili urudi kwenye sehemu yako ya kazi.",
                  )}
                </Typography>
              </Box>

              {auth.error ? <Alert severity="error">{auth.error}</Alert> : null}

              <Stack divider={<Divider flexItem />}>
                <RecoveryStep
                  icon={<AdminPanelSettingsRoundedIcon />}
                  number="01"
                  title={t("Contact your administrator", "Wasiliana na msimamizi")}
                >
                  {t(
                    "Ask the property owner or manager to confirm your staff role and reactivate your membership.",
                    "Mwombe mmiliki au meneja athibitishe jukumu lako na kuwasha tena uanachama wako.",
                  )}
                </RecoveryStep>
                <RecoveryStep
                  icon={<RefreshRoundedIcon />}
                  number="02"
                  title={t("Check access again", "Kagua ufikiaji tena")}
                >
                  {t(
                    "After they confirm the change, refresh your workspace status here.",
                    "Baada ya kuthibitisha mabadiliko, sasisha hali ya sehemu yako ya kazi hapa.",
                  )}
                </RecoveryStep>
              </Stack>

              <Button
                endIcon={<ArrowForwardRoundedIcon />}
                fullWidth
                onClick={() => window.location.replace("/")}
                size="large"
                variant="contained"
              >
                {t("Check access again", "Kagua ufikiaji tena")}
              </Button>

              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Divider sx={{ flex: 1 }} />
                <Typography color="text.secondary" variant="caption">
                  {t("or", "au")}
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Stack>

              <Button
                color="inherit"
                disabled={auth.loading}
                fullWidth
                onClick={() => void signOut()}
                startIcon={
                  auth.loading ? (
                    <CircularProgress color="inherit" size={18} />
                  ) : (
                    <LogoutRoundedIcon />
                  )
                }
              >
                {auth.loading
                  ? t("Signing out…", "Inatoka…")
                  : t(
                      "Sign out and use another account",
                      "Toka na utumie akaunti nyingine",
                    )}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

function RecoveryStep({
  children,
  icon,
  number,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  number: string;
  title: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 2.25 }}>
      <Box
        sx={{
          bgcolor:
            "color-mix(in srgb, var(--mui-palette-primary-main) 11%, transparent)",
          borderRadius: 2,
          color: "primary.main",
          display: "grid",
          flexShrink: 0,
          height: 44,
          placeItems: "center",
          width: 44,
          "& svg": { fontSize: 22 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography color="primary.main" sx={{ fontWeight: 700 }} variant="caption">
          {number}
        </Typography>
        <Typography sx={{ mt: 0.25 }} variant="subtitle1">
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.65, mt: 0.5 }} variant="body2">
          {children}
        </Typography>
      </Box>
    </Stack>
  );
}
