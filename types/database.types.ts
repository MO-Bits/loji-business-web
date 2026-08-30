export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: { [key: string]: Json | undefined } & { id: string };
        Insert: { [key: string]: Json | undefined };
        Update: { [key: string]: Json | undefined };
        Relationships: [];
      };
      rooms: {
        Row: { id: string; property_id: string; name: string; room_type: string; capacity: number; bed_count: number; price_per_night: number; amenities: Json; images: Json; room_images?: Json; description?: string | null; is_active: boolean; housekeeping_status?: string; housekeeping_notes?: string | null; housekeeping_updated_at?: string | null; created_at?: string | null; [key: string]: Json | undefined };
        Insert: { id?: string; property_id: string; name: string; room_type: string; capacity: number; bed_count: number; price_per_night: number; amenities?: Json; images?: Json; is_active?: boolean };
        Update: { name?: string; room_type?: string; capacity?: number; bed_count?: number; price_per_night?: number; amenities?: Json; images?: Json; is_active?: boolean };
        Relationships: [];
      };
      bookings: {
        Row: { id: string; room_id: string; check_in: string; check_out: string; checked_out_at: string | null; status: string; [key: string]: Json | undefined };
        Insert: { [key: string]: Json | undefined };
        Update: { [key: string]: Json | undefined };
        Relationships: [];
      };
      property_users: {
        Row: { id: string; property_id: string; user_id: string; role: string; status: string; created_at: string | null };
        Insert: { id?: string; property_id: string; user_id: string; role: string; status?: string; created_at?: string | null };
        Update: { role?: string; status?: string };
        Relationships: [];
      };
      user_profiles: {
        Row: { user_id: string; display_name: string | null; email: string | null; phone: string | null; avatar_url: string | null; [key: string]: Json | undefined };
        Insert: { user_id: string; display_name?: string | null; email?: string | null; phone?: string | null; avatar_url?: string | null };
        Update: { display_name?: string | null; email?: string | null; phone?: string | null; avatar_url?: string | null };
        Relationships: [];
      };
      property_invitations: {
        Row: { id: string; property_id: string; email: string; role: string; status: string; token: string | null; created_at: string | null };
        Insert: { id?: string; property_id: string; email: string; role: string; status?: string; token?: string | null; created_at?: string | null };
        Update: { role?: string; status?: string };
        Relationships: [];
      };
    };
    Views: {
      bookings_with_details: {
        Row: { id: string; property_id: string; room_id: string; guest_id: string; booking_number: string; check_in: string; check_out: string; checked_in_at?: string | null; checked_out_at?: string | null; adults: number; children: number; total_guests: number; total_price: number; status: string; payment_status: string; booking_source: string; special_requests?: string | null; created_at: string; room_name: string; room_type: string; price_per_night: number; guest_name: string; guest_phone?: string | null; guest_email?: string | null; gender?: string | null; nationality?: string | null; occupation?: string | null; where_from?: string | null; where_to?: string | null; id_type?: string | null; id_number?: string | null; emergency_contact_name?: string | null; emergency_contact_phone?: string | null; amount_paid: number; balance_due: number; payment_count: number; last_payment_date?: string | null; last_payment_method?: string | null; [key: string]: Json | undefined };
        Relationships: [];
      };
    };
    Functions: {
      create_property_basic_info: {
        Args: {
          p_name: string;
          p_type: string;
          p_phone: string;
          p_email: string | null;
          p_amenities: string[];
        };
        Returns: string;
      };
      get_app_session: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_home_dashboard: {
        Args: { p_property_id: string };
        Returns: Json;
      };
      save_property_images: {
        Args: { p_property_id: string; p_images: string[] };
        Returns: Json;
      };
      update_staff_status: {
        Args: { p_property_id: string; p_staff_user_id: string; p_status: string };
        Returns: Json;
      };
      change_staff_role: {
        Args: { p_property_user_id: string; p_role: string };
        Returns: Json;
      };
      remove_staff: {
        Args: { p_property_id: string; p_property_user_id: string };
        Returns: Json;
      };
      resend_staff_invitation: {
        Args: { p_invitation_id: string };
        Returns: Json;
      };
      cancel_staff_invitation: {
        Args: { p_invitation_id: string };
        Returns: Json;
      };
      delete_property_invitation: {
        Args: { p_property_id: string; p_invitation_id: string };
        Returns: Json;
      };
      invite_staff: {
        Args: { p_property_id: string; p_email: string; p_role: string };
        Returns: Json;
      };
      update_property_address: {
        Args: {
          p_owner_id: string;
          p_country: string;
          p_region: string;
          p_district: string;
          p_ward: string;
          p_street: string;
          p_formatted_address: string;
          p_latitude: number;
          p_longitude: number;
          p_place_id: string;
        };
        Returns: Json;
      };
      create_room_with_images: {
        Args: { p_room_id: string; p_property_id: string; p_room_name: string; p_room_type: string; p_capacity: number; p_base_price: number; p_bed_count: number; p_amenities: string[]; p_images: string[] };
        Returns: string;
      };
      update_room_basic_info: { Args: { p_room_id: string; p_property_id: string; p_room_name: string; p_room_type: string; p_is_active: boolean }; Returns: Json };
      update_room_pricing: { Args: { p_room_id: string; p_property_id: string; p_price_per_night: number }; Returns: Json };
      update_room_capacity: { Args: { p_room_id: string; p_property_id: string; p_capacity: number; p_bed_count: number }; Returns: Json };
      update_room_amenities: { Args: { p_room_id: string; p_property_id: string; p_amenities: string[] }; Returns: Json };
      update_room_images: { Args: { p_room_id: string; p_property_id: string; p_images: string[] }; Returns: Json };
      get_walkin_available_rooms: { Args: { p_property_id: string; p_check_in: string; p_check_out: string; p_guests: number }; Returns: Json };
      create_walkin_booking: { Args: { p_property_id: string; p_room_id: string; p_first_name: string; p_last_name: string; p_gender: string; p_nationality: string; p_occupation: string; p_email: string; p_phone: string; p_where_from: string | null; p_where_to: string | null; p_id_type: string | null; p_id_number: string | null; p_emergency_contact_name: string | null; p_emergency_contact_phone: string | null; p_check_in: string; p_check_out: string; p_adults: number; p_children: number; p_total_price: number; p_special_requests: string | null; p_payment_method: string; p_transaction_ref: string | null }; Returns: Json };
      check_in_booking: { Args: { p_booking_id: string }; Returns: Json };
      checkout_booking: { Args: { p_booking_id: string; p_allow_balance: boolean }; Returns: Json };
      update_room_housekeeping_status: { Args: { p_property_id: string; p_room_id: string; p_status: string; p_notes?: string | null }; Returns: Json };
      update_room: { Args: { p_room_id: string; p_property_id: string; p_room_name: string; p_room_type: string; p_is_active: boolean; p_price_per_night: number; p_capacity: number; p_bed_count: number; p_amenities: string[]; p_images: string[] }; Returns: Json };
      record_booking_payment: { Args: { p_property_id: string; p_booking_id: string; p_amount: number; p_method: string; p_reference?: string | null; p_notes?: string | null }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
