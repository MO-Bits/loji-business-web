"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { OnboardingFrame } from "@/components/auth/onboarding-frame";
import { useLanguage } from "@/components/providers/language-provider";

const steps = [
  {
    description: [
      "Find the property, street, ward or a nearby landmark.",
      "Tafuta biashara, mtaa, kata au alama ya karibu.",
    ],
    icon: SearchRoundedIcon,
    title: ["Search the area", "Tafuta eneo"],
  },
  {
    description: [
      "Move the map until the pin sits on the property entrance.",
      "Sogeza ramani hadi pini iwe kwenye mlango wa biashara.",
    ],
    icon: LocationOnRoundedIcon,
    title: ["Place the pin", "Weka pini"],
  },
  {
    description: [
      "Review the detected address before completing setup.",
      "Kagua anwani iliyopatikana kabla ya kukamilisha usanidi.",
    ],
    icon: ExploreRoundedIcon,
    title: ["Confirm the address", "Thibitisha anwani"],
  },
] as const;

export function PropertyAddressIntro() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <OnboardingFrame
      action={
        <Button
          color="inherit"
          onClick={() => router.back()}
          startIcon={<ArrowBackRoundedIcon />}
        >
          {t("Back", "Rudi")}
        </Button>
      }
      description={t(
        "Set the entrance guests and staff should use. Search by place name or move the pin directly on the map.",
        "Weka mlango ambao wageni na wafanyakazi watatumia. Tafuta kwa jina la eneo au sogeza pini moja kwa moja kwenye ramani.",
      )}
      eyebrow={t("Property location", "Eneo la biashara")}
      icon={<MapRoundedIcon />}
      panelDescription={t(
        "Final step — the map will suggest an address from your pin",
        "Hatua ya mwisho — ramani itapendekeza anwani kutokana na pini",
      )}
      panelTitle={t("Set an accurate location", "Weka eneo sahihi")}
      step={7}
      steps={[
        t("Property type", "Aina ya biashara"),
        t("Property name", "Jina la biashara"),
        t("Contact", "Mawasiliano"),
        t("Bookable spaces", "Sehemu za kuhifadhi"),
        t("Amenities", "Huduma"),
        t("Photos", "Picha"),
        t("Location", "Eneo"),
      ]}
      title={t("Where is your property?", "Biashara yako iko wapi?")}
    >
      <Stack divider={<Divider flexItem />}>
        {steps.map(({ description, icon: Icon, title }) => (
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
        href="/onboarding/property/address/map"
        size="large"
        variant="contained"
      >
        {t("Open location map", "Fungua ramani ya eneo")}
      </Button>
    </OnboardingFrame>
  );
}
