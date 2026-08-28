// ============================================================================
// Database types
// ============================================================================
// The `Database` type below is GENERATED from the live schema. Do not hand-edit
// it. Regenerate after any change to supabase/full-migration.sql:
//
//   SUPABASE_ACCESS_TOKEN=<sbp_...> npx supabase gen types typescript --linked
//
// The domain unions above it are hand-maintained. Postgres CHECK constraints
// don't surface as enums, so the generator emits plain `string` for those
// columns and these narrow them back down.
//
// Last generated: 2026-08-28
// ============================================================================

// ---------------------------------------------------------------- domain unions
export type DealStage =
  | "lead"
  | "initial_contact"
  | "nda_signed"
  | "info_received"
  | "loi_submitted"
  | "loi_accepted"
  | "diligence"
  | "closing"
  | "closed"
  | "dead";

export type CompanyStatus = "new" | "researching" | "qualified" | "contacted" | "disqualified";

export type ContactRoleType = "owner" | "cfo" | "broker" | "intermediary" | "other";

export type Priority = "low" | "medium" | "high" | "critical";

export type OutreachChannel = "email" | "sms" | "linkedin" | "call";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type MessageStatus = "pending" | "sent" | "delivered" | "opened" | "replied" | "bounced" | "failed";

export type Sentiment = "positive" | "neutral" | "negative";

export type CallStatus = "scheduled" | "in_progress" | "completed" | "no_answer" | "voicemail";

export type CallOutcome = "interested" | "callback" | "not_interested" | "wrong_number" | "other";

export type MeetingType = "intro" | "deep_dive" | "diligence" | "negotiation" | "closing" | "other";

export type MeetingStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export type AnalysisType = "financing" | "valuation" | "diligence" | "integration" | "scaling" | "exit";

export type DiligenceCategory = "financial" | "legal" | "operational" | "market" | "team" | "technology" | "environmental";

export type DiligenceStatus = "not_started" | "in_progress" | "completed" | "flagged" | "na";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ActivityType =
  | "email_sent"
  | "call_made"
  | "sms_sent"
  | "linkedin_sent"
  | "meeting_booked"
  | "note_added"
  | "stage_changed"
  | "deal_created"
  | "analysis_run";

