import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  ClipboardCheck,
  Layers,
  Rocket,
  LogOut,
  ArrowRight,
  Brain,
} from "lucide-react";
import Link from "next/link";

const MODULES = [
  {
    href: "/advisory/financing",
    icon: DollarSign,
    title: "Financing Analyzer",
    description: "SBA 7(a), seller financing, equity structures, and capital stack modeling",
    color: "text-green-500",
  },
  {
    href: "/advisory/valuation",
    icon: TrendingUp,
    title: "Valuation Models",
    description: "DCF, comparable analysis, asset-based, and earnings multiples",
    color: "text-blue-500",
  },
  {
    href: "/advisory/diligence",
    icon: ClipboardCheck,
    title: "Due Diligence",
    description: "Comprehensive diligence tracker with AI-powered risk analysis",
    color: "text-yellow-500",
  },
  {
    href: "/advisory/integration",
    icon: Layers,
    title: "Integration Planning",
    description: "Day 1-100 playbook, systems integration, and team transition",
    color: "text-purple-500",
  },
  {
    href: "/advisory/scaling",
    icon: Rocket,
    title: "Scaling Playbooks",
    description: "Revenue growth, operational efficiency, and KPI frameworks",
    color: "text-orange-500",
  },
  {
    href: "/advisory/exit",
    icon: LogOut,
    title: "Exit Strategy",
    description: "Exit timing, buyer universe, and value maximization planning",
    color: "text-red-500",
  },
];

export default function AdvisoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advisory Hub</h1>
        <p className="text-sm text-muted-foreground">
          AI-powered guidance across the full acquisition lifecycle
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-4 p-6">
          <Brain className="h-8 w-8 shrink-0 text-primary" />
          <div>
            <p className="font-medium">AI Advisory Engine</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a deal from your pipeline, then use any advisory module below. The
              AI will analyze your deal data and provide personalized guidance on
              financing, valuation, diligence, and more.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href}>
              <Card className="group cursor-pointer border-border/50 transition-all hover:border-border hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className={`h-5 w-5 ${mod.color}`} />
                    {mod.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{mod.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open Module <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
