import type { DealStage } from "@/types/database";

// Cold to hot. Grey early, yellow as the deal heats up, so the colour itself
// says how far along a card is. Closed and dead stay semantic.
export const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: "lead", label: "Lead", color: "bg-muted-foreground/30" },
  { value: "initial_contact", label: "Initial Contact", color: "bg-muted-foreground/50" },
  { value: "nda_signed", label: "NDA Signed", color: "bg-muted-foreground/70" },
  { value: "info_received", label: "Info Received", color: "bg-primary/35" },
  { value: "loi_submitted", label: "LOI Submitted", color: "bg-primary/55" },
  { value: "loi_accepted", label: "LOI Accepted", color: "bg-primary/75" },
  { value: "diligence", label: "Diligence", color: "bg-primary/90" },
  { value: "closing", label: "Closing", color: "bg-primary" },
  { value: "closed", label: "Closed", color: "bg-emerald-500" },
  { value: "dead", label: "Dead", color: "bg-red-500" },
];

export const PIPELINE_STAGES = DEAL_STAGES.filter(
  (s) => s.value !== "closed" && s.value !== "dead"
);

export const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-primary/15 text-primary" },
  high: { label: "High", color: "bg-primary/30 text-primary" },
  critical: { label: "Critical", color: "bg-destructive/15 text-destructive" },
} as const;

export const CHANNEL_CONFIG = {
  email: { label: "Email", icon: "Mail" },
  sms: { label: "SMS", icon: "MessageSquare" },
  linkedin: { label: "LinkedIn", icon: "Linkedin" },
  call: { label: "Call", icon: "Phone" },
} as const;

export const formatCurrency = (cents: number | null) => {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

export const formatCompactCurrency = (cents: number | null) => {
  if (cents === null || cents === undefined) return "—";
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
};
