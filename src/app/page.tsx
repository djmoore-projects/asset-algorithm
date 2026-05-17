import Link from "next/link";
import { ArrowRight, Bot, Target, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/40 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              The Asset Algorithm
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">
                Get Started <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            AI-Native Deal Intelligence
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Your Autonomous
            <br />
            <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">
              Deal Machine
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Source, outreach, negotiate, and close business acquisitions with AI
            integrated at every step. From cold outreach to exit strategy —
            fully autonomous.
          </p>
          <Link href="/signup">
            <Button size="lg" className="h-12 px-8 text-base">
              Start Building Your Pipeline
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-24 grid max-w-5xl gap-6 pb-20 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="mb-2 font-semibold">Deal Origination</h3>
            <p className="text-sm text-muted-foreground">
              Multi-channel outreach across email, phone, LinkedIn, and SMS.
              AI-personalized at scale.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Bot className="h-5 w-5 text-violet-500" />
            </div>
            <h3 className="mb-2 font-semibold">AI Advisory</h3>
            <p className="text-sm text-muted-foreground">
              Financing analysis, valuation models, due diligence automation,
              and exit strategy — all AI-powered.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <h3 className="mb-2 font-semibold">Pipeline Control</h3>
            <p className="text-sm text-muted-foreground">
              Real-time Kanban pipeline with AI scoring, automated follow-ups,
              and predictive analytics.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          The Asset Algorithm — Control Your Distribution
        </div>
      </footer>
    </div>
  );
}
