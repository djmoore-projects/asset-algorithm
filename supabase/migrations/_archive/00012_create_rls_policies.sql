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

-- Outreach messages: via contact ownership
create policy "Users can view own messages" on public.outreach_messages
  for select using (
    exists (select 1 from public.contacts ct where ct.id = contact_id and ct.user_id = auth.uid())
  );
create policy "Users can insert own messages" on public.outreach_messages
  for insert with check (
    exists (select 1 from public.contacts ct where ct.id = contact_id and ct.user_id = auth.uid())
  );
create policy "Users can update own messages" on public.outreach_messages
  for update using (
    exists (select 1 from public.contacts ct where ct.id = contact_id and ct.user_id = auth.uid())
  );

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
