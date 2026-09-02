"use client";

import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import { Box, Divider, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import {
  configuredRoomCount,
  hospitalityBusinessTypes,
  staffRoles,
  type BusinessSetupDraft,
} from "@/features/onboarding/models/business-setup";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function RegistrationReview({ draft }: { draft: BusinessSetupDraft }) {
  const { t } = useLanguage();
  const type = hospitalityBusinessTypes.find(
    (option) => option.value === draft.businessType,
  );

  return (
    <Stack divider={<Divider flexItem />} spacing={0}>
      <ReviewSection
        icon={<BusinessRoundedIcon />}
        title={t("Business", "Biashara")}
      >
        <ReviewValue
          label={t("Type", "Aina")}
          value={type ? t(type.label[0], type.label[1]) : "—"}
        />
        <ReviewValue label={t("Name", "Jina")} value={draft.businessName} />
        <ReviewValue label={t("Phone", "Simu")} value={draft.businessPhone} />
      </ReviewSection>

      <ReviewSection icon={<LocationOnRoundedIcon />} title={t("Location", "Eneo")}>
        <Typography color="text.secondary" variant="body2">
          {[draft.street, draft.ward, draft.district, draft.region, "Tanzania"]
            .filter(Boolean)
            .join(", ")}
        </Typography>
      </ReviewSection>

      <ReviewSection icon={<HotelRoundedIcon />} title={t("Rooms", "Vyumba")}>
        <ReviewValue
          label={t("Total rooms", "Jumla ya vyumba")}
          value={String(configuredRoomCount(draft.roomGroups))}
        />
        {draft.roomGroups.map((group) => (
          <ReviewValue
            key={group.id}
            label={t(
              `${group.count} ${group.roomType} room${group.count === 1 ? "" : "s"}`,
              `Vyumba ${group.count} · ${group.roomType}`,
            )}
            value={money.format(Number(group.pricePerNight) || 0)}
          />
        ))}
      </ReviewSection>

      <ReviewSection icon={<GroupsRoundedIcon />} title={t("Team access", "Ruhusa za timu")}>
        {draft.staff.length ? (
          draft.staff.map((member) => {
            const role = staffRoles.find((option) => option.value === member.role);
            return (
              <ReviewValue
                key={member.id}
                label={member.email}
                value={role ? t(role.label[0], role.label[1]) : member.role}
              />
            );
          })
        ) : (
          <Typography color="text.secondary" variant="body2">
            {t("Only the owner will have access for now.", "Kwa sasa, mmiliki pekee ndiye atakuwa na ruhusa.")}
          </Typography>
        )}
      </ReviewSection>
    </Stack>
  );
}
function ReviewSection({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: ReactNode;
}) {
  return (
    <Stack spacing={1.25} sx={{ py: 2.25 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box sx={{ color: "primary.main", display: "grid", placeItems: "center", "& .MuiSvgIcon-root": { fontSize: 20 } }}>
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      </Stack>
      <Stack spacing={0.8}>{children}</Stack>
    </Stack>
  );
}

function ReviewValue({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, textAlign: "right" }} variant="body2">
        {value}
      </Typography>
    </Stack>
  );
}
