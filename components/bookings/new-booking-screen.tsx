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
import Image from "next/image";
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
  type GuestInput,
} from "@/features/bookings/services/booking-service";
import type { AvailableRoom } from "@/features/bookings/models/booking";
import { getGuestWorkspace } from "@/features/guests/services/guest-service";
import { formatLocalDate, localDateKey } from "@/lib/date-time";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { trackEvent } from "@/lib/analytics";

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
  nationality: "Tanzanian",
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

function tomorrow() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return localDateKey(value);
}

function nightCount(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function NewBookingScreen() {
  const { session, loading, error } = useAppSession();
  const capabilities = getWorkspaceCapabilities(session?.activeRole);

  if (loading) return <BookingFlowSkeleton />;
  if (error || !session?.activePropertyId || !session.user?.id) {
    return <CenteredState severity="error" title="Booking workspace unavailable">{error?.message ?? "Select an active property before creating a booking."}</CenteredState>;
  }
  if (!capabilities.canCreateBooking) {
    return <CenteredState icon={<LockRoundedIcon />} title="Booking access is limited">Your role can view reservations but cannot create one.</CenteredState>;
  }

  return (
    <Suspense fallback={<BookingFlowSkeleton />}>
      <BookingWizard
        key={`${session.user.id}:${session.activePropertyId}`}
        propertyId={session.activePropertyId}
        userId={session.user.id}
        canRecordPayment={capabilities.canRecordPayment}
      />
    </Suspense>
  );
}

function BookingWizard({ propertyId, userId, canRecordPayment }: { propertyId: string; userId: string; canRecordPayment: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedGuestId = searchParams.get("guest");
  const client = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
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
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof GuestForm, string>>>({});

  const guests = adults + children;
  const nights = selectedRoom?.nights || nightCount(checkIn, checkOut);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const draft = JSON.parse(window.localStorage.getItem(draftKey) ?? "{}") as Record<string, unknown>;
        setCheckIn(typeof draft.checkIn === "string" ? draft.checkIn : localDateKey());
        setCheckOut(typeof draft.checkOut === "string" ? draft.checkOut : tomorrow());
        setAdults(typeof draft.adults === "number" ? Math.min(20, Math.max(1, Math.floor(draft.adults))) : 1);
        setChildren(typeof draft.children === "number" ? Math.min(20, Math.max(0, Math.floor(draft.children))) : 0);
        setSource(typeof draft.source === "string" ? draft.source : "front_desk");
      } catch {
        setCheckIn(localDateKey());
        setCheckOut(tomorrow());
      } finally {
        setDraftLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftKey]);

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
          setGuestPrefillError(cause instanceof Error ? cause.message : "Unable to load the selected guest.");
        })
        .finally(() => {
          if (!cancelled) setLoadingGuest(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [client, propertyId, requestedGuestId]);

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
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return false;
    }
    if (guests < 1) {
      setError("Add at least one guest.");
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
      setError(cause instanceof Error ? cause.message : "Unable to check room availability.");
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
    if (!guest.firstName.trim()) next.firstName = "First name is required.";
    if (!guest.lastName.trim()) next.lastName = "Last name is required.";
    if (!guest.gender) next.gender = "Select a gender.";
    const phone = guest.phone.replace(/[\s()-]/g, "");
    if (!phone) next.phone = "Phone number is required.";
    else if (!/^\+?\d{7,15}$/.test(phone.replace(/^0/, "255"))) next.phone = "Enter a valid phone number.";
    if (guest.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email)) next.email = "Enter a valid email address.";
    setFieldErrors(next);
    if (Object.keys(next).length) {
      setError("Check the highlighted guest details.");
      window.setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 80);
      return false;
    }
    return true;
  };

  const continueStep = async () => {
    setError(null);
    if (activeStep === 0) return void searchRooms();
    if (activeStep === 1) {
      if (!selectedRoom) return setError("Select an available room to continue.");
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
        setError("Enter a payment amount no greater than the booking total.");
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
      trackEvent("booking_created", { room_id: selectedRoom.id, adults, children, source, payment_mode: paymentMode, existing_guest: Boolean(existingGuestId) });
      feedback.success("Booking created successfully.");
      router.replace(result.bookingId ? `/bookings/${result.bookingId}` : "/bookings");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create booking.");
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
      sx={{ minHeight: "100dvh", pb: { xs: 18, md: 5 } }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 1.5, sm: 2.5, lg: 3 } }}>
        <Stack spacing={{ xs: 1.5, md: 2.5 }}>
          <WizardHeader activeStep={activeStep} onBack={() => activeStep ? setActiveStep((value) => value - 1) : router.back()} />

          <Stepper activeStep={activeStep} sx={{ display: { xs: "none", sm: "flex" }, maxWidth: 760, mx: "auto", width: "100%" }}>
            {steps.map((label, index) => <Step aria-current={index === activeStep ? "step" : undefined} key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
          {loadingGuest ? <Alert severity="info">Loading the selected guest profile…</Alert> : null}
          {guestPrefillError ? <Alert severity="warning" onClose={() => setGuestPrefillError(null)}>The selected guest could not be loaded: {guestPrefillError}. You can still enter a new guest.</Alert> : null}

          <Box sx={{ alignItems: "start", display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 340px" } }}>
            <Box>
              {activeStep === 0 ? (
                <StayStep checkIn={checkIn} checkOut={checkOut} adults={adults} childCount={children} source={source} onCheckIn={setCheckIn} onCheckOut={setCheckOut} onAdults={setAdults} onChildren={setChildren} onSource={setSource} />
              ) : null}
              {activeStep === 1 ? (
                <RoomStep rooms={rooms} selectedId={selectedRoom?.id} onSelect={setSelectedRoom} onSearchAgain={() => setActiveStep(0)} />
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
                  paymentReference={paymentReference}
                  onPaymentMode={setPaymentMode}
                  onPaymentAmount={setPaymentAmount}
                  onPaymentMethod={setPaymentMethod}
                  onPaymentReference={setPaymentReference}
                />
              ) : null}
            </Box>

            <Box sx={{ display: { xs: "none", lg: "block" }, position: "sticky", top: 84 }}>
              <BookingSummary room={selectedRoom} checkIn={checkIn} checkOut={checkOut} guests={guests} nights={nights} guestName={`${guest.firstName} ${guest.lastName}`.trim()} />
            </Box>
          </Box>

          <WizardActions activeStep={activeStep} busy={loadingGuest || loadingRooms || submitting} onBack={() => setActiveStep((value) => Math.max(0, value - 1))} />
        </Stack>
      </Container>
    </Box>
  );
}

function WizardHeader({ activeStep, onBack }: { activeStep: number; onBack: () => void }) {
  return (
    <Stack component="header" direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
      <IconButton aria-label="Go back" type="button" onClick={onBack} sx={{ border: "1px solid", borderColor: "divider" }}><ArrowBackRoundedIcon /></IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography color="text.secondary" variant="overline">Reservations · Step {activeStep + 1} of {steps.length}</Typography>
        <Typography component="h1" variant="h3">Create a booking</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.35 }}>Live availability, guest details and an optional payment in one controlled flow.</Typography>
        <LinearProgress aria-label="Booking progress" value={((activeStep + 1) / steps.length) * 100} variant="determinate" sx={{ display: { xs: "block", sm: "none" }, height: 4, mt: 1.25 }} />
      </Box>
    </Stack>
  );
}

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", borderBottom: "1px solid", borderColor: "divider", p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ bgcolor: "action.selected", borderRadius: 1.5, color: "primary.main", display: "grid", flexShrink: 0, height: 38, placeItems: "center", width: 38 }}>{icon}</Box>
        <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: 0.2 }}>{description}</Typography></Box>
      </Stack>
      <Box sx={{ p: { xs: 1.5, sm: 2.25 } }}>{children}</Box>
    </Paper>
  );
}