// ------------------------------------------------- generated from live schema

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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          contact_id: string | null
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          title: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          contact_id?: string | null
          created_at?: string
          description: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          title?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          contact_id?: string | null
          created_at?: string
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisory_analyses: {
        Row: {
          ai_model_used: string | null
          ai_prompt_version: string | null
          analysis_type: string
          created_at: string
          deal_id: string
          id: string
          input_data: Json
          output_data: Json | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model_used?: string | null
          ai_prompt_version?: string | null
          analysis_type: string
          created_at?: string
          deal_id: string
          id?: string
          input_data?: Json
          output_data?: Json | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model_used?: string | null
          ai_prompt_version?: string | null
          analysis_type?: string
          created_at?: string
          deal_id?: string
          id?: string
          input_data?: Json
          output_data?: Json | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisory_analyses_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          id: string
          messages: Json[] | null
          model_used: string
          total_tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          messages?: Json[] | null
          model_used?: string
          total_tokens?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          messages?: Json[] | null
          model_used?: string
          total_tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          snapshot_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics?: Json
          snapshot_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          snapshot_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          ai_next_steps: string | null
          ai_summary: string | null
          company_id: string | null
          contact_id: string
          created_at: string
          deal_id: string | null
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          outcome: string | null
          recording_url: string | null
          scheduled_at: string | null
          script_used: string | null
          started_at: string | null
          status: string
          transcript: string | null
          twilio_sid: string | null
          user_id: string
        }
        Insert: {
          ai_next_steps?: string | null
          ai_summary?: string | null
          company_id?: string | null
          contact_id: string
          created_at?: string
          deal_id?: string | null
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          outcome?: string | null
          recording_url?: string | null
          scheduled_at?: string | null
          script_used?: string | null
          started_at?: string | null
          status?: string
          transcript?: string | null
          twilio_sid?: string | null
          user_id: string
        }
        Update: {
          ai_next_steps?: string | null
          ai_summary?: string | null
          company_id?: string | null
          contact_id?: string
          created_at?: string
          deal_id?: string | null
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          outcome?: string | null
          recording_url?: string | null
          scheduled_at?: string | null
          script_used?: string | null
          started_at?: string | null
          status?: string
          transcript?: string | null
          twilio_sid?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ai_summary: string | null
          created_at: string
          description: string | null
          ebitda_range: string | null
          employee_count: number | null
          enrichment_data: Json | null
          icp_score: number | null
          id: string
          industry: string | null
          location_city: string | null
          location_state: string | null
          name: string
          revenue_range: string | null
          source: string
          source_url: string | null
          status: string
          sub_industry: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          description?: string | null
          ebitda_range?: string | null
          employee_count?: number | null
          enrichment_data?: Json | null
          icp_score?: number | null
          id?: string
          industry?: string | null
          location_city?: string | null
          location_state?: string | null
          name: string
          revenue_range?: string | null
          source?: string
          source_url?: string | null
          status?: string
          sub_industry?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          description?: string | null
          ebitda_range?: string | null
          employee_count?: number | null
          enrichment_data?: Json | null
          icp_score?: number | null
          id?: string
          industry?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string
          revenue_range?: string | null
          source?: string
          source_url?: string | null
          status?: string
          sub_industry?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          ai_notes: string | null
          company_id: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          linkedin_url: string | null
          phone: string | null
          relationship_score: number | null
          role_type: string
          suppression_reason: string | null
          tags: string[] | null
          title: string | null
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_notes?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          linkedin_url?: string | null
          phone?: string | null
          relationship_score?: number | null
          role_type?: string
          suppression_reason?: string | null
          tags?: string[] | null
          title?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_notes?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          linkedin_url?: string | null
          phone?: string | null
          relationship_score?: number | null
          role_type?: string
          suppression_reason?: string | null
          tags?: string[] | null
          title?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          ai_analysis: Json | null
          asking_price: number | null
          company_id: string
          created_at: string
          deal_score: number | null
          deal_thesis: string | null
          ebitda: number | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          notes: string | null
          primary_contact_id: string | null
          priority: string
          revenue: number | null
          stage: string
          stage_entered_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          asking_price?: number | null
          company_id: string
          created_at?: string
          deal_score?: number | null
          deal_thesis?: string | null
          ebitda?: number | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          primary_contact_id?: string | null
          priority?: string
          revenue?: number | null
          stage?: string
          stage_entered_at?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          asking_price?: number | null
          company_id?: string
          created_at?: string
          deal_score?: number | null
          deal_thesis?: string | null
          ebitda?: number | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          primary_contact_id?: string | null
          priority?: string
          revenue?: number | null
          stage?: string
          stage_entered_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diligence_items: {
        Row: {
          ai_findings: string | null
          assigned_to: string | null
          category: string
          created_at: string
          deal_id: string
          document_urls: string[] | null
          due_date: string | null
          id: string
          item: string
          notes: string | null
          risk_level: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_findings?: string | null
          assigned_to?: string | null
          category: string
          created_at?: string
          deal_id: string
          document_urls?: string[] | null
          due_date?: string | null
          id?: string
          item: string
          notes?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_findings?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          deal_id?: string
          document_urls?: string[] | null
          due_date?: string | null
          id?: string
          item?: string
          notes?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diligence_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diligence_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          ai_follow_up: string | null
          ai_notes: string | null
          ai_prep: Json | null
          company_id: string | null
          contact_id: string
          created_at: string
          deal_id: string | null
          description: string | null
          duration_minutes: number
          google_event_id: string | null
          id: string
          location: string | null
          meeting_type: string
          meeting_url: string | null
          outcome: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_follow_up?: string | null
          ai_notes?: string | null
          ai_prep?: Json | null
          company_id?: string | null
          contact_id: string
          created_at?: string
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          location?: string | null
          meeting_type?: string
          meeting_url?: string | null
          outcome?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_follow_up?: string | null
          ai_notes?: string | null
          ai_prep?: Json | null
          company_id?: string | null
          contact_id?: string
          created_at?: string
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          location?: string | null
          meeting_type?: string
          meeting_url?: string | null
          outcome?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_campaigns: {
        Row: {
          ai_config: Json | null
          auto_enroll: boolean
          auto_enroll_min_score: number
          auto_enroll_role_types: string[]
          channels: string[] | null
          created_at: string
          description: string | null
          id: string
          name: string
          stats: Json | null
          status: string
          target_company_ids: string[] | null
          target_contact_ids: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_config?: Json | null
          auto_enroll?: boolean
          auto_enroll_min_score?: number
          auto_enroll_role_types?: string[]
          channels?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          stats?: Json | null
          status?: string
          target_company_ids?: string[] | null
          target_contact_ids?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_config?: Json | null
          auto_enroll?: boolean
          auto_enroll_min_score?: number
          auto_enroll_role_types?: string[]
          channels?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          stats?: Json | null
          status?: string
          target_company_ids?: string[] | null
          target_contact_ids?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_messages: {
        Row: {
          ai_personalization: Json | null
          body: string
          campaign_id: string | null
          channel: string
          company_id: string | null
          contact_id: string
          created_at: string
          external_id: string | null
          id: string
          opened_at: string | null
          provider_message_id: string | null
          replied_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          sequence_id: string | null
          status: string
          subject: string | null
          to_address: string | null
          user_id: string | null
        }
        Insert: {
          ai_personalization?: Json | null
          body: string
          campaign_id?: string | null
          channel: string
          company_id?: string | null
          contact_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          opened_at?: string | null
          provider_message_id?: string | null
          replied_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          subject?: string | null
          to_address?: string | null
          user_id?: string | null
        }
        Update: {
          ai_personalization?: Json | null
          body?: string
          campaign_id?: string | null
          channel?: string
          company_id?: string | null
          contact_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          opened_at?: string | null
          provider_message_id?: string | null
          replied_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          subject?: string | null
          to_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "outreach_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_replies: {
        Row: {
          ai_classification: Json | null
          body: string
          channel: string
          contact_id: string
          created_at: string
          id: string
          message_id: string
          received_at: string
          sentiment: string | null
        }
        Insert: {
          ai_classification?: Json | null
          body: string
          channel: string
          contact_id: string
          created_at?: string
          id?: string
          message_id: string
          received_at?: string
          sentiment?: string | null
        }
        Update: {
          ai_classification?: Json | null
          body?: string
          channel?: string
          contact_id?: string
          created_at?: string
          id?: string
          message_id?: string
          received_at?: string
          sentiment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_replies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "outreach_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_sequences: {
        Row: {
          ai_generated: boolean
          body_template: string | null
          campaign_id: string
          channel: string
          config: Json | null
          created_at: string
          delay_days: number
          id: string
          step_number: number
          subject_template: string | null
        }
        Insert: {
          ai_generated?: boolean
          body_template?: string | null
          campaign_id: string
          channel: string
          config?: Json | null
          created_at?: string
          delay_days?: number
          id?: string
          step_number: number
          subject_template?: string | null
        }
        Update: {
          ai_generated?: boolean
          body_template?: string | null
          campaign_id?: string
          channel?: string
          config?: Json | null
          created_at?: string
          delay_days?: number
          id?: string
          step_number?: number
          subject_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          daily_send_cap: number
          full_name: string | null
          google_calendar_tokens: Json | null
          icp_config: Json | null
          id: string
          role: string
          settings: Json | null
          updated_at: string
          warmup_started_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          daily_send_cap?: number
          full_name?: string | null
          google_calendar_tokens?: Json | null
          icp_config?: Json | null
          id: string
          role?: string
          settings?: Json | null
          updated_at?: string
          warmup_started_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          daily_send_cap?: number
          full_name?: string | null
          google_calendar_tokens?: Json | null
          icp_config?: Json | null
          id?: string
          role?: string
          settings?: Json | null
          updated_at?: string
          warmup_started_at?: string | null
        }
        Relationships: []
      }
      scan_results: {
        Row: {
          ai_summary: string | null
          business_data: Json
          business_name: string
          company_id: string | null
          contact_data: Json | null
          created_at: string
          enrichment_data: Json | null
          icp_score: number | null
          id: string
          imported: boolean
          scan_id: string
        }
        Insert: {
          ai_summary?: string | null
          business_data?: Json
          business_name: string
          company_id?: string | null
          contact_data?: Json | null
          created_at?: string
          enrichment_data?: Json | null
          icp_score?: number | null
          id?: string
          imported?: boolean
          scan_id: string
        }
        Update: {
          ai_summary?: string | null
          business_data?: Json
          business_name?: string
          company_id?: string | null
          contact_data?: Json | null
          created_at?: string
          enrichment_data?: Json | null
          icp_score?: number | null
          id?: string
          imported?: boolean
          scan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_results_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          created_at: string
          criteria: Json
          error_message: string | null
          id: string
          imported_count: number
          name: string | null
          results_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criteria?: Json
          error_message?: string | null
          id?: string
          imported_count?: number
          name?: string | null
          results_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          error_message?: string | null
          id?: string
          imported_count?: number
          name?: string | null
          results_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage: {
        Row: {
          ai_credits_used: number
          created_at: string
          id: string
          outreach_messages_used: number
          period_end: string
          period_start: string
          scans_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_credits_used?: number
          created_at?: string
          id?: string
          outreach_messages_used?: number
          period_end: string
          period_start: string
          scans_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_credits_used?: number
          created_at?: string
          id?: string
          outreach_messages_used?: number
          period_end?: string
          period_start?: string
          scans_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
