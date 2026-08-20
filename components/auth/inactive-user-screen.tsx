"use client";

import DomainDisabledRoundedIcon from "@mui/icons-material/DomainDisabledRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
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
      // A full navigation removes the inactive session from the client tree.
      window.location.replace("/login");
    }
  }

  return (
    <Box
      component="main"
      sx={{
        alignItems: "center",
        display: "flex",
        minHeight: "100dvh",
        py: { xs: 3, sm: 5 },
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <BrandWordmark priority sx={{ alignSelf: "center", width: { xs: 154, sm: 176 } }} />

          <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2.5, sm: 4 } }}>
            <Stack spacing={3}>
              <Box sx={{ display: "grid", placeItems: "center" }}>
                <Box
                  sx={{
                    alignItems: "center",
                    bgcolor: "rgba(211, 47, 47, .08)",
                    border: "1px solid rgba(211, 47, 47, .18)",
                    borderRadius: "50%",
                    display: "flex",
                    height: { xs: 84, sm: 96 },
                    justifyContent: "center",
                    width: { xs: 84, sm: 96 },
                  }}
                >
                  <DomainDisabledRoundedIcon color="error" sx={{ fontSize: { xs: 38, sm: 44 } }} />
                </Box>
              </Box>

              <Box textAlign="center">
                <Typography component="h1" variant="h4" sx={{ fontWeight: 850, letterSpacing: "-.03em" }}>
                  Access restricted
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Your Loji Business access is currently unavailable.
                </Typography>
              </Box>

              {auth.error && <Alert severity="error">{auth.error}</Alert>}

              <Box sx={{ bgcolor: "action.hover", border: 1, borderColor: "divider", borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
                <Stack spacing={2.25}>
                  <InformationSection
                    icon={<InfoOutlinedIcon color="primary" fontSize="small" />}
                    title="Why am I seeing this?"
                  >
                    Your staff account may have been deactivated, removed from the property, or had its role changed by the property owner or manager.
                  </InformationSection>

                  <Divider />

                  <InformationSection
                    icon={<HelpOutlineRoundedIcon color="primary" fontSize="small" />}
                    title="What should I do?"
                  >
                    Contact your property administrator or manager to confirm your staff status and request reactivation if you should still have access.
                  </InformationSection>
                </Stack>
              </Box>

              <Button
                color="error"
                disabled={auth.loading}
                fullWidth
                onClick={() => void signOut()}
                startIcon={auth.loading ? <CircularProgress color="inherit" size={18} /> : <LogoutRoundedIcon />}
                variant="outlined"
              >
                {auth.loading ? "Signing out…" : "Sign out"}
              </Button>
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
    <Stack spacing={1}>
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
