import { ToolLoopAgent, stepCountIs, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { signalsSearchTool } from "../tools/signals.js";

const signalsOutputSchema = z.object({
  recentSignals: z.array(z.object({
    date: z.string(),
    headline: z.string(),
    source: z.string(),
    relevance: z.enum(["high", "medium", "low"]),
  })),
});

export const signalsAgent = new ToolLoopAgent({
  model: anthropic("claude-sonnet-4-6"),
  instructions: `You track recent company activity: funding, leadership changes, hiring, product launches, layoffs. Use the search tool. Rate each signal's relevance to a sales/customer-success context — a funding round or leadership change is "high," routine PR is "low." Prefer the most recent items. Stop once you have 3-5 solid signals.`,
  tools: { search: signalsSearchTool },
  stopWhen: stepCountIs(3),
  output: Output.object({ schema: signalsOutputSchema }),
});