import { researchCustomer } from "./orchestrate.js";
import { exportBriefsToExcel } from "./export.js";
import { evaluateBrief } from "./evaluate.js";

const customers = [
  { name: "Anthropic" },
  { name: "Notion", domain: "notion.so" },
  { name: "Andela", domain: "andela.com" },
];

const briefs = [];
for (const customer of customers) {
  const brief = await researchCustomer(customer.name, customer.domain);
  const quality = await evaluateBrief(brief);

  console.log(`\n=== ${customer.name} — quality report ===`);
  console.log(JSON.stringify(quality, null, 2));

  briefs.push(brief);
}

await exportBriefsToExcel(briefs, "./customer-briefs.xlsx");