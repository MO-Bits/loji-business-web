"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { Box, Container, LinearProgress, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { BrandLockup } from "@/components/shared/brand-lockup";
import { Surface } from "@/components/shared/workspace-ui";

type OnboardingFrameProps = {
  action?: ReactNode;
  children: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  icon?: ReactNode;
  panelDescription?: ReactNode;
  panelTitle?: ReactNode;
  step: number;
  steps: ReactNode[];
  title: ReactNode;
  wide?: boolean;
};

export function OnboardingFrame({
  action,
  children,
  description,
  eyebrow,
  icon,
  panelDescription,
  panelTitle,
  step,
  steps,
  title,
  wide = false,
}: OnboardingFrameProps) {
  const boundedStep = Math.min(Math.max(step, 1), steps.length);

  return (
    <Box
      component="main"
      sx={{
        background:
          "radial-gradient(circle at 88% 4%, color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent), transparent 30%)",
        bgcolor: "background.default",
        minHeight: "100dvh",
        py: { xs: 2, sm: 3, lg: 5 },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 2.5, sm: 4 }}>
          <Stack
            component="header"
            direction="row"
            spacing={2}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 44,
            }}
          >
            <BrandLockup priority symbolSize={32} textSize="1rem" />
            {action}
          </Stack>

          <Box
            sx={{
              display: "grid",
              gap: { xs: 2, md: 4.5, lg: 6 },
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                md: wide
                  ? "minmax(280px, .58fr) minmax(0, 1.42fr)"
                  : "minmax(260px, .64fr) minmax(0, 1fr)",
                lg: wide ? "minmax(310px, .58fr) minmax(0, 1.42fr)" : undefined,
              },
              mx: "auto",
              width: wide ? "min(100%, 1160px)" : "min(100%, 1040px)",
            }}
          >
            <Stack spacing={{ xs: 2, md: 3.5 }} sx={{ minWidth: 0, pt: { md: 2 } }}>
              <Box>
                <Typography color="primary.main" variant="overline">
                  {eyebrow}
                </Typography>
                <Typography
                  component="h1"
                  sx={{
                    fontSize: {
                      xs: "2rem",
                      sm: "2.5rem",
                      md: wide ? "2.25rem" : "2.5rem",
                      lg: wide ? "2.5rem" : "2.75rem",
                    },
                    fontWeight: 700,
                    hyphens: "none",
                    overflowWrap: "normal",
                    wordBreak: "normal",
                    letterSpacing: "-.045em",
                    lineHeight: 1.06,
                    mt: 0.5,
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ lineHeight: 1.7, maxWidth: 460, mt: 1.5 }}
                >
                  {description}
                </Typography>
              </Box>

              <Box sx={{ display: { md: "none" } }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
                >
                  <Typography color="text.secondary" variant="caption">
                    {steps[boundedStep - 1]}
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    {boundedStep}/{steps.length}
                  </Typography>
                </Stack>
                <LinearProgress
                  aria-label={`Step ${boundedStep} of ${steps.length}`}
                  value={(boundedStep / steps.length) * 100}
                  variant="determinate"
                  sx={{ borderRadius: 999, height: 6 }}
                />
              </Box>

              <Stack spacing={1.25} sx={{ display: { xs: "none", md: "flex" } }}>
                {steps.map((label, index) => {
                  const itemStep = index + 1;
                  const complete = itemStep < boundedStep;
                  const active = itemStep === boundedStep;
                  return (
                    <Stack
                      direction="row"
                      key={itemStep}
                      spacing={1.25}
                      sx={{ alignItems: "center", opacity: active || complete ? 1 : 0.55 }}
                    >
                      <Box
                        sx={{
                          bgcolor: active || complete ? "primary.main" : "action.disabledBackground",
                          borderRadius: "50%",
                          color: active || complete ? "primary.contrastText" : "text.secondary",
                          display: "grid",
                          flexShrink: 0,
                          fontSize: ".75rem",
                          fontWeight: 700,
                          height: 30,
                          placeItems: "center",
                          width: 30,
                        }}
                      >
                        {complete ? <CheckRoundedIcon sx={{ fontSize: 17 }} /> : itemStep}
                      </Box>
                      <Typography sx={{ fontWeight: active ? 700 : 500 }} variant="body2">
                        {label}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </Stack>

            <Surface sx={{ alignSelf: "start", p: { xs: 2, sm: 3, lg: 3.5 } }}>
              <Stack spacing={{ xs: 2.25, sm: 2.75 }}>
                {panelTitle || panelDescription || icon ? (
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    {icon ? (
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
                        }}
                      >
                        {icon}
                      </Box>
                    ) : null}
                    <Box sx={{ minWidth: 0 }}>
                      {panelTitle ? (
                        <Typography component="h2" variant="h4">
                          {panelTitle}
                        </Typography>
                      ) : null}
                      {panelDescription ? (
                        <Typography color="text.secondary" sx={{ mt: 0.25 }} variant="body2">
                          {panelDescription}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                ) : null}
                {children}
              </Stack>
            </Surface>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
