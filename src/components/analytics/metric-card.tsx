"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Kanban,
  Building2,
  Users,
  Mail,
  Phone,
  Target,
  Calendar,
  Bot,
  Sparkles,
  BarChart3,
  Activity,
  Send,
  MessageSquare,
  Briefcase,
  FileText,
  Shield,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  DollarSign,
  Kanban,
  Building2,
  Users,
  Mail,
  Phone,
  Target,
  Calendar,
  Bot,
  Sparkles,
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  Send,
  MessageSquare,
  Briefcase,
  FileText,
  Shield,
};

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  iconColor?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconColor = "text-primary",
}: MetricCardProps) {
  const Icon = iconMap[icon] || DollarSign;
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {isPositive && (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                )}
                {isNegative && (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    isPositive && "text-emerald-500",
                    isNegative && "text-red-500",
                    !isPositive && !isNegative && "text-muted-foreground"
                  )}
                >
                  {isPositive && "+"}
                  {change}%
                </span>
                {changeLabel && (
                  <span className="text-xs text-muted-foreground">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg bg-muted",
              iconColor
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
