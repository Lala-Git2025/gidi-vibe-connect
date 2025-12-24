export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          can_manage_admins: boolean | null
          can_manage_users: boolean | null
          can_moderate_content: boolean | null
          can_verify_businesses: boolean | null
          can_view_analytics: boolean | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_admins?: boolean | null
          can_manage_users?: boolean | null
          can_moderate_content?: boolean | null
          can_verify_businesses?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_admins?: boolean | null
          can_manage_users?: boolean | null
          can_moderate_content?: boolean | null
          can_verify_businesses?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_subscriptions: {
        Row: {
          can_create_offers: boolean | null
          can_manage_menu: boolean | null
          can_view_analytics: boolean | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          max_events_per_month: number
          max_photos_per_venue: number
          max_venues: number
          priority_listing: boolean | null
          status: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create_offers?: boolean | null
          can_manage_menu?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          max_events_per_month?: number
          max_photos_per_venue?: number
          max_venues?: number
          priority_listing?: boolean | null
          status?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create_offers?: boolean | null
          can_manage_menu?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          max_events_per_month?: number
          max_photos_per_venue?: number
          max_venues?: number
          priority_listing?: boolean | null
          status?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          attendee_count: number | null
          category: string
          created_at: string
          description: string | null
          end_date: string | null
          featured_image: string | null
          id: string
          is_featured: boolean | null
          location: string
          organizer: string | null
          price_range: string | null
          start_date: string
          tags: string[] | null
          ticket_url: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          address?: string | null
          attendee_count?: number | null
          category: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean | null
          location: string
          organizer?: string | null
          price_range?: string | null
          start_date: string
          tags?: string[] | null
          ticket_url?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          address?: string | null
          attendee_count?: number | null
          category?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string
          organizer?: string | null
          price_range?: string | null
          start_date?: string
          tags?: string[] | null
          ticket_url?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      exclusive_offers: {
        Row: {
          created_at: string
          current_redemptions: number | null
          description: string
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string
          id: string
          is_active: boolean | null
          max_redemptions: number | null
          offer_type: string
          start_date: string
          target_user_roles: Database["public"]["Enums"]["user_role"][] | null
          terms_conditions: string | null
          title: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          current_redemptions?: number | null
          description: string
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date: string
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          offer_type: string
          start_date: string
          target_user_roles?: Database["public"]["Enums"]["user_role"][] | null
          terms_conditions?: string | null
          title: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          current_redemptions?: number | null
          description?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          offer_type?: string
          start_date?: string
          target_user_roles?: Database["public"]["Enums"]["user_role"][] | null
          terms_conditions?: string | null
          title?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exclusive_offers_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          id: string
          report_reason: string | null
          reported_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          report_reason?: string | null
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          report_reason?: string | null
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          category: string | null
          created_at: string | null
          external_url: string | null
          featured_image_url: string | null
          id: string
          is_active: boolean | null
          publish_date: string | null
          source: string | null
          summary: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          external_url?: string | null
          featured_image_url?: string | null
          id?: string
          is_active?: boolean | null
          publish_date?: string | null
          source?: string | null
          summary?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          external_url?: string | null
          featured_image_url?: string | null
          id?: string
          is_active?: boolean | null
          publish_date?: string | null
          source?: string | null
          summary?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      news_feed: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          external_url: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean | null
          publish_date: string | null
          source: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          venue_id: string | null
          views_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          external_url?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          publish_date?: string | null
          source?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          venue_id?: string | null
          views_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          external_url?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          publish_date?: string | null
          source?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          venue_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "news_feed_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "news_feed_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          comments_count: number | null
          content: string | null
          created_at: string
          id: string
          is_featured: boolean | null
          likes_count: number | null
          location: string | null
          media_urls: string[] | null
          tags: string[] | null
          updated_at: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          comments_count?: number | null
          content?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          location?: string | null
          media_urls?: string[] | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          location?: string | null
          media_urls?: string[] | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_posts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_analytics: {
        Row: {
          created_at: string
          date: string
          direction_clicks: number | null
          event_views: number | null
          id: string
          offer_clicks: number | null
          offer_views: number | null
          phone_clicks: number | null
          profile_views: number | null
          updated_at: string
          venue_id: string
          website_clicks: number | null
        }
        Insert: {
          created_at?: string
          date: string
          direction_clicks?: number | null
          event_views?: number | null
          id?: string
          offer_clicks?: number | null
          offer_views?: number | null
          phone_clicks?: number | null
          profile_views?: number | null
          updated_at?: string
          venue_id: string
          website_clicks?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          direction_clicks?: number | null
          event_views?: number | null
          id?: string
          offer_clicks?: number | null
          offer_views?: number | null
          phone_clicks?: number | null
          profile_views?: number | null
          updated_at?: string
          venue_id?: string
          website_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_analytics_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_menus: {
        Row: {
          category: string
          created_at: string
          currency: string | null
          description: string | null
          dietary_info: string[] | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          item_name: string
          price: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          category: string
          created_at?: string
          currency?: string | null
          description?: string | null
          dietary_info?: string[] | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          item_name: string
          price: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          dietary_info?: string[] | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          item_name?: string
          price?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_menus_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_photos: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          display_order: number | null
          id: string
          is_featured: boolean | null
          photo_url: string
          updated_at: string
          uploaded_by: string | null
          venue_id: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          photo_url: string
          updated_at?: string
          uploaded_by?: string | null
          venue_id: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          photo_url?: string
          updated_at?: string
          uploaded_by?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["venue_category"]
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          event_schedules: Json | null
          features: string[] | null
          id: string
          instagram_url: string | null
          is_verified: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          opening_hours: Json | null
          owner_id: string | null
          price_range: string | null
          professional_media_urls: string[] | null
          rating: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          category: Database["public"]["Enums"]["venue_category"]
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          event_schedules?: Json | null
          features?: string[] | null
          id?: string
          instagram_url?: string | null
          is_verified?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          owner_id?: string | null
          price_range?: string | null
          professional_media_urls?: string[] | null
          rating?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["venue_category"]
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          event_schedules?: Json | null
          features?: string[] | null
          id?: string
          instagram_url?: string | null
          is_verified?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string | null
          price_range?: string | null
          professional_media_urls?: string[] | null
          rating?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          additional_info: string | null
          business_address: string
          business_document_url: string | null
          business_email: string
          business_name: string
          business_phone: string
          business_registration_number: string | null
          created_at: string
          id: string
          identity_document_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          business_address: string
          business_document_url?: string | null
          business_email: string
          business_name: string
          business_phone: string
          business_registration_number?: string | null
          created_at?: string
          id?: string
          identity_document_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_info?: string | null
          business_address?: string
          business_document_url?: string | null
          business_email?: string
          business_name?: string
          business_phone?: string
          business_registration_number?: string | null
          created_at?: string
          id?: string
          identity_document_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_event: { Args: { p_user_id: string }; Returns: boolean }
      can_create_venue: { Args: { p_user_id: string }; Returns: boolean }
      can_upload_photo: {
        Args: { p_user_id: string; p_venue_id: string }
        Returns: boolean
      }
      get_safe_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          full_name: string
          id: string
          location: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }[]
      }
    }
    Enums: {
      subscription_tier: "Free" | "Premium" | "Enterprise"
      user_role:
        | "Consumer"
        | "Business Owner"
        | "Content Creator"
        | "Admin"
        | "Super Admin"
      venue_category:
        | "Restaurant"
        | "Bar"
        | "Club"
        | "Lounge"
        | "Rooftop"
        | "Beach Club"
        | "Event Center"
        | "Hotel"
        | "Other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_tier: ["Free", "Premium", "Enterprise"],
      user_role: [
        "Consumer",
        "Business Owner",
        "Content Creator",
        "Admin",
        "Super Admin",
      ],
      venue_category: [
        "Restaurant",
        "Bar",
        "Club",
        "Lounge",
        "Rooftop",
        "Beach Club",
        "Event Center",
        "Hotel",
        "Other",
      ],
    },
  },
} as const
