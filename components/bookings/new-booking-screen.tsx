"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
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
  createWalkInBooking,
  getAvailableRooms,
} from "@/features/bookings/services/booking-service";
import type { AvailableRoom } from "@/features/bookings/models/booking";
import { formatLocalDate, localDateKey } from "@/lib/date-time";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { trackEvent } from "@/lib/analytics";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});
const LEGACY_BOOKING_DRAFT_KEY = "loji-new-booking-draft";
const BOOKING_DRAFT_PREFIX = "loji-new-booking-draft:v2";
const PAYMENT_METHODS = new Set([
  "cash",
  "mobile_money",
  "card",
  "bank_transfer",
]);

type BookingFormState = {
  firstName: string;
  lastName: string;
  gender: string;
  nationality: string;
  occupation: string;
  email: string;
  phone: string;
  whereFrom: string;
  whereTo: string;
  idType: string;
  idNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  specialRequests: string;
  paymentMethod: string;
  transactionRef: string;
};

type BookingDraft = {
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  paymentMethod?: string;
};

const emptyBookingForm = (paymentMethod = "cash"): BookingFormState => ({
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
  paymentMethod,
  transactionRef: "",
});

function bookingDraftKey(userId: string, propertyId: string) {
  return BOOKING_DRAFT_PREFIX + ":" + userId + ":" + propertyId;
}

function readBookingDraft(key: string): BookingDraft | null {
  if (typeof window === "undefined") return null;

  try {
    // Earlier builds stored guest identity in a shared browser draft. Preserve
    // only stay preferences and scope the new draft to this user and property.
    window.localStorage.removeItem(LEGACY_BOOKING_DRAFT_KEY);
    const saved = window.localStorage.getItem(key);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as BookingDraft;
    return {
      checkIn: typeof parsed.checkIn === "string" ? parsed.checkIn : undefined,
      checkOut: typeof parsed.checkOut === "string" ? parsed.checkOut : undefined,
      adults:
        typeof parsed.adults === "number" && Number.isFinite(parsed.adults)
          ? parsed.adults
          : undefined,
      children:
        typeof parsed.children === "number" && Number.isFinite(parsed.children)
          ? parsed.children
          : undefined,
      paymentMethod:
        typeof parsed.paymentMethod === "string" &&
        PAYMENT_METHODS.has(parsed.paymentMethod)
          ? parsed.paymentMethod
          : undefined,
    };
  } catch {
    return null;
  }
}

function removeBookingDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // A completed booking must not be reported as failed if storage is blocked.
  }
}

function tomorrow() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return localDateKey(value);
}

function nightsBetween(checkIn: string, checkOut: string) {
  const [startYear, startMonth, startDay] = checkIn.split("-").map(Number);
  const [endYear, endMonth, endDay] = checkOut.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, Math.round((end - start) / 86_400_000))
    : 0;
}

function paymentMethodLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function NewBookingScreen() {
  const { session, loading, error } = useAppSession();
  const propertyId = session?.activePropertyId;
  const userId = session?.user?.id;
  const capabilities = getWorkspaceCapabilities(session?.activeRole);

  if (loading) return <BookingFlowLoading />;

  if (error || !session || !propertyId || !userId) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 5, sm: 8 } }}>
        <Alert severity="error">
          {error?.message ?? "Select an active property before creating a booking."}
        </Alert>
      </Container>
    );
  }

  if (!capabilities.canCreateBooking) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 5, sm: 8 } }}>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
            <Box
              sx={{
                alignItems: "center",
                bgcolor: "action.hover",
                borderRadius: 2,
                color: "primary.main",
                display: "inline-flex",
                height: 46,
                justifyContent: "center",
                width: 46,
              }}
            >
              <LockRoundedIcon />
            </Box>
            <Box>
              <Typography variant="h4">Booking access is limited</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                Your role can view operations, but cannot create a reservation.
                Ask a property owner or manager if this should change.
              </Typography>
            </Box>
            <Button onClick={() => window.history.back()} variant="outlined">
              Go back
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <NewBookingFlow
      key={userId + ":" + propertyId}
      propertyId={propertyId}
      userId={userId}
    />
  );
}

