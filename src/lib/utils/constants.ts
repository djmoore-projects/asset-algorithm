import type { DealStage } from "@/types/database";

export const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: "lead", label: "Lead", color: "bg-slate-500" },
  { value: "initial_contact", label: "Initial Contact", color: "bg-blue-500" },
  { value: "nda_signed", label: "NDA Signed", color: "bg-indigo-500" },
  { value: "info_received", label: "Info Received", color: "bg-violet-500" },
  { value: "loi_submitted", label: "LOI Submitted", color: "bg-purple-500" },
  { value: "loi_accepted", label: "LOI Accepted", color: "bg-fuchsia-500" },
  { value: "diligence", label: "Diligence", color: "bg-amber-500" },
  { value: "closing", label: "Closing", color: "bg-orange-500" },
  { value: "closed", label: "Closed", color: "bg-emerald-500" },
  { value: "dead", label: "Dead", color: "bg-red-500" },
];

export const PIPELINE_STAGES = DEAL_STAGES.filter(
  (s) => s.value !== "closed" && s.value !== "dead"
);

export const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-100 text-slate-700" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700" },
  high: { label: "High", color: "bg-amber-100 text-amber-700" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700" },
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
