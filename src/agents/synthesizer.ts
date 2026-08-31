import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const synthesisSchema = z.object({
  summary: z.string(),
  suggestedTiming: z.string().optional(),
});

export async function synthesize(
  firmographics: unknown,
  signals: { recentSignals: Array<{ date: string; headline: string }> }
) {
  // Ground the model with an explicit, code-generated list of allowed facts
  const allowedDates = signals.recentSignals.map(s => s.date).join(", ");

  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    output: Output.object({ schema: synthesisSchema }),
    prompt: `You are helping a sales/customer-success team understand why a customer matters right now.

Firmographics:
${JSON.stringify(firmographics, null, 2)}

Recent signals:
${JSON.stringify(signals, null, 2)}

The ONLY valid dates you may reference are: ${allowedDates}. Do not use any other date, even if you believe it to be true from general knowledge. Do not mention any person, company, dollar figure, or event that does not appear verbatim in the data above — even if you recognize the company and know other facts about it from training. If you're unsure whether something is in the data, leave it out.

Write a 2-3 sentence summary connecting the firmographics and the most relevant recent signals — explain why this matters for outreach or account planning. If there's a clear timing angle, suggest it in suggestedTiming, using only the allowed dates above. If nothing suggests urgency, leave suggestedTiming out.`,
  });

  return output;
}