function NewBookingFlow({
  propertyId,
  userId,
}: {
  propertyId: string;
  userId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const client = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
  const draftKey = bookingDraftKey(userId, propertyId);
  const initialDraft = useMemo(() => readBookingDraft(draftKey), [draftKey]);
  const [checkIn, setCheckIn] = useState(
    () => initialDraft?.checkIn || localDateKey(),
  );
  const [checkOut, setCheckOut] = useState(
    () => initialDraft?.checkOut || tomorrow(),
  );
  const [adults, setAdults] = useState(() =>
    Math.max(1, Math.floor(initialDraft?.adults ?? 1)),
  );
  const [children, setChildren] = useState(() =>
    Math.max(0, Math.floor(initialDraft?.children ?? 0)),
  );
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [selected, setSelected] = useState<AvailableRoom | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BookingFormState>(() =>
    emptyBookingForm(initialDraft?.paymentMethod),
  );
  const [draftSaved, setDraftSaved] = useState(Boolean(initialDraft));
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof BookingFormState, string>>
  >({});
  const availabilityRequest = useRef(0);

  const stayNights = selected?.nights || nightsBetween(checkIn, checkOut);
  const totalGuests = adults + children;
  const guestFieldsMissing = [
    form.firstName,
    form.lastName,
    form.gender,
    form.nationality,
    form.occupation,
    form.phone,
  ].filter((value) => !value.trim()).length;
  const bookingReviewReady = Boolean(selected) && guestFieldsMissing === 0;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        // Guest PII remains only in memory. This small draft lets the operator
        // recover a stay search without leaking guest details across accounts.
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({
            checkIn,
            checkOut,
            adults,
            children,
            paymentMethod: form.paymentMethod,
          } satisfies BookingDraft),
        );
        setDraftSaved(true);
      } catch {
        setDraftSaved(false);
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [adults, checkIn, checkOut, children, draftKey, form.paymentMethod]);

  const field = (name: keyof BookingFormState) => ({
    value: form[name],
    error: Boolean(fieldErrors[name]),
    helperText: fieldErrors[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [name]: value }));
      setFieldErrors((current) => ({ ...current, [name]: undefined }));
      if (name === "paymentMethod") setDraftSaved(false);
    },
  });

  const invalidateAvailability = () => {
    availabilityRequest.current += 1;
    setRooms([]);
    setSelected(null);
    setSearched(false);
    setLoading(false);
    setError(null);
    setDraftSaved(false);
  };

  const changeCheckIn = (value: string) => {
    setCheckIn(value);
    invalidateAvailability();
  };

  const changeCheckOut = (value: string) => {
    setCheckOut(value);
    invalidateAvailability();
  };

  const changeAdults = (value: string) => {
    const next = Number(value);
    setAdults(Number.isFinite(next) ? Math.max(1, Math.floor(next)) : 1);
    invalidateAvailability();
  };

  const changeChildren = (value: string) => {
    const next = Number(value);
    setChildren(Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0);
    invalidateAvailability();
  };

  const chooseRoom = (room: AvailableRoom) => {
    setSelected(room);
    setError(null);
  };

  const handleRoomKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;
    if (["ArrowRight", "ArrowDown"].includes(event.key)) {
      nextIndex = (index + 1) % rooms.length;
    } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
      nextIndex = (index - 1 + rooms.length) % rooms.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = rooms.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextRoom = rooms[nextIndex];
    chooseRoom(nextRoom);
    window.requestAnimationFrame(() => {
      document.getElementById("available-room-" + nextRoom.id)?.focus();
    });
  };

  const validateGuestInformation = () => {
    const next: Partial<Record<keyof BookingFormState, string>> = {};
    const required: Array<keyof BookingFormState> = [
      "firstName",
      "lastName",
      "gender",
      "nationality",
      "occupation",
      "phone",
    ];

    for (const name of required) {
      if (!form[name].trim()) next[name] = "This field is required.";
    }

    const phone = form.phone.replace(/[\s()-]/g, "");
    const isTanzanian = form.nationality.trim().toLowerCase() === "tanzanian";
    const validPhone = isTanzanian
      ? /^(?:\+?255|0)?[67]\d{8}$/.test(phone)
      : /^\+?\d{7,15}$/.test(phone);
    if (form.phone.trim() && !validPhone) {
      next.phone = isTanzanian
        ? "Enter a valid Tanzanian mobile number."
        : "Enter a valid phone number.";
    }

    if (
      form.email.trim() &&
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())
    ) {
      next.email = "Enter a valid email address.";
    }

    setFieldErrors(next);
    if (Object.keys(next).length) {
      setError("Check the highlighted guest information before confirming.");
      window.setTimeout(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      }, 80);
      return false;
    }
    return true;
  };

  const search = async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError("Checkout must be after check-in.");
      return;
    }

    const request = availabilityRequest.current + 1;
    availabilityRequest.current = request;
    setRooms([]);
    setSelected(null);
    setSearched(false);
    setLoading(true);
    setError(null);
    try {
      const values = await getAvailableRooms(
        client,
        propertyId,
        checkIn,
        checkOut,
        totalGuests,
      );
      if (request !== availabilityRequest.current) return;
      setRooms(values);
      setSearched(true);
      const requested = searchParams.get("room");
      if (requested) {
        setSelected(values.find((item) => item.id === requested) ?? null);
      }
    } catch (cause) {
      if (request !== availabilityRequest.current) return;
      setError(
        cause instanceof Error ? cause.message : "Unable to search rooms.",
      );
    } finally {
      if (request === availabilityRequest.current) setLoading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) {
      setError("Select an available room first.");
      return;
    }
    if (!validateGuestInformation()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await createWalkInBooking(client, propertyId, {
        ...form,
        roomId: selected.id,
        checkIn,
        checkOut,
        totalPrice: selected.totalPrice,
        adults,
        children,
      });
      const booking = result.booking;
      const id =
        booking && typeof booking === "object" && !Array.isArray(booking)
          ? String(booking.id ?? "")
          : "";
      removeBookingDraft(draftKey);
      trackEvent("booking_created", {
        room_id: selected.id,
        adults,
        children,
        payment_method: form.paymentMethod,
      });
      feedback.success("Booking created successfully.");
      router.replace(id ? "/bookings/" + id : "/bookings");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create booking.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100dvh", pb: { xs: 10, md: 5 } }}>
      <Container
        component="form"
        maxWidth="xl"
        onSubmit={submit}
        sx={{ py: { xs: 1.75, sm: 2.5, lg: 3 } }}
      >
        <Stack spacing={{ xs: 1.5, md: 2 }}>
          <ReservationHeader
            draftSaved={draftSaved}
            onBack={() => router.back()}
          />

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <PanelHeading
              caption="01 · Stay search"
              icon={<CalendarMonthRoundedIcon fontSize="small" />}
              title="Build a live room quote"
              description="Choose dates and guest count, then search the current inventory."
            />
            <Box sx={{ p: { xs: 1.5, sm: 2.25, lg: 2.5 } }}>
              <Box
                sx={{
                  alignItems: "end",
                  display: "grid",
                  gap: { xs: 1.25, sm: 1.5 },
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: "repeat(5, minmax(0, 1fr))",
                  },
                }}
              >
                <TextField
                  fullWidth
                  required
                  label="Check-in"
                  type="date"
                  value={checkIn}
                  onChange={(event) => changeCheckIn(event.target.value)}
                  slotProps={{
                    htmlInput: { min: localDateKey() },
                    inputLabel: { shrink: true },
                  }}
                />
                <TextField
                  fullWidth
                  required
                  label="Check-out"
                  type="date"
                  value={checkOut}
                  onChange={(event) => changeCheckOut(event.target.value)}
                  slotProps={{
                    htmlInput: { min: checkIn || localDateKey() },
                    inputLabel: { shrink: true },
                  }}
                />
                <TextField
                  fullWidth
                  label="Adults"
                  type="number"
                  value={adults}
                  onChange={(event) => changeAdults(event.target.value)}
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                />
                <TextField
                  fullWidth
                  label="Children"
                  type="number"
                  value={children}
                  onChange={(event) => changeChildren(event.target.value)}
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                />
                <Button
                  type="button"
                  fullWidth
                  variant="contained"
                  startIcon={<SearchRoundedIcon />}
                  disabled={loading}
                  onClick={() => void search()}
                  sx={{ minHeight: { lg: 56 } }}
                >
                  {loading ? "Searching…" : "Check availability"}
                </Button>
              </Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={0.75}
                sx={{ alignItems: { sm: "center" }, mt: 1.5 }}
              >
                <Chip
                  icon={<GroupRoundedIcon />}
                  label={totalGuests + " " + (totalGuests === 1 ? "guest" : "guests")}
                  size="small"
                  variant="outlined"
                />
                <Typography color="text.secondary" variant="caption">
                  The server rechecks the room, rate and availability before a
                  reservation is created.
                </Typography>
              </Stack>
            </Box>
          </Paper>

          <Stepper
            activeStep={bookingReviewReady ? 2 : selected ? 1 : 0}
            alternativeLabel
            sx={{
              px: { xs: 0, sm: 2 },
              "& .MuiStepLabel-label": {
                fontSize: { xs: ".68rem", sm: ".75rem" },
                mt: 0.65,
              },
              "& .MuiStepIcon-root": { fontSize: { xs: "1.5rem", sm: "1.75rem" } },
            }}
          >
            {["Find a room", "Guest profile", "Review & confirm"].map(
              (label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ),
            )}
          </Stepper>

          <AvailabilityPanel
            loading={loading}
            rooms={rooms}
            searched={searched}
            selectedId={selected?.id}
            onChoose={chooseRoom}
            onRoomKeyDown={handleRoomKeyDown}
          />

          {Object.keys(fieldErrors).length > 0 ? (
            <Alert severity="warning">
              {Object.keys(fieldErrors).length} required guest field
              {Object.keys(fieldErrors).length === 1 ? "" : "s"} need
              attention before confirmation.
            </Alert>
          ) : null}

          {selected ? (
            <Box
              sx={{
                alignItems: "start",
                display: "grid",
                gap: { xs: 1.5, lg: 2 },
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  lg: "minmax(0, 1.35fr) minmax(320px, .8fr)",
                },
              }}
            >
              <Stack spacing={{ xs: 1.5, md: 2 }}>
                <FormSection
                  caption="02 · Required for check-in"
                  title="Guest profile"
                  description="Add the details your front desk needs to identify and contact this guest."
                >
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.5,
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                    }}
                  >
                    <TextField fullWidth required label="First name" {...field("firstName")} />
                    <TextField fullWidth required label="Last name" {...field("lastName")} />
                    <TextField fullWidth required select label="Gender" {...field("gender")}>
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>
                    <TextField fullWidth required label="Nationality" {...field("nationality")} />
                    <TextField fullWidth required label="Occupation" {...field("occupation")} />
                    <TextField fullWidth required label="Phone" {...field("phone")} />
                    <TextField fullWidth label="Email" type="email" {...field("email")} />
                  </Box>
                </FormSection>

                <FormSection
                  caption="Optional · Operations context"
                  title="Travel, ID & requests"
                  description="Capture only the additional details that will help the team support the stay."
                >
                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                      }}
                    >
                      <TextField fullWidth label="Coming from" {...field("whereFrom")} />
                      <TextField fullWidth label="Going to" {...field("whereTo")} />
                      <TextField fullWidth select label="ID type" {...field("idType")}>
                        <MenuItem value="">Not recorded</MenuItem>
                        <MenuItem value="national_id">National ID</MenuItem>
                        <MenuItem value="passport">Passport</MenuItem>
                        <MenuItem value="driving_license">Driving licence</MenuItem>
                      </TextField>
                      <TextField fullWidth label="ID number" {...field("idNumber")} />
                      <TextField
                        fullWidth
                        label="Emergency contact name"
                        {...field("emergencyContactName")}
                      />
                      <TextField
                        fullWidth
                        label="Emergency contact phone"
                        {...field("emergencyContactPhone")}
                      />
                    </Box>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Special requests"
                      {...field("specialRequests")}
                    />
                  </Stack>
                </FormSection>
              </Stack>

              <BookingReviewRail
                checkIn={checkIn}
                checkOut={checkOut}
                form={form}
                guestFieldsMissing={guestFieldsMissing}
                loading={loading}
                nights={stayNights}
                room={selected}
                totalGuests={totalGuests}
                onFieldChange={field}
              />
            </Box>
          ) : null}
        </Stack>
      </Container>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6500}
        onClose={() => setError(null)}
      >
        <Alert severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function BookingFlowLoading() {
  return (
    <Box sx={{ display: "grid", minHeight: "60dvh", placeItems: "center" }}>
      <Stack spacing={1.25} sx={{ alignItems: "center", width: "min(320px, 70%)" }}>
        <LinearProgress sx={{ width: "100%" }} />
        <Typography color="text.secondary" variant="caption">
          Preparing reservation workspace
        </Typography>
      </Stack>
    </Box>
  );
}

