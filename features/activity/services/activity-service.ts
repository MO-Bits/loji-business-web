import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import { parseActivityFeed, parseNotificationFeed } from "../models/activity";

export async function listPropertyActivity(
  supabase: SupabaseClient<Database>,
  args: {
    propertyId: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  },
) {
  const { data, error } = await supabase.rpc("list_property_activity", {
    p_property_id: args.propertyId,
    p_event_type: args.eventType || null,
    p_limit: args.limit ?? 30,
    p_offset: args.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return parseActivityFeed(data);
}

export async function listMyNotifications(
  supabase: SupabaseClient<Database>,
  args: {
    propertyId: string;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  },
) {
  const { data, error } = await supabase.rpc("list_my_notifications", {
    p_property_id: args.propertyId,
    p_unread_only: args.unreadOnly ?? false,
    p_limit: args.limit ?? 30,
    p_offset: args.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return parseNotificationFeed(data);
}

export async function setNotificationRead(
  supabase: SupabaseClient<Database>,
  notificationId: string,
  isRead: boolean,
) {
  const { error } = await supabase.rpc("set_notification_read", {
    p_notification_id: notificationId,
    p_is_read: isRead,
  });
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient<Database>,
  propertyId: string,
) {
  const { error } = await supabase.rpc("mark_all_notifications_read", {
    p_property_id: propertyId,
  });
  if (error) throw new Error(error.message);
}
