create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  first_name text not null,
  last_name text not null,
  title text,
  email text,
  phone text,
  linkedin_url text,
  role_type text not null default 'other' check (role_type in ('owner', 'cfo', 'broker', 'intermediary', 'other')),
  relationship_score real check (relationship_score >= 0 and relationship_score <= 100),
  ai_notes text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contacts_user_id on public.contacts(user_id);
create index idx_contacts_company_id on public.contacts(company_id);
create index idx_contacts_email on public.contacts(email);
create index idx_contacts_relationship_score on public.contacts(relationship_score desc nulls last);

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function public.update_updated_at();