function ReservationHeader({
  draftSaved,
  onBack,
}: {
  draftSaved: boolean;
  onBack: () => void;
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          alignItems: { sm: "center" },
          bgcolor: "primary.dark",
          color: "primary.contrastText",
          display: "flex",
          gap: { xs: 1.25, sm: 2 },
          p: { xs: 1.5, sm: 2.25, lg: 2.5 },
        }}
      >
        <IconButton aria-label="Back" color="inherit" onClick={onBack} type="button">
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em", opacity: 0.74 }}>
            RESERVATIONS · NEW WALK-IN
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.25 }}>
            Create a booking
          </Typography>
          <Typography sx={{ fontSize: ".8125rem", mt: 0.45, opacity: 0.78 }}>
            Quote live inventory, capture guest details and record the stay in one controlled flow.
          </Typography>
        </Box>
        <Chip
          color={draftSaved ? "success" : "default"}
          icon={draftSaved ? <CheckCircleRoundedIcon /> : undefined}
          label={draftSaved ? "Draft saved" : "Draft active"}
          size="small"
          sx={{
            alignSelf: { xs: "flex-start", sm: "center" },
            bgcolor: draftSaved ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.08)",
            color: "inherit",
            "& .MuiChip-icon": { color: "inherit" },
          }}
        />
      </Box>
    </Paper>
  );
}

