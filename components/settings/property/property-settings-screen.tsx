"use client";

import Link from "next/link";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { Box, Button, Chip, Divider, Stack, Typography } from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";
import { SettingsPageHeader, SettingsSection } from "@/components/settings/settings-shared";
import { MetricCell, Surface } from "@/components/shared/workspace-ui";
import { usePropertySettings } from "@/features/settings/property/hooks/use-property-settings";
import { formatLocalDateTime } from "@/lib/date-time";
import {
  PropertySettingLink,
  PropertySettingsError,
  PropertySettingsLoading,
} from "./property-settings-shared";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function propertyTypeLabel(value: string, t: (english: string, swahili: string) => string) {
  return ["hotel", "lodge", "guesthouse"].includes(value.trim().toLowerCase())
    ? titleCase(value)
    : t("Protected existing property", "Biashara iliyopo iliyolindwa");
}

export function PropertySettingsScreen() {
  const { t } = useLanguage();
  const { error, loading, refresh, workspace } = usePropertySettings();

  if (loading) return <PropertySettingsLoading />;
  if (!workspace) return <PropertySettingsError message={error ?? t("Property settings were not found.", "Mipangilio ya biashara haijapatikana.")} onRetry={() => void refresh()} />;

  const { property, capabilities, role } = workspace;
  const canUpdate = capabilities.updateProperty;
  const contactReady = Boolean(property.phone && property.email);
  const locationReady = Boolean(property.formattedAddress || property.country || property.region);
  const operationsReady = Boolean(property.timezone && property.checkinTime && property.checkoutTime);
  const setupChecks = [
    Boolean(property.name && property.description && property.propertyType),
    contactReady,
    locationReady,
    operationsReady,
    property.amenities.length > 0,
    property.paymentMethods.length > 0,
  ];
  const completed = setupChecks.filter(Boolean).length;
  const progress = Math.round((completed / setupChecks.length) * 100);
  const address = property.formattedAddress || [property.street, property.ward, property.district, property.region, property.country].filter(Boolean).join(", ");

  return (
    <Stack spacing={{ xs: 2.5, sm: 3 }}>
      <SettingsPageHeader
        action={canUpdate ? <Button component={Link} href="/settings/property/profile" startIcon={<EditRoundedIcon />} variant="contained">{t("Edit property", "Hariri biashara")}</Button> : undefined}
        description={t("Control the business identity, local address, services, accepted payments and operating rules for this workspace.", "Dhibiti utambulisho wa biashara, anwani, huduma, njia za malipo na kanuni za uendeshaji.")}
        eyebrow={t("Workspace administration", "Usimamizi wa biashara")}
        icon={<BusinessRoundedIcon />}
        title={t("Property settings", "Mipangilio ya biashara")}
      />

      {error ? <PropertySettingsError message={error} onRetry={() => void refresh()} /> : null}

      <Surface padding={false}>
        <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack spacing={1.25} sx={{ alignItems: "flex-start" }}>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
              <Chip label={propertyTypeLabel(property.propertyType, t)} size="small" variant="outlined" />
              <Chip color={property.isActive ? "success" : "warning"} label={property.isActive ? t("Active property", "Biashara inatumika") : t("Property hidden", "Biashara imefichwa")} size="small" variant="outlined" />
            </Stack>
            <Typography component="h2" variant="h3">{property.name}</Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-start", color: "text.secondary", maxWidth: 760 }}><PlaceOutlinedIcon fontSize="small" /><Typography variant="body2">{address || t("Location not configured", "Eneo halijawekwa")}</Typography></Stack>
          </Stack>
        </Box>
      </Surface>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))" } }}>
        <MetricCell caption={t(`${completed} of ${setupChecks.length} areas complete`, `Sehemu ${completed} kati ya ${setupChecks.length} zimekamilika`)} icon={<TuneRoundedIcon />} label={t("Profile readiness", "Utayari wa wasifu")} tone={progress === 100 ? "success" : "info"} value={`${progress}%`} />
        <MetricCell caption={property.amenities.length ? t("Guest-facing facilities", "Huduma za wageni") : t("Add your facilities", "Ongeza huduma zako")} icon={<LocalOfferOutlinedIcon />} label={t("Amenities", "Huduma")} value={property.amenities.length} />
        <MetricCell caption={t("Accepted at the front desk", "Zinazokubaliwa mapokezi")} icon={<PublicOutlinedIcon />} label={t("Payment methods", "Njia za malipo")} value={property.paymentMethods.length} />
        <MetricCell caption={`${property.checkinTime} → ${property.checkoutTime}`} icon={<ScheduleOutlinedIcon />} label={t("Guest schedule", "Ratiba ya wageni")} tone="info" value={property.timezone.split("/").at(-1)?.replaceAll("_", " ") ?? property.timezone} />
      </Box>

      <Box sx={{ alignItems: "start", display: "grid", gap: { xs: 2.5, lg: 3 }, gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,1.2fr) minmax(320px,.8fr)" } }}>
        <Stack spacing={2.5}>
          <SettingsSection description={t("Every section opens a focused editor and saves independently.", "Kila sehemu hufungua ukurasa wake na kuhifadhi kivyake.")} title={t("Business configuration", "Mpangilio wa biashara")}>
            <Stack divider={<Divider flexItem />}>
              <PropertySettingLink description={t("Name, description, property type, phone and email", "Jina, maelezo, aina, simu na barua pepe")} href={canUpdate ? "/settings/property/profile" : undefined} icon={<BadgeOutlinedIcon />} meta={property.phone || t("Phone required", "Simu inahitajika")} title={t("Identity and contact", "Utambulisho na mawasiliano")} />
              <PropertySettingLink description={t("Tanzania region, district, ward and local street or landmark", "Mkoa, wilaya, kata na mtaa au alama ya karibu Tanzania")} href={canUpdate ? "/settings/property/location" : undefined} icon={<PlaceOutlinedIcon />} meta={address || t("Not configured", "Haijawekwa")} title={t("Location", "Eneo")} />
              <PropertySettingLink description={t("Guest arrival/departure times and accepted payment methods", "Muda wa wageni kuingia/kutoka na njia za malipo")} href={canUpdate ? "/settings/property/operations" : undefined} icon={<ScheduleOutlinedIcon />} meta={`${property.checkinTime} ${t("check-in", "kuingia")} · ${property.checkoutTime} ${t("checkout", "kutoka")}`} title={t("Operations and payments", "Uendeshaji na malipo")} />
              <PropertySettingLink description={t("Facilities and services shown across the business workspace", "Huduma zinazoonyeshwa katika mfumo wa biashara")} href={canUpdate ? "/settings/property/amenities" : undefined} icon={<LocalOfferOutlinedIcon />} meta={t(`${property.amenities.length} selected`, `${property.amenities.length} zimechaguliwa`)} title={t("Amenities", "Huduma")} />
              <PropertySettingLink description={t("Control whether the property is active and visible to booking flows", "Dhibiti kama biashara inatumika na inaonekana kwenye utaratibu wa uhifadhi")} href={capabilities.changeVisibility ? "/settings/property/visibility" : undefined} icon={<PublicOutlinedIcon />} meta={property.isActive ? t("Active", "Inatumika") : t("Hidden", "Imefichwa")} title={t("Status and visibility", "Hali na mwonekano")} />
            </Stack>
          </SettingsSection>

          <SettingsSection description={t("A concise summary guests and teammates can trust.", "Muhtasari mfupi ambao wageni na timu wanaweza kuamini.")} title={t("About this property", "Kuhusu biashara hii")}>
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography color={property.description ? "text.primary" : "text.secondary"} sx={{ lineHeight: 1.75 }} variant="body2">{property.description || t("No property description has been added yet.", "Maelezo ya biashara hayajaongezwa bado.")}</Typography>
              {property.amenities.length ? <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 2 }}>{property.amenities.slice(0, 12).map((amenity) => <Chip key={amenity} label={t(amenity)} size="small" variant="outlined" />)}{property.amenities.length > 12 ? <Chip color="primary" label={`+${property.amenities.length - 12}`} size="small" /> : null}</Box> : null}
            </Box>
          </SettingsSection>
        </Stack>

        <Stack spacing={2.5}>
          <SettingsSection description={t("The operational contact card for this workspace.", "Kadi ya mawasiliano ya uendeshaji wa biashara hii.")} title={t("At a glance", "Kwa muhtasari")}>
            <Stack divider={<Divider flexItem />}>
              <SummaryLine icon={<PhoneOutlinedIcon />} label={t("Phone", "Simu")} value={property.phone} />
              <SummaryLine icon={<EmailOutlinedIcon />} label={t("Email", "Barua pepe")} value={property.email} />
              <SummaryLine icon={<PlaceOutlinedIcon />} label={t("Address", "Anwani")} value={address} />
              <SummaryLine icon={<ScheduleOutlinedIcon />} label={t("Timezone", "Saa za eneo")} value={property.timezone} />
              <SummaryLine icon={<BusinessRoundedIcon />} label={t("Role", "Jukumu")} value={titleCase(role)} />
            </Stack>
          </SettingsSection>

          <Surface>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
              <Box sx={{ bgcolor: "color-mix(in srgb, var(--mui-palette-success-main) 10%, transparent)", borderRadius: 2, color: "success.main", display: "grid", flexShrink: 0, height: 40, placeItems: "center", width: 40 }}><CheckCircleRoundedIcon fontSize="small" /></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Server-controlled settings", "Mipangilio inayodhibitiwa na seva")}</Typography><Typography color="text.secondary" sx={{ mt: 0.35 }} variant="body2">{t("Changes are permission-checked and recorded in the property activity log.", "Mabadiliko hukaguliwa kwa ruhusa na kurekodiwa kwenye historia ya biashara.")}</Typography>{property.updatedAt ? <Typography color="text.secondary" sx={{ display: "block", mt: 1 }} variant="caption">{t("Last updated", "Ilisasishwa mwisho")}: {formatLocalDateTime(property.updatedAt)}</Typography> : null}</Box>
            </Stack>
          </Surface>

        </Stack>
      </Box>
    </Stack>
  );
}

function SummaryLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const { t } = useLanguage();
  return <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", px: { xs: 2, sm: 2.5 }, py: 1.5 }}><Box sx={{ color: "primary.main", display: "grid", mt: 0.1, placeItems: "center", "& .MuiSvgIcon-root": { fontSize: 19 } }}>{icon}</Box><Typography color="text.secondary" sx={{ flex: "0 0 72px" }} variant="body2">{label}</Typography><Typography sx={{ flex: 1, fontWeight: 500, overflowWrap: "anywhere", textAlign: "right" }} variant="body2">{value || t("Not provided", "Haijawekwa")}</Typography></Stack>;
}
