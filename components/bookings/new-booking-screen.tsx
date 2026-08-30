"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Drawer,
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";
import {
  createWalkInBooking,
  getAvailableRooms,
} from "@/features/bookings/services/booking-service";
import type { AvailableRoom } from "@/features/bookings/models/booking";
import { localDateKey } from "@/lib/date-time";
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
  return `${BOOKING_DRAFT_PREFIX}:${userId}:${propertyId}`;
}

function readBookingDraft(key: string): BookingDraft | null {
  if (typeof window === "undefined") return null;

  try {
    // Older builds stored full guest identity and contact details globally.
    // Never restore that data into another user's or property's booking form.
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

const tomorrow = () => {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return localDateKey(value);
};

export function NewBookingScreen() {
  const { session, loading, error } = useAppSession();
  const propertyId = session?.activePropertyId;
  const userId = session?.user?.id;

  if (loading || !session) {
    return (
      <Box sx={{ display: "grid", minHeight: "60dvh", placeItems: "center" }}>
        <LinearProgress sx={{ maxWidth: 320, width: "70%" }} />
      </Box>
    );
  }

  if (error || !propertyId || !userId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">
          {error?.message ?? "Select an active property before creating a booking."}
        </Alert>
      </Container>
    );
  }

  return (
    <NewBookingFlow
      key={`${userId}:${propertyId}`}
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
  const [guestSheetOpen, setGuestSheetOpen] = useState(false);
  const [guestStep, setGuestStep] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BookingFormState>(() =>
    emptyBookingForm(initialDraft?.paymentMethod),
  );
  const [draftSaved, setDraftSaved] = useState(Boolean(initialDraft));
  const availabilityRequest = useRef(0);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof typeof form, string>>
  >({});
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        // Guest identity, contact, ID and special-request fields intentionally
        // stay in memory only. Persist only the low-risk stay preferences.
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

  const field = (name: keyof typeof form) => ({
    value: form[name],
    error: Boolean(fieldErrors[name]),
    helperText: fieldErrors[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [name]: event.target.value }));
      setFieldErrors((current) => ({ ...current, [name]: undefined }));
      if (name === "paymentMethod") setDraftSaved(false);
    },
  });

  const invalidateAvailability = () => {
    availabilityRequest.current += 1;
    setRooms([]);
    setSelected(null);
    setSearched(false);
    setGuestSheetOpen(false);
    setGuestStep(0);
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
    if (isMobile) {
      setGuestStep(0);
      setGuestSheetOpen(true);
    }
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
      document.getElementById(`available-room-${nextRoom.id}`)?.focus();
    });
  };

  const validateGuestInformation = () => {
    const next: Partial<Record<keyof typeof form, string>> = {};
    const required: Array<keyof typeof form> = [
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
      setError("Check the highlighted guest information.");
      window.setTimeout(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      }, 80);
      return false;
    }
    return true;
  };

  const continueGuestFlow = () => {
    if (guestStep === 0 && !validateGuestInformation()) return;
    setGuestStep((current) => Math.min(current + 1, 2));
  };
  const search = async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn)
      return setError("Checkout must be after check-in.");
    const request = availabilityRequest.current + 1;
    availabilityRequest.current = request;
    setRooms([]);
    setSelected(null);
    setSearched(false);
    setGuestSheetOpen(false);
    setGuestStep(0);
    setLoading(true);
    setError(null);
    try {
      const values = await getAvailableRooms(
        client,
        propertyId,
        checkIn,
        checkOut,
        adults + children,
      );
      if (request !== availabilityRequest.current) return;
      setRooms(values);
      setSearched(true);
      const requested = searchParams.get("room");
      if (requested) {
        const requestedRoom =
          values.find((item) => item.id === requested) ?? null;
        setSelected(requestedRoom);
        if (requestedRoom && isMobile) {
          setGuestStep(0);
          setGuestSheetOpen(true);
        }
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
    if (!selected) return setError("Select an available room first.");
    if (!validateGuestInformation()) {
      setGuestStep(0);
      if (isMobile) setGuestSheetOpen(true);
      return;
    }
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
      trackEvent("booking_created", { room_id: selected.id, adults, children, payment_method: form.paymentMethod });
      feedback.success("Booking created successfully.");
      router.replace(id ? `/bookings/${id}` : "/bookings");
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
    <Container
      component="form"
      onSubmit={submit}
      maxWidth="lg"
      sx={{ py: { xs: 2.5, sm: 3.5, lg: 5 } }}
    >
      <Stack spacing={{ xs: 2.25, sm: 3 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <IconButton aria-label="Back" onClick={() => router.back()}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box>
            <Typography variant="h4">New booking</Typography>
            <Typography
              color="text.secondary"
              sx={{ fontSize: { xs: ".9rem", sm: "1rem" } }}
            >
              Search availability, select a room and enter guest details.
            </Typography>
            {draftSaved ? (
              <Typography color="success.main" variant="caption">
                Stay preferences saved on this device
              </Typography>
            ) : null}
          </Box>
        </Stack>
        <Stepper
          activeStep={selected ? 1 : 0}
          alternativeLabel
          sx={{
            px: { xs: 0, sm: 2 },
            "& .MuiStepLabel-label": {
              fontSize: { xs: ".72rem", sm: ".875rem" },
            },
          }}
        >
          {["Stay & room", "Guest & payment"].map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3, lg: 4 } }}>
          <Stack spacing={2}>
            <Typography variant="h6">Stay dates</Typography>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2,minmax(0,1fr))",
                  lg: "repeat(4,minmax(0,1fr))",
                },
              }}
            >
              <TextField
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
                label="Adults"
                type="number"
                value={adults}
                onChange={(event) => changeAdults(event.target.value)}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
              />
              <TextField
                label="Children"
                type="number"
                value={children}
                onChange={(event) => changeChildren(event.target.value)}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </Box>
            <Button
              variant="outlined"
              startIcon={<SearchRoundedIcon />}
              disabled={loading}
              onClick={() => void search()}
              sx={{
                alignSelf: { sm: "flex-start" },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {loading ? "Searching…" : "Search available rooms"}
            </Button>
          </Stack>
        </Paper>
        {searched && (
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3, lg: 4 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Available rooms
            </Typography>
            {rooms.length ? (
              <Box
                aria-label="Available rooms"
                role="radiogroup"
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
                }}
              >
                {rooms.map((room, index) => (
                  <Paper
                    component="button"
                    key={room.id}
                    id={`available-room-${room.id}`}
                    type="button"
                    variant="outlined"
                    role="radio"
                    aria-checked={selected?.id === room.id}
                    aria-label={`${room.name}, ${room.roomType}, capacity ${room.capacity}, ${money.format(room.totalPrice)}`}
                    tabIndex={
                      selected?.id === room.id || (!selected && index === 0)
                        ? 0
                        : -1
                    }
                    onClick={() => chooseRoom(room)}
                    onKeyDown={(event) => handleRoomKeyDown(event, index)}
                    sx={{
                      appearance: "none",
                      bgcolor: "background.paper",
                      borderColor:
                        selected?.id === room.id ? "primary.main" : "divider",
                      borderWidth: selected?.id === room.id ? 2 : 1,
                      color: "text.primary",
                      cursor: "pointer",
                      font: "inherit",
                      overflow: "hidden",
                      p: 0,
                      textAlign: "left",
                      width: "100%",
                      "&:focus-visible": {
                        outline: "3px solid",
                        outlineColor: "primary.main",
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Stack direction={{ xs: "column", sm: "row" }}>
                      {room.images[0] ? (
                        <Box
                          sx={{
                            aspectRatio: { xs: "16/8", sm: "auto" },
                            height: { xs: "auto", sm: 128 },
                            minHeight: { xs: 120, sm: 128 },
                            position: "relative",
                            width: { xs: "100%", sm: 132 },
                          }}
                        >
                          <Image
                            src={room.images[0]}
                            alt={room.name}
                            fill
                            sizes="(max-width: 600px) 100vw, 132px"
                            style={{ objectFit: "cover" }}
                          />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            display: "grid",
                            height: { xs: 100, sm: 128 },
                            placeItems: "center",
                            width: { xs: "100%", sm: 132 },
                          }}
                        >
                          <BedRoundedIcon />
                        </Box>
                      )}
                      <Stack spacing={0.7} sx={{ flex: 1, p: 2 }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {room.name}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {room.roomType} · {room.capacity} guests
                        </Typography>
                        <Typography color="primary" sx={{ fontWeight: 700 }}>
                          {money.format(room.totalPrice)}
                        </Typography>
                        {selected?.id === room.id && (
                          <Chip
                            label="Selected"
                            color="primary"
                            size="small"
                            sx={{ alignSelf: "flex-start" }}
                          />
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Alert severity="info">
                No rooms are available for these dates and guest count.
              </Alert>
            )}
          </Paper>
        )}
        {Object.keys(fieldErrors).length > 0 ? (
          <Alert severity="warning">
            {Object.keys(fieldErrors).length} required guest field{Object.keys(fieldErrors).length === 1 ? "" : "s"} need attention before confirmation.
          </Alert>
        ) : null}
        {selected && (
          <ResponsiveBookingContainer
            open={guestSheetOpen}
            onClose={() => !loading && setGuestSheetOpen(false)}
            step={guestStep}
            onBack={() => setGuestStep((current) => Math.max(current - 1, 0))}
            onContinue={continueGuestFlow}
          >
            <Box
              sx={{
                alignItems: "start",
                display: "grid",
                gap: { xs: 2, md: 3 },
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  md: "minmax(0, 1fr) minmax(280px, 340px)",
                },
              }}
            >
              <Stack spacing={{ xs: 2, sm: 3 }}>
                <Paper
                  data-booking-step="guest"
                  variant="outlined"
                  sx={{ p: { xs: 2, sm: 3, lg: 4 } }}
                >
                  <Stack spacing={2.2}>
                    <Typography variant="h6">Guest information</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        fullWidth
                        required
                        label="First name"
                        {...field("firstName")}
                      />
                      <TextField
                        fullWidth
                        required
                        label="Last name"
                        {...field("lastName")}
                      />
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                      <TextField
                        fullWidth
                        required
                        select
                        label="Gender"
                        {...field("gender")}
                      >
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </TextField>
                      <TextField
                        fullWidth
                        required
                        label="Nationality"
                        {...field("nationality")}
                      />
                      <TextField
                        fullWidth
                        required
                        label="Occupation"
                        {...field("occupation")}
                      />
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        fullWidth
                        required
                        label="Phone"
                        {...field("phone")}
                      />
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        {...field("email")}
                      />
                    </Stack>
                  </Stack>
                </Paper>
                <Paper
                  data-booking-step="travel"
                  variant="outlined"
                  sx={{ p: { xs: 2, sm: 3, lg: 4 } }}
                >
                  <Stack spacing={2}>
                    <Typography variant="h6">
                      Travel and identification
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        fullWidth
                        label="Coming from"
                        {...field("whereFrom")}
                      />
                      <TextField
                        fullWidth
                        label="Going to"
                        {...field("whereTo")}
                      />
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        fullWidth
                        select
                        label="ID type"
                        {...field("idType")}
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="national_id">National ID</MenuItem>
                        <MenuItem value="passport">Passport</MenuItem>
                        <MenuItem value="driving_license">
                          Driving licence
                        </MenuItem>
                      </TextField>
                      <TextField
                        fullWidth
                        label="ID number"
                        {...field("idNumber")}
                      />
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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
                    </Stack>
                    <TextField
                      multiline
                      minRows={3}
                      label="Special requests"
                      {...field("specialRequests")}
                    />
                  </Stack>
                </Paper>
              </Stack>

              <Stack
                data-booking-step="payment"
                spacing={2}
                sx={{ position: { md: "sticky" }, top: { md: 24 } }}
              >
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h6">Booking summary</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {selected.name} · {adults + children} guests
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        borderBlock: "1px solid",
                        borderColor: "divider",
                        py: 2,
                      }}
                    >
                      <Typography color="text.secondary" variant="caption">
                        Total stay
                      </Typography>
                      <Typography color="primary.main" variant="h4">
                        {money.format(selected.totalPrice)}
                      </Typography>
                    </Box>
                    <TextField
                      required
                      select
                      label="Payment method"
                      {...field("paymentMethod")}
                    >
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="mobile_money">Mobile money</MenuItem>
                      <MenuItem value="card">Card</MenuItem>
                      <MenuItem value="bank_transfer">Bank transfer</MenuItem>
                    </TextField>
                    {form.paymentMethod !== "cash" && (
                      <TextField
                        label="Transaction reference"
                        {...field("transactionRef")}
                      />
                    )}
                  </Stack>
                </Paper>
                <Button
                  type="submit"
                  size="large"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                >
                  {loading ? "Creating booking…" : "Confirm booking"}
                </Button>
                <Typography
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                  variant="caption"
                >
                  Review guest and payment details before confirming.
                </Typography>
              </Stack>
            </Box>
          </ResponsiveBookingContainer>
        )}
        <Snackbar
          open={Boolean(error)}
          autoHideDuration={6500}
          onClose={() => setError(null)}
        >
          <Alert severity="error" variant="filled">
            {error}
          </Alert>
        </Snackbar>
      </Stack>
    </Container>
  );
}

function ResponsiveBookingContainer({
  children,
  open,
  onClose,
  step,
  onBack,
  onContinue,
}: {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  step: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (!isMobile) return <>{children}</>;

  const steps = [
    { key: "guest", title: "Guest information" },
    { key: "travel", title: "Travel and identification" },
    { key: "payment", title: "Payment and review" },
  ];
  const currentStep = steps[step] ?? steps[0];

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      ModalProps={{ disablePortal: true, keepMounted: true }}
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px 16px 0 0",
            maxHeight: "92dvh",
            overflow: "hidden",
          },
        },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          bgcolor: "divider",
          borderRadius: 99,
          height: 4,
          mx: "auto",
          mt: 1.25,
          width: 38,
        }}
      />
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          px: 2.5,
          py: 2,
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
        >
          <Box>
            <Typography variant="h6">{currentStep.title}</Typography>
            <Typography color="text.secondary" variant="body2">
              Step {step + 1} of {steps.length}
            </Typography>
          </Box>
          <Typography color="text.secondary" variant="caption" sx={{ pt: 0.5 }}>
            {Math.round(((step + 1) / steps.length) * 100)}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={((step + 1) / steps.length) * 100}
          sx={{ borderRadius: 99, height: 4, mt: 1.5 }}
        />
      </Box>
      <Box
        sx={{
          overflowY: "auto",
          p: 2,
          pb: "max(24px, env(safe-area-inset-bottom))",
          "& > .MuiBox-root": { gap: 2 },
          "& .MuiPaper-root": { boxShadow: "none" },
          [`& [data-booking-step]:not([data-booking-step="${currentStep.key}"])`]:
            {
              display: "none",
            },
        }}
      >
        {children}
      </Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          p: 2,
          pb: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        {step > 0 && (
          <Button color="inherit" onClick={onBack} sx={{ minWidth: 96 }}>
            Back
          </Button>
        )}
        {step < steps.length - 1 && (
          <Button fullWidth variant="contained" onClick={onContinue}>
            Continue
          </Button>
        )}
      </Stack>
    </Drawer>
  );
}
