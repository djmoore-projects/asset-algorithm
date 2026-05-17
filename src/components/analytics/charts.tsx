"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const COLORS = {
  blue: "#3b82f6",
  violet: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
};

const STAGE_COLORS: Record<string, string> = {
  sourced: COLORS.blue,
  contacted: COLORS.violet,
  negotiating: COLORS.amber,
  due_diligence: COLORS.emerald,
  loi: COLORS.rose,
  closed: "#6b7280",
  dead: "#374151",
};

const STATUS_COLORS: Record<string, string> = {
  new: COLORS.blue,
  researching: COLORS.violet,
  qualified: COLORS.emerald,
  contacted: COLORS.amber,
  disqualified: COLORS.rose,
};

const FUNNEL_COLORS = [COLORS.blue, COLORS.violet, COLORS.amber, COLORS.emerald];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--card-foreground))",
    fontSize: "12px",
  },
  cursor: { fill: "hsl(var(--muted))", opacity: 0.3 },
};

interface PipelineChartProps {
  data: { stage: string; count: number }[];
}

export function PipelineChart({ data }: PipelineChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No deals yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="stage"
          width={100}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
          {data.map((entry) => (
            <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || COLORS.blue} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface OutreachFunnelProps {
  data: { name: string; value: number }[];
}

export function OutreachFunnel({ data }: OutreachFunnelProps) {
  if (data.every((d) => d.value === 0)) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No outreach data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={48}>
          {data.map((_, i) => (
            <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CompanyStatusChartProps {
  data: { status: string; count: number }[];
}

export function CompanyStatusChart({ data }: CompanyStatusChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No companies yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          strokeWidth={2}
          stroke="hsl(var(--card))"
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || COLORS.blue} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface DealScoreDistributionProps {
  data: { bucket: string; count: number }[];
}

export function DealScoreDistribution({ data }: DealScoreDistributionProps) {
  if (data.every((d) => d.count === 0)) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No scored deals yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.violet} stopOpacity={0.4} />
            <stop offset="100%" stopColor={COLORS.violet} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="bucket"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip {...tooltipStyle} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={COLORS.violet}
          strokeWidth={2}
          fill="url(#scoreGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
