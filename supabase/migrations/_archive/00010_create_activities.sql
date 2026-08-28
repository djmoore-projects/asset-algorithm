create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('company', 'contact', 'deal', 'campaign', 'meeting')),
  entity_id uuid not null,
  activity_type text not null check (activity_type in (
    'email_sent', 'call_made', 'sms_sent', 'linkedin_sent',
    'meeting_booked', 'note_added', 'stage_changed', 'deal_created', 'analysis_run'
  )),
  description text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_activities_user_id on public.activities(user_id);
create index idx_activities_entity on public.activities(entity_type, entity_id);
create index idx_activities_type on public.activities(activity_type);
create index idx_activities_created on public.activities(created_at desc);
