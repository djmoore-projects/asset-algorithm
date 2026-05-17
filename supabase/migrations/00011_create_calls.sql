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
