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
