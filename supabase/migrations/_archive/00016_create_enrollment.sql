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
