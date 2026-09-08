import ExcelJS from "exceljs";
import type { customerBriefSchema } from "./schema.js";
import type { z } from "zod";

type CustomerBrief = z.infer<typeof customerBriefSchema>;

export async function exportBriefsToExcel(
  briefs: CustomerBrief[],
  outputPath: string
) {
  const workbook = new ExcelJS.Workbook();

  // --- Sheet 1: Customer Briefs overview ---
  const overview = workbook.addWorksheet("Customer Briefs");

  overview.columns = [
    { header: "Customer", key: "customerName", width: 22 },
    { header: "Domain", key: "domain", width: 18 },
    { header: "Industry", key: "industry", width: 24 },
    { header: "Employee Count", key: "employeeCount", width: 28 },
    { header: "Headquarters", key: "headquarters", width: 22 },
    { header: "Funding Stage", key: "fundingStage", width: 30 },
    { header: "Tech Stack Highlights", key: "techStack", width: 40 },
    { header: "Summary", key: "summary", width: 50 },
    { header: "Suggested Timing", key: "suggestedTiming", width: 40 },
    { header: "Sources", key: "sources", width: 40 },
  ];

  // Bold, frozen header row — the header must stay visible as the client scrolls
  overview.getRow(1).font = { bold: true };
  overview.views = [{ state: "frozen", ySplit: 1 }];

  for (const brief of briefs) {
    overview.addRow({
      customerName: brief.customerName,
      domain: brief.domain ?? "",
      industry: brief.firmographics.industry,
      employeeCount: brief.firmographics.employeeCountEstimate,
      headquarters: brief.firmographics.headquarters ?? "",
      fundingStage: brief.firmographics.fundingStage ?? "",
      techStack: (brief.firmographics.techStackHighlights ?? []).join(", "),
      summary: brief.synthesis.summary,
      suggestedTiming: brief.synthesis.suggestedTiming ?? "",
      sources: brief.sourcesUsed.join("\n"),
    });
  }

  // Wrap text on the long narrative columns so cells stay readable, not truncated
  ["summary", "suggestedTiming", "sources", "techStack"].forEach((key) => {
    const col = overview.getColumn(key);
    col.alignment = { wrapText: true, vertical: "top" };
  });

  // --- Sheet 2: Signals detail ---
  const signalsSheet = workbook.addWorksheet("Signals");

  signalsSheet.columns = [
    { header: "Customer", key: "customerName", width: 22 },
    { header: "Date", key: "date", width: 14 },
    { header: "Headline", key: "headline", width: 60 },
    { header: "Source", key: "source", width: 22 },
    { header: "Relevance", key: "relevance", width: 12 },
  ];
  signalsSheet.getRow(1).font = { bold: true };
  signalsSheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const brief of briefs) {
    for (const signal of brief.recentSignals) {
      signalsSheet.addRow({
        customerName: brief.customerName,
        date: signal.date,
        headline: signal.headline,
        source: signal.source,
        relevance: signal.relevance,
      });
    }
  }
  signalsSheet.getColumn("headline").alignment = { wrapText: true, vertical: "top" };

  await workbook.xlsx.writeFile(outputPath);
  console.log(`Exported ${briefs.length} customer briefs to ${outputPath}`);
}