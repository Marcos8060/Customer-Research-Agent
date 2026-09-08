import type { customerBriefSchema } from "./schema.js";
import type { z } from "zod";

type CustomerBrief = z.infer<typeof customerBriefSchema>;

// --- Check 1: extended grounding (dates + proper nouns) ---
function checkGrounding(brief: CustomerBrief): { issues: string[] } {
  const issues: string[] = [];
  const synthesisText = brief.synthesis.summary + " " + (brief.synthesis.suggestedTiming ?? "");

  // Build the full text of everything the model was actually allowed to know
  const sourceText = JSON.stringify(brief.firmographics) + JSON.stringify(brief.recentSignals);

  // Dates: same check as before, now living here permanently
  const allowedDates = new Set(brief.recentSignals.map(s => s.date));
  const mentionedDates = synthesisText.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  for (const date of mentionedDates) {
    if (!allowedDates.has(date)) {
      issues.push(`Date "${date}" in synthesis not found in signals data`);
    }
  }

  // Proper nouns: capitalized multi-word phrases (e.g. "John Jumper", "Anthropic Labs")
  const properNounPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})\b/g;
  const mentioned = new Set(
    Array.from(synthesisText.matchAll(properNounPattern), m => m[1])
  );

  for (const phrase of mentioned) {
    // Skip the customer's own name — it's expected to appear without being "in the data" literally
    if (phrase === brief.customerName) continue;
    if (!sourceText.includes(phrase)) {
      issues.push(`Possible unsupported reference: "${phrase}" not found in firmographics/signals data`);
    }
  }

  return { issues };
}

// --- Check 2: source URL sanity ---
async function checkSourceUrls(brief: CustomerBrief): Promise<{ issues: string[] }> {
  const issues: string[] = [];

  await Promise.all(
    brief.sourcesUsed.map(async (url) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { method: "HEAD", signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          issues.push(`Source URL returned ${res.status}: ${url}`);
        }
      } catch {
        issues.push(`Source URL unreachable: ${url}`);
      }
    })
  );

  return { issues };
}

// --- Check 3: completeness score ---
function checkCompleteness(brief: CustomerBrief): { score: number; missingFields: string[] } {
  const optionalFields: Array<[string, unknown]> = [
    ["headquarters", brief.firmographics.headquarters],
    ["fundingStage", brief.firmographics.fundingStage],
    ["techStackHighlights", brief.firmographics.techStackHighlights?.length ? brief.firmographics.techStackHighlights : undefined],
    ["suggestedTiming", brief.synthesis.suggestedTiming],
  ];

  const missingFields = optionalFields
    .filter(([, value]) => value === undefined || value === "")
    .map(([key]) => key);

  const score = (optionalFields.length - missingFields.length) / optionalFields.length;

  return { score, missingFields };
}

// --- Combined ---
export async function evaluateBrief(brief: CustomerBrief) {
  const grounding = checkGrounding(brief);
  const sourceUrls = await checkSourceUrls(brief);
  const completeness = checkCompleteness(brief);

  return {
    groundingIssues: grounding.issues,
    sourceUrlIssues: sourceUrls.issues,
    completenessScore: completeness.score,
    missingFields: completeness.missingFields,
    passed: sourceUrls.issues.length === 0,
  };
}