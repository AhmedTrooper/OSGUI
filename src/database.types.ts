export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      UniversalApplicationUsages: {
        Row: {
          id: number
          application: string | null
          architecture: string | null
          rand_str: string | null
          created_at: string
        }
        Insert: {
          id?: number
          application?: string | null
          architecture?: string | null
          rand_str?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          application?: string | null
          architecture?: string | null
          rand_str?: string | null
          created_at?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[
        PublicTableNameOrOptions['schema']
      ]['Tables'])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[
      PublicTableNameOrOptions['schema']
    ]['Tables'][TableName] extends {
      Row: infer R
    }
      ? R
      : never)
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'])
  ? (Database['public']['Tables'][PublicTableNameOrOptions] extends {
      Row: infer R
    }
      ? R
      : never)
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[
        PublicTableNameOrOptions['schema']
      ]['Tables'])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[
      PublicTableNameOrOptions['schema']
    ]['Tables'][TableName] extends {
      Insert: infer I
    }
      ? I
      : never)
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'])
  ? (Database['public']['Tables'][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
      ? I
      : never)
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[
        PublicTableNameOrOptions['schema']
      ]['Tables'])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[
      PublicTableNameOrOptions['schema']
    ]['Tables'][TableName] extends {
      Update: infer U
    }
      ? U
      : never)
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'])
  ? (Database['public']['Tables'][PublicTableNameOrOptions] extends {
      Update: infer U
    }
      ? U
      : never)
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof (Database['public']['Enums'])
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[
        PublicEnumNameOrOptions['schema']
      ]['Enums'])
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? (Database[
      PublicEnumNameOrOptions['schema']
    ]['Enums'][EnumName])
  : PublicEnumNameOrOptions extends keyof (Database['public']['Enums'])
  ? (Database['public']['Enums'][PublicEnumNameOrOptions])
  : never

// Local SQLite Database Types
export interface LocalDatabase {
  DownloadList: {
    id: string
    unique_id: string
    active: boolean
    failed: boolean
    completed: boolean
    isPaused: boolean
    format_id: string
    web_url: string | null
    title: string | null
    tracking_message: string | null
    playlistVerification: string | null
    playlistTitle: string | null
    created_at?: string
    updated_at?: string
  }
}

// Application Usage Data
export interface ApplicationUsageData {
  application: string
  architecture: string
  rand_str: string
  session_id?: string
  user_agent?: string
  timestamp?: string
}