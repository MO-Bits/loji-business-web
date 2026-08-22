const translations: Record<string, string> = {
  Home: "Nyumbani", Bookings: "Uhifadhi", Rooms: "Vyumba", Property: "Jengo",
  Staff: "Wafanyakazi", Account: "Akaunti", "My account": "Akaunti yangu",
  Manage: "Usimamizi", Search: "Tafuta", Filter: "Chuja", Back: "Rudi",
  Cancel: "Ghairi", Close: "Funga", Continue: "Endelea", Save: "Hifadhi",
  Confirm: "Thibitisha", Delete: "Futa", Edit: "Hariri", Retry: "Jaribu tena",
  Refresh: "Onyesha upya", "Sign out": "Ondoka", "Please wait…": "Tafadhali subiri…",
  "Loading…": "Inapakia…", "Something went wrong.": "Hitilafu imetokea.",
  "Welcome back": "Karibu tena", "Continue with Google": "Endelea na Google",
  "Get started": "Anza", "Learn more": "Jifunze zaidi",
  "Terms of Use": "Masharti ya matumizi", "Privacy Policy": "Sera ya faragha",
  "Access Restricted": "Ufikiaji Umezuiwa",
  "Why am I seeing this?": "Kwa nini ninaona hii?", "What should I do?": "Nifanye nini?",
  "Invitation code": "Namba ya mwaliko", "Accept invitation": "Kubali mwaliko",
  "Property invitation": "Mwaliko wa jengo", "Property setup": "Maandalizi ya jengo",
  "Set up your property": "Sanidi jengo lako", "Property information": "Taarifa za jengo",
  Address: "Anwani", "Choose location": "Chagua eneo", "Confirm location": "Thibitisha eneo",
  "Use my location": "Tumia eneo langu", "New booking": "Uhifadhi mpya",
  "Booking details": "Maelezo ya uhifadhi", "Guest information": "Taarifa za mgeni",
  "Booking information": "Taarifa za uhifadhi", "Payment details": "Maelezo ya malipo",
  "Payment and review": "Malipo na ukaguzi", "Travel information": "Taarifa za safari",
  "Travel & identification": "Safari na utambulisho", "First name": "Jina la kwanza",
  "Last name": "Jina la mwisho", Gender: "Jinsia", Nationality: "Uraia",
  Occupation: "Kazi", Phone: "Simu", Email: "Barua pepe", "Check-in": "Kuingia",
  "Check-out": "Kutoka", Adults: "Watu wazima", Children: "Watoto",
  "Search available rooms": "Tafuta vyumba vinavyopatikana",
  "Available rooms": "Vyumba vinavyopatikana", Selected: "Kimechaguliwa",
  "Payment method": "Njia ya malipo", Cash: "Taslimu", "Mobile money": "Pesa ya simu",
  Card: "Kadi", "Bank transfer": "Uhamisho wa benki",
  "Confirm booking": "Thibitisha uhifadhi", "Create booking": "Tengeneza uhifadhi",
  "Check in guest": "Ingiza mgeni", "Check out guest": "Ondoa mgeni",
  "Check-ins today": "Wanaoingia leo", "Check-outs today": "Wanaotoka leo",
  "Today’s check-outs": "Wanaotoka leo", "Occupancy rate": "Kiwango cha matumizi",
  "Today’s revenue": "Mapato ya leo", "Add room": "Ongeza chumba",
  "Room details": "Maelezo ya chumba", "Edit room": "Hariri chumba",
  "Room information": "Taarifa za chumba", "Basic information": "Taarifa za msingi",
  Amenities: "Huduma", Photos: "Picha", Pricing: "Bei", Capacity: "Uwezo",
  Available: "Kinapatikana", Occupied: "Kimelaliwa", Inactive: "Kimezimwa", Ready: "Tayari",
  "Available now": "Kinapatikana sasa", "Manage rooms": "Simamia vyumba",
  "Invite staff": "Alika mfanyakazi", "Invite staff member": "Alika mfanyakazi",
  Invitations: "Mialiko", "Current Staff": "Wafanyakazi",
  "Staff email address": "Barua pepe ya mfanyakazi", "Property role": "Jukumu",
  Manager: "Meneja", Receptionist: "Mapokezi", "Send invitation": "Tuma mwaliko",
  "Remove staff": "Ondoa mfanyakazi", "Delete invitation": "Futa mwaliko",
  Suspend: "Simamisha", Activate: "Washa", "Property details": "Maelezo ya jengo",
  "Edit Property": "Hariri jengo", "Contact Information": "Mawasiliano", Policies: "Sera",
  "Personal information": "Taarifa binafsi", "No active rooms found.": "Hakuna vyumba vinavyotumika.",
  "No staff members found": "Hakuna wafanyakazi", "No staff invitations found": "Hakuna mialiko",
  "Booking not found.": "Uhifadhi haujapatikana.",
};

export function translateToSwahili(value: string) {
  if (translations[value]) return translations[value];
  const patterns: Array<[RegExp, (...values: string[]) => string]> = [
    [/^(\d+) guests?$/, (count) => `${count} wageni`],
    [/^(\d+) beds?$/, (count) => `${count} vitanda`],
    [/^(\d+) photos?$/, (count) => `${count} picha`],
    [/^(\d+) days? left$/, (count) => `${count} siku zimebaki`],
    [/^Step (\d+) of (\d+)$/, (step, total) => `Hatua ${step} kati ya ${total}`],
    [/^Show all (\d+) rooms$/, (count) => `Onyesha vyumba vyote ${count}`],
    [/^Staff \((\d+)\)$/, (count) => `Wafanyakazi (${count})`],
    [/^Invitations \((\d+)\)$/, (count) => `Mialiko (${count})`],
  ];
  for (const [pattern, formatter] of patterns) {
    const match = value.match(pattern);
    if (match) return formatter(...match.slice(1));
  }
  return value;
}
