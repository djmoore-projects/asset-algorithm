-- Profiles table extends Supabase auth.users
create table public.profiles (
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

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();
create table public.companies (
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

create index idx_companies_user_id on public.companies(user_id);
create index idx_companies_status on public.companies(status);
create index idx_companies_icp_score on public.companies(icp_score desc nulls last);
create index idx_companies_industry on public.companies(industry);

create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.update_updated_at();
create table public.contacts (
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

create index idx_contacts_user_id on public.contacts(user_id);
create index idx_contacts_company_id on public.contacts(company_id);
create index idx_contacts_email on public.contacts(email);
create index idx_contacts_relationship_score on public.contacts(relationship_score desc nulls last);

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function public.update_updated_at();
-- Campaigns
create table public.outreach_campaigns (
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

create index idx_campaigns_user_id on public.outreach_campaigns(user_id);
create index idx_campaigns_status on public.outreach_campaigns(status);

create trigger campaigns_updated_at
  before update on public.outreach_campaigns
  for each row execute function public.update_updated_at();

-- Sequences (steps within a campaign)
create table public.outreach_sequences (
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

create index idx_sequences_campaign_id on public.outreach_sequences(campaign_id);

-- Individual messages
create table public.outreach_messages (
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

create index idx_messages_user_id on public.outreach_messages(user_id);
create index idx_messages_contact_id on public.outreach_messages(contact_id);
create index idx_messages_campaign_id on public.outreach_messages(campaign_id);
create index idx_messages_status on public.outreach_messages(status);
create index idx_messages_scheduled on public.outreach_messages(scheduled_at) where status = 'pending';
create index idx_messages_provider_id on public.outreach_messages(provider_message_id) where provider_message_id is not null;

-- Replies
create table public.outreach_replies (
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

create index idx_replies_message_id on public.outreach_replies(message_id);
create index idx_replies_contact_id on public.outreach_replies(contact_id);
create table public.deals (
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

create index idx_deals_user_id on public.deals(user_id);
create index idx_deals_company_id on public.deals(company_id);
create index idx_deals_stage on public.deals(stage);
create index idx_deals_priority on public.deals(priority);
create index idx_deals_score on public.deals(deal_score desc nulls last);

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

create trigger deals_stage_change
  before update on public.deals
  for each row execute function public.handle_deal_stage_change();
create table public.meetings (
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

create index idx_meetings_user_id on public.meetings(user_id);
create index idx_meetings_contact_id on public.meetings(contact_id);
create index idx_meetings_deal_id on public.meetings(deal_id);
create index idx_meetings_scheduled on public.meetings(scheduled_at);
create index idx_meetings_status on public.meetings(status);

create trigger meetings_updated_at
  before update on public.meetings
  for each row execute function public.update_updated_at();
create table public.advisory_analyses (
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

create index idx_advisory_user_id on public.advisory_analyses(user_id);
create index idx_advisory_deal_id on public.advisory_analyses(deal_id);
create index idx_advisory_type on public.advisory_analyses(analysis_type);

create trigger advisory_updated_at
  before update on public.advisory_analyses
  for each row execute function public.update_updated_at();

-- Due diligence items
create table public.diligence_items (
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

create index idx_diligence_deal_id on public.diligence_items(deal_id);
create index idx_diligence_status on public.diligence_items(status);
create index idx_diligence_category on public.diligence_items(category);

create trigger diligence_updated_at
  before update on public.diligence_items
  for each row execute function public.update_updated_at();
create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_date date not null,
  metrics jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, snapshot_date)
);

create index idx_analytics_user_date on public.analytics_snapshots(user_id, snapshot_date desc);
create table public.ai_conversations (
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

create index idx_ai_conv_user_id on public.ai_conversations(user_id);
create index idx_ai_conv_context on public.ai_conversations(context_type, context_id);

create trigger ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.update_updated_at();
create table public.activities (
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

create index idx_activities_user_id on public.activities(user_id);
create index idx_activities_contact_id on public.activities(contact_id);
create index idx_activities_entity on public.activities(entity_type, entity_id);
create index idx_activities_type on public.activities(activity_type);
create index idx_activities_created on public.activities(created_at desc);
create table public.calls (
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

create index idx_calls_user_id on public.calls(user_id);
create index idx_calls_contact_id on public.calls(contact_id);
create index idx_calls_deal_id on public.calls(deal_id);
create index idx_calls_status on public.calls(status);
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
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Companies: users can CRUD their own companies
create policy "Users can view own companies" on public.companies
  for select using (auth.uid() = user_id);
create policy "Users can insert own companies" on public.companies
  for insert with check (auth.uid() = user_id);
create policy "Users can update own companies" on public.companies
  for update using (auth.uid() = user_id);
create policy "Users can delete own companies" on public.companies
  for delete using (auth.uid() = user_id);

-- Contacts: users can CRUD their own contacts
create policy "Users can view own contacts" on public.contacts
  for select using (auth.uid() = user_id);
create policy "Users can insert own contacts" on public.contacts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own contacts" on public.contacts
  for update using (auth.uid() = user_id);
create policy "Users can delete own contacts" on public.contacts
  for delete using (auth.uid() = user_id);

-- Deals: users can CRUD their own deals
create policy "Users can view own deals" on public.deals
  for select using (auth.uid() = user_id);
create policy "Users can insert own deals" on public.deals
  for insert with check (auth.uid() = user_id);
create policy "Users can update own deals" on public.deals
  for update using (auth.uid() = user_id);
create policy "Users can delete own deals" on public.deals
  for delete using (auth.uid() = user_id);

-- Outreach campaigns
create policy "Users can view own campaigns" on public.outreach_campaigns
  for select using (auth.uid() = user_id);
create policy "Users can insert own campaigns" on public.outreach_campaigns
  for insert with check (auth.uid() = user_id);
create policy "Users can update own campaigns" on public.outreach_campaigns
  for update using (auth.uid() = user_id);
create policy "Users can delete own campaigns" on public.outreach_campaigns
  for delete using (auth.uid() = user_id);

-- Outreach sequences: via campaign ownership
create policy "Users can view own sequences" on public.outreach_sequences
  for select using (
    exists (select 1 from public.outreach_campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );
create policy "Users can insert own sequences" on public.outreach_sequences
  for insert with check (
    exists (select 1 from public.outreach_campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );
create policy "Users can update own sequences" on public.outreach_sequences
  for update using (
    exists (select 1 from public.outreach_campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );
create policy "Users can delete own sequences" on public.outreach_sequences
  for delete using (
    exists (select 1 from public.outreach_campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );

-- Outreach messages: via user_id
create policy "Users can view own messages" on public.outreach_messages
  for select using (auth.uid() = user_id);
create policy "Users can insert own messages" on public.outreach_messages
  for insert with check (auth.uid() = user_id);
create policy "Users can update own messages" on public.outreach_messages
  for update using (auth.uid() = user_id);

-- Outreach replies
create policy "Users can view own replies" on public.outreach_replies
  for select using (
    exists (select 1 from public.contacts ct where ct.id = contact_id and ct.user_id = auth.uid())
  );
create policy "Users can insert own replies" on public.outreach_replies
  for insert with check (
    exists (select 1 from public.contacts ct where ct.id = contact_id and ct.user_id = auth.uid())
  );

-- Calls
create policy "Users can view own calls" on public.calls
  for select using (auth.uid() = user_id);
create policy "Users can insert own calls" on public.calls
  for insert with check (auth.uid() = user_id);
create policy "Users can update own calls" on public.calls
  for update using (auth.uid() = user_id);

-- Meetings
create policy "Users can view own meetings" on public.meetings
  for select using (auth.uid() = user_id);
create policy "Users can insert own meetings" on public.meetings
  for insert with check (auth.uid() = user_id);
create policy "Users can update own meetings" on public.meetings
  for update using (auth.uid() = user_id);
create policy "Users can delete own meetings" on public.meetings
  for delete using (auth.uid() = user_id);

-- Advisory analyses
create policy "Users can view own analyses" on public.advisory_analyses
  for select using (auth.uid() = user_id);
create policy "Users can insert own analyses" on public.advisory_analyses
  for insert with check (auth.uid() = user_id);
create policy "Users can update own analyses" on public.advisory_analyses
  for update using (auth.uid() = user_id);

-- Diligence items: via deal ownership
create policy "Users can view own diligence" on public.diligence_items
  for select using (
    exists (select 1 from public.deals d where d.id = deal_id and d.user_id = auth.uid())
  );
create policy "Users can insert own diligence" on public.diligence_items
  for insert with check (
    exists (select 1 from public.deals d where d.id = deal_id and d.user_id = auth.uid())
  );
create policy "Users can update own diligence" on public.diligence_items
  for update using (
    exists (select 1 from public.deals d where d.id = deal_id and d.user_id = auth.uid())
  );
create policy "Users can delete own diligence" on public.diligence_items
  for delete using (
    exists (select 1 from public.deals d where d.id = deal_id and d.user_id = auth.uid())
  );

-- Activities
create policy "Users can view own activities" on public.activities
  for select using (auth.uid() = user_id);
create policy "Users can insert own activities" on public.activities
  for insert with check (auth.uid() = user_id);

-- AI conversations
create policy "Users can view own ai conversations" on public.ai_conversations
  for select using (auth.uid() = user_id);
create policy "Users can insert own ai conversations" on public.ai_conversations
  for insert with check (auth.uid() = user_id);
create policy "Users can update own ai conversations" on public.ai_conversations
  for update using (auth.uid() = user_id);

-- Analytics snapshots
create policy "Users can view own analytics" on public.analytics_snapshots
  for select using (auth.uid() = user_id);
create policy "Users can insert own analytics" on public.analytics_snapshots
  for insert with check (auth.uid() = user_id);
create policy "Users can update own analytics" on public.analytics_snapshots
  for update using (auth.uid() = user_id);
