export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type DbTable<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type PropertyRow = {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  property_type: string;
  phone: string;
  email: string | null;
  country: string | null;
  region: string | null;
  district: string | null;
  ward: string | null;
  street: string | null;
  formatted_address: string | null;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  status: boolean | null;
  timezone: string;
  checkin_time: string;
  checkout_time: string;
  amenities: Json | null;
  images: Json | null;
  onboarding_request_key: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type RoomRow = {
  id: string;
  property_id: string | null;
  name: string;
  room_type: string;
  capacity: number | null;
  bed_count: number | null;
  price_per_night: number;
  description: string | null;
  amenities: Json | null;
  images: Json;
  is_active: boolean | null;
  operational_status: string | null;
  housekeeping_status: string;
  housekeeping_notes: string | null;
  housekeeping_updated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type BookingRow = {
  id: string;
  booking_number: string;
  property_id: string;
  room_id: string;
  guest_id: string | null;
  created_by: string | null;
  check_in: string;
  check_out: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  checked_in_by: string | null;
  checked_out_by: string | null;
  adults: number;
  children: number;
  total_guests: number | null;
  total_price: number;
  booking_source: string;
  status: string;
  payment_status: string;
  special_requests: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  no_show_reason: string | null;
  no_show_at: string | null;
  no_show_by: string | null;
  idempotency_key: string | null;
  idempotency_fingerprint: string | null;
  created_at: string;
  updated_at: string | null;
};

type GuestRow = {
  id: string;
  title: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: string;
  date_of_birth: string | null;
  occupation: string | null;
  nationality: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  where_from: string | null;
  where_to: string | null;
  id_type: string | null;
  id_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

type PaymentRow = {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_status: string;
  transaction_reference: string | null;
  received_by: string | null;
  paid_at: string;
  notes: string | null;
  created_at: string;
  method: string | null;
  status: string | null;
  transaction_ref: string | null;
  idempotency_key: string | null;
  idempotency_fingerprint: string | null;
  entry_type: string;
  reverses_payment_id: string | null;
  approved_by: string | null;
  reversal_reason: string | null;
};

type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  image_url: string | null;
  bio: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PropertyUserRow = {
  id: string;
  property_id: string;
  user_id: string;
  role: string;
  status: string | null;
  created_at: string | null;
};

type PropertyInvitationRow = {
  id: string;
  property_id: string;
  email: string;
  role: string;
  token: string | null;
  status: string | null;
  created_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  created_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
};

type NotificationType =
  | "booking_created"
  | "booking_cancelled"
  | "guest_checked_in"
  | "guest_checked_out"
  | "payment_received"
  | "payment_failed"
  | "staff_invited"
  | "room_created"
  | "room_updated"
  | "maintenance_request"
  | "system";

type NotificationPriority = "high" | "normal" | "low";

export type Database = {
  public: {
    Tables: {
      properties: DbTable<PropertyRow>;
      rooms: DbTable<RoomRow>;
      bookings: DbTable<BookingRow>;
      guests: DbTable<GuestRow>;
      payments: DbTable<PaymentRow>;
      property_guests: DbTable<{
        property_id: string;
        guest_id: string;
        property_notes: string | null;
        created_at: string;
        updated_at: string;
      }>;
      property_users: DbTable<PropertyUserRow>;
      user_profiles: DbTable<UserProfileRow>;
      property_invitations: DbTable<PropertyInvitationRow>;
      notifications: DbTable<{
        id: string;
        user_id: string;
        property_id: string | null;
        title: string;
        body: string;
        data: Json | null;
        is_read: boolean | null;
        created_at: string | null;
        type: NotificationType;
        priority: NotificationPriority | null;
      }>;
      audit_log: DbTable<{
        id: number;
        property_id: string | null;
        actor_id: string | null;
        entity_type: string;
        entity_id: string | null;
        event_type: string;
        old_data: Json | null;
        new_data: Json | null;
        created_at: string;
      }>;
      role_permissions: DbTable<{
        role: string;
        resource: string;
        action: string;
      }>;
      room_images: DbTable<{
        id: string;
        room_id: string | null;
        url: string;
        created_at: string | null;
        position: number | null;
        is_cover: boolean | null;
      }>;
      property_images: DbTable<{
        id: string;
        property_id: string | null;
        url: string;
        created_at: string | null;
        is_cover: boolean | null;
        position: number | null;
      }>;
      booking_payments: DbTable<{
        id: string;
        property_id: string;
        booking_id: string;
        amount: number;
        method: string;
        reference: string | null;
        notes: string | null;
        recorded_by: string;
        created_at: string;
      }>;
    };
    Views: {
      bookings_with_details: {
        Row: {
          id: string | null;
          booking_number: string | null;
          property_id: string | null;
          room_id: string | null;
          guest_id: string | null;
          check_in: string | null;
          check_out: string | null;
          checked_in_at: string | null;
          checked_out_at: string | null;
          adults: number | null;
          children: number | null;
          total_guests: number | null;
          total_price: number | null;
          status: string | null;
          payment_status: string | null;
          booking_source: string | null;
          special_requests: string | null;
          created_at: string | null;
          room_name: string | null;
          room_type: string | null;
          price_per_night: number | null;
          title: string | null;
          first_name: string | null;
          middle_name: string | null;
          last_name: string | null;
          guest_name: string | null;
          gender: string | null;
          date_of_birth: string | null;
          occupation: string | null;
          nationality: string | null;
          guest_phone: string | null;
          guest_email: string | null;
          address: string | null;
          where_from: string | null;
          where_to: string | null;
          id_type: string | null;
          id_number: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          guest_notes: string | null;
          amount_paid: number | null;
          balance_due: number | null;
          payment_count: number | null;
          last_payment_date: string | null;
          last_payment_method: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_app_session: { Args: Record<PropertyKey, never>; Returns: Json };
      create_property_basic_info: {
        Args: { p_name: string; p_type: string; p_phone: string; p_email: string | null; p_amenities: Json; p_request_key?: string | null };
        Returns: string;
      };
      complete_property_onboarding_location: {
        Args: { p_property_id: string; p_country: string; p_region: string; p_district: string; p_ward: string; p_street: string; p_formatted_address: string; p_place_id: string | null; p_latitude: number | null; p_longitude: number | null };
        Returns: Json;
      };
      get_property_dashboard: { Args: { p_property_id: string }; Returns: Json };
      get_home_dashboard: { Args: { p_property_id: string }; Returns: Json };
      get_room_board: { Args: { p_property_id: string }; Returns: Json };
      get_room_workspace: { Args: { p_property_id: string; p_room_id: string }; Returns: Json };
      get_property_operations_board: { Args: { p_property_id: string }; Returns: Json };
      create_room: {
        Args: { p_property_id: string; p_room_id: string; p_room_name: string; p_room_type: string; p_is_active: boolean; p_price_per_night: number; p_capacity: number; p_bed_count: number; p_description: string | null; p_amenities: string[]; p_images: Json };
        Returns: Json;
      };
      update_room: {
        Args: { p_property_id: string; p_room_id: string; p_room_name: string; p_room_type: string; p_is_active: boolean; p_price_per_night: number; p_capacity: number; p_bed_count: number; p_description: string | null; p_amenities: string[]; p_images: Json };
        Returns: Json;
      };
      update_room_housekeeping_status: { Args: { p_property_id: string; p_room_id: string; p_status: string; p_notes?: string | null }; Returns: Json };
      get_walkin_available_rooms: {
        Args: { p_property_id: string; p_check_in: string; p_check_out: string; p_guests?: number };
        Returns: {
          room_id: string;
          room_name: string;
          room_type: string;
          capacity: number;
          bed_count: number;
          price_per_night: number;
          total_price: number;
          nights: number;
          operational_status: string;
          amenities: Json;
          images: Json;
        }[];
      };
      list_property_bookings: {
        Args: { p_property_id: string; p_query?: string | null; p_view?: string; p_status?: string | null; p_from?: string | null; p_to?: string | null; p_limit?: number; p_offset?: number };
        Returns: Json;
      };
      get_booking_workspace: { Args: { p_property_id: string; p_booking_id: string }; Returns: Json };
      get_booking_settlement: { Args: { p_property_id: string; p_booking_id: string }; Returns: Json };
      create_property_booking: {
        Args: { p_property_id: string; p_idempotency_key: string; p_room_id: string; p_guest: Json | null; p_existing_guest_id: string | null; p_check_in: string; p_check_out: string; p_adults?: number; p_children?: number; p_source?: string; p_special_requests?: string | null; p_initial_payment_amount?: number | null; p_initial_payment_method?: string | null; p_initial_payment_reference?: string | null };
        Returns: Json;
      };
      update_property_booking: {
        Args: { p_property_id: string; p_booking_id: string; p_room_id: string; p_check_in: string; p_check_out: string; p_adults: number; p_children: number; p_source: string; p_special_requests?: string | null };
        Returns: Json;
      };
      update_booking_lifecycle: { Args: { p_property_id: string; p_booking_id: string; p_action: string; p_reason?: string | null; p_allow_balance?: boolean }; Returns: Json };
      check_in_booking: { Args: { p_booking_id: string }; Returns: Json };
      checkout_booking: { Args: { p_booking_id: string; p_allow_balance?: boolean }; Returns: Json };
      record_booking_payment: {
        Args: { p_property_id: string; p_booking_id: string; p_idempotency_key: string; p_amount: number; p_method: string; p_reference?: string | null; p_notes?: string | null };
        Returns: Json;
      };
      list_property_guests: { Args: { p_property_id: string; p_query?: string | null; p_page?: number; p_page_size?: number; p_stay_filter?: string }; Returns: Json };
      get_guest_workspace: { Args: { p_property_id: string; p_guest_id: string }; Returns: Json };
      update_property_guest: { Args: { p_property_id: string; p_guest_id: string; p_guest: Json }; Returns: Json };
      get_property_calendar: { Args: { p_property_id: string; p_from: string; p_to: string }; Returns: Json };
      get_owner_finance_dashboard: { Args: { p_property_id: string; p_from: string; p_to: string }; Returns: Json };
      get_property_finance_dashboard: { Args: { p_property_id: string; p_from: string; p_to: string }; Returns: Json };
      list_property_payments: { Args: { p_property_id: string; p_from?: string | null; p_to?: string | null; p_status?: string | null; p_search?: string | null; p_method?: string | null; p_limit?: number; p_offset?: number }; Returns: Json };
      list_property_finance_entries: { Args: { p_property_id: string; p_from?: string | null; p_to?: string | null; p_status?: string | null; p_search?: string | null; p_method?: string | null; p_limit?: number; p_offset?: number }; Returns: Json };
      reverse_booking_payment: { Args: { p_property_id: string; p_payment_id: string; p_action: string; p_reason: string; p_idempotency_key: string }; Returns: Json };
      get_property_reports: { Args: { p_property_id: string; p_from: string; p_to: string }; Returns: Json };
      list_property_activity: { Args: { p_property_id: string; p_event_type?: string | null; p_limit?: number; p_offset?: number }; Returns: Json };
      get_property_activity_feed: { Args: { p_property_id: string; p_entity_type?: string | null; p_limit?: number; p_offset?: number }; Returns: Json };
      list_my_notifications: { Args: { p_property_id?: string | null; p_unread_only?: boolean; p_limit?: number; p_offset?: number }; Returns: Json };
      list_notifications: { Args: { p_limit?: number; p_offset?: number; p_unread_only?: boolean }; Returns: Json };
      set_notification_read: { Args: { p_notification_id: string; p_is_read: boolean }; Returns: Json };
      mark_notification_read: { Args: { p_notification_id: string }; Returns: Json };
      mark_all_notifications_read: { Args: { p_property_id?: string | null }; Returns: Json };
      get_invitation_details: { Args: { p_token: string }; Returns: Json };
      accept_property_invitation: { Args: { p_token: string }; Returns: Json };
      reject_property_invitation: { Args: { p_token: string }; Returns: Json };
      get_team_access_workspace: { Args: { p_property_id: string }; Returns: Json };
      invite_staff: { Args: { p_property_id: string; p_email: string; p_role: string }; Returns: Json };
      resend_staff_invitation: { Args: { p_property_id: string; p_invitation_id: string }; Returns: Json };
      cancel_staff_invitation: { Args: { p_property_id: string; p_invitation_id: string }; Returns: Json };
      delete_property_invitation: { Args: { p_property_id: string; p_invitation_id: string }; Returns: Json };
      change_staff_role: { Args: { p_property_id: string; p_staff_user_id: string; p_role: string }; Returns: Json };
      update_staff_status: { Args: { p_property_id: string; p_staff_user_id: string; p_status: string }; Returns: Json };
      remove_staff: { Args: { p_property_id: string; p_property_user_id: string }; Returns: Json };
      get_property_settings: { Args: { p_property_id: string }; Returns: Json };
      update_property_profile: { Args: { p_property_id: string; p_name: string; p_description?: string | null; p_property_type?: string | null; p_phone?: string | null; p_email?: string | null }; Returns: Json };
      update_property_operational_settings: { Args: { p_property_id: string; p_timezone: string; p_checkin_time: string; p_checkout_time: string }; Returns: Json };
      update_property_amenities: { Args: { p_property_id: string; p_amenities: string[] }; Returns: Json };
      update_property_location: { Args: { p_property_id: string; p_country?: string | null; p_region?: string | null; p_district?: string | null; p_ward?: string | null; p_street?: string | null; p_formatted_address?: string | null; p_place_id?: string | null; p_latitude?: number | null; p_longitude?: number | null }; Returns: Json };
      update_property_gallery: { Args: { p_property_id: string; p_images: string[] }; Returns: Json };
      update_property_visibility: { Args: { p_property_id: string; p_is_active: boolean }; Returns: Json };
      get_my_profile: { Args: Record<PropertyKey, never>; Returns: Json };
      update_my_profile: { Args: { p_display_name: string; p_phone?: string | null; p_bio?: string | null }; Returns: Json };
      save_property_images: { Args: { p_property_id: string; p_images: string[] }; Returns: undefined };
      update_property_address: { Args: { p_owner_id: string; p_country: string; p_region: string; p_district: string; p_ward: string; p_street: string; p_formatted_address: string; p_place_id: string; p_latitude: number; p_longitude: number }; Returns: undefined };
      get_property_operations_report: { Args: { p_property_id: string; p_from: string; p_to: string }; Returns: Json };
    };
    Enums: {
      notification_type: NotificationType;
      notification_priority: NotificationPriority;
    };
    CompositeTypes: Record<string, never>;
  };
};
