import posthog from "posthog-js";

type AnalyticsEvent =
  | { event: "scan_started"; properties: { criteria?: string } }
  | { event: "scan_completed"; properties: { results_count: number } }
  | { event: "outreach_sent"; properties: { channel: string; campaign_id?: string } }
  | { event: "advisory_run"; properties: { module: string; deal_id?: string } }
  | { event: "deal_created"; properties: { source?: string } }
  | { event: "company_imported"; properties: { count: number; source: string } }
  | { event: "campaign_launched"; properties: { channel_count: number; contact_count: number } }
  | { event: "icp_configured"; properties: {} }
  | { event: "integration_connected"; properties: { provider: string } }
  | { event: "plan_upgraded"; properties: { from: string; to: string } };

export function trackEvent<T extends AnalyticsEvent>(event: T["event"], properties?: T["properties"]) {
  if (typeof window !== "undefined" && posthog.__loaded) {
    posthog.capture(event, properties);
  }
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window !== "undefined" && posthog.__loaded) {
    posthog.identify(userId, traits);
  }
}

export function resetAnalytics() {
  if (typeof window !== "undefined" && posthog.__loaded) {
    posthog.reset();
  }
}
