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
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
            foreignKeyName: "news_feed_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "social_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "venues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          location: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_public_profile_data: {
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
      user_role: "Consumer" | "Business Owner" | "Content Creator"
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
      user_role: ["Consumer", "Business Owner", "Content Creator"],
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
