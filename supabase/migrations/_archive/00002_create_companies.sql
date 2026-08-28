create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  industry text,
  sub_industry text,
  revenue_range text,
  ebitda_range text,
  employee_count integer,
  location_city text,
  location_state text,
  website text,
  description text,
  source text not null default 'manual' check (source in ('manual', 'import', 'scraped')),
  source_url text,
  enrichment_data jsonb default '{}',
  icp_score real check (icp_score >= 0 and icp_score <= 100),
  ai_summary text,
  tags text[] default '{}',
  status text not null default 'new' check (status in ('new', 'researching', 'qualified', 'contacted', 'disqualified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_companies_user_id on public.companies(user_id);
create index idx_companies_status on public.companies(status);
create index idx_companies_icp_score on public.companies(icp_score desc nulls last);
create index idx_companies_industry on public.companies(industry);

create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.update_updated_at();
