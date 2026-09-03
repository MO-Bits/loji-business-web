"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CallRoundedIcon from "@mui/icons-material/CallRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import SignpostRoundedIcon from "@mui/icons-material/SignpostRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import { Alert, Box } from "@mui/material";
import type { ReactNode } from "react";

import { FullPageLoader } from "@/components/shared/full-page-loader";
import { SessionErrorScreen } from "@/components/shared/session-error-screen";
import { useLanguage } from "@/components/providers/language-provider";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { AppStatus, AppStep } from "@/features/session/models/app-status";
import { normalizeWorkspaceRole } from "@/features/session/permissions";
import {
  configuredRoomCount,
  clearLegacyPropertySetupDrafts,
  createBusinessSetupDraft,
  isEmail,
  MAX_ONBOARDING_ROOMS,
  normalizeRoomGroups,
  restoreBusinessSetupDraft,
  setupDraftStorageKey,
  setupStepSlugs,
  tanzaniaRegions,
  type BusinessSetupDraft,
  type SetupStepSlug,
} from "@/features/onboarding/models/business-setup";
import { completeBusinessRegistration } from "@/features/onboarding/services/business-registration-service";
import { createClient } from "@/lib/supabase/client";

import {
  BusinessAddressStep,
  BusinessAreaStep,
  BusinessContactStep,
  BusinessNameStep,
  BusinessTypeStep,
  RoomCountStep,
} from "./business-setup-steps";
import { RegistrationReview } from "./registration-review";
import { RoomGroupsStep } from "./room-groups-step";
import { SetupShell } from "./setup-shell";
import { StaffAccessStep } from "./staff-access-step";
import {
  AcceptedPaymentsStep,
  BusinessDescriptionStep,
  OperatingScheduleStep,
  PropertyOfferingsStep,
} from "./property-details-steps";

type Translation = readonly [english: string, swahili: string];

const stepContent: ReadonlyArray<{
  slug: SetupStepSlug;
  title: Translation;
  description: Translation;
  icon: ReactNode;
}> = [
  {
    slug: "type",
    title: ["What kind of business do you run?", "Unaendesha biashara ya aina gani?"],
    description: [
      "Loji Business is purpose-built for hotels, lodges and guesthouses.",
      "Loji Business imeundwa mahsusi kwa hoteli, loji na nyumba za wageni.",
    ],
    icon: <StorefrontRoundedIcon />,
  },
  {
    slug: "name",
    title: ["What is your business called?", "Biashara yako inaitwaje?"],
    description: [
      "Use the name guests and staff already know.",
      "Tumia jina ambalo wageni na wafanyakazi tayari wanalifahamu.",
    ],
    icon: <BadgeRoundedIcon />,
  },
  {
    slug: "contact",
    title: ["How can guests reach the business?", "Wageni watawasilianaje na biashara?"],
    description: [
      "Add the main business phone number. A separate business email is optional.",
      "Weka namba kuu ya simu ya biashara. Barua pepe tofauti ya biashara si lazima.",
    ],
    icon: <CallRoundedIcon />,
  },
  {
    slug: "description",
    title: ["How would you describe the property?", "Unaielezeaje biashara yako?"],
    description: ["A short description helps managers and staff identify the workspace. You can skip it.", "Maelezo mafupi huwasaidia mameneja na wafanyakazi kuitambua biashara. Unaweza kuruka."],
    icon: <NotesRoundedIcon />,
  },
  {
    slug: "area",
    title: ["Which area is the business in?", "Biashara ipo eneo gani?"],
    description: [
      "Choose the region and enter the district manually.",
      "Chagua mkoa na uweke wilaya mwenyewe.",
    ],
    icon: <LocationOnRoundedIcon />,
  },
  {
    slug: "address",
    title: ["Add a simple local address", "Weka anwani rahisi ya eneo"],
    description: [
      "Add a ward, street or nearby landmark that staff and guests can recognise.",
      "Weka kata, mtaa au alama ya karibu ambayo wafanyakazi na wageni wanaweza kuitambua.",
    ],
    icon: <SignpostRoundedIcon />,
  },
  {
    slug: "offerings",
    title: ["What is available at the property?", "Ni huduma gani zinapatikana?"],
    description: ["Check every facility and guest service you currently provide.", "Weka tiki kwenye vifaa na huduma zote unazotoa sasa."],
    icon: <LocalOfferRoundedIcon />,
  },
  {
    slug: "payments",
    title: ["How can guests pay?", "Wageni wanaweza kulipaje?"],
    description: ["Check every payment method the front desk can accept.", "Weka tiki kwenye njia zote za malipo zinazokubaliwa mapokezi."],
    icon: <CreditCardRoundedIcon />,
  },
  {
    slug: "schedule",
    title: ["When do guests check in and out?", "Wageni wanaingia na kutoka saa ngapi?"],
    description: ["Set the standard times used to flag overdue arrivals and departures.", "Weka muda wa kawaida utakaotumika kuonyesha waliochelewa kuingia au kutoka."],
    icon: <AccessTimeRoundedIcon />,
  },
  {
    slug: "room-count",
    title: ["How many bookable rooms are there?", "Kuna vyumba vingapi vinavyohifadhiwa?"],
    description: [
      "We will create this room inventory as part of registration.",
      "Tutaunda orodha hii ya vyumba wakati wa usajili.",
    ],
    icon: <MeetingRoomRoundedIcon />,
  },
  {
    slug: "room-details",
    title: ["Configure the rooms", "Panga taarifa za vyumba"],
    description: [
      "Group rooms that share a type, price, guest capacity and bed count.",
      "Panga pamoja vyumba vyenye aina, bei, uwezo wa wageni na idadi ya vitanda inayofanana.",
    ],
    icon: <TuneRoundedIcon />,
  },
  {
    slug: "staff",
    title: ["Who should have access?", "Nani apewe ruhusa?"],
    description: [
      "Add staff emails and roles now, or continue alone. Existing Loji accounts receive access immediately; all others can claim pending access within 30 days.",
      "Weka barua pepe na majukumu ya wafanyakazi sasa, au endelea mwenyewe. Akaunti zilizopo za Loji hupata ruhusa mara moja; nyingine zinaweza kudai ruhusa ndani ya siku 30.",
    ],
    icon: <GroupsRoundedIcon />,
  },
  {
    slug: "review",
    title: ["Ready to create your workspace", "Tayari kuunda eneo lako la kazi"],
    description: [
      "Review the essentials. You can edit individual room names and other settings later.",
      "Kagua taarifa muhimu. Unaweza kubadilisha majina ya vyumba na mipangilio mingine baadaye.",
    ],
    icon: <FactCheckRoundedIcon />,
  },
];

