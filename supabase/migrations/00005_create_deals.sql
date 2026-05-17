create table public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  primary_contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  stage text not null default 'lead' check (stage in (
    'lead', 'initial_contact', 'nda_signed', 'info_received',
    'loi_submitted', 'loi_accepted', 'diligence', 'closing', 'closed', 'dead'
  )),
  asking_price bigint,
  estimated_value bigint,
  revenue bigint,
  ebitda bigint,
  deal_score real check (deal_score >= 0 and deal_score <= 100),
  deal_thesis text,
  ai_analysis jsonb default '{}',
  notes text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  stage_entered_at timestamptz not null default now(),
  expected_close_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_deals_user_id on public.deals(user_id);
create index idx_deals_company_id on public.deals(company_id);
create index idx_deals_stage on public.deals(stage);
create index idx_deals_priority on public.deals(priority);
create index idx_deals_score on public.deals(deal_score desc nulls last);

create trigger deals_updated_at
  before update on public.deals
  for each row execute function public.update_updated_at();

-- Auto-update stage_entered_at when stage changes
create or replace function public.handle_deal_stage_change()
returns trigger as $$
begin
  if old.stage is distinct from new.stage then
    new.stage_entered_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger deals_stage_change
  before update on public.deals
  for each row execute function public.handle_deal_stage_change();
