import { firmographicsAgent } from "./agents/firmographicAgent.js";
import { signalsAgent } from "./agents/signalsAgent.js";
import { synthesize } from "./agents/synthesizer.js";
import { customerBriefSchema } from "./schema.js";
import { z } from "zod";

type CustomerBrief = z.infer<typeof customerBriefSchema>;

function verifyGrounding(
  synthesis: { summary: string; suggestedTiming?: string },
  signals: { recentSignals: Array<{ date: string }> }
) {
  const allowedDates = new Set(signals.recentSignals.map(s => s.date));
  const text = synthesis.summary + " " + (synthesis.suggestedTiming ?? "");
  const mentionedDates = text.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  const invalidDates = mentionedDates.filter(d => !allowedDates.has(d));
  return { grounded: invalidDates.length === 0, invalidDates };
}

export async function researchCustomer(
  customerName: string,
  domain?: string
): Promise<CustomerBrief & { groundingWarning?: string[] }> {
  const [firmographicsResult, signalsResult] = await Promise.all([
    firmographicsAgent.generate({
      prompt: `Research firmographics for ${customerName}${domain ? ` (${domain})` : ""}.`,
    }),
    signalsAgent.generate({
      prompt: `Find recent signals for ${customerName}${domain ? ` (${domain})` : ""}.`,
    }),
  ]);

  const firmographics = firmographicsResult.output;
  const signals = signalsResult.output;

  const synthesis = await synthesize(firmographics, signals);
  const grounding = verifyGrounding(synthesis, signals);

  const brief: CustomerBrief & { groundingWarning?: string[] } = {
    customerName,
    domain,
    firmographics: {
      industry: firmographics.industry,
      employeeCountEstimate: firmographics.employeeCountEstimate,
      headquarters: firmographics.headquarters,
      fundingStage: firmographics.fundingStage,
      techStackHighlights: firmographics.techStackHighlights,
    },
    recentSignals: signals.recentSignals,
    synthesis,
    sourcesUsed: firmographics.sourcesUsed,
  };

  if (!grounding.grounded) {
    brief.groundingWarning = grounding.invalidDates;
  }

  return customerBriefSchema.parse(brief) as typeof brief;
}