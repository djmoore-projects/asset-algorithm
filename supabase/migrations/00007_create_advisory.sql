create table public.advisory_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  analysis_type text not null check (analysis_type in (
    'financing', 'valuation', 'diligence', 'integration', 'scaling', 'exit'
  )),
  title text not null,
  input_data jsonb not null default '{}',
  output_data jsonb,
  ai_model_used text,
  ai_prompt_version text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_advisory_user_id on public.advisory_analyses(user_id);
create index idx_advisory_deal_id on public.advisory_analyses(deal_id);
create index idx_advisory_type on public.advisory_analyses(analysis_type);

create trigger advisory_updated_at
  before update on public.advisory_analyses
  for each row execute function public.update_updated_at();

-- Due diligence items
create table public.diligence_items (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  category text not null check (category in (
    'financial', 'legal', 'operational', 'market', 'team', 'technology', 'environmental'
  )),
  item text not null,
  status text not null default 'not_started' check (status in (
    'not_started', 'in_progress', 'completed', 'flagged', 'na'
  )),
  notes text,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  ai_findings text,
  document_urls text[] default '{}',
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_diligence_deal_id on public.diligence_items(deal_id);
create index idx_diligence_status on public.diligence_items(status);
create index idx_diligence_category on public.diligence_items(category);

create trigger diligence_updated_at
  before update on public.diligence_items
  for each row execute function public.update_updated_at();
