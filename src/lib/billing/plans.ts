export const PLAN_LIMITS = {
  free: {
    ai_credits: 50,
    scans: 5,
    outreach_messages: 100,
    advisory_modules: ["valuation"],
    multi_channel_outreach: false,
    priority_support: false,
  },
  pro: {
    ai_credits: 500,
    scans: 50,
    outreach_messages: 1000,
    advisory_modules: ["valuation", "financing", "diligence", "integration", "scaling", "exit"],
    multi_channel_outreach: true,
    priority_support: false,
  },
  enterprise: {
    ai_credits: -1, // unlimited
    scans: -1,
    outreach_messages: -1,
    advisory_modules: ["valuation", "financing", "diligence", "integration", "scaling", "exit"],
    multi_channel_outreach: true,
    priority_support: true,
  },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export const PLAN_PRICES = {
  free: { monthly: 0, yearly: 0, stripe_monthly_id: null, stripe_yearly_id: null },
  pro: { monthly: 79, yearly: 790, stripe_monthly_id: "price_pro_monthly", stripe_yearly_id: "price_pro_yearly" },
  enterprise: { monthly: 199, yearly: 1990, stripe_monthly_id: "price_enterprise_monthly", stripe_yearly_id: "price_enterprise_yearly" },
} as const;
