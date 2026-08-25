"use client";

import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import DomainVerificationRoundedIcon from "@mui/icons-material/DomainVerificationRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import { Grid, Paper, Stack, Typography } from "@mui/material";

import { MarketingPageShell } from "@/components/content/marketing-page-shell";
import { useLanguage } from "@/components/providers/language-provider";

type SecurityItem = {
  icon: SvgIconComponent;
  title: string;
  swTitle: string;
  description: string;
  swDescription: string;
};

const items: SecurityItem[] = [
  {
    icon: LockRoundedIcon,
    title: "Authenticated access",
    swTitle: "Ufikiaji uliothibitishwa",
    description: "Users access Loji Business through authenticated accounts rather than shared public links.",
    swDescription: "Watumiaji huingia Loji Business kupitia akaunti zilizothibitishwa badala ya viungo vya wazi.",
  },
  {
    icon: AdminPanelSettingsRoundedIcon,
    title: "Role-based permissions",
    swTitle: "Ruhusa kulingana na jukumu",
    description: "Owners and managers can control what different staff roles are allowed to see and do.",
    swDescription: "Wamiliki na mameneja wanaweza kudhibiti kile ambacho kila jukumu la mfanyakazi linaweza kuona na kufanya.",
  },
  {
    icon: DomainVerificationRoundedIcon,
    title: "Property-level separation",
    swTitle: "Kutenganisha taarifa za kila jengo",
    description: "Operational information is scoped to the property workspace a user is authorised to access.",
    swDescription: "Taarifa za uendeshaji huonekana ndani ya jengo ambalo mtumiaji ameruhusiwa kulifikia.",
  },
  {
    icon: CloudDoneRoundedIcon,
    title: "Cloud-based service",
    swTitle: "Huduma ya wingu",
    description: "Loji Business uses managed cloud infrastructure to deliver the application, storage and supporting services.",
    swDescription: "Loji Business hutumia miundombinu ya wingu kusambaza programu, hifadhi na huduma zinazohusiana.",
  },
];

export default function SecurityPage() {
  const { t } = useLanguage();

  return (
    <MarketingPageShell
      eyebrow={["SECURITY & DATA", "USALAMA NA TAARIFA"]}
      title={[
        "Access controls designed around your property team.",
        "Udhibiti wa ufikiaji unaoendana na timu ya biashara yako.",
      ]}
      description={[
        "Loji Business is designed so property information is accessed through authenticated users, property membership and role permissions.",
        "Loji Business imeundwa ili taarifa za biashara zifikikiwe kupitia watumiaji waliothibitishwa, uanachama wa jengo na ruhusa za majukumu.",
      ]}
    >
      <Grid container spacing={2}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Grid size={{ xs: 12, sm: 6 }} key={item.title}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%", borderRadius: 2 }}>
                <Stack spacing={1.5}>
                  <Icon color="primary" sx={{ fontSize: 30 }} />
                  <Typography variant="h5" fontWeight={760}>
                    {t(item.title, item.swTitle)}
                  </Typography>
                  <Typography color="text.secondary" lineHeight={1.75}>
                    {t(item.description, item.swDescription)}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Paper variant="outlined" sx={{ mt: 3, p: { xs: 2.5, sm: 3.5 }, borderRadius: 2 }}>
        <Typography fontWeight={760} mb={1}>
          {t("Your responsibilities", "Wajibu wako")}
        </Typography>
        <Typography color="text.secondary" lineHeight={1.75}>
          {t(
            "Property owners and authorised administrators remain responsible for choosing appropriate staff access, removing access when roles change, and handling guest and business information according to applicable requirements.",
            "Wamiliki na wasimamizi walioidhinishwa wanaendelea kuwajibika kutoa ruhusa zinazofaa, kuondoa ruhusa majukumu yanapobadilika, na kushughulikia taarifa za wageni na biashara kwa mujibu wa masharti yanayotumika.",
          )}
        </Typography>
      </Paper>
    </MarketingPageShell>
  );
}
