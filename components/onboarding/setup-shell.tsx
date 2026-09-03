"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

import { BrandLockup } from "@/components/shared/brand-lockup";
import { useLanguage } from "@/components/providers/language-provider";

export function SetupShell({
  children,
  description,
  icon,
  loading = false,
  nextDisabled = false,
  nextLabel,
  onBack,
  onCancel,
  onNext,
  onSignOut,
  step,
  title,
  totalSteps,
}: {
  children: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  loading?: boolean;
  nextDisabled?: boolean;
  nextLabel?: ReactNode;
  onBack?: () => void;
  onCancel?: () => void;
  onNext: () => void;
  onSignOut?: () => void;
  step: number;
  title: ReactNode;
  totalSteps: number;
}) {
  const { t } = useLanguage();
  const progress = Math.min(100, Math.max(0, (step / totalSteps) * 100));

  return (
    <Box
      component="main"
      sx={{
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
      }}
    >
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              height: { xs: 58, sm: 64 },
              justifyContent: "space-between",
            }}
          >
            <BrandLockup priority symbolSize={30} textSize=".9375rem" />
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography
                color="text.secondary"
                sx={{
                  display: "none",
                  "@media (min-width: 360px)": { display: "block" },
                }}
                variant="caption"
              >
                {t(`Step ${step} of ${totalSteps}`, `Hatua ${step} kati ya ${totalSteps}`)}
              </Typography>
              {onCancel ? (
                <>
                  <IconButton
                    aria-label={t("Close setup", "Funga mpangilio")}
                    disabled={loading}
                    onClick={onCancel}
                    size="small"
                    sx={{ display: { xs: "inline-flex", sm: "none" } }}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                  <Button
                    color="inherit"
                    disabled={loading}
                    onClick={onCancel}
                    size="small"
                    startIcon={<CloseRoundedIcon fontSize="small" />}
                    sx={{ display: { xs: "none", sm: "inline-flex" } }}
                  >
                    {t("Close", "Funga")}
                  </Button>
                </>
              ) : onSignOut ? (
                <IconButton
                  aria-label={t("Sign out", "Toka")}
                  disabled={loading}
                  onClick={onSignOut}
                  size="small"
                >
                  <LogoutRoundedIcon fontSize="small" />
                </IconButton>
              ) : null}
            </Stack>
          </Stack>
        </Container>
        <LinearProgress
          aria-label={t("Registration progress", "Maendeleo ya usajili")}
          value={progress}
          variant="determinate"
          sx={{ height: 3 }}
        />
      </Box>

      <Container
        maxWidth="md"
        sx={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 5, md: 6 },
        }}
      >
        <Box sx={{ flex: 1, mx: "auto", width: "min(100%, 720px)" }}>
          <Box
            sx={{
              bgcolor:
                "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
              borderRadius: 2.5,
              color: "primary.main",
              display: "grid",
              height: 48,
              mb: 2.25,
              placeItems: "center",
              width: 48,
              "& .MuiSvgIcon-root": { fontSize: 25 },
            }}
          >
            {icon}
          </Box>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: "1.75rem", sm: "2.15rem" },
              fontWeight: 700,
              letterSpacing: "-.04em",
              lineHeight: 1.12,
              maxWidth: 650,
            }}
          >
            {title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ fontSize: { xs: ".875rem", sm: ".9375rem" }, lineHeight: 1.65, mt: 1, maxWidth: 620 }}
          >
            {description}
          </Typography>

          <Box sx={{ mt: { xs: 3, sm: 4 } }}>{children}</Box>
        </Box>
      </Container>

      <Box
        component="footer"
        sx={{
          backdropFilter: "blur(18px)",
          bgcolor:
            "color-mix(in srgb, var(--mui-palette-background-paper) 94%, transparent)",
          borderTop: "1px solid",
          borderColor: "divider",
          bottom: 0,
          pb: "env(safe-area-inset-bottom)",
          position: "sticky",
          zIndex: 10,
        }}
      >
        <Container maxWidth="md" sx={{ py: 1.5 }}>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ justifyContent: "space-between", mx: "auto", width: "min(100%, 720px)" }}
          >
            {onBack ? (
              <Button
                color="inherit"
                disabled={loading}
                onClick={onBack}
                startIcon={<ArrowBackRoundedIcon />}
                variant="text"
              >
                {t("Back", "Rudi")}
              </Button>
            ) : (
              <Box />
            )}
            <Button
              disabled={loading || nextDisabled}
              endIcon={loading ? undefined : <ArrowForwardRoundedIcon />}
              onClick={onNext}
              size="large"
              sx={{ minWidth: { xs: 132, sm: 170 } }}
              variant="contained"
            >
              {loading ? (
                <CircularProgress color="inherit" size={22} />
              ) : (
                nextLabel ?? t("Continue", "Endelea")
              )}
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
