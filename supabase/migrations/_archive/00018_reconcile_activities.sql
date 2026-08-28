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
