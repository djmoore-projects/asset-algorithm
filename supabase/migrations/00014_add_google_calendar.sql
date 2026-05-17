-- Add Google Calendar tokens to profiles
alter table public.profiles
  add column if not exists google_calendar_tokens jsonb default null;

-- Add Google Calendar event ID to meetings
alter table public.meetings
  add column if not exists google_event_id text;

create index if not exists idx_meetings_google_event_id
  on public.meetings(google_event_id)
  where google_event_id is not null;
