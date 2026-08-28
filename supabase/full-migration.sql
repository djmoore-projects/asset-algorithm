-- ============================================================================
-- asset-algorithm : COMPLETE SCHEMA (source of truth)
-- ============================================================================
-- Generated 2026-08-28 by consolidating every numbered
-- migration and verifying the result against the live database.
--
-- THIS FILE IS AUTHORITATIVE. Make schema changes here.
-- The old numbered migrations are archived under supabase/migrations/_archive/
-- and are kept for history only. Do not run them.
--
-- Safe to re-run: every statement is guarded (if not exists, or drop-then-create
-- for policies and triggers, which do not support if not exists).
-- ============================================================================

-- Profiles table extends Supabase auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  company_name text,
  icp_config jsonb default '{}',
  settings jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger function (reused across tables)
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  industry text,
  sub_industry text,
  revenue_range text,
  ebitda_range text,
  employee_count integer,
  location_city text,
  location_state text,
  website text,
  description text,
  source text not null default 'manual' check (source in ('manual', 'import', 'scraped')),
  source_url text,
  enrichment_data jsonb default '{}',
  icp_score real check (icp_score >= 0 and icp_score <= 100),
  ai_summary text,
  tags text[] default '{}',
  status text not null default 'new' check (status in ('new', 'researching', 'qualified', 'contacted', 'disqualified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_companies_user_id on public.companies(user_id);
create index if not exists idx_companies_status on public.companies(status);
create index if not exists idx_companies_icp_score on public.companies(icp_score desc nulls last);
create index if not exists idx_companies_industry on public.companies(industry);

drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.update_updated_at();
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  first_name text not null,
  last_name text not null,
  title text,
  email text,
  phone text,
  linkedin_url text,
  role_type text not null default 'other' check (role_type in ('owner', 'cfo', 'broker', 'intermediary', 'other')),
  relationship_score real check (relationship_score >= 0 and relationship_score <= 100),
  ai_notes text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contacts_user_id on public.contacts(user_id);
create index if not exists idx_contacts_company_id on public.contacts(company_id);
create index if not exists idx_contacts_email on public.contacts(email);
create index if not exists idx_contacts_relationship_score on public.contacts(relationship_score desc nulls last);

drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function public.update_updated_at();
-- Campaigns
create table if not exists public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  channels text[] default '{}',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  target_company_ids uuid[] default '{}',
  target_contact_ids uuid[] default '{}',
  ai_config jsonb default '{}',
  stats jsonb default '{"sent":0,"opened":0,"replied":0,"booked":0}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_user_id on public.outreach_campaigns(user_id);
create index if not exists idx_campaigns_status on public.outreach_campaigns(status);

drop trigger if exists campaigns_updated_at on public.outreach_campaigns;
create trigger campaigns_updated_at
  before update on public.outreach_campaigns
  for each row execute function public.update_updated_at();

-- Sequences (steps within a campaign)
create table if not exists public.outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  step_number integer not null,
  channel text not null check (channel in ('email', 'sms', 'linkedin', 'call')),
  delay_days integer not null default 0,
  subject_template text,
  body_template text,
  ai_generated boolean not null default false,
  config jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_sequences_campaign_id on public.outreach_sequences(campaign_id);

-- Individual messages
create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  sequence_id uuid references public.outreach_sequences(id) on delete set null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  campaign_id uuid references public.outreach_campaigns(id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'linkedin', 'call')),
  to_address text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  subject text,
  body text not null,
  ai_personalization jsonb default '{}',
  provider_message_id text,
  external_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_user_id on public.outreach_messages(user_id);
create index if not exists idx_messages_contact_id on public.outreach_messages(contact_id);
create index if not exists idx_messages_campaign_id on public.outreach_messages(campaign_id);
create index if not exists idx_messages_status on public.outreach_messages(status);
create index if not exists idx_messages_scheduled on public.outreach_messages(scheduled_at) where status = 'pending';
create index if not exists idx_messages_provider_id on public.outreach_messages(provider_message_id) where provider_message_id is not null;

-- Replies
create table if not exists public.outreach_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.outreach_messages(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'linkedin', 'call')),
  body text not null,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  ai_classification jsonb default '{}',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_replies_message_id on public.outreach_replies(message_id);