export function BusinessSetupFlow() {
  const router = useRouter();
  const sessionState = useAppSession();
  const session = sessionState.session;
  const propertySetupAllowed = session?.status === AppStatus.Onboarding &&
    (session.step === AppStep.PropertyBasic || session.step === AppStep.PropertyAddress) &&
    Boolean(session.user);

  useEffect(() => {
    if (sessionState.loading || sessionState.error || propertySetupAllowed) return;
    if (!session?.user || session.status === AppStatus.Unauthenticated) {
      router.replace("/login");
      return;
    }
    if (session.status === AppStatus.Inactive) {
      router.replace("/inactive");
      return;
    }
    if (session.status === AppStatus.Ready) {
      const role = normalizeWorkspaceRole(session.activeRole);
      router.replace(role === "owner" ? "/dashboard" : role === "manager" || role === "receptionist" ? "/front-desk" : "/settings/profile");
      return;
    }
    router.replace(session.step === AppStep.Profile ? "/onboarding/profile" : "/");
  }, [propertySetupAllowed, router, session, sessionState.error, sessionState.loading]);

  if (sessionState.error) {
    return <SessionErrorScreen error={sessionState.error} onRetry={() => void sessionState.refresh()} />;
  }

  const user = session?.user;
  if (sessionState.loading || !propertySetupAllowed || !user) return <FullPageLoader />;

  return (
    <ReadyBusinessSetupFlow
      key={user.id}
      ownerEmail={user.email ?? ""}
      ownerId={user.id}
      refreshSession={sessionState.refresh}
    />
  );
}

