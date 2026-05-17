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