create index if not exists idx_replies_contact_id on public.outreach_replies(contact_id);
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  primary_contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  stage text not null default 'lead' check (stage in (
    'lead', 'initial_contact', 'nda_signed', 'info_received',
    'loi_submitted', 'loi_accepted', 'diligence', 'closing', 'closed', 'dead'
  )),
  asking_price bigint,
  estimated_value bigint,
  revenue bigint,
  ebitda bigint,
  deal_score real check (deal_score >= 0 and deal_score <= 100),
  deal_thesis text,
  ai_analysis jsonb default '{}',
  notes text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  stage_entered_at timestamptz not null default now(),
  expected_close_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deals_user_id on public.deals(user_id);
create index if not exists idx_deals_company_id on public.deals(company_id);
create index if not exists idx_deals_stage on public.deals(stage);
create index if not exists idx_deals_priority on public.deals(priority);
create index if not exists idx_deals_score on public.deals(deal_score desc nulls last);

drop trigger if exists deals_updated_at on public.deals;
create trigger deals_updated_at
  before update on public.deals
  for each row execute function public.update_updated_at();

-- Auto-update stage_entered_at when stage changes
create or replace function public.handle_deal_stage_change()
returns trigger as $$
begin
  if old.stage is distinct from new.stage then
    new.stage_entered_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists deals_stage_change on public.deals;
