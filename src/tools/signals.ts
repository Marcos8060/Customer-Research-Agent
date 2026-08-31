import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

// The actual logic, callable directly — no tool-execution typing involved
export async function searchSignals(query: string) {
  return client.search(query, {
    searchDepth: "advanced",
    topic: "news",
    maxResults: 5,
  });
}

// The tool wrapper the agent will use later — just delegates to the function above
export const signalsSearchTool = tool({
  description:
    "Search the web for recent news and activity about a company: funding rounds, leadership changes, hiring surges, product launches, layoffs. Use for time-sensitive signals — not general company facts.",
  inputSchema: z.object({
    query: z.string().describe(
      "A recency-focused search query, e.g. 'Acme Corp funding news 2026'"
    ),
  }),
  execute: async ({ query }) => searchSignals(query),
});