function ReadyBusinessSetupFlow({
  ownerEmail,
  ownerId,
  refreshSession,
}: {
  ownerEmail: string;
  ownerId: string;
  refreshSession: () => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [draft, setDraft] = useState<BusinessSetupDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(
          window.localStorage.getItem(setupDraftStorageKey(ownerId)) ?? "null",
        ) as unknown;
        setDraft(restoreBusinessSetupDraft(saved, ownerEmail));
      } catch {
        setDraft(createBusinessSetupDraft(ownerEmail));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ownerEmail, ownerId]);

  if (!draft) return <FullPageLoader />;

  const requestedStep = searchParams.get("step");
  const returnToReview = searchParams.get("return") === "review";
  const requestedIndex = setupStepSlugs.findIndex((slug) => slug === requestedStep);
  const stepIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const step = stepContent[stepIndex];

  const commit = (next: BusinessSetupDraft) => {
    setDraft(next);
    setError(null);
    try {
      window.localStorage.setItem(setupDraftStorageKey(ownerId), JSON.stringify(next));
    } catch {
      // The database request key still protects completion if storage is unavailable.
    }
  };

  const goToStep = (index: number, returnAfterEdit = false) => {
    const nextIndex = Math.max(0, Math.min(stepContent.length - 1, index));
    setError(null);
    const params = new URLSearchParams({ step: stepContent[nextIndex].slug });
    if (returnAfterEdit && nextIndex < stepContent.length - 1) params.set("return", "review");
    router.replace(`/onboarding/property?${params.toString()}`, {
      scroll: false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const errorForStep = (index: number): string | null => {
    switch (setupStepSlugs[index]) {
      case "type":
        return draft.businessType
          ? null
          : t("Choose Hotel, Lodge or Guesthouse.", "Chagua Hoteli, Loji au Nyumba ya wageni.");
      case "name":
        return draft.businessName.trim().length >= 2
          ? null
          : t("Enter the business name.", "Weka jina la biashara.");
      case "contact": {
        const phoneDigits = draft.businessPhone.replace(/[^0-9]/g, "");
        if (phoneDigits.length < 7 || phoneDigits.length > 15) {
          return t("Enter a valid business phone number.", "Weka namba sahihi ya simu ya biashara.");
        }
        if (draft.businessEmail.trim() && !isEmail(draft.businessEmail)) {
          return t("Enter a valid business email.", "Weka barua pepe sahihi ya biashara.");
        }
        return null;
      }
      case "description":
        return draft.description.length <= 2000
          ? null
          : t("Keep the description under 2,000 characters.", "Maelezo yawe na herufi zisizozidi 2,000.");
      case "area":
        return tanzaniaRegions.some((region) => region === draft.region) &&
          draft.district.trim()
          ? null
          : t("Choose a region and enter the district.", "Chagua mkoa na uweke wilaya.");
      case "address":
        return draft.ward.trim() || draft.street.trim()
          ? null
          : t("Add a ward, street or nearby landmark.", "Weka kata, mtaa au alama ya karibu.");
      case "offerings":
        return null;
      case "payments":
        return draft.paymentMethods.length
          ? null
          : t("Choose at least one accepted payment method.", "Chagua angalau njia moja ya malipo.");
      case "schedule":
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.checkinTime) &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.checkoutTime) &&
          draft.checkinTime !== draft.checkoutTime
          ? null
          : t("Choose valid and different check-in and checkout times.", "Chagua muda sahihi na tofauti wa kuingia na kutoka.");
      case "room-count":
        return Number.isInteger(draft.roomCount) &&
          draft.roomCount >= 1 &&
          draft.roomCount <= MAX_ONBOARDING_ROOMS
          ? null
          : t("Enter between 1 and 300 rooms.", "Weka vyumba kati ya 1 na 300.");
      case "room-details": {
        if (configuredRoomCount(draft.roomGroups) !== draft.roomCount) {
          return t(
            `Configure exactly ${draft.roomCount} rooms before continuing.`,
            `Panga vyumba vyote ${draft.roomCount} kabla ya kuendelea.`,
          );
        }
        const invalid = draft.roomGroups.some((group) => {
          const price = Number(group.pricePerNight);
          return !Number.isInteger(group.count) || group.count < 1 ||
            !Number.isFinite(price) || price < 1 || price > 100_000_000 ||
            !Number.isInteger(group.capacity) || group.capacity < 1 || group.capacity > 20 ||
            !Number.isInteger(group.bedCount) || group.bedCount < 1 ||
            group.bedCount > group.capacity;
        });
        return invalid
          ? t(
              "Check the count, nightly price, guests and beds for every room group.",
              "Kagua idadi, bei kwa usiku, wageni na vitanda kwa kila kundi la vyumba.",
            )
          : null;
      }
      case "staff": {
        const emails = draft.staff.map((member) => member.email.trim().toLowerCase());
        if (emails.some((email) => !isEmail(email))) {
          return t("Enter a valid email for every teammate.", "Weka barua pepe sahihi kwa kila mfanyakazi.");
        }
        if (new Set(emails).size !== emails.length) {
          return t("Each teammate email can only be added once.", "Kila barua pepe ya mfanyakazi iwekwe mara moja tu.");
        }
        if (emails.includes(ownerEmail.trim().toLowerCase())) {
          return t("The owner email cannot also be added as staff.", "Barua pepe ya mmiliki haiwezi kuongezwa tena kama mfanyakazi.");
        }
        return null;
      }
      case "review":
        return null;
    }
  };

  const continueSetup = async () => {
    if (saving) return;
    if (stepIndex < stepContent.length - 1) {
      const validationError = errorForStep(stepIndex);
      if (validationError) {
        setError(validationError);
        return;
      }
      if (returnToReview) {
        goToStep(stepContent.length - 1);
        return;
      }
      goToStep(stepIndex + 1);
      return;
    }

    for (let index = 0; index < stepContent.length - 1; index += 1) {
      const validationError = errorForStep(index);
      if (validationError) {
        goToStep(index);
        setError(validationError);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await completeBusinessRegistration(createClient(), draft);
      window.localStorage.removeItem(setupDraftStorageKey(ownerId));
      clearLegacyPropertySetupDrafts(ownerId);
      await refreshSession();
      window.location.replace("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("We could not complete registration.", "Hatukuweza kukamilisha usajili."),
      );
      setSaving(false);
    }
  };

  const signOut = async () => {
    if (saving) return;
    setSaving(true);
    await createClient().auth.signOut();
    window.location.replace("/login");
  };

  let content: ReactNode;
  switch (step.slug) {
    case "type":
      content = (
        <BusinessTypeStep
          onChange={(businessType) => commit({ ...draft, businessType })}
          value={draft.businessType}
        />
      );
      break;
    case "name":
      content = (
        <BusinessNameStep
          onChange={(businessName) => commit({ ...draft, businessName })}
          value={draft.businessName}
        />
      );
      break;
    case "contact":
      content = (
        <BusinessContactStep
          draft={draft}
          onChange={(field, value) => commit({ ...draft, [field]: value })}
        />
      );
      break;
    case "description":
      content = <BusinessDescriptionStep onChange={(description) => commit({ ...draft, description })} value={draft.description} />;
      break;
    case "area":
      content = (
        <BusinessAreaStep
          draft={draft}
          onChange={(field, value) => commit({ ...draft, [field]: value })}
        />
      );
      break;
    case "address":
      content = (
        <BusinessAddressStep
          draft={draft}
          onChange={(field, value) => commit({ ...draft, [field]: value })}
        />
      );
      break;
    case "offerings":
      content = <PropertyOfferingsStep onChange={(amenities) => commit({ ...draft, amenities })} value={draft.amenities} />;
      break;
    case "payments":
      content = <AcceptedPaymentsStep onChange={(paymentMethods) => commit({ ...draft, paymentMethods })} value={draft.paymentMethods} />;
      break;
    case "schedule":
      content = <OperatingScheduleStep checkinTime={draft.checkinTime} checkoutTime={draft.checkoutTime} onChange={(field, value) => commit({ ...draft, [field]: value })} />;
      break;
    case "room-count":
      content = (
        <RoomCountStep
          onChange={(roomCount) =>
            commit({
              ...draft,
              roomCount,
              roomGroups: normalizeRoomGroups(draft.roomGroups, roomCount),
            })
          }
          value={draft.roomCount}
        />
      );
      break;
    case "room-details":
      content = (
        <RoomGroupsStep
          groups={draft.roomGroups}
          onChange={(roomGroups) => commit({ ...draft, roomGroups })}
          roomCount={draft.roomCount}
        />
      );
      break;
    case "staff":
      content = (
        <StaffAccessStep
          onChange={(staff) => commit({ ...draft, staff })}
          staff={draft.staff}
        />
      );
      break;
    case "review":
      content = (
        <RegistrationReview
          draft={draft}
          onEdit={(slug) => goToStep(setupStepSlugs.indexOf(slug), true)}
        />
      );
      break;
  }

  return (
    <SetupShell
      description={t(step.description[0], step.description[1])}
      icon={step.icon}
      loading={saving}
      nextLabel={
        step.slug === "review"
          ? t("Create my business", "Unda biashara yangu")
          : undefined
      }
      onBack={returnToReview
        ? () => goToStep(stepContent.length - 1)
        : stepIndex
          ? () => goToStep(stepIndex - 1)
          : undefined}
      onNext={() => void continueSetup()}
      onSignOut={() => void signOut()}
      step={stepIndex + 2}
      title={t(step.title[0], step.title[1])}
      totalSteps={stepContent.length + 1}
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void continueSetup();
        }}
      >
        {error ? <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert> : null}
        {content}
      </Box>
    </SetupShell>
  );
}
