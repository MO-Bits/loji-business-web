import type {
  GuestProfile,
  GuestUpdateInput,
} from "@/features/guests/models/guest";

export type GuestForm = Omit<
  Required<GuestUpdateInput>,
  "expectedUpdatedAt" | "propertyNotes"
> & {
  notes: string;
};

export type GuestField = keyof GuestForm;
export type GuestErrors = Partial<Record<GuestField, string>>;
export type Translate = (english: string, swahili: string) => string;
export type GuestEditorDraft = {
  baseline: GuestForm;
  form: GuestForm;
};
export type DraftNotice = "restored" | "stale" | null;

export const genderOptions = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
];

export const idTypeOptions = [
  "national_id",
  "passport",
  "driving_license",
  "voter_id",
  "other",
];

const phonePattern = /^[+()\d.\-\s]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function guestToInput(guest: GuestProfile): GuestForm {
  return normalizeGuest({
    firstName: guest.firstName,
    lastName: guest.lastName,
    gender: normalizeChoice(guest.gender),
    phone: guest.phone,
    email: guest.email,
    nationality: guest.nationality,
    occupation: guest.occupation,
    address: guest.address,
    whereFrom: guest.whereFrom,
    whereTo: guest.whereTo,
    idType: normalizeChoice(guest.idType),
    idNumber: guest.idNumber,
    emergencyContactName: guest.emergencyContactName,
    emergencyContactPhone: guest.emergencyContactPhone,
    notes: guest.propertyNotes,
  });
}

export function normalizeGuest(guest: GuestForm): GuestForm {
  return {
    firstName: guest.firstName.trim(),
    lastName: guest.lastName.trim(),
    gender: normalizeChoice(guest.gender),
    phone: guest.phone.trim(),
    email: guest.email.trim().toLowerCase(),
    nationality: guest.nationality.trim(),
    occupation: guest.occupation.trim(),
    address: guest.address.trim(),
    whereFrom: guest.whereFrom.trim(),
    whereTo: guest.whereTo.trim(),
    idType: normalizeChoice(guest.idType),
    idNumber: guest.idNumber.trim(),
    emergencyContactName: guest.emergencyContactName.trim(),
    emergencyContactPhone: guest.emergencyContactPhone.trim(),
    notes: guest.notes.trim(),
  };
}

