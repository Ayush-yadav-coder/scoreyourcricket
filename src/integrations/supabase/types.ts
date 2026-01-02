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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      batting_scores: {
        Row: {
          balls_faced: number | null
          batsman_id: string
          batting_position: number | null
          bowler_id: string | null
          created_at: string | null
          dismissal_type: Database["public"]["Enums"]["dismissal_type"] | null
          fielder_id: string | null
          fours: number | null
          id: string
          innings_id: string
          is_out: boolean | null
          is_striker: boolean | null
          runs: number | null
          sixes: number | null
        }
        Insert: {
          balls_faced?: number | null
          batsman_id: string
          batting_position?: number | null
          bowler_id?: string | null
          created_at?: string | null
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          fielder_id?: string | null
          fours?: number | null
          id?: string
          innings_id: string
          is_out?: boolean | null
          is_striker?: boolean | null
          runs?: number | null
          sixes?: number | null
        }
        Update: {
          balls_faced?: number | null
          batsman_id?: string
          batting_position?: number | null
          bowler_id?: string | null
          created_at?: string | null
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          fielder_id?: string | null
          fours?: number | null
          id?: string
          innings_id?: string
          is_out?: boolean | null
          is_striker?: boolean | null
          runs?: number | null
          sixes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batting_scores_batsman_id_fkey"
            columns: ["batsman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batting_scores_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batting_scores_fielder_id_fkey"
            columns: ["fielder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batting_scores_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
        ]
      }
      bowling_scores: {
        Row: {
          bowler_id: string
          created_at: string | null
          id: string
          innings_id: string
          is_current_bowler: boolean | null
          maidens: number | null
          no_balls: number | null
          overs: number | null
          runs_conceded: number | null
          wickets: number | null
          wides: number | null
        }
        Insert: {
          bowler_id: string
          created_at?: string | null
          id?: string
          innings_id: string
          is_current_bowler?: boolean | null
          maidens?: number | null
          no_balls?: number | null
          overs?: number | null
          runs_conceded?: number | null
          wickets?: number | null
          wides?: number | null
        }
        Update: {
          bowler_id?: string
          created_at?: string | null
          id?: string
          innings_id?: string
          is_current_bowler?: boolean | null
          maidens?: number | null
          no_balls?: number | null
          overs?: number | null
          runs_conceded?: number | null
          wickets?: number | null
          wides?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bowling_scores_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowling_scores_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          ball_number: number
          batsman_id: string
          bowler_id: string
          created_at: string | null
          dismissal_type: Database["public"]["Enums"]["dismissal_type"] | null
          id: string
          innings_id: string
          is_boundary: boolean | null
          is_bye: boolean | null
          is_leg_bye: boolean | null
          is_no_ball: boolean | null
          is_six: boolean | null
          is_wicket: boolean | null
          is_wide: boolean | null
          non_striker_id: string
          over_number: number
          runs: number | null
          shot_x: number | null
          shot_y: number | null
        }
        Insert: {
          ball_number: number
          batsman_id: string
          bowler_id: string
          created_at?: string | null
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          id?: string
          innings_id: string
          is_boundary?: boolean | null
          is_bye?: boolean | null
          is_leg_bye?: boolean | null
          is_no_ball?: boolean | null
          is_six?: boolean | null
          is_wicket?: boolean | null
          is_wide?: boolean | null
          non_striker_id: string
          over_number: number
          runs?: number | null
          shot_x?: number | null
          shot_y?: number | null
        }
        Update: {
          ball_number?: number
          batsman_id?: string
          bowler_id?: string
          created_at?: string | null
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          id?: string
          innings_id?: string
          is_boundary?: boolean | null
          is_bye?: boolean | null
          is_leg_bye?: boolean | null
          is_no_ball?: boolean | null
          is_six?: boolean | null
          is_wicket?: boolean | null
          is_wide?: boolean | null
          non_striker_id?: string
          over_number?: number
          runs?: number | null
          shot_x?: number | null
          shot_y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_batsman_id_fkey"
            columns: ["batsman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_non_striker_id_fkey"
            columns: ["non_striker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grounds: {
        Row: {
          capacity: number | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          location: string | null
          name: string
        }
        Insert: {
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      innings: {
        Row: {
          batting_team_id: string
          bowling_team_id: string
          created_at: string | null
          declared: boolean | null
          extras: number | null
          id: string
          innings_number: number
          is_completed: boolean | null
          match_id: string
          total_overs: number | null
          total_runs: number | null
          total_wickets: number | null
        }
        Insert: {
          batting_team_id: string
          bowling_team_id: string
          created_at?: string | null
          declared?: boolean | null
          extras?: number | null
          id?: string
          innings_number: number
          is_completed?: boolean | null
          match_id: string
          total_overs?: number | null
          total_runs?: number | null
          total_wickets?: number | null
        }
        Update: {
          batting_team_id?: string
          bowling_team_id?: string
          created_at?: string | null
          declared?: boolean | null
          extras?: number | null
          id?: string
          innings_number?: number
          is_completed?: boolean | null
          match_id?: string
          total_overs?: number | null
          total_runs?: number | null
          total_wickets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "innings_batting_team_id_fkey"
            columns: ["batting_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_bowling_team_id_fkey"
            columns: ["bowling_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_breaks: {
        Row: {
          break_type: Database["public"]["Enums"]["break_type"]
          ended_at: string | null
          id: string
          match_id: string
          notes: string | null
          started_at: string | null
        }
        Insert: {
          break_type: Database["public"]["Enums"]["break_type"]
          ended_at?: string | null
          id?: string
          match_id: string
          notes?: string | null
          started_at?: string | null
        }
        Update: {
          break_type?: Database["public"]["Enums"]["break_type"]
          ended_at?: string | null
          id?: string
          match_id?: string
          notes?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_breaks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_officials: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          name: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          name?: string | null
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          name?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_officials_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_officials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          ball_type: Database["public"]["Enums"]["ball_type"]
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          ground_id: string | null
          id: string
          is_live_streaming: boolean | null
          match_ticker: string | null
          match_type: Database["public"]["Enums"]["match_type"]
          overs: number | null
          started_at: string | null
          status: string | null
          stream_url: string | null
          team1_id: string
          team2_id: string
          toss_decision: string | null
          toss_winner_id: string | null
          tournament_id: string | null
        }
        Insert: {
          ball_type?: Database["public"]["Enums"]["ball_type"]
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          ground_id?: string | null
          id?: string
          is_live_streaming?: boolean | null
          match_ticker?: string | null
          match_type: Database["public"]["Enums"]["match_type"]
          overs?: number | null
          started_at?: string | null
          status?: string | null
          stream_url?: string | null
          team1_id: string
          team2_id: string
          toss_decision?: string | null
          toss_winner_id?: string | null
          tournament_id?: string | null
        }
        Update: {
          ball_type?: Database["public"]["Enums"]["ball_type"]
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          ground_id?: string | null
          id?: string
          is_live_streaming?: boolean | null
          match_ticker?: string | null
          match_type?: Database["public"]["Enums"]["match_type"]
          overs?: number | null
          started_at?: string | null
          status?: string | null
          stream_url?: string | null
          team1_id?: string
          team2_id?: string
          toss_decision?: string | null
          toss_winner_id?: string | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_ground_id_fkey"
            columns: ["ground_id"]
            isOneToOne: false
            referencedRelation: "grounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_toss_winner_id_fkey"
            columns: ["toss_winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          batting_style: string | null
          bio: string | null
          bowling_style: string | null
          created_at: string | null
          full_name: string
          gender: string | null
          id: string
          is_famous: boolean | null
          location: string | null
          phone: string
          playing_role: string | null
          profile_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          batting_style?: string | null
          bio?: string | null
          bowling_style?: string | null
          created_at?: string | null
          full_name: string
          gender?: string | null
          id: string
          is_famous?: boolean | null
          location?: string | null
          phone: string
          playing_role?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          batting_style?: string | null
          bio?: string | null
          bowling_style?: string | null
          created_at?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_famous?: boolean | null
          location?: string | null
          phone?: string
          playing_role?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      series: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          name: string
          series_type: Database["public"]["Enums"]["match_type"]
          start_date: string | null
          team1_id: string
          team2_id: string
          total_matches: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          name: string
          series_type: Database["public"]["Enums"]["match_type"]
          start_date?: string | null
          team1_id: string
          team2_id: string
          total_matches: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          name?: string
          series_type?: Database["public"]["Enums"]["match_type"]
          start_date?: string | null
          team1_id?: string
          team2_id?: string
          total_matches?: number
        }
        Relationships: [
          {
            foreignKeyName: "series_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_at: string | null
          id: string
          is_captain: boolean | null
          is_wicketkeeper: boolean | null
          jersey_number: number | null
          player_id: string
          team_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          is_captain?: boolean | null
          is_wicketkeeper?: boolean | null
          jersey_number?: number | null
          player_id: string
          team_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          is_captain?: boolean | null
          is_wicketkeeper?: boolean | null
          jersey_number?: number | null
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tournament_group_teams: {
        Row: {
          group_id: string
          id: string
          team_id: string
        }
        Insert: {
          group_id: string
          id?: string
          team_id: string
        }
        Update: {
          group_id?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_group_teams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_group_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_groups: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          id: string
          team_id: string
          tournament_id: string
        }
        Insert: {
          id?: string
          team_id: string
          tournament_id: string
        }
        Update: {
          id?: string
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          match_type: Database["public"]["Enums"]["match_type"]
          name: string
          start_date: string | null
          tournament_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          match_type: Database["public"]["Enums"]["match_type"]
          name: string
          start_date?: string | null
          tournament_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          name?: string
          start_date?: string | null
          tournament_type?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "user"
      ball_type: "leather" | "tennis" | "rubber" | "other"
      break_type:
        | "tea"
        | "lunch"
        | "rain"
        | "drinks"
        | "injury"
        | "bad_light"
        | "other"
      dismissal_type:
        | "bowled"
        | "caught"
        | "lbw"
        | "run_out"
        | "stumped"
        | "hit_wicket"
        | "retired"
        | "timed_out"
        | "handled_ball"
        | "obstructing_field"
      match_type: "test" | "odi" | "T20" | "box_cricket" | "custom"
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
      app_role: ["admin", "user"],
      ball_type: ["leather", "tennis", "rubber", "other"],
      break_type: [
        "tea",
        "lunch",
        "rain",
        "drinks",
        "injury",
        "bad_light",
        "other",
      ],
      dismissal_type: [
        "bowled",
        "caught",
        "lbw",
        "run_out",
        "stumped",
        "hit_wicket",
        "retired",
        "timed_out",
        "handled_ball",
        "obstructing_field",
      ],
      match_type: ["test", "odi", "T20", "box_cricket", "custom"],
    },
  },
} as const
