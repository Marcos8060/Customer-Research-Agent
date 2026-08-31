import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

// The actual logic, callable directly — no tool-execution typing involved
export async function searchFirmographics(query: string) {
  return client.search(query, {
    searchDepth: "advanced",
    maxResults: 5,
  });
}

// The tool wrapper the agent will use later — just delegates to the function above
export const firmographicsSearchTool = tool({
  description:
    "Search the web for a company's firmographic details: industry, size, headquarters, funding stage, and tech stack. Use for factual, slow-changing company information — not recent news.",
  inputSchema: z.object({
    query: z.string().describe(
      "A targeted search query, e.g. 'Acme Corp company size industry headquarters'"
    ),
  }),
  execute: async ({ query }) => searchFirmographics(query),
});
