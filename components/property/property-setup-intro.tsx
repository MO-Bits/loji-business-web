"use client";

import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";

import { OnboardingFrame } from "@/components/auth/onboarding-frame";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";

const features = [
  {
    description: [
      "Add the details, facilities and photos your team will recognise.",
      "Ongeza taarifa, huduma na picha ambazo timu yako itatambua.",
    ],
    icon: ApartmentRoundedIcon,
    title: ["Property profile", "Wasifu wa biashara"],
  },
  {
    description: [
      "Set the entrance location so the workspace uses a reliable address.",
      "Weka eneo la kuingilia ili mfumo utumie anwani sahihi.",
    ],
    icon: EventAvailableRoundedIcon,
    title: ["Location & operations", "Eneo na shughuli"],
  },
  {
    description: [
      "Invite staff later and give each person the right level of access.",
      "Alika wafanyakazi baadaye na mpe kila mmoja ruhusa inayofaa.",
    ],
    icon: GroupsRoundedIcon,
    title: ["Team access", "Ruhusa za timu"],
  },
] as const;

export function PropertySetupIntro() {
  const router = useRouter();
  const { t } = useLanguage();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <OnboardingFrame
      action={
        <Button
          color="inherit"
          onClick={() => void signOut()}
          startIcon={<LogoutRoundedIcon />}
        >
          {t("Sign out", "Toka")}
        </Button>
      }
      description={t(
        "A short guided setup creates the shared workspace your rooms, bookings and team will use.",
        "Usanidi mfupi unaongozwa utatengeneza sehemu ya kazi ambayo vyumba, uhifadhi na timu yako vitatumia.",
      )}
      eyebrow={t("Property setup", "Usanidi wa biashara")}
      icon={<ApartmentRoundedIcon />}
      panelDescription={t(
        "You can update these details later in Settings",
        "Unaweza kubadili taarifa hizi baadaye kwenye Mipangilio",
      )}
      panelTitle={t("What you will set up", "Utakachoweka")}
      step={2}
      steps={[
        t("Personal profile", "Wasifu binafsi"),
        t("Property details", "Taarifa za biashara"),
        t("Location & finish", "Eneo na kumaliza"),
      ]}
      title={t(
        "Build your property workspace.",
        "Tengeneza sehemu ya kazi ya biashara yako.",
      )}
    >
      <Stack divider={<Divider flexItem />}>
        {features.map(({ description, icon: Icon, title }) => (
          <Stack
            direction="row"
            key={title[0]}
            spacing={2}
            sx={{ alignItems: "flex-start", py: 2 }}
          >
            <Box
              sx={{
                bgcolor:
                  "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
                borderRadius: 2,
                color: "primary.main",
                display: "grid",
                flexShrink: 0,
                height: 42,
                placeItems: "center",
                width: 42,
              }}
            >
              <Icon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>
                {t(title[0], title[1])}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ lineHeight: 1.65, mt: 0.35 }}
                variant="body2"
              >
                {t(description[0], description[1])}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>

      <Button
        component={Link}
        endIcon={<ArrowForwardRoundedIcon />}
        fullWidth
        href="/onboarding/property/basic"
        size="large"
        variant="contained"
      >
        {t("Start property setup", "Anza usanidi wa biashara")}
      </Button>
    </OnboardingFrame>
  );
}
