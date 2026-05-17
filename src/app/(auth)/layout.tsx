import { Zap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-muted p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">The Asset Algorithm</span>
        </Link>
        <div>
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Control distribution. Control the deal.&rdquo;
            </p>
            <footer className="text-sm text-muted-foreground">
              AI-Native Deal Origination Platform
            </footer>
          </blockquote>
        </div>
        <div className="text-xs text-muted-foreground">
          Autonomous deal sourcing, outreach, and advisory.
        </div>
      </div>
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