function StayStep(props: { checkIn: string; checkOut: string; adults: number; childCount: number; source: string; onCheckIn: (v: string) => void; onCheckOut: (v: string) => void; onAdults: (v: number) => void; onChildren: (v: number) => void; onSource: (v: string) => void }) {
  return (
    <Section icon={<CalendarMonthRoundedIcon />} title="When is the guest staying?" description="Set the stay and party size before checking current room inventory.">
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
        <TextField required label="Check-in" type="date" value={props.checkIn} onChange={(event) => props.onCheckIn(event.target.value)} slotProps={{ htmlInput: { min: localDateKey() }, inputLabel: { shrink: true } }} />
        <TextField required label="Check-out" type="date" value={props.checkOut} onChange={(event) => props.onCheckOut(event.target.value)} slotProps={{ htmlInput: { min: props.checkIn || localDateKey() }, inputLabel: { shrink: true } }} />
        <TextField label="Adults" type="number" value={props.adults} onChange={(event) => props.onAdults(Math.min(20, Math.max(1, Math.floor(Number(event.target.value) || 1))))} slotProps={{ htmlInput: { min: 1, max: 20 } }} />
        <TextField label="Children" type="number" value={props.childCount} onChange={(event) => props.onChildren(Math.min(20, Math.max(0, Math.floor(Number(event.target.value) || 0))))} slotProps={{ htmlInput: { min: 0, max: 20 } }} />
        <TextField select label="Booking source" value={props.source} onChange={(event) => props.onSource(event.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }}>
          <MenuItem value="front_desk">Front desk / walk-in</MenuItem><MenuItem value="phone">Phone</MenuItem><MenuItem value="direct">Direct</MenuItem><MenuItem value="agent">Agent</MenuItem><MenuItem value="other">Other</MenuItem>
        </TextField>
      </Box>
    </Section>
  );
}

