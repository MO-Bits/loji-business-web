import type { Json } from "@/types/database.types";

type JsonObject = Record<string, Json | undefined>;
const asObject = (value: Json | undefined): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const asText = (value: Json | undefined) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";
const asNumber = (value: Json | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const asBoolean = (value: Json | undefined) => value === true || value === "true";

export type ActivityItem = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorName: string;
  actorEmail: string;
  description: string;
  createdAt: string;
};

export type ActivityFeed = {
  items: ActivityItem[];
  total: number;
};

export type WorkspaceNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  href: string;
};

export type NotificationFeed = {
  items: WorkspaceNotification[];
  total: number;
  unreadCount: number;
};

function safeHref(data: Json | undefined) {
  const details = asObject(data);
  const explicit = asText(details.href ?? details.route);
  if (/^\/[a-z0-9/_?=&.-]*$/i.test(explicit) && !explicit.startsWith("//")) {
    return explicit;
  }
  const bookingId = asText(details.booking_id);
  if (/^[0-9a-f-]{36}$/i.test(bookingId)) return `/bookings/${bookingId}`;
  const roomId = asText(details.room_id);
  if (/^[0-9a-f-]{36}$/i.test(roomId)) return `/rooms/${roomId}`;
  return "";
}

export function parseActivityFeed(value: Json): ActivityFeed {
  const root = asObject(value);
  return {
    total: asNumber(root.total),
    items: Array.isArray(root.items)
      ? root.items.map(asObject).map((item) => ({
          id: asText(item.id),
          eventType: asText(item.event_type).toLowerCase(),
          entityType: asText(item.entity_type).toLowerCase(),
          entityId: asText(item.entity_id),
          actorName: asText(item.actor_name) || "Loji automation",
          actorEmail: asText(item.actor_email),
          description: asText(item.description),
          createdAt: asText(item.created_at),
        }))
      : [],
  };
}

export function parseNotificationFeed(value: Json): NotificationFeed {
  const root = asObject(value);
  return {
    total: asNumber(root.total),
    unreadCount: asNumber(root.unread_count),
    items: Array.isArray(root.items)
      ? root.items.map(asObject).map((item) => ({
          id: asText(item.id),
          title: asText(item.title) || "Notification",
          body: asText(item.body),
          type: (asText(item.type) || "system").toLowerCase(),
          priority: (asText(item.priority) || "normal").toLowerCase(),
          isRead: asBoolean(item.is_read),
          createdAt: asText(item.created_at),
          href: safeHref(item.data),
        }))
      : [],
  };
}