create trigger deals_stage_change
  before update on public.deals
  for each row execute function public.handle_deal_stage_change();
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  title text not null,
  description text,
  meeting_type text not null default 'intro' check (meeting_type in (
    'intro', 'deep_dive', 'diligence', 'negotiation', 'closing', 'other'
  )),
  location text,
  meeting_url text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30,
  status text not null default 'scheduled' check (status in (
    'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  )),
  ai_prep jsonb default '{}',
  ai_notes text,
  ai_follow_up text,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meetings_user_id on public.meetings(user_id);
create index if not exists idx_meetings_contact_id on public.meetings(contact_id);
create index if not exists idx_meetings_deal_id on public.meetings(deal_id);
create index if not exists idx_meetings_scheduled on public.meetings(scheduled_at);
create index if not exists idx_meetings_status on public.meetings(status);

drop trigger if exists meetings_updated_at on public.meetings;
create trigger meetings_updated_at
  before update on public.meetings
  for each row execute function public.update_updated_at();
create table if not exists public.advisory_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  analysis_type text not null check (analysis_type in (
    'financing', 'valuation', 'diligence', 'integration', 'scaling', 'exit'
  )),
  title text not null,
  input_data jsonb not null default '{}',
  output_data jsonb,
  ai_model_used text,
  ai_prompt_version text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_advisory_user_id on public.advisory_analyses(user_id);
create index if not exists idx_advisory_deal_id on public.advisory_analyses(deal_id);
create index if not exists idx_advisory_type on public.advisory_analyses(analysis_type);

drop trigger if exists advisory_updated_at on public.advisory_analyses;
create trigger advisory_updated_at
  before update on public.advisory_analyses
  for each row execute function public.update_updated_at();

-- Due diligence items
create table if not exists public.diligence_items (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  category text not null check (category in (
    'financial', 'legal', 'operational', 'market', 'team', 'technology', 'environmental'
  )),
  item text not null,
  status text not null default 'not_started' check (status in (
    'not_started', 'in_progress', 'completed', 'flagged', 'na'
  )),
  notes text,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  ai_findings text,
  document_urls text[] default '{}',
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_diligence_deal_id on public.diligence_items(deal_id);
create index if not exists idx_diligence_status on public.diligence_items(status);
create index if not exists idx_diligence_category on public.diligence_items(category);

drop trigger if exists diligence_updated_at on public.diligence_items;
create trigger diligence_updated_at
  before update on public.diligence_items
  for each row execute function public.update_updated_at();
create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_date date not null,
  metrics jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, snapshot_date)
);

create index if not exists idx_analytics_user_date on public.analytics_snapshots(user_id, snapshot_date desc);
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  context_type text not null default 'global' check (context_type in (
    'global', 'deal', 'company', 'contact', 'advisory'
  )),
  context_id uuid,
  messages jsonb[] default '{}',
  model_used text not null default 'claude-sonnet-4-5-20250929',
  total_tokens integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_conv_user_id on public.ai_conversations(user_id);
create index if not exists idx_ai_conv_context on public.ai_conversations(context_type, context_id);

drop trigger if exists ai_conversations_updated_at on public.ai_conversations;
create trigger ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.update_updated_at();
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid references public.contacts(id),
  entity_type text not null check (entity_type in ('company', 'contact', 'deal', 'campaign', 'meeting')),
  entity_id uuid not null,
  activity_type text not null check (activity_type in (
    'email_sent', 'call_made', 'sms_sent', 'linkedin_sent',
    'meeting_booked', 'meeting_scheduled', 'meeting_auto_booked',
    'note_added', 'stage_changed', 'deal_created', 'analysis_run'
  )),
  title text,
  description text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_user_id on public.activities(user_id);
create index if not exists idx_activities_contact_id on public.activities(contact_id);
create index if not exists idx_activities_entity on public.activities(entity_type, entity_id);
create index if not exists idx_activities_type on public.activities(activity_type);
create index if not exists idx_activities_created on public.activities(created_at desc);
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  direction text not null check (direction in ('outbound', 'inbound')),
  status text not null default 'scheduled' check (status in (
    'scheduled', 'in_progress', 'completed', 'no_answer', 'voicemail'
  )),
  duration_seconds integer,
  recording_url text,
  transcript text,
  ai_summary text,
  ai_next_steps text,
  script_used text,
  outcome text check (outcome is null or outcome in (
    'interested', 'callback', 'not_interested', 'wrong_number', 'other'
  )),
  twilio_sid text,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_calls_user_id on public.calls(user_id);
create index if not exists idx_calls_contact_id on public.calls(contact_id);
create index if not exists idx_calls_deal_id on public.calls(deal_id);
create index if not exists idx_calls_status on public.calls(status);
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.outreach_campaigns enable row level security;
alter table public.outreach_sequences enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_replies enable row level security;
alter table public.calls enable row level security;
alter table public.meetings enable row level security;
alter table public.advisory_analyses enable row level security;
alter table public.diligence_items enable row level security;
alter table public.activities enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.analytics_snapshots enable row level security;

-- Profiles: users can read/update their own profile
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Companies: users can CRUD their own companies
drop policy if exists "Users can view own companies" on public.companies;
create policy "Users can view own companies" on public.companies
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own companies" on public.companies;
create policy "Users can insert own companies" on public.companies
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own companies" on public.companies;
create policy "Users can update own companies" on public.companies
  for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own companies" on public.companies;
create policy "Users can delete own companies" on public.companies
  for delete using (auth.uid() = user_id);

-- Contacts: users can CRUD their own contacts
drop policy if exists "Users can view own contacts" on public.contacts;
create policy "Users can view own contacts" on public.contacts
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own contacts" on public.contacts;
create policy "Users can insert own contacts" on public.contacts
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own contacts" on public.contacts;
create policy "Users can update own contacts" on public.contacts
  for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own contacts" on public.contacts;
create policy "Users can delete own contacts" on public.contacts
  for delete using (auth.uid() = user_id);

-- Deals: users can CRUD their own deals
drop policy if exists "Users can view own deals" on public.deals;
create policy "Users can view own deals" on public.deals
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own deals" on public.deals;
create policy "Users can insert own deals" on public.deals
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own deals" on public.deals;
create policy "Users can update own deals" on public.deals
  for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own deals" on public.deals;
create policy "Users can delete own deals" on public.deals
  for delete using (auth.uid() = user_id);

-- Outreach campaigns
drop policy if exists "Users can view own campaigns" on public.outreach_campaigns;
create policy "Users can view own campaigns" on public.outreach_campaigns
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own campaigns" on public.outreach_campaigns;
create policy "Users can insert own campaigns" on public.outreach_campaigns
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own campaigns" on public.outreach_campaigns;
create policy "Users can update own campaigns" on public.outreach_campaigns
  for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own campaigns" on public.outreach_campaigns;
create policy "Users can delete own campaigns" on public.outreach_campaigns
  for delete using (auth.uid() = user_id);

-- Outreach sequences: via campaign ownership
drop policy if exists "Users can view own sequences" on public.outreach_sequences;
create policy "Users can view own sequences" on public.outreach_sequences
  for select using (
    exists (select 1 from public.outreach_campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );
drop policy if exists "Users can insert own sequences" on public.outreach_sequences;
create policy "Users can insert own sequences" on public.outreach_sequences
  for insert with check (
    exists (select 1 from public.outreach_campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );
drop policy if exists "Users can update own sequences" on public.outreach_sequences;
create policy "Users can update own sequences" on public.outreach_sequences
  for update using (
    exists (select 1 from public.outreach_campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );
drop policy if exists "Users can delete own sequences" on public.outreach_sequences;
create policy "Users can delete own sequences" on public.outreach_sequences
  for delete using (
    exists (select 1 from public.outreach_campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );

-- Outreach messages: via user_id
drop policy if exists "Users can view own messages" on public.outreach_messages;
create policy "Users can view own messages" on public.outreach_messages
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own messages" on public.outreach_messages;
create policy "Users can insert own messages" on public.outreach_messages
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own messages" on public.outreach_messages;
create policy "Users can update own messages" on public.outreach_messages
  for update using (auth.uid() = user_id);

-- Outreach replies
drop policy if exists "Users can view own replies" on public.outreach_replies;
create policy "Users can view own replies" on public.outreach_replies
  for select using (
    exists (select 1 from public.contacts ct where ct.id = contact_id and ct.user_id = auth.uid())
  );
drop policy if exists "Users can insert own replies" on public.outreach_replies;
create policy "Users can insert own replies" on public.outreach_replies
  for insert with check (
    exists (select 1 from public.contacts ct where ct.id = contact_id and ct.user_id = auth.uid())
  );

-- Calls
drop policy if exists "Users can view own calls" on public.calls;
create policy "Users can view own calls" on public.calls
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own calls" on public.calls;
create policy "Users can insert own calls" on public.calls
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own calls" on public.calls;
create policy "Users can update own calls" on public.calls
  for update using (auth.uid() = user_id);

-- Meetings
drop policy if exists "Users can view own meetings" on public.meetings;
create policy "Users can view own meetings" on public.meetings
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own meetings" on public.meetings;
create policy "Users can insert own meetings" on public.meetings
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own meetings" on public.meetings;
create policy "Users can update own meetings" on public.meetings
  for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own meetings" on public.meetings;
create policy "Users can delete own meetings" on public.meetings
  for delete using (auth.uid() = user_id);

-- Advisory analyses
drop policy if exists "Users can view own analyses" on public.advisory_analyses;
create policy "Users can view own analyses" on public.advisory_analyses
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own analyses" on public.advisory_analyses;
create policy "Users can insert own analyses" on public.advisory_analyses
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own analyses" on public.advisory_analyses;
create policy "Users can update own analyses" on public.advisory_analyses
  for update using (auth.uid() = user_id);

-- Diligence items: via deal ownership
drop policy if exists "Users can view own diligence" on public.diligence_items;
create policy "Users can view own diligence" on public.diligence_items
  for select using (
    exists (select 1 from public.deals d where d.id = deal_id and d.user_id = auth.uid())
  );
drop policy if exists "Users can insert own diligence" on public.diligence_items;
create policy "Users can insert own diligence" on public.diligence_items
  for insert with check (
    exists (select 1 from public.deals d where d.id = deal_id and d.user_id = auth.uid())
  );
drop policy if exists "Users can update own diligence" on public.diligence_items;
create policy "Users can update own diligence" on public.diligence_items
  for update using (
    exists (select 1 from public.deals d where d.id = deal_id and d.user_id = auth.uid())
  );
drop policy if exists "Users can delete own diligence" on public.diligence_items;
create policy "Users can delete own diligence" on public.diligence_items
  for delete using (
    exists (select 1 from public.deals d where d.id = deal_id and d.user_id = auth.uid())
  );

-- Activities
drop policy if exists "Users can view own activities" on public.activities;
create policy "Users can view own activities" on public.activities
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own activities" on public.activities;
create policy "Users can insert own activities" on public.activities
  for insert with check (auth.uid() = user_id);

-- AI conversations
drop policy if exists "Users can view own ai conversations" on public.ai_conversations;
create policy "Users can view own ai conversations" on public.ai_conversations
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own ai conversations" on public.ai_conversations;
create policy "Users can insert own ai conversations" on public.ai_conversations
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own ai conversations" on public.ai_conversations;
create policy "Users can update own ai conversations" on public.ai_conversations
  for update using (auth.uid() = user_id);

-- Analytics snapshots
drop policy if exists "Users can view own analytics" on public.analytics_snapshots;
create policy "Users can view own analytics" on public.analytics_snapshots
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own analytics" on public.analytics_snapshots;
create policy "Users can insert own analytics" on public.analytics_snapshots
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own analytics" on public.analytics_snapshots;
create policy "Users can update own analytics" on public.analytics_snapshots
  for update using (auth.uid() = user_id);


-- ======================================================================
-- Scanner (was 00013)
-- ======================================================================

-- Scanner tables for business discovery

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  criteria jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  results_count integer not null default 0,
  imported_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scans_user_id on public.scans(user_id);
create index if not exists idx_scans_status on public.scans(status);
create index if not exists idx_scans_created_at on public.scans(created_at desc);

create table if not exists public.scan_results (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  business_name text not null,
  business_data jsonb not null default '{}',
  contact_data jsonb default '{}',
  enrichment_data jsonb default '{}',
  icp_score real check (icp_score >= 0 and icp_score <= 100),
  ai_summary text,
  imported boolean not null default false,
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_scan_results_scan_id on public.scan_results(scan_id);
create index if not exists idx_scan_results_imported on public.scan_results(imported);
create index if not exists idx_scan_results_icp_score on public.scan_results(icp_score desc nulls last);

-- RLS policies
alter table public.scans enable row level security;

drop policy if exists "Users can view own scans" on public.scans;
create policy "Users can view own scans" on public.scans
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own scans" on public.scans;
create policy "Users can insert own scans" on public.scans
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own scans" on public.scans;
create policy "Users can update own scans" on public.scans
  for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own scans" on public.scans;
create policy "Users can delete own scans" on public.scans
  for delete using (auth.uid() = user_id);

alter table public.scan_results enable row level security;

drop policy if exists "Users can view own scan results" on public.scan_results;
create policy "Users can view own scan results" on public.scan_results
  for select using (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );
drop policy if exists "Users can insert own scan results" on public.scan_results;
create policy "Users can insert own scan results" on public.scan_results
  for insert with check (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );
drop policy if exists "Users can update own scan results" on public.scan_results;
create policy "Users can update own scan results" on public.scan_results
  for update using (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );
drop policy if exists "Users can delete own scan results" on public.scan_results;
create policy "Users can delete own scan results" on public.scan_results
  for delete using (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );

-- ======================================================================
-- Google Calendar (was 00014)
-- ======================================================================

-- Add Google Calendar tokens to profiles
alter table public.profiles
  add column if not exists google_calendar_tokens jsonb default null;

-- Add Google Calendar event ID to meetings
alter table public.meetings
  add column if not exists google_event_id text;

create index if not exists idx_meetings_google_event_id
  on public.meetings(google_event_id)
  where google_event_id is not null;

-- ======================================================================
-- Billing (was 00015)
-- ======================================================================

-- Subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);

-- Usage tracking table
create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  ai_credits_used integer not null default 0,
  scans_used integer not null default 0,
  outreach_messages_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, period_start)
);

create index if not exists idx_usage_user_period on public.usage(user_id, period_start);

-- RLS
alter table public.subscriptions enable row level security;
drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription" on public.subscriptions for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own subscription" on public.subscriptions;
create policy "Users can insert own subscription" on public.subscriptions for insert with check (auth.uid() = user_id);

alter table public.usage enable row level security;
drop policy if exists "Users can view own usage" on public.usage;
create policy "Users can view own usage" on public.usage for select using (auth.uid() = user_id);

-- Auto-create free subscription on signup
create or replace function public.handle_new_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_subscription on public.profiles;
create trigger on_profile_created_subscription
  after insert on public.profiles
  for each row execute function public.handle_new_subscription();

-- ======================================================================
-- Enrollment (was 00016)
-- ======================================================================

-- Autonomous enrollment: suppression, send governor, and auto-enroll rules.

-- ── Suppression ──────────────────────────────────────────────────────────
-- A contact is suppressed the moment unsubscribed_at is set. Nothing may be
-- sent to a suppressed contact on any channel, in any campaign.

alter table public.contacts
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists suppression_reason text,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

-- Backfill tokens for rows that predate this column, then enforce uniqueness.
update public.contacts set unsubscribe_token = gen_random_uuid()
  where unsubscribe_token is null;

create unique index if not exists idx_contacts_unsubscribe_token
  on public.contacts(unsubscribe_token);

create index if not exists idx_contacts_unsubscribed_at
  on public.contacts(unsubscribed_at) where unsubscribed_at is not null;

-- ── Send governor ────────────────────────────────────────────────────────
-- The cap lives on the profile, not the campaign: sending reputation belongs
-- to the domain, so every campaign a user runs draws from one daily budget.

alter table public.profiles
  add column if not exists daily_send_cap integer not null default 50,
  add column if not exists warmup_started_at timestamptz;

-- ── Auto-enrollment ──────────────────────────────────────────────────────
-- When auto_enroll is on, the sequence runner pulls qualifying contacts into
-- the campaign and fires step 1 without anyone clicking send.

alter table public.outreach_campaigns
  add column if not exists auto_enroll boolean not null default false,
  add column if not exists auto_enroll_min_score real not null default 70,
  add column if not exists auto_enroll_role_types text[] not null default '{owner}';

create index if not exists idx_campaigns_auto_enroll
  on public.outreach_campaigns(auto_enroll) where auto_enroll = true;

-- Counting the day's sends drives the governor, so this index carries the
-- hot path in every cron run.
create index if not exists idx_outreach_messages_user_sent_at
  on public.outreach_messages(user_id, sent_at desc);

-- Enrollment checks whether a contact is already in a campaign before
-- creating step 1.
create index if not exists idx_outreach_messages_campaign_contact
  on public.outreach_messages(campaign_id, contact_id);

-- ======================================================================
-- outreach_messages fix (was 00017)
-- ======================================================================

-- Reconcile outreach_messages with the schema the application expects.
--
-- The live database was built from 00004_create_outreach.sql, which predates
-- three columns that full-migration.sql and the TypeScript types both declare.
-- Every send path writes all three, so without this the first outbound message
-- fails on a missing column.
--
-- Nullable on purpose: full-migration.sql declares them nullable, and there is
-- no sensible backfill value for historical rows.

alter table public.outreach_messages
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists to_address text,
  add column if not exists provider_message_id text;

-- The send governor counts a user's messages for the current day, and the
-- webhook resolves a message by its provider id on delivery and bounce events.
create index if not exists idx_outreach_messages_user_id
  on public.outreach_messages(user_id);

create index if not exists idx_outreach_messages_provider_id
  on public.outreach_messages(provider_message_id)
  where provider_message_id is not null;

-- ======================================================================
-- activities fix (was 00018)
-- ======================================================================

-- Reconcile activities with the schema the application expects.
--
-- Same class of drift as 00017, in the opposite direction: full-migration.sql
-- declares contact_id and title, the live table never had them. Five code
-- paths write both (calendar/book, calendar/auto-book, the auto-book webhook,
-- and the manual email send), so every activity insert fails on a missing
-- column until this runs.

alter table public.activities
  add column if not exists contact_id uuid references public.contacts(id),
  add column if not exists title text;

create index if not exists idx_activities_contact_id
  on public.activities(contact_id) where contact_id is not null;
