"use client";

import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
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

import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { useAuthController } from "@/features/auth/hooks/use-auth-controller";

export function InactiveUserScreen() {
  const auth = useAuthController();

  async function signOut() {
    const error = await auth.signOut();

    if (!error) {
      window.location.replace("/login");
    }
  }

  return (
    <Box component="main" sx={{ bgcolor: "#F4F6F8", minHeight: "100dvh" }}>
      <Box component="header" sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Stack alignItems="center" direction="row" justifyContent="space-between" sx={{ minHeight: { xs: 64, sm: 72 } }}>
            <BrandWordmark priority sx={{ width: { xs: 142, sm: 164 } }} />
            <Stack alignItems="center" direction="row" spacing={0.75}>
              <LockOutlinedIcon sx={{ color: "text.secondary", fontSize: 17 }} />
              <Typography color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, fontWeight: 650 }} variant="caption">
                Secure account status
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5, md: 8 } }}>
        <Paper
          variant="outlined"
          sx={{
            borderColor: "rgba(15,23,42,.09)",
            borderRadius: 2,
            boxShadow: "0 22px 65px rgba(15,23,42,.08)",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(300px, .82fr) minmax(430px, 1.18fr)" },
            mx: "auto",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <Box
            sx={{
              background: "linear-gradient(145deg, #102A43 0%, #173F68 100%)",
              color: "common.white",
              display: "flex",
              minHeight: { md: 580 },
              p: { xs: 3, sm: 4, md: 5 },
            }}
          >
            <Stack justifyContent="space-between" spacing={{ xs: 5, md: 8 }} sx={{ width: "100%" }}>
              <Stack spacing={3}>
                <Box
                  sx={{
                    alignItems: "center",
                    bgcolor: "rgba(255,255,255,.10)",
                    border: "1px solid rgba(255,255,255,.16)",
                    borderRadius: 2,
                    display: "flex",
                    height: 58,
                    justifyContent: "center",
                    width: 58,
                  }}
                >
                  <BusinessRoundedIcon sx={{ fontSize: 29 }} />
                </Box>

                <Box>
                  <Typography sx={{ color: "#9CC8F5", fontSize: ".72rem", fontWeight: 850, letterSpacing: ".12em", mb: 1.5 }}>
                    WORKSPACE STATUS
                  </Typography>
                  <Typography component="h1" sx={{ fontSize: { xs: "2rem", sm: "2.45rem" }, fontWeight: 850, letterSpacing: "-.045em", lineHeight: 1.08 }}>
                    Access temporarily paused
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,.72)", lineHeight: 1.7, mt: 2 }}>
                    Your Loji Business account is safe, but it is not currently connected to an active property membership.
                  </Typography>
                </Box>
              </Stack>

              <Stack alignItems="center" direction="row" spacing={1.25}>
                <CheckCircleRoundedIcon sx={{ color: "#79D4AE", fontSize: 21 }} />
                <Typography sx={{ color: "rgba(255,255,255,.78)", fontSize: ".84rem", fontWeight: 650 }}>
                  Your property and booking data remain protected
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ bgcolor: "background.paper", p: { xs: 3, sm: 4.5, md: 6 } }}>
            <Stack spacing={{ xs: 3, sm: 4 }}>
              <Box>
                <Typography component="h2" sx={{ fontSize: { xs: "1.45rem", sm: "1.7rem" }, fontWeight: 820, letterSpacing: "-.025em" }}>
                  Restore your workspace access
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7, mt: 1 }}>
                  Follow these steps to get back into your property workspace.
                </Typography>
              </Box>

              {auth.error && <Alert severity="error" variant="outlined">{auth.error}</Alert>}

              <Stack divider={<Divider flexItem />}>
                <RecoveryStep
                  icon={<AdminPanelSettingsRoundedIcon />}
                  number="01"
                  title="Contact your administrator"
                >
                  Ask the property owner or manager to confirm your staff role and reactivate your membership.
                </RecoveryStep>
                <RecoveryStep
                  icon={<RefreshRoundedIcon />}
                  number="02"
                  title="Check your access again"
                >
                  Once they confirm the change, return here and refresh your workspace status.
                </RecoveryStep>
              </Stack>

              <Button
                endIcon={<ArrowForwardRoundedIcon />}
                fullWidth
                onClick={() => window.location.replace("/")}
                size="large"
                sx={{ minHeight: 52 }}
                variant="contained"
              >
                Check access again
              </Button>

              <Stack alignItems="center" direction="row" spacing={2}>
                <Divider sx={{ flex: 1 }} />
                <Typography color="text.secondary" variant="caption">or</Typography>
                <Divider sx={{ flex: 1 }} />
              </Stack>

              <Button
                color="inherit"
                disabled={auth.loading}
                fullWidth
                onClick={() => void signOut()}
                startIcon={auth.loading ? <CircularProgress color="inherit" size={18} /> : <LogoutRoundedIcon />}
                variant="text"
              >
                {auth.loading ? "Signing out…" : "Sign out and use another account"}
              </Button>
            </Stack>
          </Box>
        </Paper>

        <Typography color="text.secondary" sx={{ mt: 3, textAlign: "center" }} variant="caption">
          Loji Business · Secure hospitality operations
        </Typography>
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
  children: React.ReactNode;
  icon: React.ReactNode;
  number: string;
  title: string;
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 2.25 }}>
      <Box
        sx={{
          alignItems: "center",
          bgcolor: "#EAF3FF",
          borderRadius: 2,
          color: "primary.main",
          display: "flex",
          flexShrink: 0,
          height: 44,
          justifyContent: "center",
          width: 44,
          "& svg": { fontSize: 22 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography color="primary.main" sx={{ fontSize: ".68rem", fontWeight: 850, letterSpacing: ".08em" }}>
          STEP {number}
        </Typography>
        <Typography sx={{ fontWeight: 780, mt: .25 }}>{title}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.65, mt: .5 }}>
          {children}
        </Typography>
      </Box>
    </Stack>
  );
}
