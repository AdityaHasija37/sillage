
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "chat_messages": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"role": string,"session_id": string,"tool_summary_json": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: string,"role": string,"session_id": string,"tool_summary_json"?: NonNullable<Json>,"user_id"?: string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"role"?: string,"session_id"?: string,"tool_summary_json"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chat_messages_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "chat_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"chat_sessions": {
                  Row: {
                    "created_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"collection_items": {
                  Row: {
                    "created_at": string,"fragrance_id": string,"id": string,"notes": string | null,"owned_since": string | null,"rating": number | null,"sentiment": string | null,"user_id": string,"variant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fragrance_id": string,"id"?: string,"notes"?: string | null,"owned_since"?: string | null,"rating"?: number | null,"sentiment"?: string | null,"user_id"?: string,"variant_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"fragrance_id"?: string,"id"?: string,"notes"?: string | null,"owned_since"?: string | null,"rating"?: number | null,"sentiment"?: string | null,"user_id"?: string,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_items_fragrance_id_fkey"
      columns: ["fragrance_id"]
isOneToOne: false
      referencedRelation: "fragrances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collection_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "variants"
      referencedColumns: ["id"]
    }
                  ]
                },"demo_accounts": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"fragrances": {
                  Row: {
                    "accords": NonNullable<Json>,"alternative_to": Json | null,"brand": string,"brand_tier": string | null,"canonical_key": string,"community": Json | null,"community_rating": number | null,"community_votes": number | null,"concentration": string | null,"concentration_basis": string | null,"external_id": string,"family": string | null,"family_label": string | null,"fetched_at": string,"gender": string | null,"id": string,"image_url": string | null,"metadata_quality": string,"name": string,"notes": NonNullable<Json>,"perfumers": (string)[],"popularity": number,"price_band": string | null,"price_basis": string | null,"provider": string,"search_text": string | null,"similar_to": NonNullable<Json>,"sizes_ml": (number)[],"source_url": string | null,"themes": NonNullable<Json>,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accords"?: NonNullable<Json>,"alternative_to"?: Json | null,"brand": string,"brand_tier"?: string | null,"canonical_key": string,"community"?: Json | null,"community_rating"?: never,"community_votes"?: never,"concentration"?: string | null,"concentration_basis"?: string | null,"external_id": string,"family"?: string | null,"family_label"?: string | null,"fetched_at"?: string,"gender"?: string | null,"id"?: string,"image_url"?: string | null,"metadata_quality"?: string,"name": string,"notes"?: NonNullable<Json>,"perfumers"?: (string)[],"popularity"?: number,"price_band"?: string | null,"price_basis"?: string | null,"provider": string,"search_text"?: never,"similar_to"?: NonNullable<Json>,"sizes_ml"?: (number)[],"source_url"?: string | null,"themes"?: NonNullable<Json>,"year"?: number | null
                  }
                  Update: {
                    "accords"?: NonNullable<Json>,"alternative_to"?: Json | null,"brand"?: string,"brand_tier"?: string | null,"canonical_key"?: string,"community"?: Json | null,"community_rating"?: never,"community_votes"?: never,"concentration"?: string | null,"concentration_basis"?: string | null,"external_id"?: string,"family"?: string | null,"family_label"?: string | null,"fetched_at"?: string,"gender"?: string | null,"id"?: string,"image_url"?: string | null,"metadata_quality"?: string,"name"?: string,"notes"?: NonNullable<Json>,"perfumers"?: (string)[],"popularity"?: number,"price_band"?: string | null,"price_basis"?: string | null,"provider"?: string,"search_text"?: never,"similar_to"?: NonNullable<Json>,"sizes_ml"?: (number)[],"source_url"?: string | null,"themes"?: NonNullable<Json>,"year"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"offer_snapshots": {
                  Row: {
                    "availability": string | null,"checked_at": string,"concentration": string | null,"condition": string | null,"currency": string,"expires_at": string,"id": string,"item_url": string,"list_price": number,"match_reasons": NonNullable<Json>,"match_status": string,"merchant": string,"provider": string,"shipping_price": number | null,"size_ml": number | null,"tax_price": number | null,"title": string,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: string | null,"checked_at"?: string,"concentration"?: string | null,"condition"?: string | null,"currency"?: string,"expires_at": string,"id"?: string,"item_url": string,"list_price": number,"match_reasons"?: NonNullable<Json>,"match_status": string,"merchant": string,"provider": string,"shipping_price"?: number | null,"size_ml"?: number | null,"tax_price"?: number | null,"title": string,"variant_id": string
                  }
                  Update: {
                    "availability"?: string | null,"checked_at"?: string,"concentration"?: string | null,"condition"?: string | null,"currency"?: string,"expires_at"?: string,"id"?: string,"item_url"?: string,"list_price"?: number,"match_reasons"?: NonNullable<Json>,"match_status"?: string,"merchant"?: string,"provider"?: string,"shipping_price"?: number | null,"size_ml"?: number | null,"tax_price"?: number | null,"title"?: string,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offer_snapshots_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "variants"
      referencedColumns: ["id"]
    }
                  ]
                },"preferences": {
                  Row: {
                    "disliked_notes": NonNullable<Json>,"include_alternatives": boolean,"liked_families": NonNullable<Json>,"liked_notes": NonNullable<Json>,"marketed_for": string,"occasions": NonNullable<Json>,"performance": NonNullable<Json>,"seasons": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "disliked_notes"?: NonNullable<Json>,"include_alternatives"?: boolean,"liked_families"?: NonNullable<Json>,"liked_notes"?: NonNullable<Json>,"marketed_for"?: string,"occasions"?: NonNullable<Json>,"performance"?: NonNullable<Json>,"seasons"?: NonNullable<Json>,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "disliked_notes"?: NonNullable<Json>,"include_alternatives"?: boolean,"liked_families"?: NonNullable<Json>,"liked_notes"?: NonNullable<Json>,"marketed_for"?: string,"occasions"?: NonNullable<Json>,"performance"?: NonNullable<Json>,"seasons"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "budget_max": number | null,"budget_min": number | null,"created_at": string,"display_name": string | null,"onboarded_at": string | null,"region": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "budget_max"?: number | null,"budget_min"?: number | null,"created_at"?: string,"display_name"?: string | null,"onboarded_at"?: string | null,"region"?: string,"user_id": string
                  }
                  Update: {
                    "budget_max"?: number | null,"budget_min"?: number | null,"created_at"?: string,"display_name"?: string | null,"onboarded_at"?: string | null,"region"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_counters": {
                  Row: {
                    "bucket": string,"hits": number,"subject": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"hits"?: number,"subject": string,"window_start": string
                  }
                  Update: {
                    "bucket"?: string,"hits"?: number,"subject"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recommendation_feedback": {
                  Row: {
                    "created_at": string,"fragrance_id": string,"id": string,"reaction": string,"run_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fragrance_id": string,"id"?: string,"reaction": string,"run_id": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"fragrance_id"?: string,"id"?: string,"reaction"?: string,"run_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommendation_feedback_fragrance_id_fkey"
      columns: ["fragrance_id"]
isOneToOne: false
      referencedRelation: "fragrances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommendation_feedback_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "recommendation_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"recommendation_runs": {
                  Row: {
                    "created_at": string,"criteria_json": NonNullable<Json>,"engine_version": string,"id": string,"mode": string,"results_json": NonNullable<Json>,"source": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"criteria_json"?: NonNullable<Json>,"engine_version": string,"id"?: string,"mode": string,"results_json"?: NonNullable<Json>,"source"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"criteria_json"?: NonNullable<Json>,"engine_version"?: string,"id"?: string,"mode"?: string,"results_json"?: NonNullable<Json>,"source"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"variants": {
                  Row: {
                    "concentration": string,"created_at": string,"edition": string | null,"fragrance_id": string,"id": string,"size_ml": number,"variant_key": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "concentration": string,"created_at"?: string,"edition"?: string | null,"fragrance_id": string,"id"?: string,"size_ml": number,"variant_key"?: never
                  }
                  Update: {
                    "concentration"?: string,"created_at"?: string,"edition"?: string | null,"fragrance_id"?: string,"id"?: string,"size_ml"?: number,"variant_key"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "variants_fragrance_id_fkey"
      columns: ["fragrance_id"]
isOneToOne: false
      referencedRelation: "fragrances"
      referencedColumns: ["id"]
    }
                  ]
                },"wishlist_items": {
                  Row: {
                    "created_at": string,"fragrance_id": string,"id": string,"user_id": string,"variant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fragrance_id": string,"id"?: string,"user_id"?: string,"variant_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"fragrance_id"?: string,"id"?: string,"user_id"?: string,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlist_items_fragrance_id_fkey"
      columns: ["fragrance_id"]
isOneToOne: false
      referencedRelation: "fragrances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wishlist_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "variants"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "claim_rate":
{ Args: { "p_bucket": string,"p_limit": number,"p_subject": string,"p_window_seconds": number }; Returns: boolean
                           },
"demo_capacity_ok":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"ensure_variant":
{ Args: { "p_concentration": string,"p_fragrance_id": string,"p_size_ml": number }; Returns: string
                           },
"expired_demo_accounts":
{ Args: { "p_limit"?: number }; Returns: string[]
                           },
"owns_chat":
{ Args: { "p_session": string }; Returns: boolean
                           },
"owns_run":
{ Args: { "p_run": string }; Returns: boolean
                           },
"search_fragrances":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_query": string }; Returns: {
              "accords": NonNullable<Json>,
"alternative_to": Json | null,
"brand": string,
"brand_tier": string | null,
"canonical_key": string,
"community": Json | null,
"community_rating": number | null,
"community_votes": number | null,
"concentration": string | null,
"concentration_basis": string | null,
"external_id": string,
"family": string | null,
"family_label": string | null,
"fetched_at": string,
"gender": string | null,
"id": string,
"image_url": string | null,
"metadata_quality": string,
"name": string,
"notes": NonNullable<Json>,
"perfumers": (string)[],
"popularity": number,
"price_band": string | null,
"price_basis": string | null,
"provider": string,
"search_text": string | null,
"similar_to": NonNullable<Json>,
"sizes_ml": (number)[],
"source_url": string | null,
"themes": NonNullable<Json>,
"year": number | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "fragrances"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