function PanelHeading({
  caption,
  description,
  icon,
  title,
}: {
  caption: string;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Box
      sx={{
        alignItems: "flex-start",
        borderBottom: "1px solid",
        borderColor: "divider",
        display: "flex",
        gap: 1.25,
        p: { xs: 1.5, sm: 2.25 },
      }}
    >
      <Box
        sx={{
          alignItems: "center",
          bgcolor: "action.hover",
          borderRadius: 1.5,
          color: "primary.main",
          display: "inline-flex",
          flexShrink: 0,
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography color="text.secondary" variant="overline">
          {caption}
        </Typography>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.25 }} variant="body2">
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

function AvailabilityPanel({
  loading,
  onChoose,
  onRoomKeyDown,
  rooms,
  searched,
  selectedId,
}: {
  loading: boolean;
  onChoose: (room: AvailableRoom) => void;
  onRoomKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  rooms: AvailableRoom[];
  searched: boolean;
  selectedId?: string;
}) {
  if (!searched) {
    return (
      <Paper
        variant="outlined"
        sx={{
          alignItems: "center",
          borderStyle: "dashed",
          display: "flex",
          gap: 1.25,
          justifyContent: "center",
          minHeight: 132,
          p: 2,
          textAlign: "center",
        }}
      >
        <HotelRoundedIcon color="action" />
        <Box>
          <Typography variant="subtitle1">Search to see live inventory</Typography>
          <Typography color="text.secondary" variant="body2">
            Select a room only after the availability check returns a current quote.
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <PanelHeading
        caption="Inventory · live quote"
        icon={<BedRoundedIcon fontSize="small" />}
        title={rooms.length ? String(rooms.length) + " room" + (rooms.length === 1 ? "" : "s") + " available" : "No matching rooms"}
        description={
          rooms.length
            ? "Select one room to continue to the guest and payment review."
            : "Try another date range or adjust the number of guests."
        }
      />
      {loading ? <LinearProgress /> : null}
      <Box sx={{ p: { xs: 1.25, sm: 1.75, lg: 2 } }}>
        {rooms.length ? (
          <Box
            aria-label="Available rooms"
            role="radiogroup"
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
            }}
          >
            {rooms.map((room, index) => (
              <RoomQuoteCard
                key={room.id}
                index={index}
                onChoose={onChoose}
                onKeyDown={onRoomKeyDown}
                room={room}
                selected={selectedId === room.id}
              />
            ))}
          </Box>
        ) : (
          <Alert severity="info">No rooms are available for these dates and guest count.</Alert>
        )}
      </Box>
    </Paper>
  );
}

function RoomQuoteCard({
  index,
  onChoose,
  onKeyDown,
  room,
  selected,
}: {
  index: number;
  onChoose: (room: AvailableRoom) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  room: AvailableRoom;
  selected: boolean;
}) {
  return (
    <Paper
      component="button"
      id={"available-room-" + room.id}
      type="button"
      variant="outlined"
      role="radio"
      aria-checked={selected}
      aria-label={room.name + ", " + room.roomType + ", capacity " + room.capacity + ", " + money.format(room.totalPrice)}
      tabIndex={selected || index === 0 ? 0 : -1}
      onClick={() => onChoose(room)}
      onKeyDown={(event) => onKeyDown(event, index)}
      sx={{
        appearance: "none",
        bgcolor: selected ? "action.selected" : "background.paper",
        borderColor: selected ? "primary.main" : "divider",
        borderWidth: selected ? 2 : 1,
        color: "text.primary",
        cursor: "pointer",
        font: "inherit",
        overflow: "hidden",
        p: 0,
        textAlign: "left",
        transition: "border-color 160ms ease, background-color 160ms ease, transform 160ms ease",
        width: "100%",
        "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" },
        "&:focus-visible": {
          outline: "3px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "108px minmax(0, 1fr)", sm: "124px minmax(0, 1fr) auto" },
          minHeight: 132,
        }}
      >
        <RoomImage room={room} />
        <Stack spacing={0.55} sx={{ minWidth: 0, p: { xs: 1.25, sm: 1.5 } }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 700 }}>
              {room.name}
            </Typography>
            {selected ? <Chip color="primary" label="Selected" size="small" /> : null}
          </Stack>
          <Typography color="text.secondary" variant="body2">
            {room.roomType} · {room.capacity} guests · {room.bedCount} bed{room.bedCount === 1 ? "" : "s"}
          </Typography>
          <Typography color="text.secondary" variant="caption" sx={{ lineClamp: 1, overflow: "hidden" }}>
            {room.amenities.length ? room.amenities.slice(0, 3).join(" · ") : "Standard room amenities"}
          </Typography>
        </Stack>
        <Stack
          spacing={0.25}
          sx={{
            alignItems: { xs: "flex-start", sm: "flex-end" },
            borderLeft: { sm: "1px solid" },
            borderTop: { xs: "1px solid", sm: 0 },
            borderColor: "divider",
            gridColumn: { xs: "1 / -1", sm: "auto" },
            justifyContent: "center",
            minWidth: { sm: 126 },
            p: { xs: 1.1, sm: 1.5 },
          }}
        >
          <Typography color="text.secondary" variant="caption">
            {room.nights} night{room.nights === 1 ? "" : "s"} total
          </Typography>
          <Typography color="primary.main" sx={{ fontWeight: 800 }}>
            {money.format(room.totalPrice)}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {money.format(room.pricePerNight)} / night
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}

function RoomImage({ room }: { room: AvailableRoom }) {
  if (!room.images[0]) {
    return (
      <Box
        sx={{
          alignItems: "center",
          bgcolor: "action.hover",
          color: "primary.main",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <BedRoundedIcon />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: 108, position: "relative" }}>
      <Image
        src={room.images[0]}
        alt={room.name}
        fill
        sizes="(max-width: 599px) 108px, 124px"
        style={{ objectFit: "cover" }}
      />
    </Box>
  );
}

function FormSection({
  caption,
  children,
  description,
  title,
}: {
  caption: string;
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", p: { xs: 1.5, sm: 2.25 } }}>
        <Typography color="text.secondary" variant="overline">
          {caption}
        </Typography>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.25 }} variant="body2">
          {description}
        </Typography>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 2.25 } }}>{children}</Box>
    </Paper>
  );
}

