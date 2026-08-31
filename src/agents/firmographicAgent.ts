import { ToolLoopAgent,stepCountIs, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from 'zod';
import { firmographicsSearchTool } from "../tools/firmographics.js";


const firmographicsOutputSchema = z.object({
  industry: z.string(),
  employeeCountEstimate: z.string(),
  headquarters: z.string().optional(),
  fundingStage: z.string().optional(),
  techStackHighlights: z.array(z.string()).optional(),
  sourcesUsed: z.array(z.string()),
});

export const firmographicsAgent = new ToolLoopAgent({
  model: anthropic("claude-sonnet-4-6"),
  instructions: `You research company firmographics. Use the search tool to find facts about the given company. When sources disagree (e.g. different employee counts), report a reasonable range rather than picking one arbitrarily. Only include information you can attribute to a source. Stop once you have enough to fill the output fields — don't over-search.`,
  tools: { search: firmographicsSearchTool },
  stopWhen: stepCountIs(3),
    output: Output.object({ schema: firmographicsOutputSchema }),
});