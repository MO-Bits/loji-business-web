"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Collapse,
  Container,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { createClient } from "@/lib/supabase/client";
import {
  createPropertyBooking,
  getAvailableRooms,
  sendBookingSms,
  type GuestInput,
} from "@/features/bookings/services/booking-service";
import type { AvailableRoom } from "@/features/bookings/models/booking";
import { getGuestWorkspace } from "@/features/guests/services/guest-service";
import { formatLocalDate, localDateKey } from "@/lib/date-time";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { trackEvent } from "@/lib/analytics";
import {
  getInventoryDefinition,
  getPropertyTypeDefinition,
} from "@/features/property/property-type";
import {
  acceptedPaymentMethods,
  normalizeAcceptedPaymentMethods,
  type AcceptedPaymentMethod,
} from "@/features/property/property-catalog";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});
const steps = ["Stay", "Room", "Guest", "Review"];
const draftPrefix = "loji-booking-preferences:v3";

type GuestForm = GuestInput & {
  whereFrom: string;
  whereTo: string;
  idType: string;
  idNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  specialRequests: string;
};

const emptyGuest: GuestForm = {
  firstName: "",
  lastName: "",
  gender: "",
  nationality: "Mtanzania",
  occupation: "",
  email: "",
  phone: "",
  whereFrom: "",
  whereTo: "",
  idType: "",
  idNumber: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  specialRequests: "",
};

function isDateKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

