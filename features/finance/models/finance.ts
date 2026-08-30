import type { Json } from "@/types/database.types";

type JsonObject = Record<string, Json | undefined>;
const object = (value: Json | undefined): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const text = (value: Json | undefined) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";
const number = (value: Json | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export type FinanceSummary = {
  collected: number;
  outstanding: number;
  refunds: number;
  transactions: number;
  occupancyRate: number;
  averageDailyRate: number;
};

export type FinanceDay = {
  date: string;
  collected: number;
  bookings: number;
  occupancyRate: number;
};

export type FinanceMethod = {
  method: string;
  amount: number;
  count: number;
};

export type FinanceDashboard = {
  businessDate: string;
  timezone: string;
  summary: FinanceSummary;
  daily: FinanceDay[];
  methods: FinanceMethod[];
};

export type PaymentLedgerItem = {
  id: string;
  bookingId: string;
  bookingNumber: string;
  guestName: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string;
  receiverName: string;
  reference: string;
};

export type PaymentLedger = {
  items: PaymentLedgerItem[];
  total: number;
};

export function parseFinanceDashboard(value: Json): FinanceDashboard {
  const root = object(value);
  const property = object(root.property);
  const summary = object(root.summary);
  return {
    businessDate: text(property.business_date ?? root.business_date),
    timezone: text(property.timezone ?? root.timezone),
    summary: {
      collected: number(summary.collected ?? summary.total_collected),
      outstanding: number(summary.outstanding ?? summary.outstanding_balance),
      refunds: number(summary.refunds ?? summary.total_refunded),
      transactions: number(summary.transactions ?? summary.payment_count),
      occupancyRate: number(summary.occupancy_rate),
      averageDailyRate: number(summary.average_daily_rate ?? summary.adr),
    },
    daily: Array.isArray(root.daily)
      ? root.daily.map((item) => object(item)).map((item) => ({
          date: text(item.date),
          collected: number(item.collected),
          bookings: number(item.bookings),
          occupancyRate: number(item.occupancy_rate),
        }))
      : [],
    methods: Array.isArray(root.methods)
      ? root.methods.map((item) => object(item)).map((item) => ({
          method: text(item.method) || "Other",
          amount: number(item.amount),
          count: number(item.count),
        }))
      : [],
  };
}

export function parsePaymentLedger(value: Json): PaymentLedger {
  const root = object(value);
  return {
    total: number(root.total),
    items: Array.isArray(root.items)
      ? root.items.map((item) => object(item)).map((item) => ({
          id: text(item.id),
          bookingId: text(item.booking_id),
          bookingNumber: text(item.booking_number),
          guestName: text(item.guest_name) || "Guest",
          amount: number(item.amount),
          currency: text(item.currency) || "TZS",
          method: text(item.method ?? item.payment_method) || "Other",
          status: (text(item.status ?? item.payment_status) || "completed").toLowerCase(),
          paidAt: text(item.paid_at ?? item.created_at),
          receiverName: text(item.receiver_name ?? item.received_by_name),
          reference: text(item.reference ?? item.transaction_reference ?? item.transaction_ref),
        }))
      : [],
  };
}
