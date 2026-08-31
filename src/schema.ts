import { z } from "zod";

export const customerBriefSchema = z.object({
  customerName: z.string(),
  domain: z.string().optional(),

  firmographics: z.object({
    industry: z.string(),
    employeeCountEstimate: z.string(), // e.g. "50-200" — ranges are more honest than fake precision
    headquarters: z.string().optional(),
    fundingStage: z.string().optional(),
    techStackHighlights: z.array(z.string()).optional(),
  }),

  recentSignals: z.array(z.object({
    date: z.string(),
    headline: z.string(),
    source: z.string(),
    relevance: z.enum(["high", "medium", "low"]),
  })),

  synthesis: z.object({
    summary: z.string(),          // 2-3 sentence "why this matters"
    suggestedTiming: z.string().optional(), // e.g. "good time to reach out — just raised funding"
  }),

  sourcesUsed: z.array(z.string()), // URLs, for trust/verification
});