export function validateGuest(guest: GuestForm, t: Translate): GuestErrors {
  const errors: GuestErrors = {};

  if (!guest.firstName || guest.firstName.length > 80) {
    errors.firstName = t(
      "Enter a first name with up to 80 characters.",
      "Weka jina la kwanza lenye herufi zisizozidi 80.",
    );
  }
  if (!guest.lastName || guest.lastName.length > 80) {
    errors.lastName = t(
      "Enter a last name with up to 80 characters.",
      "Weka jina la mwisho lenye herufi zisizozidi 80.",
    );
  }
  if (!guest.gender || guest.gender.length > 32) {
    errors.gender = t("Select a gender.", "Chagua jinsia.");
  }
  if (
    guest.phone.length < 5 ||
    guest.phone.length > 32 ||
    !phonePattern.test(guest.phone)
  ) {
    errors.phone = t(
      "Enter a valid phone number with 5–32 characters.",
      "Weka namba sahihi ya simu yenye herufi 5–32.",
    );
  }
  if (
    guest.email &&
    (guest.email.length > 254 || !emailPattern.test(guest.email))
  ) {
    errors.email = t(
      "Enter a valid email address.",
      "Weka anwani sahihi ya barua pepe.",
    );
  }
  if (guest.nationality.length > 80) {
    errors.nationality = t(
      "Use no more than 80 characters.",
      "Tumia herufi zisizozidi 80.",
    );
  }
  if (guest.occupation.length > 120) {
    errors.occupation = t(
      "Use no more than 120 characters.",
      "Tumia herufi zisizozidi 120.",
    );
  }
  if (guest.address.length > 500) {
    errors.address = t(
      "Keep the address under 500 characters.",
      "Anwani iwe chini ya herufi 500.",
    );
  }
  if (guest.whereFrom.length > 120) {
    errors.whereFrom = t(
      "Use no more than 120 characters.",
      "Tumia herufi zisizozidi 120.",
    );
  }
  if (guest.whereTo.length > 120) {
    errors.whereTo = t(
      "Use no more than 120 characters.",
      "Tumia herufi zisizozidi 120.",
    );
  }
  if (guest.idType.length > 40) {
    errors.idType = t(
      "Select a valid ID type.",
      "Chagua aina sahihi ya kitambulisho.",
    );
  }
  if (guest.idNumber.length > 100) {
    errors.idNumber = t(
      "Use no more than 100 characters.",
      "Tumia herufi zisizozidi 100.",
    );
  } else if (guest.idType && !guest.idNumber) {
    errors.idNumber = t(
      "Enter the number for the selected ID type.",
      "Weka namba ya aina ya kitambulisho iliyochaguliwa.",
    );
  } else if (guest.idNumber && !guest.idType) {
    errors.idType = t(
      "Select the type for this ID number.",
      "Chagua aina ya namba hii ya kitambulisho.",
    );
  }
  if (guest.emergencyContactName.length > 160) {
    errors.emergencyContactName = t(
      "Use no more than 160 characters.",
      "Tumia herufi zisizozidi 160.",
    );
  }
  if (
    guest.emergencyContactPhone &&
    (guest.emergencyContactPhone.length < 5 ||
      guest.emergencyContactPhone.length > 32 ||
      !phonePattern.test(guest.emergencyContactPhone))
  ) {
    errors.emergencyContactPhone = t(
      "Enter a valid emergency phone number.",
      "Weka namba sahihi ya simu ya dharura.",
    );
  }
  if (guest.notes.length > 1000) {
    errors.notes = t(
      "Keep internal notes under 1,000 characters.",
      "Maelezo ya ndani yawe chini ya herufi 1,000.",
    );
  }

  return errors;
}

export function guestInputsDiffer(left: GuestForm, right: GuestForm) {
  return (Object.keys(left) as GuestField[]).some(
    (field) => left[field] !== right[field],
  );
}

export function toGuestUpdateInput(
  guest: GuestForm,
  includeSensitive: boolean,
  expectedUpdatedAt: string | null,
): GuestUpdateInput {
  return {
    firstName: guest.firstName,
    lastName: guest.lastName,
    gender: guest.gender,
    phone: guest.phone,
    email: guest.email,
    nationality: guest.nationality,
    occupation: guest.occupation,
    address: guest.address,
    whereFrom: guest.whereFrom,
    whereTo: guest.whereTo,
    ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
    ...(includeSensitive
      ? {
          idType: guest.idType,
          idNumber: guest.idNumber,
          emergencyContactName: guest.emergencyContactName,
          emergencyContactPhone: guest.emergencyContactPhone,
          propertyNotes: guest.notes,
        }
      : {}),
  };
}

function normalizeChoice(value: string) {
  return value.trim().toLowerCase().replaceAll(" ", "_");
}

export function choiceOptions(options: string[], current: string) {
  return current && !options.includes(current) ? [current, ...options] : options;
}

export function choiceLabel(value: string, t: Translate) {
  const known: Record<string, [string, string]> = {
    male: ["Male", "Mwanaume"],
    female: ["Female", "Mwanamke"],
    other: ["Other", "Nyingine"],
    prefer_not_to_say: ["Prefer not to say", "Napendelea kutosema"],
    national_id: ["National ID", "Kitambulisho cha taifa"],
    passport: ["Passport", "Pasipoti"],
    driving_license: ["Driving licence", "Leseni ya udereva"],
    voter_id: ["Voter ID", "Kitambulisho cha mpiga kura"],
  };
  const label = known[value];
  return label ? t(label[0], label[1]) : value.replaceAll("_", " ");
}
