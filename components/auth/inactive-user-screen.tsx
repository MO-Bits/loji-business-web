"use client";

import DomainDisabledRoundedIcon from "@mui/icons-material/DomainDisabledRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
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
      // A full navigation removes the inactive session from the client tree.
      window.location.replace("/login");
    }
  }

  return (
    <Box
      component="main"
      sx={{
        alignItems: "center",
        background: "radial-gradient(circle at 50% 0%, rgba(30,136,229,.10), transparent 38%), #F7F9FC",
        display: "flex",
        minHeight: "100dvh",
        py: { xs: 2.5, sm: 5, md: 7 },
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={{ xs: 2.5, sm: 3.5 }}>
          <BrandWordmark priority sx={{ alignSelf: "center", width: { xs: 154, sm: 176 } }} />

          <Paper
            variant="outlined"
            sx={{
              borderColor: "rgba(15, 23, 42, .10)",
              borderRadius: 2,
              boxShadow: "0 24px 70px rgba(15, 23, 42, .09)",
              overflow: "hidden",
              p: { xs: 2.5, sm: 4, md: 5 },
            }}
          >
            <Stack spacing={{ xs: 3, sm: 4 }}>
              <Stack alignItems="center" spacing={2.25} textAlign="center">
                <Box
                  sx={{
                    alignItems: "center",
                    bgcolor: "#FFF3F2",
                    border: "8px solid #FFF8F7",
                    borderRadius: "50%",
                    display: "flex",
                    height: { xs: 88, sm: 104 },
                    justifyContent: "center",
                    width: { xs: 88, sm: 104 },
                  }}
                >
                  <DomainDisabledRoundedIcon color="error" sx={{ fontSize: { xs: 38, sm: 44 } }} />
                </Box>

                <Chip
                  color="error"
                  label="ACCESS INACTIVE"
                  size="small"
                  sx={{ fontSize: ".7rem", fontWeight: 850, letterSpacing: ".08em" }}
                  variant="outlined"
                />

                <Box>
                  <Typography component="h1" sx={{ fontSize: { xs: "1.8rem", sm: "2.25rem" }, fontWeight: 850, letterSpacing: "-.04em" }}>
                    Your workspace access is paused
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: { xs: ".96rem", sm: "1.05rem" }, lineHeight: 1.65, mt: 1, mx: "auto", maxWidth: 570 }}>
                    Your account is secure, but you currently do not have an active role at a Loji Business property.
                  </Typography>
                </Box>
              </Stack>

              {auth.error && <Alert severity="error" variant="outlined">{auth.error}</Alert>}

              <Box
                sx={{
                  bgcolor: "#F8FAFC",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Stack direction={{ xs: "column", sm: "row" }}>
                  <InformationSection
                    icon={<AdminPanelSettingsRoundedIcon color="primary" />}
                    title="Why access may be paused"
                  >
                    A property owner or manager may have deactivated your staff account, removed you from the property, or changed your role.
                  </InformationSection>

                  <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", sm: "block" } }} />
                  <Divider sx={{ display: { xs: "block", sm: "none" } }} />

                  <InformationSection
                    icon={<CheckCircleOutlineRoundedIcon color="primary" />}
                    title="How to restore access"
                  >
                    Ask your property administrator to reactivate your membership. Once they confirm, use the button below to check again.
                  </InformationSection>
                </Stack>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  fullWidth
                  onClick={() => window.location.replace("/")}
                  size="large"
                  startIcon={<RefreshRoundedIcon />}
                  variant="contained"
                >
                  Check access again
                </Button>
                <Button
                  color="inherit"
                  disabled={auth.loading}
                  fullWidth
                  onClick={() => void signOut()}
                  size="large"
                  startIcon={auth.loading ? <CircularProgress color="inherit" size={18} /> : <LogoutRoundedIcon />}
                  variant="outlined"
                >
                  {auth.loading ? "Signing out…" : "Use another account"}
                </Button>
              </Stack>

              <Typography color="text.secondary" textAlign="center" variant="caption">
                No booking or property data has been deleted. Access returns as soon as your membership is reactivated.
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

function InformationSection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Stack spacing={1.25} sx={{ flex: 1, p: { xs: 2.25, sm: 3 } }}>
      <Stack alignItems="center" direction="row" spacing={1}>
        {icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
      </Stack>
      <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.7 }}>
        {children}
      </Typography>
    </Stack>
  );
}