function nextDateKey(dateKey: string) {
  const value = new Date(`${dateKey}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function nightCount(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function NewBookingScreen() {
  const { session, loading, error } = useAppSession();
  const { t } = useLanguage();
  const capabilities = getWorkspaceCapabilities(session?.activeRole);
  const paymentMethods = normalizeAcceptedPaymentMethods(
    session?.property?.payment_methods ?? session?.property?.paymentMethods,
  );
  const businessDate = isDateKey(session?.property?.business_date)
    ? session.property.business_date
    : isDateKey(session?.property?.businessDate)
      ? session.property.businessDate
      : localDateKey();

  if (loading) return <BookingFlowSkeleton />;
  if (error || !session?.activePropertyId || !session.user?.id) {
    return <CenteredState severity="error" title={t("Booking workspace unavailable", "Eneo la uhifadhi halipatikani")}>{error?.message ?? t("Select an active property before creating a booking.", "Chagua biashara inayotumika kabla ya kutengeneza uhifadhi.")}</CenteredState>;
  }
  if (!capabilities.canCreateBooking) {
    return <CenteredState icon={<LockRoundedIcon />} title={t("Booking access is limited", "Ruhusa ya uhifadhi imewekewa kikomo")}>{t("Your role can view reservations but cannot create one.", "Jukumu lako linaweza kuona uhifadhi lakini haliwezi kutengeneza mpya.")}</CenteredState>;
  }

  return (
    <Suspense fallback={<BookingFlowSkeleton />}>
      <BookingWizard
        key={`${session.user.id}:${session.activePropertyId}`}
        propertyId={session.activePropertyId}
        propertyType={session.property?.type}
        businessDate={businessDate}
        paymentMethods={paymentMethods}
        userId={session.user.id}
        canRecordPayment={capabilities.canRecordPayment}
      />
    </Suspense>
  );
}

function BookingWizard({ businessDate, propertyId, propertyType, paymentMethods, userId, canRecordPayment }: { businessDate: string; propertyId: string; propertyType?: string; paymentMethods: AcceptedPaymentMethod[]; userId: string; canRecordPayment: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedGuestId = searchParams.get("guest");
  const client = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const propertyDefinition = getPropertyTypeDefinition(propertyType);
  const singular = t(propertyDefinition.inventorySingular[0], propertyDefinition.inventorySingular[1]);
  const plural = t(propertyDefinition.inventoryPlural[0], propertyDefinition.inventoryPlural[1]);
  const bookingSteps = [
    t("Stay", "Ukaaji"),
    t(propertyDefinition.inventorySingular[0], propertyDefinition.inventorySingular[1]),
    t("Guest", "Mgeni"),
    t("Review", "Kagua"),
  ];
  const idempotencyKey = useRef(crypto.randomUUID());
  const availabilityRequestInFlight = useRef(false);
  const bookingRequestInFlight = useRef(false);
  const draftKey = `${draftPrefix}:${userId}:${propertyId}`;
  const [activeStep, setActiveStep] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [source, setSource] = useState("front_desk");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);
  const [guest, setGuest] = useState<GuestForm>(emptyGuest);
  const [existingGuestId, setExistingGuestId] = useState<string | null>(null);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [guestPrefillError, setGuestPrefillError] = useState<string | null>(null);
  const [showMoreGuest, setShowMoreGuest] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"none" | "deposit" | "full">("none");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<AcceptedPaymentMethod>(paymentMethods[0] ?? "cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof GuestForm, string>>>({});

  const guests = adults + children;
  const nights = selectedRoom?.nights || nightCount(checkIn, checkOut);
  const isSameDayBooking = checkIn === businessDate;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const draft = JSON.parse(window.localStorage.getItem(draftKey) ?? "{}") as Record<string, unknown>;
        const nextCheckIn = isDateKey(draft.checkIn) && draft.checkIn >= businessDate
          ? draft.checkIn
          : businessDate;
        const nextCheckOut = isDateKey(draft.checkOut) && draft.checkOut > nextCheckIn
          ? draft.checkOut
          : nextDateKey(nextCheckIn);
        setCheckIn(nextCheckIn);
        setCheckOut(nextCheckOut);
        setAdults(typeof draft.adults === "number" ? Math.min(20, Math.max(1, Math.floor(draft.adults))) : 1);
        setChildren(typeof draft.children === "number" ? Math.min(20, Math.max(0, Math.floor(draft.children))) : 0);
        setSource(typeof draft.source === "string" ? draft.source : "front_desk");
      } catch {
        setCheckIn(businessDate);
        setCheckOut(nextDateKey(businessDate));
      } finally {
        setDraftLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [businessDate, draftKey]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!requestedGuestId) {
        setActiveStep((current) => Math.min(current, 2));
        setExistingGuestId(null);
        setGuest((current) => ({ ...emptyGuest, specialRequests: current.specialRequests }));
        setFieldErrors({});
        setLoadingGuest(false);
        setGuestPrefillError(null);
        return;
      }

      setActiveStep((current) => Math.min(current, 2));
      setExistingGuestId(null);
      setGuest((current) => ({ ...emptyGuest, specialRequests: current.specialRequests }));
      setFieldErrors({});
      setLoadingGuest(true);
      setGuestPrefillError(null);
      void getGuestWorkspace(client, propertyId, requestedGuestId)
        .then((workspace) => {
          if (cancelled) return;
          const profile = workspace.guest;
          setExistingGuestId(profile.id);
          setGuest((current) => ({
            ...current,
            firstName: profile.firstName,
            lastName: profile.lastName,
            gender: profile.gender,
            nationality: profile.nationality,
            occupation: profile.occupation,
            email: profile.email,
            phone: profile.phone,
            whereFrom: profile.whereFrom,
            whereTo: profile.whereTo,
            idType: profile.idType,
            idNumber: profile.idNumber,
            emergencyContactName: profile.emergencyContactName,
            emergencyContactPhone: profile.emergencyContactPhone,
          }));
        })
        .catch((cause) => {
          if (cancelled) return;
          setExistingGuestId(null);
          setGuest((current) => ({ ...emptyGuest, specialRequests: current.specialRequests }));
          setFieldErrors({});
          setGuestPrefillError(cause instanceof Error ? cause.message : t("Unable to load the selected guest.", "Imeshindikana kupakia mgeni aliyechaguliwa."));
        })
        .finally(() => {
          if (!cancelled) setLoadingGuest(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [client, propertyId, requestedGuestId, t]);

  useEffect(() => {
    if (!draftLoaded) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ checkIn, checkOut, adults, children, source }));
      } catch {
        // Booking can continue when local storage is unavailable.
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [adults, checkIn, checkOut, children, draftKey, draftLoaded, source]);

  const setGuestField = (name: keyof GuestForm) => ({
    value: guest[name] ?? "",
    error: Boolean(fieldErrors[name]),
    helperText: fieldErrors[name],
    disabled: Boolean(existingGuestId && name !== "specialRequests"),
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setGuest((current) => ({ ...current, [name]: event.target.value }));
      setFieldErrors((current) => ({ ...current, [name]: undefined }));
    },
  });

  const validateStay = () => {
    if (checkIn < businessDate) {
      setError(t("Check-in cannot be before the property's current business date.", "Tarehe ya kuingia haiwezi kuwa kabla ya tarehe ya sasa ya biashara."));
      return false;
    }
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError(t("Check-out must be after check-in.", "Tarehe ya kutoka lazima iwe baada ya tarehe ya kuingia."));
      return false;
    }
    if (guests < 1) {
      setError(t("Add at least one guest.", "Weka angalau mgeni mmoja."));
      return false;
    }
    return true;
  };

  const searchRooms = async () => {
    if (availabilityRequestInFlight.current || !validateStay()) return;
    availabilityRequestInFlight.current = true;
    setLoadingRooms(true);
    setError(null);
    setSelectedRoom(null);
    try {
      const available = await getAvailableRooms(client, propertyId, checkIn, checkOut, guests);
      setRooms(available);
      const requestedRoom = searchParams.get("room");
      if (requestedRoom) setSelectedRoom(available.find((room) => room.id === requestedRoom) ?? null);
      setActiveStep(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t(`Unable to check ${singular} availability.`, `Imeshindikana kukagua upatikanaji wa ${plural}.`));
    } finally {
      availabilityRequestInFlight.current = false;
      setLoadingRooms(false);
    }
  };

  const validateGuest = () => {
    if (existingGuestId) {
      setFieldErrors({});
      return true;
    }
    const next: Partial<Record<keyof GuestForm, string>> = {};
    if (!guest.firstName.trim()) next.firstName = t("First name is required.", "Jina la kwanza linahitajika.");
    if (!guest.lastName.trim()) next.lastName = t("Last name is required.", "Jina la mwisho linahitajika.");
    if (!guest.gender) next.gender = t("Select a gender.", "Chagua jinsia.");
    const phone = guest.phone.replace(/[\s()-]/g, "");
    if (!phone) next.phone = t("Phone number is required.", "Namba ya simu inahitajika.");
    else if (!/^\+?\d{7,15}$/.test(phone.replace(/^0/, "255"))) next.phone = t("Enter a valid phone number.", "Weka namba sahihi ya simu.");
    if (guest.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email)) next.email = t("Enter a valid email address.", "Weka barua pepe sahihi.");
    setFieldErrors(next);
    if (Object.keys(next).length) {
      setError(t("Check the highlighted guest details.", "Kagua taarifa za mgeni zilizoainishwa."));
      window.setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 80);
      return false;
    }
    return true;
  };

  const continueStep = async () => {
    setError(null);
    if (activeStep === 0) return void searchRooms();
    if (activeStep === 1) {
      if (!selectedRoom) return setError(t(`Select an available ${singular} to continue.`, `Chagua ${singular} inayopatikana ili kuendelea.`));
      setActiveStep(2);
      return;
    }
    if (activeStep === 2) {
      if (validateGuest()) setActiveStep(3);
    }
  };

  const submitBooking = async () => {
    if (bookingRequestInFlight.current || !selectedRoom || !validateGuest()) return;
    let initialPayment = null;
    if (canRecordPayment && paymentMode !== "none") {
      const amount = paymentMode === "full" ? selectedRoom.totalPrice : Number(paymentAmount);
      if (!amount || amount <= 0 || amount > selectedRoom.totalPrice) {
        setError(t("Enter a payment amount no greater than the booking total.", "Weka kiasi cha malipo kisichozidi jumla ya uhifadhi."));
        return;
      }
      initialPayment = { amount, method: paymentMethod, reference: paymentReference };
    }

    bookingRequestInFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createPropertyBooking(client, propertyId, {
        roomId: selectedRoom.id,
        guest,
        existingGuestId,
        checkIn,
        checkOut,
        adults,
        children,
        source,
        specialRequests: guest.specialRequests,
        initialPayment,
        idempotencyKey: idempotencyKey.current,
      });
      try { window.localStorage.removeItem(draftKey); } catch { /* no-op */ }
      const createdStatus = result.status.trim().toLowerCase();
      trackEvent("booking_created", { room_id: selectedRoom.id, adults, children, source, payment_mode: paymentMode, existing_guest: Boolean(existingGuestId), status: createdStatus || "unknown" });
      let smsSent = false;
      if (result.bookingId) {
        try {
          await sendBookingSms(client, propertyId, result.bookingId);
          smsSent = true;
          trackEvent("booking_sms_sent", { booking_id: result.bookingId });
        } catch (smsCause) {
          trackEvent("booking_sms_failed", {
            booking_id: result.bookingId,
            reason: smsCause instanceof Error ? smsCause.message : "unknown",
          });
        }
      }
      const bookingMessage = createdStatus === "checked_in"
        ? t("Guest checked in.", "Mgeni ameingia.")
        : ["pending", "reserved", "confirmed"].includes(createdStatus)
          ? t("Reservation created.", "Uhifadhi umetengenezwa.")
          : t("Booking created successfully.", "Uhifadhi umetengenezwa kikamilifu.");
      if (smsSent) {
        feedback.success(`${bookingMessage} ${t("SMS sent.", "SMS imetumwa.")}`);
      } else {
        feedback.error(`${bookingMessage} ${t("The automatic SMS could not be delivered.", "SMS ya moja kwa moja haikuweza kufikishwa.")}`);
      }
      router.replace(result.bookingId ? `/bookings/${result.bookingId}` : "/bookings");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Unable to create booking.", "Imeshindikana kutengeneza uhifadhi."));
    } finally {
      bookingRequestInFlight.current = false;
      setSubmitting(false);
    }
  };

  const handleWizardSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loadingGuest || loadingRooms || submitting) return;
    if (activeStep < steps.length - 1) {
      void continueStep();
      return;
    }
    void submitBooking();
  };

  if (!draftLoaded) return <BookingFlowSkeleton />;

  return (
    <Box
      component="form"
      noValidate
      aria-busy={loadingGuest || loadingRooms || submitting}
      onSubmit={handleWizardSubmit}
      sx={{ minHeight: "100dvh", pb: { xs: 6, md: 5 } }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 1.5, sm: 2.5, lg: 3 } }}>
        <Stack spacing={{ xs: 1.5, md: 2.5 }}>
          <WizardHeader activeStep={activeStep} inventoryPlural={plural} onBack={() => activeStep ? setActiveStep((value) => value - 1) : router.back()} />

          <Stepper activeStep={activeStep} sx={{ display: { xs: "none", sm: "flex" }, maxWidth: 760, mx: "auto", width: "100%" }}>
            {bookingSteps.map((label, index) => <Step aria-current={index === activeStep ? "step" : undefined} key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
          {loadingGuest ? <Alert severity="info">{t("Loading the selected guest profile…")}</Alert> : null}
          {guestPrefillError ? <Alert severity="warning" onClose={() => setGuestPrefillError(null)}>{t("The selected guest could not be loaded:", "Mgeni aliyechaguliwa hakuweza kupakiwa:")} {guestPrefillError}. {t("You can still enter a new guest.", "Bado unaweza kuweka mgeni mpya.")}</Alert> : null}

          <Box sx={{ alignItems: "start", display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 340px" } }}>
            <Box>
              {activeStep === 0 ? (
                <StayStep businessDate={businessDate} checkIn={checkIn} checkOut={checkOut} adults={adults} childCount={children} inventoryPlural={plural} source={source} onCheckIn={setCheckIn} onCheckOut={setCheckOut} onAdults={setAdults} onChildren={setChildren} onSource={setSource} />
              ) : null}
              {activeStep === 1 ? (
                <RoomStep rooms={rooms} singular={singular} plural={plural} selectedId={selectedRoom?.id} onSelect={setSelectedRoom} onSearchAgain={() => setActiveStep(0)} />
              ) : null}
              {activeStep === 2 ? (
                <GuestStep
                  existingGuestId={existingGuestId}
                  field={setGuestField}
                  showMore={showMoreGuest}
                  onChangeGuest={() => {
                    setExistingGuestId(null);
                    setGuest((current) => ({ ...emptyGuest, specialRequests: current.specialRequests }));
                    setFieldErrors({});
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("guest");
                    const next = params.toString();
                    router.replace(next ? `/bookings/new?${next}` : "/bookings/new", { scroll: false });
                  }}
                  onToggleMore={() => setShowMoreGuest((value) => !value)}
                />
              ) : null}
              {activeStep === 3 && selectedRoom ? (
                <ReviewStep
                  room={selectedRoom}
                  guest={guest}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  guests={guests}
                  canRecordPayment={canRecordPayment}
                  paymentMode={paymentMode}
                  paymentAmount={paymentAmount}
                  paymentMethod={paymentMethod}
                  paymentMethods={paymentMethods}
                  paymentReference={paymentReference}
                  checkInNow={isSameDayBooking}
                  onPaymentMode={setPaymentMode}
                  onPaymentAmount={setPaymentAmount}
                  onPaymentMethod={(value) => setPaymentMethod(value)}
                  onPaymentReference={setPaymentReference}
                />
              ) : null}
            </Box>

            <Box sx={{ display: { xs: "none", lg: "block" }, position: "sticky", top: 84 }}>
              <BookingSummary room={selectedRoom} singular={singular} checkIn={checkIn} checkOut={checkOut} guests={guests} nights={nights} guestName={`${guest.firstName} ${guest.lastName}`.trim()} />
            </Box>
          </Box>

          <WizardActions activeStep={activeStep} busy={loadingGuest || loadingRooms || submitting} checkInNow={isSameDayBooking} onBack={() => setActiveStep((value) => Math.max(0, value - 1))} />
        </Stack>
      </Container>
    </Box>
  );
}

function WizardHeader({ activeStep, inventoryPlural, onBack }: { activeStep: number; inventoryPlural: string; onBack: () => void }) {
  const { t } = useLanguage();
  return (
    <Stack component="header" direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
      <IconButton aria-label={t("Go back")} type="button" onClick={onBack} sx={{ border: "1px solid", borderColor: "divider" }}><ArrowBackRoundedIcon /></IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }} variant="overline">{t("Reservations")} · {t(`Step ${activeStep + 1} of ${steps.length}`)}</Typography>
        <Typography component="h1" sx={{ display: { xs: "none", sm: "block" } }} variant="h3">{t("Create a booking")}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ display: { xs: "none", sm: "block" }, mt: 0.35 }}>{t(`Live ${inventoryPlural} availability, guest details and optional payment.`, `Upatikanaji wa ${inventoryPlural}, taarifa za mgeni na malipo ya hiari.`)}</Typography>
        <Typography color="text.secondary" sx={{ display: { xs: "block", sm: "none" }, fontWeight: 500 }} variant="caption">
          {t(`Step ${activeStep + 1} of ${steps.length}`, `Hatua ya ${activeStep + 1} kati ya ${steps.length}`)}
        </Typography>
        <LinearProgress aria-label={t("Booking progress")} value={((activeStep + 1) / steps.length) * 100} variant="determinate" sx={{ display: { xs: "block", sm: "none" }, height: 4, mt: 1.25 }} />
      </Box>
    </Stack>
  );
}

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", borderBottom: "1px solid", borderColor: "divider", p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ bgcolor: "action.selected", borderRadius: 1.5, color: "primary.main", display: "grid", flexShrink: 0, height: 38, placeItems: "center", width: 38 }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}><Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography><Typography color="text.secondary" variant="body2" sx={{ display: { xs: "none", sm: "block" }, mt: 0.2 }}>{description}</Typography></Box>
      </Stack>
      <Box sx={{ p: { xs: 1.5, sm: 2.25 } }}>{children}</Box>
    </Paper>
  );
}

function StayStep(props: { businessDate: string; checkIn: string; checkOut: string; adults: number; childCount: number; inventoryPlural: string; source: string; onCheckIn: (v: string) => void; onCheckOut: (v: string) => void; onAdults: (v: number) => void; onChildren: (v: number) => void; onSource: (v: string) => void }) {
  const { t } = useLanguage();
  return (
    <Section icon={<CalendarMonthRoundedIcon />} title={t("When is the guest staying?", "Mgeni atakaa lini?")} description={t(`Set the stay and party size before checking available ${props.inventoryPlural}.`, `Weka tarehe za ukaaji na idadi ya wageni kabla ya kukagua ${props.inventoryPlural} zinazopatikana.`)}>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
        <TextField required label={t("Check-in")} type="date" value={props.checkIn} onChange={(event) => props.onCheckIn(event.target.value)} slotProps={{ htmlInput: { min: props.businessDate }, inputLabel: { shrink: true } }} />
        <TextField required label={t("Check-out")} type="date" value={props.checkOut} onChange={(event) => props.onCheckOut(event.target.value)} slotProps={{ htmlInput: { min: nextDateKey(props.checkIn || props.businessDate) }, inputLabel: { shrink: true } }} />
        <TextField label={t("Adults")} type="number" value={props.adults} onChange={(event) => props.onAdults(Math.min(20, Math.max(1, Math.floor(Number(event.target.value) || 1))))} slotProps={{ htmlInput: { min: 1, max: 20 } }} />
        <TextField label={t("Children")} type="number" value={props.childCount} onChange={(event) => props.onChildren(Math.min(20, Math.max(0, Math.floor(Number(event.target.value) || 0))))} slotProps={{ htmlInput: { min: 0, max: 20 } }} />
        <TextField select label={t("Booking source")} value={props.source} onChange={(event) => props.onSource(event.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }}>
          <MenuItem value="front_desk">{t("Front desk / walk-in")}</MenuItem><MenuItem value="phone">{t("Phone")}</MenuItem><MenuItem value="direct">{t("Direct")}</MenuItem><MenuItem value="agent">{t("Agent")}</MenuItem><MenuItem value="other">{t("Other")}</MenuItem>
        </TextField>
      </Box>
    </Section>
  );
}

function RoomStep({ rooms, singular, plural, selectedId, onSelect, onSearchAgain }: { rooms: AvailableRoom[]; singular: string; plural: string; selectedId?: string; onSelect: (room: AvailableRoom) => void; onSearchAgain: () => void }) {
  const { t } = useLanguage();
  return (
    <Section icon={<BedRoundedIcon />} title={rooms.length ? t(`${rooms.length} available ${rooms.length === 1 ? singular : plural}`, `${plural} ${rooms.length} zinapatikana`) : t(`No matching ${plural}`, `Hakuna ${plural} zinazolingana`)} description={rooms.length ? t(`Choose the best ${singular} for this guest. Rates are verified again when you confirm.`, `Chagua ${singular} inayomfaa mgeni. Bei itakaguliwa tena unapothibitisha.`) : t("Change the stay dates or guest count and search again.", "Badili tarehe za ukaaji au idadi ya wageni kisha utafute tena.")}>
      {!rooms.length ? (
        <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}><Alert severity="info" sx={{ width: "100%" }}>{t(`No ${plural} are available for this stay.`, `Hakuna ${plural} zinazopatikana kwa ukaaji huu.`)}</Alert><Button type="button" onClick={onSearchAgain} startIcon={<SearchRoundedIcon />} variant="outlined">{t("Change search")}</Button></Stack>
      ) : (
        <Box role="radiogroup" aria-label={t(`Available ${plural}`, `${plural} zinazopatikana`)} sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", xl: "repeat(2,minmax(0,1fr))" } }}>
          {rooms.map((room) => <RoomChoice key={room.id} room={room} selected={room.id === selectedId} onSelect={() => onSelect(room)} />)}
        </Box>
      )}
    </Section>
  );
}

function RoomChoice({ room, selected, onSelect }: { room: AvailableRoom; selected: boolean; onSelect: () => void }) {
  const { t } = useLanguage();
  return (
    <Paper component="button" type="button" role="radio" aria-checked={selected} onClick={onSelect} variant="outlined" sx={{ appearance: "none", bgcolor: selected ? "action.selected" : "background.paper", borderColor: selected ? "primary.main" : "divider", color: "text.primary", cursor: "pointer", minHeight: 128, p: { xs: 1.5, sm: 2 }, textAlign: "left", width: "100%", "&:hover": { borderColor: "primary.main" } }}>
        <Stack spacing={0.6} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: "space-between", minWidth: 0 }}><Typography noWrap variant="subtitle1" sx={{ flex: 1, fontWeight: 700, minWidth: 0 }}>{room.name}</Typography>{selected ? <CheckCircleRoundedIcon color="primary" fontSize="small" sx={{ flexShrink: 0 }} /> : null}</Stack>
          <Typography color="text.secondary" variant="body2" sx={{ overflowWrap: "anywhere", textTransform: "capitalize" }}>{room.roomType} · {t(`${room.capacity} guests`)} · {t(`${room.bedCount} bed${room.bedCount === 1 ? "" : "s"}`)}</Typography>
          <Typography color="text.secondary" noWrap variant="caption">{room.amenities.slice(0, 3).join(" · ") || t("Standard amenities", "Huduma za kawaida")}</Typography>
          <Box sx={{ mt: "auto!important", pt: 0.75 }}><Typography color="primary.main" sx={{ fontWeight: 700 }}>{money.format(room.totalPrice)}</Typography><Typography color="text.secondary" variant="caption">{money.format(room.pricePerNight)} / {t("night", "usiku")}</Typography></Box>
        </Stack>
    </Paper>
  );
}

function GuestStep({ existingGuestId, field, showMore, onChangeGuest, onToggleMore }: { existingGuestId: string | null; field: (name: keyof GuestForm) => { value: string; error: boolean; helperText?: string; disabled?: boolean; onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void }; showMore: boolean; onChangeGuest: () => void; onToggleMore: () => void }) {
  const { t } = useLanguage();
  return (
    <Section icon={<PersonRoundedIcon />} title={t("Who is staying?", "Nani atakaa?")} description={t("Capture only what the front desk needs. Additional identity and travel details are optional.", "Weka taarifa zinazohitajika mapokezi. Taarifa zaidi za utambulisho na safari ni za hiari.")}>
      <Stack spacing={2}>
        {existingGuestId ? (
          <Alert
            severity="success"
            action={<Button color="inherit" type="button" onClick={onChangeGuest} size="small">{t("Use different guest")}</Button>}
            sx={{
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              "& .MuiAlert-action": {
                alignSelf: { xs: "stretch", sm: "center" },
                justifyContent: { xs: "flex-start", sm: "flex-end" },
                ml: { xs: 0, sm: "auto" },
                mt: { xs: 1, sm: 0 },
                p: 0,
              },
            }}
          >
            {t("Existing guest profile selected. It will be linked to this reservation without creating a duplicate record.", "Wasifu wa mgeni aliyepo umechaguliwa. Utaunganishwa na uhifadhi huu bila kutengeneza taarifa zinazojirudia.")}
          </Alert>
        ) : null}
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
          <TextField required label={t("First name")} {...field("firstName")} /><TextField required label={t("Last name")} {...field("lastName")} />
          <TextField required select label={t("Gender")} {...field("gender")}><MenuItem value="male">{t("Male")}</MenuItem><MenuItem value="female">{t("Female")}</MenuItem><MenuItem value="other">{t("Other")}</MenuItem></TextField>
          <TextField required label={t("Phone")} {...field("phone")} />
          <TextField label={t("Email")} type="email" {...field("email")} /><TextField label={t("Nationality")} {...field("nationality")} />
        </Box>
        <Button type="button" onClick={onToggleMore} sx={{ alignSelf: "flex-start" }}>{showMore ? t("Hide additional details", "Ficha taarifa za ziada") : t("Add ID, travel and emergency details", "Ongeza utambulisho, safari na taarifa za dharura")}</Button>
        <Collapse in={showMore} unmountOnExit>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
            <TextField label={t("Occupation")} {...field("occupation")} /><TextField label={t("Coming from", "Anakotoka")} {...field("whereFrom")} />
            <TextField label={t("Going to")} {...field("whereTo")} /><TextField select label={t("ID type")} {...field("idType")}><MenuItem value="">{t("Not recorded")}</MenuItem><MenuItem value="national_id">{t("National ID")}</MenuItem><MenuItem value="passport">{t("Passport")}</MenuItem><MenuItem value="driving_license">{t("Driving licence")}</MenuItem></TextField>
            <TextField label={t("ID number")} {...field("idNumber")} /><TextField label={t("Emergency contact name")} {...field("emergencyContactName")} />
            <TextField label={t("Emergency contact phone")} {...field("emergencyContactPhone")} />
          </Box>
        </Collapse>
        <TextField label={t("Special requests")} multiline minRows={3} {...field("specialRequests")} />
      </Stack>
    </Section>
  );
}

function ReviewStep(props: { room: AvailableRoom; guest: GuestForm; checkIn: string; checkOut: string; guests: number; canRecordPayment: boolean; paymentMode: "none" | "deposit" | "full"; paymentAmount: string; paymentMethod: AcceptedPaymentMethod; paymentMethods: AcceptedPaymentMethod[]; paymentReference: string; checkInNow: boolean; onPaymentMode: (v: "none" | "deposit" | "full") => void; onPaymentAmount: (v: string) => void; onPaymentMethod: (v: AcceptedPaymentMethod) => void; onPaymentReference: (v: string) => void }) {
  const { t } = useLanguage();
  const definition = getInventoryDefinition(props.room.inventoryType);
  const singular = t(definition.inventorySingular[0], definition.inventorySingular[1]);
  return (
    <Stack spacing={2}>
      <Section
        icon={<CheckCircleRoundedIcon />}
        title={props.checkInNow ? t("Review check-in", "Kagua kuingia") : t("Review reservation", "Kagua uhifadhi")}
        description={props.checkInNow
          ? t(`The guest will be checked into this ${singular} now.`, `Mgeni ataingizwa kwenye ${singular} hii sasa.`)
          : t(`Confirm the stay, ${singular} and lead guest.`, `Thibitisha ukaaji, ${singular} na mgeni mkuu.`)}
      >
        <Stack divider={<Divider flexItem />} spacing={0}>
          <ReviewRow label={t("Guest")} value={`${props.guest.firstName} ${props.guest.lastName}`} /><ReviewRow label={t("Phone")} value={props.guest.phone} />
          <ReviewRow label={t(definition.inventorySingular[0], definition.inventorySingular[1])} value={`${props.room.name} · ${props.room.roomType}`} /><ReviewRow label={t("Stay")} value={`${formatLocalDate(props.checkIn)} → ${formatLocalDate(props.checkOut)}`} />
          <ReviewRow label={t("Party")} value={t(`${props.guests} guest${props.guests === 1 ? "" : "s"}`)} /><ReviewRow label={t("Booking total")} value={money.format(props.room.totalPrice)} accent />
        </Stack>
      </Section>
      <Section icon={<PaymentsRoundedIcon />} title={t("Initial payment")} description={props.canRecordPayment ? t("Continue unpaid, record a deposit, or settle in full.", "Endelea bila malipo, rekodi amana, au lipa kikamilifu.") : t("A permitted team member can record payment later.", "Mfanyakazi mwenye ruhusa anaweza kuweka malipo baadaye.")}>
        {props.canRecordPayment ? (
          <Stack spacing={1.5}>
            <TextField select label={t("Payment at booking")} value={props.paymentMode} onChange={(event) => props.onPaymentMode(event.target.value as "none" | "deposit" | "full")}><MenuItem value="none">{t("No payment now")}</MenuItem><MenuItem value="deposit">{t("Record a deposit")}</MenuItem><MenuItem value="full">{t("Pay in full")}</MenuItem></TextField>
            {props.paymentMode === "deposit" ? <TextField label={t("Deposit amount")} type="number" value={props.paymentAmount} onChange={(event) => props.onPaymentAmount(event.target.value)} slotProps={{ input: { startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>TZS</Typography> }, htmlInput: { min: 1, max: props.room.totalPrice } }} /> : null}
            {props.paymentMode !== "none" ? <><TextField select label={t("Payment method")} value={props.paymentMethod} onChange={(event) => props.onPaymentMethod(event.target.value as AcceptedPaymentMethod)}>{props.paymentMethods.map((value) => { const method = acceptedPaymentMethods.find((item) => item.value === value); return method ? <MenuItem key={value} value={value}>{t(method.label[0], method.label[1])}</MenuItem> : null; })}</TextField><TextField label={t("Transaction reference (optional)")} value={props.paymentReference} onChange={(event) => props.onPaymentReference(event.target.value)} /></> : null}
          </Stack>
        ) : <Alert severity="info">{t("This reservation will be created as unpaid. No payment or finance data is exposed to your role.", "Uhifadhi huu utatengenezwa bila malipo. Jukumu lako halitaonyeshwa taarifa za malipo au fedha.")}</Alert>}
      </Section>
    </Stack>
  );
}

function BookingSummary({ room, singular, checkIn, checkOut, guests, nights, guestName }: { room: AvailableRoom | null; singular: string; checkIn: string; checkOut: string; guests: number; nights: number; guestName: string }) {
  const { t } = useLanguage();
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", p: 2 }}><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Booking summary")}</Typography><Typography color="text.secondary" variant="caption">{t("Updates as you complete the steps", "Husasishwa kadiri unavyokamilisha hatua")}</Typography></Box>
      <Stack divider={<Divider flexItem />} spacing={0} sx={{ px: 2 }}><ReviewRow label={t("Stay")} value={`${formatLocalDate(checkIn)} → ${formatLocalDate(checkOut)}`} /><ReviewRow label={t("Guests")} value={String(guests)} /><ReviewRow label={singular} value={room?.name || t("Not selected")} /><ReviewRow label={t("Lead guest")} value={guestName || t("Not added")} /></Stack>
      <Box sx={{ bgcolor: "action.hover", p: 2 }}><Typography color="text.secondary" variant="caption">{t(`${nights} night${nights === 1 ? "" : "s"}`, `Usiku ${nights}`)} · {t("booking total", "jumla ya uhifadhi")}</Typography><Typography color="primary.main" variant="h4">{room ? money.format(room.totalPrice) : "—"}</Typography></Box>
    </Paper>
  );
}

function ReviewRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <Box sx={{ alignItems: "baseline", display: "grid", gap: 1.5, gridTemplateColumns: "minmax(84px,auto) minmax(0,1fr)", py: 1.25 }}><Typography color="text.secondary" variant="body2">{label}</Typography><Typography color={accent ? "primary.main" : "text.primary"} variant="body2" sx={{ fontWeight: 700, minWidth: 0, overflowWrap: "anywhere", textAlign: "right" }}>{value || "—"}</Typography></Box>;
}

function WizardActions({ activeStep, busy, checkInNow, onBack }: { activeStep: number; busy: boolean; checkInNow: boolean; onBack: () => void }) {
  const { t } = useLanguage();
  return (
    <Paper elevation={0} sx={{ bgcolor: "background.paper", borderRadius: { xs: 0, md: 1 }, borderTop: { xs: 1, md: 0 }, borderColor: "divider", bottom: { xs: "calc(64px + env(safe-area-inset-bottom))", md: "auto" }, left: { xs: 0, md: "auto" }, p: { xs: 1, md: 1.5 }, position: { xs: "fixed", md: "static" }, right: { xs: 0, md: "auto" }, zIndex: { xs: (theme) => theme.zIndex.appBar - 1, md: "auto" } }}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", maxWidth: { md: 560 }, ml: { md: "auto" } }}>
        {activeStep > 0 ? <Button disabled={busy} type="button" onClick={onBack} sx={{ flex: { xs: 1, md: "initial" } }}>{t("Back")}</Button> : null}
        <Button disabled={busy} type="submit" endIcon={activeStep < 3 ? <ArrowForwardRoundedIcon /> : undefined} variant="contained" sx={{ flex: { xs: 2, md: "initial" }, minWidth: { md: 180 } }}>{busy ? t("Please wait…") : activeStep === 0 ? t("Check availability", "Kagua upatikanaji") : activeStep === 3 ? (checkInNow ? t("Check in guest", "Mwingize mgeni") : t("Create reservation", "Tengeneza uhifadhi")) : t("Continue")}</Button>
      </Stack>
    </Paper>
  );
}

function BookingFlowSkeleton() {
  return <Container maxWidth="xl" sx={{ py: 3 }}><Stack spacing={2}><Skeleton width={260} height={44} /><Skeleton height={60} /><Skeleton height={420} variant="rounded" /></Stack></Container>;
}

function CenteredState({ title, children, icon, severity = "info" }: { title: string; children: ReactNode; icon?: ReactNode; severity?: "info" | "error" }) {
  const { t } = useLanguage();
  return <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}><Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}><Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>{icon ? <Box sx={{ bgcolor: "action.selected", borderRadius: 2, color: "primary.main", display: "grid", height: 46, placeItems: "center", width: 46 }}>{icon}</Box> : null}<Typography variant="h5">{title}</Typography><Alert severity={severity} sx={{ width: "100%" }}>{children}</Alert><Button type="button" onClick={() => window.history.back()}>{t("Go back")}</Button></Stack></Paper></Container>;
}
