export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
