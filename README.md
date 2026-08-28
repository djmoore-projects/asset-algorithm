# The Asset Algorithm

AI-powered deal origination, outreach automation, and advisory platform for small business acquisitions.

Built for self-funded searchers, independent sponsors, and search fund operators who need institutional-grade deal flow tooling without the $4K–8K/month service contracts.

## What This Does

**Scanner** — Discovers acquisition targets through Apollo, filtered by industry, location and company size, then enriches with Hunter.io and website scraping. Every lead is scored against your ICP by Claude, weighted toward succession signals: business age is the strongest available proxy for owner retirement, which drives most small-business sales.

**Multi-Channel Outreach** — Generates and executes personalized email (Resend), SMS, voice (Twilio), and LinkedIn sequences. AI writes each touchpoint with deal-specific context — not templates.

**Outreach Safety** — Global suppression across every channel, a one-click unsubscribe page satisfying CAN-SPAM, and a per-domain daily send governor that ramps new senders from 10/day rather than opening at full volume. Hard bounces suppress the contact automatically.

**Autopilot** — Contacts clearing your ICP threshold are enrolled into a campaign and sent step 1 by a daily cron, with every message AI-written against that specific business. Suppression and the send budget both apply.

**Pipeline & CRM** — Kanban deal tracker with stage-gated workflows, relationship management, meeting prep with Google Calendar integration, and full activity history.

**Advisory Modules** — On-demand AI analysis for valuation, financing, due diligence, post-acquisition integration, scaling strategy, and exit planning. Each module is domain-tuned for SMB buyouts.

**Billing & Usage** — Stripe-integrated three-tier subscription system (Free / Pro / Enterprise) with per-feature usage metering and plan-gated access controls.

**Analytics** — PostHog product analytics with server-side event tracking, usage dashboards, and growth metrics.

## Architecture

```
src/
├── actions/           # Server Actions (companies, deals, outreach, advisory)
├── app/
│   ├── (auth)/        # Login, signup, password reset, OAuth callback
│   ├── (dashboard)/   # 30+ dashboard routes (scanner, pipeline, outreach, advisory, settings)
│   ├── (legal)/       # Terms of Service, Privacy Policy
│   ├── api/           # 20+ API routes (AI, billing, calendar, outreach, scanner, webhooks)
│   └── pricing/       # Public pricing page
├── components/        # 60+ components across 12 domains
│   ├── advisory/      # Diligence, financing, integration, scaling, valuation
│   ├── ai/            # Co-pilot chat interface
│   ├── outreach/      # Campaign builder, sequence editor, call interface
│   ├── pipeline/      # Deal board, stage management
│   ├── sourcing/      # Company cards, import, ICP configuration
│   └── ui/            # shadcn/ui primitives
├── lib/
│   ├── ai/            # Anthropic SDK integration, prompt management
│   ├── billing/       # Stripe checkout, webhooks, usage metering, plan limits
│   ├── integrations/  # Google Calendar, Resend, Twilio clients
│   ├── scanner/       # Apollo discovery, contact enrichment pipeline
│   ├── supabase/      # Typed client, admin client, middleware helpers
│   └── utils/         # Rate limiting, validation, formatters
├── stores/            # Zustand state management
└── types/             # Database types (18 tables), domain enums
supabase/
└── migrations/        # 15 versioned migrations with RLS policies
```

## Schema Discipline

`supabase/full-migration.sql` is the single source of truth, and it is idempotent, so it replays safely from any state. A CI check (`npm run check:schema`) diffs every `insert`, `update` and `upsert` in the codebase against that schema and fails the build on a mismatch.

That check exists because the same bug shipped three times: code writing a column the table did not have, the row silently rejected, and the feature failing somewhere that looked unrelated. The scanner returning zero results turned out to be every result insert being rejected over one stray column.

## Technical Decisions

**Next.js 16 App Router + React 19** — Server Components for data fetching, Server Actions for mutations, Route Handlers for external API integration. No client-side data fetching libraries needed for most flows.

**Supabase (Postgres + Auth + RLS)** — Row Level Security on all 18 tables. Auth handles email/password with confirmation flow, password reset, and session management via SSR cookies. Service role client isolated to webhooks and cron jobs.

**Typed end-to-end** — Central `Database` type generates Row/Insert/Update types for every table. Supabase join queries return `{}` on complex relations — handled with explicit interface definitions and controlled type assertions rather than `any`.

**AI prompt architecture** — Prompts load from environment configuration at runtime. Each module (scanner, outreach, advisory, scoring) has domain-specific prompts tuned for SMB acquisition workflows. This keeps prompt IP separate from application code.

**Stripe billing** — Webhook-driven subscription lifecycle (checkout → active → updated → canceled → payment failed). Usage tracked per billing period with automatic free-tier provisioning on signup.

**Multi-channel outreach engine** — Sequences define ordered steps across email/SMS/call/LinkedIn. A cron-based runner executes pending steps with per-channel rate limiting. Each message is AI-generated with full deal context, not template-filled.

**Rate limiting** — Token bucket algorithm with in-memory storage (designed for Upstash Redis upgrade in production).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6, React 19, TypeScript (strict) |
| Database | Supabase (Postgres), 18 tables, 15 migrations, full RLS |
| Auth | Supabase Auth (email/password, email confirmation, password reset) |
| AI | Anthropic Claude SDK |
| Payments | Stripe (Checkout, Billing Portal, Webhooks) |
| Email | Resend |
| Voice/SMS | Twilio |
| Data Enrichment | Apollo.io, Hunter.io, website scraping |
| Calendar | Google Calendar API (OAuth) |
| Analytics | PostHog (client + server) |
| UI | shadcn/ui, Radix, Tailwind CSS, Recharts |
| State | Zustand (client), React Query (server) |
| Validation | Zod |
| Drag & Drop | dnd-kit |

## Scale

- **165 TypeScript files**, ~18,800 lines
- **62 routes** (36 pages + 26 API endpoints)
- **18 database tables** with row-level security
- **15 versioned SQL migrations**
- **9 AI prompt modules** across scanner, outreach, advisory, and scoring domains
- **4 outreach channels** with sequence automation
- **6 advisory modules** with domain-specific analysis
- **3 subscription tiers** with usage metering

## Setup

```bash
# Install
npm install

# Configure environment
cp .env.example .env.local
# Fill in: Supabase, Anthropic, Stripe, Resend, Twilio, Google, PostHog keys

# Run migrations
npx supabase db push

# Start dev server
npm run dev
```

## Environment Variables

See `.env.example` for the full list. Required services:

- **Supabase** — Database, auth, realtime
- **Anthropic** — AI analysis and generation
- **Stripe** — Billing and subscription management

Optional (feature-gated):
- **Apollo** — Scanner discovery and contact enrichment
- **Hunter.io / Apollo** — Contact enrichment
- **Resend** — Email outreach
- **Twilio** — SMS and voice outreach
- **Google Calendar** — Meeting scheduling
- **PostHog** — Product analytics

## License

Proprietary. AI prompt engineering and domain-specific workflows are trade secrets loaded from environment configuration.
