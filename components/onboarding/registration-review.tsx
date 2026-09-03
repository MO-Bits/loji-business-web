"use client";

import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import {
  configuredRoomCount,
  hospitalityBusinessTypes,
  staffRoles,
  type BusinessSetupDraft,
  type SetupStepSlug,
} from "@/features/onboarding/models/business-setup";
import { acceptedPaymentMethods, propertyOfferings } from "@/features/property/property-catalog";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function RegistrationReview({ draft, onEdit }: { draft: BusinessSetupDraft; onEdit: (slug: SetupStepSlug) => void }) {
  const { t } = useLanguage();
  const type = hospitalityBusinessTypes.find(
    (option) => option.value === draft.businessType,
  );

  return (
    <Stack divider={<Divider flexItem />} spacing={0}>
      <ReviewSection
        icon={<BusinessRoundedIcon />}
        title={t("Business", "Biashara")}
        onEdit={() => onEdit("type")}
      >
        <ReviewValue
          label={t("Type", "Aina")}
          value={type ? t(type.label[0], type.label[1]) : "—"}
        />
        <ReviewValue label={t("Name", "Jina")} value={draft.businessName} />
        <ReviewValue label={t("Phone", "Simu")} value={draft.businessPhone} />
        <ReviewValue label={t("Email", "Barua pepe")} value={draft.businessEmail} />
        {draft.description ? <Typography color="text.secondary" variant="body2">{draft.description}</Typography> : null}
      </ReviewSection>

      <ReviewSection icon={<LocalOfferRoundedIcon />} title={t("Services and amenities", "Huduma na vifaa")} onEdit={() => onEdit("offerings")}>
        <Typography color="text.secondary" variant="body2">
          {draft.amenities.length
            ? draft.amenities.map((value) => {
                const offering = propertyOfferings.find((item) => item.value === value);
                return offering ? t(offering.label[0], offering.label[1]) : value;
              }).join(" · ")
            : t("No listed offerings", "Hakuna huduma iliyochaguliwa")}
        </Typography>
        <ReviewValue
          label={t("Accepted payments", "Malipo yanayokubaliwa")}
          value={draft.paymentMethods.map((value) => {
            const method = acceptedPaymentMethods.find((item) => item.value === value);
            return method ? t(method.label[0], method.label[1]) : value;
          }).join(", ")}
        />
      </ReviewSection>

      <ReviewSection icon={<AccessTimeRoundedIcon />} title={t("Guest schedule", "Ratiba ya wageni")} onEdit={() => onEdit("schedule")}>
        <ReviewValue label={t("Check-in", "Kuingia")} value={draft.checkinTime} />
        <ReviewValue label={t("Checkout", "Kutoka")} value={draft.checkoutTime} />
      </ReviewSection>

      <ReviewSection icon={<LocationOnRoundedIcon />} title={t("Location", "Eneo")} onEdit={() => onEdit("area")}>
        <Typography color="text.secondary" variant="body2">
          {[draft.street, draft.ward, draft.district, draft.region, "Tanzania"]
            .filter(Boolean)
            .join(", ")}
        </Typography>
      </ReviewSection>

      <ReviewSection icon={<HotelRoundedIcon />} title={t("Rooms", "Vyumba")} onEdit={() => onEdit("room-count")}>
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
            value={t(
              `${money.format(Number(group.pricePerNight) || 0)} · ${group.capacity} guests · ${group.bedCount} beds`,
              `${money.format(Number(group.pricePerNight) || 0)} · wageni ${group.capacity} · vitanda ${group.bedCount}`,
            )}
          />
        ))}
      </ReviewSection>

      <ReviewSection icon={<GroupsRoundedIcon />} title={t("Team access", "Ruhusa za timu")} onEdit={() => onEdit("staff")}>
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
  onEdit,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  onEdit: () => void;
  title: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <Stack spacing={1.25} sx={{ py: 2.25 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box sx={{ color: "primary.main", display: "grid", placeItems: "center", "& .MuiSvgIcon-root": { fontSize: 20 } }}>
          {icon}
        </Box>
        <Typography sx={{ flex: 1, fontWeight: 700 }}>{title}</Typography>
        <Button onClick={onEdit} size="small" startIcon={<EditRoundedIcon />}>
          {t("Edit", "Hariri")}
        </Button>
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
