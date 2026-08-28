create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_date date not null,
  metrics jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, snapshot_date)
);

create index idx_analytics_user_date on public.analytics_snapshots(user_id, snapshot_date desc);