function RoomStep({ rooms, selectedId, onSelect, onSearchAgain }: { rooms: AvailableRoom[]; selectedId?: string; onSelect: (room: AvailableRoom) => void; onSearchAgain: () => void }) {
  return (
    <Section icon={<BedRoundedIcon />} title={rooms.length ? `${rooms.length} available room${rooms.length === 1 ? "" : "s"}` : "No matching rooms"} description={rooms.length ? "Choose the best room for this guest. Rates are verified again when you confirm." : "Change the stay dates or guest count and search again."}>
      {!rooms.length ? (
        <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}><Alert severity="info" sx={{ width: "100%" }}>No rooms are available for this stay.</Alert><Button type="button" onClick={onSearchAgain} startIcon={<SearchRoundedIcon />} variant="outlined">Change search</Button></Stack>
      ) : (
        <Box role="radiogroup" aria-label="Available rooms" sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", xl: "repeat(2,minmax(0,1fr))" } }}>
          {rooms.map((room) => <RoomChoice key={room.id} room={room} selected={room.id === selectedId} onSelect={() => onSelect(room)} />)}
        </Box>
      )}
    </Section>
  );
}

function RoomChoice({ room, selected, onSelect }: { room: AvailableRoom; selected: boolean; onSelect: () => void }) {
  return (
    <Paper component="button" type="button" role="radio" aria-checked={selected} onClick={onSelect} variant="outlined" sx={{ appearance: "none", bgcolor: selected ? "action.selected" : "background.paper", borderColor: selected ? "primary.main" : "divider", color: "text.primary", cursor: "pointer", overflow: "hidden", p: 0, textAlign: "left", width: "100%", "&:hover": { borderColor: "primary.main" } }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "104px minmax(0,1fr)", sm: "132px minmax(0,1fr)" }, minHeight: 128 }}>
        <Box sx={{ bgcolor: "action.hover", position: "relative" }}>{room.images[0] ? <Image src={room.images[0]} alt={room.name} fill sizes="132px" style={{ objectFit: "cover" }} /> : <Box sx={{ color: "text.disabled", display: "grid", height: "100%", placeItems: "center" }}><BedRoundedIcon /></Box>}</Box>
        <Stack spacing={0.45} sx={{ minWidth: 0, p: { xs: 1.25, sm: 1.5 } }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: "space-between", minWidth: 0 }}><Typography noWrap variant="subtitle1" sx={{ flex: 1, fontWeight: 700, minWidth: 0 }}>{room.name}</Typography>{selected ? <CheckCircleRoundedIcon color="primary" fontSize="small" sx={{ flexShrink: 0 }} /> : null}</Stack>
          <Typography color="text.secondary" variant="body2" sx={{ overflowWrap: "anywhere", textTransform: "capitalize" }}>{room.roomType} · {room.capacity} guests · {room.bedCount} bed{room.bedCount === 1 ? "" : "s"}</Typography>
          <Typography color="text.secondary" noWrap variant="caption">{room.amenities.slice(0, 3).join(" · ") || "Standard amenities"}</Typography>
          <Box sx={{ mt: "auto!important", pt: 0.75 }}><Typography color="primary.main" sx={{ fontWeight: 700 }}>{money.format(room.totalPrice)}</Typography><Typography color="text.secondary" variant="caption">{money.format(room.pricePerNight)} / night</Typography></Box>
        </Stack>
      </Box>
    </Paper>
  );
}

function GuestStep({ existingGuestId, field, showMore, onChangeGuest, onToggleMore }: { existingGuestId: string | null; field: (name: keyof GuestForm) => { value: string; error: boolean; helperText?: string; disabled?: boolean; onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void }; showMore: boolean; onChangeGuest: () => void; onToggleMore: () => void }) {
  return (
    <Section icon={<PersonRoundedIcon />} title="Who is staying?" description="Capture only what the front desk needs. Additional identity and travel details are optional.">
      <Stack spacing={2}>
        {existingGuestId ? (
          <Alert
            severity="success"
            action={<Button color="inherit" type="button" onClick={onChangeGuest} size="small">Use different guest</Button>}
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
            Existing guest profile selected. It will be linked to this reservation without creating a duplicate record.
          </Alert>
        ) : null}
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
          <TextField required label="First name" {...field("firstName")} /><TextField required label="Last name" {...field("lastName")} />
          <TextField required select label="Gender" {...field("gender")}><MenuItem value="male">Male</MenuItem><MenuItem value="female">Female</MenuItem><MenuItem value="other">Other</MenuItem></TextField>
          <TextField required label="Phone" {...field("phone")} />
          <TextField label="Email" type="email" {...field("email")} /><TextField label="Nationality" {...field("nationality")} />
        </Box>
        <Button type="button" onClick={onToggleMore} sx={{ alignSelf: "flex-start" }}>{showMore ? "Hide additional details" : "Add ID, travel and emergency details"}</Button>
        <Collapse in={showMore} unmountOnExit>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
            <TextField label="Occupation" {...field("occupation")} /><TextField label="Coming from" {...field("whereFrom")} />
            <TextField label="Going to" {...field("whereTo")} /><TextField select label="ID type" {...field("idType")}><MenuItem value="">Not recorded</MenuItem><MenuItem value="national_id">National ID</MenuItem><MenuItem value="passport">Passport</MenuItem><MenuItem value="driving_license">Driving licence</MenuItem></TextField>
            <TextField label="ID number" {...field("idNumber")} /><TextField label="Emergency contact name" {...field("emergencyContactName")} />
            <TextField label="Emergency contact phone" {...field("emergencyContactPhone")} />
          </Box>
        </Collapse>
        <TextField label="Special requests" multiline minRows={3} {...field("specialRequests")} />
      </Stack>
    </Section>
  );
}

function ReviewStep(props: { room: AvailableRoom; guest: GuestForm; checkIn: string; checkOut: string; guests: number; canRecordPayment: boolean; paymentMode: "none" | "deposit" | "full"; paymentAmount: string; paymentMethod: string; paymentReference: string; onPaymentMode: (v: "none" | "deposit" | "full") => void; onPaymentAmount: (v: string) => void; onPaymentMethod: (v: string) => void; onPaymentReference: (v: string) => void }) {
  return (
    <Stack spacing={2}>
      <Section icon={<CheckCircleRoundedIcon />} title="Review the reservation" description="Confirm the stay, room and lead guest before creating the booking.">
        <Stack divider={<Divider flexItem />} spacing={0}>
          <ReviewRow label="Guest" value={`${props.guest.firstName} ${props.guest.lastName}`} /><ReviewRow label="Phone" value={props.guest.phone} />
          <ReviewRow label="Room" value={`${props.room.name} · ${props.room.roomType}`} /><ReviewRow label="Stay" value={`${formatLocalDate(props.checkIn)} → ${formatLocalDate(props.checkOut)}`} />
          <ReviewRow label="Party" value={`${props.guests} guest${props.guests === 1 ? "" : "s"}`} /><ReviewRow label="Booking total" value={money.format(props.room.totalPrice)} accent />
        </Stack>
      </Section>
      <Section icon={<PaymentsRoundedIcon />} title="Initial payment" description={props.canRecordPayment ? "Create the reservation unpaid, with a deposit, or fully settled." : "Your role can create an unpaid reservation. A permitted team member can record payment later."}>
        {props.canRecordPayment ? (
          <Stack spacing={1.5}>
            <TextField select label="Payment at booking" value={props.paymentMode} onChange={(event) => props.onPaymentMode(event.target.value as "none" | "deposit" | "full")}><MenuItem value="none">No payment now</MenuItem><MenuItem value="deposit">Record a deposit</MenuItem><MenuItem value="full">Pay in full</MenuItem></TextField>
            {props.paymentMode === "deposit" ? <TextField label="Deposit amount" type="number" value={props.paymentAmount} onChange={(event) => props.onPaymentAmount(event.target.value)} slotProps={{ input: { startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>TZS</Typography> }, htmlInput: { min: 1, max: props.room.totalPrice } }} /> : null}
            {props.paymentMode !== "none" ? <><TextField select label="Payment method" value={props.paymentMethod} onChange={(event) => props.onPaymentMethod(event.target.value)}><MenuItem value="cash">Cash</MenuItem><MenuItem value="mobile_money">Mobile money</MenuItem><MenuItem value="card">Card</MenuItem><MenuItem value="bank_transfer">Bank transfer</MenuItem><MenuItem value="cheque">Cheque</MenuItem><MenuItem value="other">Other</MenuItem></TextField><TextField label="Transaction reference (optional)" value={props.paymentReference} onChange={(event) => props.onPaymentReference(event.target.value)} /></> : null}
          </Stack>
        ) : <Alert severity="info">This reservation will be created as unpaid. No payment or finance data is exposed to your role.</Alert>}
      </Section>
    </Stack>
  );
}

