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
  sequence_id uuid references public.outreach_sequences(id) on delete set null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  campaign_id uuid references public.outreach_campaigns(id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'linkedin', 'call')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  subject text,
  body text not null,
  ai_personalization jsonb default '{}',
  external_id text,
  created_at timestamptz not null default now()
);

create index idx_messages_contact_id on public.outreach_messages(contact_id);
create index idx_messages_campaign_id on public.outreach_messages(campaign_id);
create index idx_messages_status on public.outreach_messages(status);
create index idx_messages_scheduled on public.outreach_messages(scheduled_at) where status = 'pending';

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
