create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  context_type text not null default 'global' check (context_type in (
    'global', 'deal', 'company', 'contact', 'advisory'
  )),
  context_id uuid,
  messages jsonb[] default '{}',
  model_used text not null default 'claude-sonnet-4-5-20250929',
  total_tokens integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conv_user_id on public.ai_conversations(user_id);
create index idx_ai_conv_context on public.ai_conversations(context_type, context_id);

create trigger ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.update_updated_at();