function BookingSummary({ room, checkIn, checkOut, guests, nights, guestName }: { room: AvailableRoom | null; checkIn: string; checkOut: string; guests: number; nights: number; guestName: string }) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", p: 2 }}><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Booking summary</Typography><Typography color="text.secondary" variant="caption">Updates as you complete the steps</Typography></Box>
      <Stack divider={<Divider flexItem />} spacing={0} sx={{ px: 2 }}><ReviewRow label="Stay" value={`${formatLocalDate(checkIn)} → ${formatLocalDate(checkOut)}`} /><ReviewRow label="Guests" value={String(guests)} /><ReviewRow label="Room" value={room?.name || "Not selected"} /><ReviewRow label="Lead guest" value={guestName || "Not added"} /></Stack>
      <Box sx={{ bgcolor: "action.hover", p: 2 }}><Typography color="text.secondary" variant="caption">{nights} night{nights === 1 ? "" : "s"} · booking total</Typography><Typography color="primary.main" variant="h4">{room ? money.format(room.totalPrice) : "—"}</Typography></Box>
    </Paper>
  );
}

function ReviewRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <Box sx={{ alignItems: "baseline", display: "grid", gap: 1.5, gridTemplateColumns: "minmax(84px,auto) minmax(0,1fr)", py: 1.25 }}><Typography color="text.secondary" variant="body2">{label}</Typography><Typography color={accent ? "primary.main" : "text.primary"} variant="body2" sx={{ fontWeight: 700, minWidth: 0, overflowWrap: "anywhere", textAlign: "right" }}>{value || "—"}</Typography></Box>;
}

function WizardActions({ activeStep, busy, onBack }: { activeStep: number; busy: boolean; onBack: () => void }) {
  return (
    <Paper elevation={activeStep >= 0 ? 6 : 0} sx={{ bottom: { xs: "calc(64px + env(safe-area-inset-bottom))", md: "auto" }, left: { xs: 0, md: "auto" }, p: { xs: 1.25, md: 1.5 }, position: { xs: "fixed", md: "static" }, right: { xs: 0, md: "auto" }, zIndex: { xs: 10, md: "auto" } }}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", maxWidth: { md: 560 }, ml: { md: "auto" } }}>
        {activeStep > 0 ? <Button disabled={busy} type="button" onClick={onBack} sx={{ flex: { xs: 1, md: "initial" } }}>Back</Button> : null}
        <Button disabled={busy} type="submit" endIcon={activeStep < 3 ? <ArrowForwardRoundedIcon /> : undefined} variant="contained" sx={{ flex: { xs: 2, md: "initial" }, minWidth: { md: 180 } }}>{busy ? "Please wait…" : activeStep === 0 ? "Check availability" : activeStep === 3 ? "Confirm booking" : "Continue"}</Button>
      </Stack>
    </Paper>
  );
}

function BookingFlowSkeleton() {
  return <Container maxWidth="xl" sx={{ py: 3 }}><Stack spacing={2}><Skeleton width={260} height={44} /><Skeleton height={60} /><Skeleton height={420} variant="rounded" /></Stack></Container>;
}

function CenteredState({ title, children, icon, severity = "info" }: { title: string; children: ReactNode; icon?: ReactNode; severity?: "info" | "error" }) {
  return <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}><Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}><Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>{icon ? <Box sx={{ bgcolor: "action.selected", borderRadius: 2, color: "primary.main", display: "grid", height: 46, placeItems: "center", width: 46 }}>{icon}</Box> : null}<Typography variant="h5">{title}</Typography><Alert severity={severity} sx={{ width: "100%" }}>{children}</Alert><Button type="button" onClick={() => window.history.back()}>Go back</Button></Stack></Paper></Container>;
}
