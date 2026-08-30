"use client";

import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import DomainRoundedIcon from "@mui/icons-material/DomainRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import { Grid, Paper, Stack, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

import { MarketingPageShell } from "@/components/content/marketing-page-shell";
import { useLanguage } from "@/components/providers/language-provider";

type FeatureItem = {
  icon: SvgIconComponent;
  title: string;
  swTitle: string;
  description: string;
  swDescription: string;
};

const items: FeatureItem[] = [
  {
    icon: HotelRoundedIcon,
    title: "Room management",
    swTitle: "Usimamizi wa vyumba",
    description: "See room availability and operational status from one workspace.",
    swDescription: "Ona upatikanaji na hali ya vyumba kutoka sehemu moja.",
  },
  {
    icon: EventAvailableRoundedIcon,
    title: "Bookings",
    swTitle: "Uhifadhi",
    description: "Create, confirm, check in and check out bookings with less paperwork.",
    swDescription: "Tengeneza, thibitisha, ingiza na ondoa wageni kwa urahisi.",
  },
  {
    icon: GroupsRoundedIcon,
    title: "Guest records",
    swTitle: "Taarifa za wageni",
    description: "Keep useful guest and stay information organised and easy to retrieve.",
    swDescription: "Hifadhi taarifa muhimu za wageni na ukaaji kwa mpangilio.",
  },
  {
    icon: BadgeRoundedIcon,
    title: "Staff & permissions",
    swTitle: "Wafanyakazi na ruhusa",
    description: "Give owners, managers and reception staff the right level of access.",
    swDescription: "Wape wamiliki, mameneja na mapokezi ruhusa zinazofaa.",
  },
  {
    icon: AnalyticsRoundedIcon,
    title: "Operational visibility",
    swTitle: "Mwonekano wa shughuli",
    description: "Follow occupancy, arrivals, departures and daily operations at a glance.",
    swDescription: "Fuatilia matumizi ya vyumba, wanaoingia, wanaotoka na shughuli za kila siku.",
  },
  {
    icon: DomainRoundedIcon,
    title: "Multiple properties",
    swTitle: "Majengo mengi",
    description: "Move between properties from one account when your business grows.",
    swDescription: "Simamia majengo mengi kutoka akaunti moja biashara yako inapokua.",
  },
];

export default function FeaturesPage() {
  const { t } = useLanguage();

  return (
    <MarketingPageShell
      eyebrow={["PRODUCT FEATURES", "VIPENGELE VYA BIDHAA"]}
      title={[
        "Everything your property needs to stay organised.",
        "Kila unachohitaji kuendesha biashara kwa mpangilio.",
      ]}
      description={[
        "Loji Business connects rooms, bookings, guests, staff and daily property operations in one focused workspace.",
        "Loji Business inaunganisha vyumba, uhifadhi, wageni, wafanyakazi na shughuli za kila siku katika sehemu moja.",
      ]}
    >
      <Grid container spacing={2}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Grid size={{ xs: 12, md: 6 }} key={item.title}>
              <Paper variant="outlined" sx={{ height: "100%", p: { xs: 2.5, sm: 3 }, borderRadius: 2 }}>
                <Stack spacing={2}>
                  <Icon color="primary" sx={{ fontSize: 32 }} />
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {t(item.title, item.swTitle)}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
                    {t(item.description, item.swDescription)}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </MarketingPageShell>
  );
}