function BookingReviewRail({
  checkIn,
  checkOut,
  form,
  guestFieldsMissing,
  loading,
  nights,
  room,
  totalGuests,
  onFieldChange,
}: {
  checkIn: string;
  checkOut: string;
  form: BookingFormState;
  guestFieldsMissing: number;
  loading: boolean;
  nights: number;
  room: AvailableRoom;
  totalGuests: number;
  onFieldChange: (name: keyof BookingFormState) => {
    value: string;
    error: boolean;
    helperText: string | undefined;
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  };
}) {
  return (
    <Stack spacing={1.5} sx={{ position: { lg: "sticky" }, top: { lg: 20 } }}>
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box sx={{ bgcolor: "primary.dark", color: "primary.contrastText", p: { xs: 1.5, sm: 2 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <PaymentsRoundedIcon fontSize="small" />
            <Box>
              <Typography sx={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em", opacity: 0.72 }}>
                03 · REVIEW & CONFIRM
              </Typography>
              <Typography variant="h6">Reservation ledger</Typography>
            </Box>
          </Stack>
        </Box>
        <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />} spacing={0}>
          <ReviewRow label="Room" value={room.name + " · " + room.roomType} />
          <ReviewRow
            label="Stay"
            value={formatLocalDate(checkIn) + " → " + formatLocalDate(checkOut)}
          />
          <ReviewRow label="Guests" value={totalGuests + " " + (totalGuests === 1 ? "guest" : "guests")} />
          <ReviewRow label="Rate" value={money.format(room.pricePerNight) + " / night"} />
        </Stack>
        <Box sx={{ bgcolor: "action.hover", p: { xs: 1.5, sm: 2 } }}>
          <Stack direction="row" sx={{ alignItems: "end", justifyContent: "space-between" }}>
            <Box>
              <Typography color="text.secondary" variant="caption">
                {nights} night{nights === 1 ? "" : "s"} · total due
              </Typography>
              <Typography color="primary.main" variant="h4">
                {money.format(room.totalPrice)}
              </Typography>
            </Box>
            <Chip color="success" label="Live quote" size="small" />
          </Stack>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Payment record
            </Typography>
            <Typography color="text.secondary" variant="body2">
              The full quoted amount is recorded with this reservation.
            </Typography>
          </Box>
          <TextField fullWidth required select label="Payment method" {...onFieldChange("paymentMethod")}>
            <MenuItem value="cash">Cash</MenuItem>
            <MenuItem value="mobile_money">Mobile money</MenuItem>
            <MenuItem value="card">Card</MenuItem>
            <MenuItem value="bank_transfer">Bank transfer</MenuItem>
          </TextField>
          {form.paymentMethod !== "cash" ? (
            <TextField fullWidth label="Transaction reference" {...onFieldChange("transactionRef")} />
          ) : null}
          <Typography color="text.secondary" variant="caption">
            Method: {paymentMethodLabel(form.paymentMethod)}. The rate is recalculated by the server before the payment record is saved.
          </Typography>
        </Stack>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          bgcolor: "background.paper",
          p: { xs: 1.25, sm: 1.5 },
          position: { xs: "sticky", lg: "static" },
          bottom: { xs: 8 },
          zIndex: 2,
        }}
      >
        <Stack spacing={1}>
          {guestFieldsMissing ? (
            <Typography color="warning.main" variant="caption">
              {guestFieldsMissing} required guest detail{guestFieldsMissing === 1 ? "" : "s"} still need attention.
            </Typography>
          ) : (
            <Typography color="success.main" variant="caption">
              Guest profile is ready for confirmation.
            </Typography>
          )}
          <Button type="submit" size="large" variant="contained" disabled={loading} fullWidth>
            {loading ? "Creating booking…" : "Confirm booking"}
          </Button>
          <Typography color="text.secondary" sx={{ textAlign: "center" }} variant="caption">
            Confirming creates the guest, booking and payment record together.
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "baseline", justifyContent: "space-between", p: { xs: 1.25, sm: 1.5 } }}
    >
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontSize: ".8125rem", fontWeight: 700, textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}
