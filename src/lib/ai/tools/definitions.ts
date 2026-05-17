import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const AI_TOOLS: Tool[] = [
  {
    name: "search_companies",
    description: "Search the user's company database by name, industry, status, or score range",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query for company name" },
        industry: { type: "string", description: "Filter by industry" },
        status: { type: "string", enum: ["new", "researching", "qualified", "contacted", "disqualified"] },
        min_score: { type: "number", description: "Minimum ICP score" },
      },
      required: [],
    },
  },
  {
    name: "get_company",
    description: "Get full details of a specific company by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        company_id: { type: "string", description: "The company UUID" },
      },
      required: ["company_id"],
    },
  },
  {
    name: "search_deals",
    description: "Search active deals in the pipeline by stage, priority, or title",
    input_schema: {
      type: "object" as const,
      properties: {
        stage: { type: "string", enum: ["lead", "initial_contact", "nda_signed", "info_received", "loi_submitted", "loi_accepted", "diligence", "closing", "closed", "dead"] },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        search: { type: "string", description: "Search by deal title" },
      },
      required: [],
    },
  },
  {
    name: "get_deal",
    description: "Get full details of a specific deal including company and contact info",
    input_schema: {
      type: "object" as const,
      properties: {
        deal_id: { type: "string", description: "The deal UUID" },
      },
      required: ["deal_id"],
    },
  },
  {
    name: "update_deal_stage",
    description: "Move a deal to a new pipeline stage",
    input_schema: {
      type: "object" as const,
      properties: {
        deal_id: { type: "string" },
        stage: { type: "string", enum: ["lead", "initial_contact", "nda_signed", "info_received", "loi_submitted", "loi_accepted", "diligence", "closing", "closed", "dead"] },
      },
      required: ["deal_id", "stage"],
    },
  },
  {
    name: "search_contacts",
    description: "Search contacts by name, email, company, or role",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        role_type: { type: "string", enum: ["owner", "cfo", "broker", "intermediary", "other"] },
      },
      required: [],
    },
  },
  {
    name: "get_pipeline_metrics",
    description: "Get current pipeline metrics and statistics",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_campaign_stats",
    description: "Get outreach campaign statistics",
    input_schema: {
      type: "object" as const,
      properties: {
        campaign_id: { type: "string", description: "Optional specific campaign ID" },
      },
      required: [],
    },
  },
  {
    name: "get_upcoming_meetings",
    description: "Get upcoming scheduled meetings",
    input_schema: {
      type: "object" as const,
      properties: {
        days: { type: "number", description: "Number of days ahead to look (default 7)" },
      },
      required: [],
    },
  },
];
