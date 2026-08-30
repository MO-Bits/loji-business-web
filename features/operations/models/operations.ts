import { parseRoomBoardItem, parseRoomStay, type RoomBoardItem, type RoomStay } from "@/features/rooms/models/room";

export type OperationBooking = RoomStay & {
  roomId: string;
  roomName: string;
  roomType: string;
  isOverdue: boolean;
};

export type OperationsSummary = {
  arrivalsDue: number;
  departuresDue: number;
  overdueArrivals: number;
  overdueDepartures: number;
  inHouse: number;
  readyRooms: number;
  roomsNeedingAttention: number;
};

export type OperationsBoard = {
  property: { id: string; timezone: string; businessDate: string };
  capabilities: {
    checkIn: boolean;
    checkOut: boolean;
    manageRooms: boolean;
    createBooking: boolean;
  };
  summary: OperationsSummary;
  arrivals: OperationBooking[];
  departures: OperationBooking[];
  housekeeping: RoomBoardItem[];
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function field(row: UnknownRecord, snake: string, camel = snake): unknown {
  return row[snake] ?? row[camel];
}

function stringField(row: UnknownRecord, snake: string, camel = snake, fallback = ""): string {
  const value = field(row, snake, camel);
  return value === null || value === undefined ? fallback : String(value);
}

function numberField(row: UnknownRecord, snake: string, camel = snake, fallback = 0): number {
  const value = Number(field(row, snake, camel));
  return Number.isFinite(value) ? value : fallback;
}

function booleanField(row: UnknownRecord, snake: string, camel = snake, fallback = false): boolean {
  const value = field(row, snake, camel);
  return typeof value === "boolean" ? value : fallback;
}

function parseOperationBooking(input: unknown): OperationBooking | null {
  const row = record(input);
  const stay = parseRoomStay(row);
  if (!stay) return null;
  return {
    ...stay,
    roomId: stringField(row, "room_id", "roomId"),
    roomName: stringField(row, "room_name", "roomName", "Room"),
    roomType: stringField(row, "room_type", "roomType"),
    isOverdue: booleanField(row, "is_overdue", "isOverdue"),
  };
}

function list<T>(input: unknown, parse: (value: unknown) => T | null): T[] {
  return Array.isArray(input) ? input.map(parse).filter((item): item is T => Boolean(item)) : [];
}

export function parseOperationsBoard(input: unknown, propertyId = ""): OperationsBoard {
  const root = record(input);
  if (root.success === false) throw new Error(stringField(root, "message", "message", "Unable to load operations board."));
  const property = record(root.property);
  const capabilities = record(root.capabilities);
  const summary = record(root.summary);
  const arrivals = list(root.arrivals, parseOperationBooking);
  const departures = list(root.departures, parseOperationBooking);
  const housekeeping = list(root.housekeeping ?? root.rooms, (value) => parseRoomBoardItem(value));
  const attention = housekeeping.filter((room) => room.operationalStatus !== "ready").length;
  return {
    property: {
      id: stringField(property, "id", "id", propertyId),
      timezone: stringField(property, "timezone", "timezone", "Africa/Dar_es_Salaam"),
      businessDate: stringField(property, "business_date", "businessDate"),
    },
    capabilities: {
      checkIn: booleanField(capabilities, "check_in", "checkIn"),
      checkOut: booleanField(capabilities, "check_out", "checkOut"),
      manageRooms: booleanField(capabilities, "manage_rooms", "manageRooms"),
      createBooking: booleanField(capabilities, "create_booking", "createBooking"),
    },
    summary: {
      arrivalsDue: numberField(summary, "arrivals_due", "arrivalsDue", arrivals.length),
      departuresDue: numberField(summary, "departures_due", "departuresDue", departures.length),
      overdueArrivals: numberField(summary, "overdue_arrivals", "overdueArrivals", arrivals.filter((item) => item.isOverdue).length),
      overdueDepartures: numberField(summary, "overdue_departures", "overdueDepartures", departures.filter((item) => item.isOverdue).length),
      inHouse: numberField(summary, "in_house", "inHouse"),
      readyRooms: numberField(summary, "ready_rooms", "readyRooms", housekeeping.filter((room) => room.operationalStatus === "ready").length),
      roomsNeedingAttention: numberField(summary, "rooms_needing_attention", "roomsNeedingAttention", attention),
    },
    arrivals,
    departures,
    housekeeping,
  };
}
