export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "owner" | "admin" | "member";
          company_name: string | null;
          icp_config: Json | null;
          settings: Json | null;
          google_calendar_tokens: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "owner" | "admin" | "member";
          company_name?: string | null;
          icp_config?: Json | null;
          settings?: Json | null;
          google_calendar_tokens?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          industry: string | null;
          sub_industry: string | null;
          revenue_range: string | null;
          ebitda_range: string | null;
          employee_count: number | null;
          location_city: string | null;
          location_state: string | null;
          website: string | null;
          description: string | null;
          source: "manual" | "import" | "scraped";
          source_url: string | null;
          enrichment_data: Json | null;
          icp_score: number | null;
          ai_summary: string | null;
          tags: string[];
          status: CompanyStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          industry?: string | null;
          sub_industry?: string | null;
          revenue_range?: string | null;
          ebitda_range?: string | null;
          employee_count?: number | null;
          location_city?: string | null;
          location_state?: string | null;
          website?: string | null;
          description?: string | null;
          source?: "manual" | "import" | "scraped";
          source_url?: string | null;
          enrichment_data?: Json | null;
          icp_score?: number | null;
          ai_summary?: string | null;
          tags?: string[];
          status?: CompanyStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          company_id: string | null;
          first_name: string;
          last_name: string;
          title: string | null;
          email: string | null;
          phone: string | null;
          linkedin_url: string | null;
          role_type: ContactRoleType;
          relationship_score: number | null;
          ai_notes: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id?: string | null;
          first_name: string;
          last_name: string;
          title?: string | null;
          email?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          role_type?: ContactRoleType;
          relationship_score?: number | null;
          ai_notes?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [];
      };
      deals: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          primary_contact_id: string | null;
          title: string;
          stage: DealStage;
          asking_price: number | null;
          estimated_value: number | null;
          revenue: number | null;
          ebitda: number | null;
          deal_score: number | null;
          deal_thesis: string | null;
          ai_analysis: Json | null;
          notes: string | null;
          priority: Priority;
          stage_entered_at: string;
          expected_close_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          primary_contact_id?: string | null;
          title: string;
          stage?: DealStage;
          asking_price?: number | null;
          estimated_value?: number | null;
          revenue?: number | null;
          ebitda?: number | null;
          deal_score?: number | null;
          deal_thesis?: string | null;
          ai_analysis?: Json | null;
          notes?: string | null;
          priority?: Priority;
          stage_entered_at?: string;
          expected_close_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deals"]["Insert"]>;
        Relationships: [];
      };
      outreach_campaigns: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          channels: OutreachChannel[];
          status: CampaignStatus;
          target_company_ids: string[];
          target_contact_ids: string[];
          ai_config: Json | null;
          stats: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          channels?: OutreachChannel[];
          status?: CampaignStatus;
          target_company_ids?: string[];
          target_contact_ids?: string[];
          ai_config?: Json | null;
          stats?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outreach_campaigns"]["Insert"]>;
        Relationships: [];
      };
      outreach_sequences: {
        Row: {
          id: string;
          campaign_id: string;
          step_number: number;
          channel: OutreachChannel;
          delay_days: number;
          subject_template: string | null;
          body_template: string | null;
          ai_generated: boolean;
          config: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          step_number: number;
          channel: OutreachChannel;
          delay_days?: number;
          subject_template?: string | null;
          body_template?: string | null;
          ai_generated?: boolean;
          config?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outreach_sequences"]["Insert"]>;
        Relationships: [];
      };
      outreach_messages: {
        Row: {
          id: string;
          user_id: string;
          sequence_id: string | null;
          contact_id: string;
          company_id: string | null;
          campaign_id: string | null;
          channel: OutreachChannel;
          status: MessageStatus;
          scheduled_at: string | null;
          sent_at: string | null;
          opened_at: string | null;
          replied_at: string | null;
          subject: string | null;
          body: string;
          to_address: string | null;
          provider_message_id: string | null;
          ai_personalization: Json | null;
          external_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sequence_id?: string | null;
          contact_id: string;
          company_id?: string | null;
          campaign_id?: string | null;
          channel: OutreachChannel;
          status?: MessageStatus;
          scheduled_at?: string | null;
          sent_at?: string | null;
          opened_at?: string | null;
          replied_at?: string | null;
          subject?: string | null;
          body: string;
          to_address?: string | null;
          provider_message_id?: string | null;
          ai_personalization?: Json | null;
          external_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outreach_messages"]["Insert"]>;
        Relationships: [];
      };
      outreach_replies: {
        Row: {
          id: string;
          message_id: string;
          contact_id: string;
          channel: OutreachChannel;
          body: string;
          sentiment: Sentiment | null;
          ai_classification: Json | null;
          received_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          contact_id: string;
          channel: OutreachChannel;
          body: string;
          sentiment?: Sentiment | null;
          ai_classification?: Json | null;
          received_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outreach_replies"]["Insert"]>;
        Relationships: [];
      };
      calls: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          company_id: string | null;
          deal_id: string | null;
          direction: "outbound" | "inbound";
          status: CallStatus;
          duration_seconds: number | null;
          recording_url: string | null;
          transcript: string | null;
          ai_summary: string | null;
          ai_next_steps: string | null;
          script_used: string | null;
          outcome: CallOutcome | null;
          twilio_sid: string | null;
          scheduled_at: string | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          company_id?: string | null;
          deal_id?: string | null;
          direction: "outbound" | "inbound";
          status?: CallStatus;
          duration_seconds?: number | null;
          recording_url?: string | null;
          transcript?: string | null;
          ai_summary?: string | null;
          ai_next_steps?: string | null;
          script_used?: string | null;
          outcome?: CallOutcome | null;
          twilio_sid?: string | null;
          scheduled_at?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["calls"]["Insert"]>;
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          company_id: string | null;
          deal_id: string | null;
          title: string;
          description: string | null;
          meeting_type: MeetingType;
          location: string | null;
          meeting_url: string | null;
          scheduled_at: string;
          duration_minutes: number;
          status: MeetingStatus;
          ai_prep: Json | null;
          ai_notes: string | null;
          ai_follow_up: string | null;
          outcome: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          company_id?: string | null;
          deal_id?: string | null;
          title: string;
          description?: string | null;
          meeting_type?: MeetingType;
          location?: string | null;
          meeting_url?: string | null;
          scheduled_at: string;
          duration_minutes?: number;
          status?: MeetingStatus;
          ai_prep?: Json | null;
          ai_notes?: string | null;
          ai_follow_up?: string | null;
          outcome?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meetings"]["Insert"]>;
        Relationships: [];
      };
      advisory_analyses: {
        Row: {
          id: string;
          user_id: string;
          deal_id: string;
          analysis_type: AnalysisType;
          title: string;
          input_data: Json;
          output_data: Json | null;
          ai_model_used: string | null;
          ai_prompt_version: string | null;
          status: "pending" | "processing" | "completed" | "error";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          deal_id: string;
          analysis_type: AnalysisType;
          title: string;
          input_data: Json;
          output_data?: Json | null;
          ai_model_used?: string | null;
          ai_prompt_version?: string | null;
          status?: "pending" | "processing" | "completed" | "error";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["advisory_analyses"]["Insert"]>;
        Relationships: [];
      };
      diligence_items: {
        Row: {
          id: string;
          deal_id: string;
          category: DiligenceCategory;
          item: string;
          status: DiligenceStatus;
          notes: string | null;
          risk_level: RiskLevel;
          ai_findings: string | null;
          document_urls: string[];
          assigned_to: string | null;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          category: DiligenceCategory;
          item: string;
          status?: DiligenceStatus;
          notes?: string | null;
          risk_level?: RiskLevel;
          ai_findings?: string | null;
          document_urls?: string[];
          assigned_to?: string | null;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["diligence_items"]["Insert"]>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string | null;
          title: string | null;
          entity_type: "company" | "contact" | "deal" | "campaign" | "meeting";
          entity_id: string;
          activity_type: ActivityType;
          description: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id?: string | null;
          title?: string | null;
          entity_type: "company" | "contact" | "deal" | "campaign" | "meeting";
          entity_id: string;
          activity_type: ActivityType;
          description: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          context_type: "global" | "deal" | "company" | "contact" | "advisory";
          context_id: string | null;
          messages: Json[];
          model_used: string;
          total_tokens: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          context_type?: "global" | "deal" | "company" | "contact" | "advisory";
          context_id?: string | null;
          messages?: Json[];
          model_used?: string;
          total_tokens?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_conversations"]["Insert"]>;
        Relationships: [];
      };
      analytics_snapshots: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          metrics: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_date: string;
          metrics: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analytics_snapshots"]["Insert"]>;
        Relationships: [];
      };
      scans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          criteria: Json;
          status: "pending" | "running" | "completed" | "failed";
          results_count: number;
          imported_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          criteria: Json;
          status?: "pending" | "running" | "completed" | "failed";
          results_count?: number;
          imported_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scans"]["Insert"]>;
        Relationships: [];
      };
      scan_results: {
        Row: {
          id: string;
          scan_id: string;
          user_id: string;
          business_name: string;
          business_data: Json | null;
          contact_data: Json | null;
          enrichment_data: Json | null;
          icp_score: number | null;
          ai_summary: string | null;
          imported: boolean;
          company_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          scan_id: string;
          user_id: string;
          business_name: string;
          business_data?: Json | null;
          contact_data?: Json | null;
          enrichment_data?: Json | null;
          icp_score?: number | null;
          ai_summary?: string | null;
          imported?: boolean;
          company_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scan_results"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
