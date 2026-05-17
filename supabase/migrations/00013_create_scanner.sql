-- Scanner tables for business discovery

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  criteria jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  results_count integer not null default 0,
  imported_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_scans_user_id on public.scans(user_id);
create index idx_scans_status on public.scans(status);
create index idx_scans_created_at on public.scans(created_at desc);

create table public.scan_results (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  business_name text not null,
  business_data jsonb not null default '{}',
  contact_data jsonb default '{}',
  enrichment_data jsonb default '{}',
  icp_score real check (icp_score >= 0 and icp_score <= 100),
  ai_summary text,
  imported boolean not null default false,
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_scan_results_scan_id on public.scan_results(scan_id);
create index idx_scan_results_imported on public.scan_results(imported);
create index idx_scan_results_icp_score on public.scan_results(icp_score desc nulls last);

-- RLS policies
alter table public.scans enable row level security;

create policy "Users can view own scans" on public.scans
  for select using (auth.uid() = user_id);
create policy "Users can insert own scans" on public.scans
  for insert with check (auth.uid() = user_id);
create policy "Users can update own scans" on public.scans
  for update using (auth.uid() = user_id);
create policy "Users can delete own scans" on public.scans
  for delete using (auth.uid() = user_id);

alter table public.scan_results enable row level security;

create policy "Users can view own scan results" on public.scan_results
  for select using (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );
create policy "Users can insert own scan results" on public.scan_results
  for insert with check (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );
create policy "Users can update own scan results" on public.scan_results
  for update using (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );
create policy "Users can delete own scan results" on public.scan_results
  for delete using (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );
