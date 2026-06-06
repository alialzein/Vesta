/**
 * Database types for the Supabase `public` schema.
 *
 * Hand-authored to match the Phase 1 migrations in `supabase/migrations`
 * (the standard `supabase gen types` path requires Docker, which is not
 * available in this environment). Keep this file in sync whenever a migration
 * changes a table. The shape matches what `supabase gen types typescript`
 * produces, so it can be regenerated later once Docker/login is available.
 *
 * `private.graph_tokens` is intentionally NOT included: it is never accessed
 * from browser/typed client code.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamptz = string;
type DateString = string;
type UUID = string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: UUID;
          email: string | null;
          full_name: string | null;
          timezone: string;
          role: string | null;
          onboarded_at: Timestamptz | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id: UUID;
          email?: string | null;
          full_name?: string | null;
          timezone?: string;
          role?: string | null;
          onboarded_at?: Timestamptz | null;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      user_integrations: {
        Row: {
          id: UUID;
          user_id: UUID;
          provider: string;
          status: string;
          provider_user_id: string | null;
          provider_tenant_id: string | null;
          provider_email: string | null;
          scopes: string[];
          connected_at: Timestamptz | null;
          last_sync_at: Timestamptz | null;
          last_error: string | null;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          provider?: string;
          status?: string;
          provider_user_id?: string | null;
          provider_tenant_id?: string | null;
          provider_email?: string | null;
          scopes?: string[];
          connected_at?: Timestamptz | null;
          last_sync_at?: Timestamptz | null;
          last_error?: string | null;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['user_integrations']['Insert']>;
        Relationships: [];
      };
      mailboxes: {
        Row: {
          id: UUID;
          user_id: UUID;
          integration_id: UUID;
          provider: string;
          provider_tenant_id: string | null;
          provider_user_id: string | null;
          mailbox_email: string | null;
          mailbox_display_name: string | null;
          mailbox_type: string;
          aliases: string[];
          status: string;
          connected_at: Timestamptz | null;
          last_sync_at: Timestamptz | null;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          integration_id: UUID;
          provider?: string;
          provider_tenant_id?: string | null;
          provider_user_id?: string | null;
          mailbox_email?: string | null;
          mailbox_display_name?: string | null;
          mailbox_type?: string;
          aliases?: string[];
          status?: string;
          connected_at?: Timestamptz | null;
          last_sync_at?: Timestamptz | null;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['mailboxes']['Insert']>;
        Relationships: [];
      };
      sync_cursors: {
        Row: {
          id: UUID;
          user_id: UUID;
          integration_id: UUID | null;
          mailbox_id: UUID | null;
          provider: string;
          resource_type: string;
          resource_id: string | null;
          delta_link: string | null;
          next_link: string | null;
          last_success_at: Timestamptz | null;
          last_error: string | null;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          integration_id?: UUID | null;
          mailbox_id?: UUID | null;
          provider?: string;
          resource_type: string;
          resource_id?: string | null;
          delta_link?: string | null;
          next_link?: string | null;
          last_success_at?: Timestamptz | null;
          last_error?: string | null;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['sync_cursors']['Insert']>;
        Relationships: [];
      };
      people: {
        Row: {
          id: UUID;
          user_id: UUID;
          display_name: string | null;
          email: string | null;
          domain: string | null;
          company: string | null;
          is_vip: boolean;
          vip_reason: string | null;
          default_priority_boost: number;
          relationship_notes: string | null;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          display_name?: string | null;
          email?: string | null;
          domain?: string | null;
          company?: string | null;
          is_vip?: boolean;
          vip_reason?: string | null;
          default_priority_boost?: number;
          relationship_notes?: string | null;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['people']['Insert']>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: UUID;
          user_id: UUID;
          name: string;
          description: string | null;
          status: string;
          priority_boost: number;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          name: string;
          description?: string | null;
          status?: string;
          priority_boost?: number;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
        Relationships: [];
      };
      email_threads: {
        Row: {
          id: UUID;
          user_id: UUID;
          integration_id: UUID | null;
          mailbox_id: UUID;
          graph_conversation_id: string;
          subject_normalized: string | null;
          participants: Json;
          latest_message_at: Timestamptz | null;
          latest_inbound_at: Timestamptz | null;
          latest_outbound_at: Timestamptz | null;
          inbound_after_last_outbound_count: number;
          followup_count: number;
          is_waiting_on_manager: boolean;
          is_waiting_on_other: boolean;
          thread_summary: string | null;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          integration_id?: UUID | null;
          mailbox_id: UUID;
          graph_conversation_id: string;
          subject_normalized?: string | null;
          participants?: Json;
          latest_message_at?: Timestamptz | null;
          latest_inbound_at?: Timestamptz | null;
          latest_outbound_at?: Timestamptz | null;
          inbound_after_last_outbound_count?: number;
          followup_count?: number;
          is_waiting_on_manager?: boolean;
          is_waiting_on_other?: boolean;
          thread_summary?: string | null;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['email_threads']['Insert']>;
        Relationships: [];
      };
      email_messages: {
        Row: {
          id: UUID;
          user_id: UUID;
          integration_id: UUID | null;
          mailbox_id: UUID;
          thread_id: UUID | null;
          graph_message_id: string;
          graph_folder_id: string | null;
          graph_conversation_id: string | null;
          internet_message_id: string | null;
          conversation_index: string | null;
          direction: string | null;
          subject: string | null;
          body_preview: string | null;
          body_text: string | null;
          body_html: string | null;
          sender_name: string | null;
          sender_email: string | null;
          from_email: string | null;
          to_recipients: Json;
          cc_recipients: Json;
          importance: string | null;
          is_read: boolean | null;
          has_attachments: boolean;
          categories: string[];
          flag: Json | null;
          web_link: string | null;
          received_at: Timestamptz | null;
          sent_at: Timestamptz | null;
          deleted_at: Timestamptz | null;
          raw_graph: Json | null;
          content_hash: string | null;
          ai_relevant_hash: string | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          integration_id?: UUID | null;
          mailbox_id: UUID;
          thread_id?: UUID | null;
          graph_message_id: string;
          graph_folder_id?: string | null;
          graph_conversation_id?: string | null;
          internet_message_id?: string | null;
          conversation_index?: string | null;
          direction?: string | null;
          subject?: string | null;
          body_preview?: string | null;
          body_text?: string | null;
          body_html?: string | null;
          sender_name?: string | null;
          sender_email?: string | null;
          from_email?: string | null;
          to_recipients?: Json;
          cc_recipients?: Json;
          importance?: string | null;
          is_read?: boolean | null;
          has_attachments?: boolean;
          categories?: string[];
          flag?: Json | null;
          web_link?: string | null;
          received_at?: Timestamptz | null;
          sent_at?: Timestamptz | null;
          deleted_at?: Timestamptz | null;
          raw_graph?: Json | null;
          content_hash?: string | null;
          ai_relevant_hash?: string | null;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['email_messages']['Insert']>;
        Relationships: [];
      };
      work_items: {
        Row: {
          id: UUID;
          user_id: UUID;
          integration_id: UUID | null;
          mailbox_id: UUID | null;
          source: string;
          source_id: UUID | null;
          source_external_id: string | null;
          thread_id: UUID | null;
          title: string;
          summary: string | null;
          category: string | null;
          status: string;
          urgency: string | null;
          priority_score: number;
          due_at: Timestamptz | null;
          snoozed_until: Timestamptz | null;
          completed_at: Timestamptz | null;
          assigned_to: string | null;
          related_person_id: UUID | null;
          related_project_id: UUID | null;
          requires_reply: boolean;
          requires_decision: boolean;
          requires_approval: boolean;
          can_delegate: boolean;
          suggested_delegate: string | null;
          suggested_action: string | null;
          urgency_reason: string | null;
          confidence: number | null;
          last_analyzed_at: Timestamptz | null;
          analysis_version: number | null;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          integration_id?: UUID | null;
          mailbox_id?: UUID | null;
          source: string;
          source_id?: UUID | null;
          source_external_id?: string | null;
          thread_id?: UUID | null;
          title: string;
          summary?: string | null;
          category?: string | null;
          status?: string;
          urgency?: string | null;
          priority_score?: number;
          due_at?: Timestamptz | null;
          snoozed_until?: Timestamptz | null;
          completed_at?: Timestamptz | null;
          assigned_to?: string | null;
          related_person_id?: UUID | null;
          related_project_id?: UUID | null;
          requires_reply?: boolean;
          requires_decision?: boolean;
          requires_approval?: boolean;
          can_delegate?: boolean;
          suggested_delegate?: string | null;
          suggested_action?: string | null;
          urgency_reason?: string | null;
          confidence?: number | null;
          last_analyzed_at?: Timestamptz | null;
          analysis_version?: number | null;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['work_items']['Insert']>;
        Relationships: [];
      };
      commitments: {
        Row: {
          id: UUID;
          user_id: UUID;
          work_item_id: UUID | null;
          source: string | null;
          source_id: string | null;
          commitment_type: string | null;
          promisor_name: string | null;
          promisor_email: string | null;
          owner_user_id: UUID | null;
          commitment_text: string;
          due_at: Timestamptz | null;
          status: string;
          confidence: number | null;
          extracted_from_quote: string | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          work_item_id?: UUID | null;
          source?: string | null;
          source_id?: string | null;
          commitment_type?: string | null;
          promisor_name?: string | null;
          promisor_email?: string | null;
          owner_user_id?: UUID | null;
          commitment_text: string;
          due_at?: Timestamptz | null;
          status?: string;
          confidence?: number | null;
          extracted_from_quote?: string | null;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['commitments']['Insert']>;
        Relationships: [];
      };
      focus_sessions: {
        Row: {
          id: UUID;
          user_id: UUID;
          started_at: Timestamptz | null;
          ended_at: Timestamptz | null;
          target_minutes: number | null;
          estimated_total_minutes: number | null;
          status: string;
          summary: string | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          started_at?: Timestamptz | null;
          ended_at?: Timestamptz | null;
          target_minutes?: number | null;
          estimated_total_minutes?: number | null;
          status?: string;
          summary?: string | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['focus_sessions']['Insert']>;
        Relationships: [];
      };
      focus_session_items: {
        Row: {
          id: UUID;
          user_id: UUID;
          session_id: UUID;
          work_item_id: UUID | null;
          position: number;
          estimated_minutes: number | null;
          recommended_action: string | null;
          completed_at: Timestamptz | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          session_id: UUID;
          work_item_id?: UUID | null;
          position?: number;
          estimated_minutes?: number | null;
          recommended_action?: string | null;
          completed_at?: Timestamptz | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['focus_session_items']['Insert']>;
        Relationships: [];
      };
      ai_analyses: {
        Row: {
          id: UUID;
          user_id: UUID;
          work_item_id: UUID | null;
          source_hash: string | null;
          model: string | null;
          prompt_version: string | null;
          input_summary: string | null;
          output: Json | null;
          priority_score: number | null;
          category: string | null;
          urgency: string | null;
          user_visible_reason: string | null;
          confidence: number | null;
          token_input: number | null;
          token_output: number | null;
          cost_estimate_usd: number | null;
          error: string | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          work_item_id?: UUID | null;
          source_hash?: string | null;
          model?: string | null;
          prompt_version?: string | null;
          input_summary?: string | null;
          output?: Json | null;
          priority_score?: number | null;
          category?: string | null;
          urgency?: string | null;
          user_visible_reason?: string | null;
          confidence?: number | null;
          token_input?: number | null;
          token_output?: number | null;
          cost_estimate_usd?: number | null;
          error?: string | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['ai_analyses']['Insert']>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: UUID;
          user_id: UUID;
          work_item_id: UUID | null;
          title: string;
          description: string | null;
          due_at: Timestamptz | null;
          status: string;
          source: string;
          parsed_from_text: string | null;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          work_item_id?: UUID | null;
          title: string;
          description?: string | null;
          due_at?: Timestamptz | null;
          status?: string;
          source?: string;
          parsed_from_text?: string | null;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
        Relationships: [];
      };
      reminders: {
        Row: {
          id: UUID;
          user_id: UUID;
          work_item_id: UUID | null;
          title: string;
          remind_at: Timestamptz;
          timezone: string;
          status: string;
          recurrence_rule: string | null;
          delivery_channels: string[];
          last_sent_at: Timestamptz | null;
          snoozed_until: Timestamptz | null;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          work_item_id?: UUID | null;
          title: string;
          remind_at: Timestamptz;
          timezone?: string;
          status?: string;
          recurrence_rule?: string | null;
          delivery_channels?: string[];
          last_sent_at?: Timestamptz | null;
          snoozed_until?: Timestamptz | null;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>;
        Relationships: [];
      };
      draft_replies: {
        Row: {
          id: UUID;
          user_id: UUID;
          work_item_id: UUID | null;
          email_message_id: UUID | null;
          graph_draft_message_id: string | null;
          status: string;
          to_recipients: Json;
          cc_recipients: Json;
          subject: string | null;
          body_text: string | null;
          body_html: string | null;
          ai_generated_body: string | null;
          user_edited_body: string | null;
          edit_diff_summary: string | null;
          tone: string | null;
          model: string | null;
          prompt_version: string | null;
          approved_at: Timestamptz | null;
          sent_at: Timestamptz | null;
          error: string | null;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          work_item_id?: UUID | null;
          email_message_id?: UUID | null;
          graph_draft_message_id?: string | null;
          status?: string;
          to_recipients?: Json;
          cc_recipients?: Json;
          subject?: string | null;
          body_text?: string | null;
          body_html?: string | null;
          ai_generated_body?: string | null;
          user_edited_body?: string | null;
          edit_diff_summary?: string | null;
          tone?: string | null;
          model?: string | null;
          prompt_version?: string | null;
          approved_at?: Timestamptz | null;
          sent_at?: Timestamptz | null;
          error?: string | null;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['draft_replies']['Insert']>;
        Relationships: [];
      };
      manager_rules: {
        Row: {
          id: UUID;
          user_id: UUID;
          name: string;
          description: string | null;
          is_enabled: boolean;
          rule_type: string | null;
          conditions: Json;
          actions: Json;
          priority: number;
          created_from: string | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          name: string;
          description?: string | null;
          is_enabled?: boolean;
          rule_type?: string | null;
          conditions?: Json;
          actions?: Json;
          priority?: number;
          created_from?: string | null;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['manager_rules']['Insert']>;
        Relationships: [];
      };
      manager_memories: {
        Row: {
          id: UUID;
          user_id: UUID;
          memory_type: string;
          memory_text: string;
          scope: string | null;
          scope_ref: string | null;
          source: string;
          confidence: number | null;
          is_active: boolean;
          embedding: string | null;
          metadata: Json;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          memory_type: string;
          memory_text: string;
          scope?: string | null;
          scope_ref?: string | null;
          source?: string;
          confidence?: number | null;
          is_active?: boolean;
          embedding?: string | null;
          metadata?: Json;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['manager_memories']['Insert']>;
        Relationships: [];
      };
      feedback_events: {
        Row: {
          id: UUID;
          user_id: UUID;
          work_item_id: UUID | null;
          event_type: string;
          feedback_text: string | null;
          old_value: Json | null;
          new_value: Json | null;
          processed_at: Timestamptz | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          work_item_id?: UUID | null;
          event_type: string;
          feedback_text?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          processed_at?: Timestamptz | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['feedback_events']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: UUID;
          user_id: UUID | null;
          actor_type: string;
          actor_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          before: Json | null;
          after: Json | null;
          metadata: Json;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id?: UUID | null;
          actor_type?: string;
          actor_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          metadata?: Json;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
      notification_events: {
        Row: {
          id: UUID;
          user_id: UUID;
          work_item_id: UUID | null;
          channel: string;
          title: string | null;
          body: string | null;
          status: string;
          sent_at: Timestamptz | null;
          error: string | null;
          metadata: Json;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          work_item_id?: UUID | null;
          channel: string;
          title?: string | null;
          body?: string | null;
          status?: string;
          sent_at?: Timestamptz | null;
          error?: string | null;
          metadata?: Json;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['notification_events']['Insert']>;
        Relationships: [];
      };
      daily_briefs: {
        Row: {
          id: UUID;
          user_id: UUID;
          brief_date: DateString;
          title: string | null;
          summary: string | null;
          sections: Json;
          generated_by_model: string | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          user_id: UUID;
          brief_date: DateString;
          title?: string | null;
          summary?: string | null;
          sections?: Json;
          generated_by_model?: string | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['daily_briefs']['Insert']>;
        Relationships: [];
      };
      webhook_events: {
        Row: {
          id: UUID;
          provider: string;
          subscription_id: string | null;
          user_id: UUID | null;
          integration_id: UUID | null;
          mailbox_id: UUID | null;
          event_type: string | null;
          payload: Json | null;
          status: string;
          processed_at: Timestamptz | null;
          error: string | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          provider?: string;
          subscription_id?: string | null;
          user_id?: UUID | null;
          integration_id?: UUID | null;
          mailbox_id?: UUID | null;
          event_type?: string | null;
          payload?: Json | null;
          status?: string;
          processed_at?: Timestamptz | null;
          error?: string | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['webhook_events']['Insert']>;
        Relationships: [];
      };
      account_transfer_events: {
        Row: {
          id: UUID;
          requested_by_user_id: UUID | null;
          source_user_id: UUID | null;
          target_user_id: UUID | null;
          source_mailbox_id: UUID | null;
          target_mailbox_id: UUID | null;
          transfer_type: string | null;
          status: string;
          reason: string | null;
          before_counts: Json | null;
          after_counts: Json | null;
          approved_at: Timestamptz | null;
          completed_at: Timestamptz | null;
          error: string | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          requested_by_user_id?: UUID | null;
          source_user_id?: UUID | null;
          target_user_id?: UUID | null;
          source_mailbox_id?: UUID | null;
          target_mailbox_id?: UUID | null;
          transfer_type?: string | null;
          status?: string;
          reason?: string | null;
          before_counts?: Json | null;
          after_counts?: Json | null;
          approved_at?: Timestamptz | null;
          completed_at?: Timestamptz | null;
          error?: string | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['account_transfer_events']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      upsert_graph_token: {
        Args: {
          p_integration_id: UUID;
          p_access: string;
          p_refresh: string | null;
          p_expires: Timestamptz;
          p_scopes: string[];
        };
        Returns: undefined;
      };
      get_graph_token: {
        Args: { p_integration_id: UUID };
        Returns: {
          encrypted_access_token: string | null;
          encrypted_refresh_token: string | null;
          access_token_expires_at: Timestamptz | null;
          granted_scopes: string[];
        }[];
      };
      update_graph_access_token: {
        Args: { p_integration_id: UUID; p_access: string; p_expires: Timestamptz };
        Returns: undefined;
      };
      delete_graph_token: {
        Args: { p_integration_id: UUID };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
