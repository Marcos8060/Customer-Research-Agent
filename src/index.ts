import { researchCustomer } from "./orchestrate.js";

const customers = [
  { name: "Anthropic" },
  { name: "Notion", domain: "notion.so" },
  { name: "Andela", domain: "andela.com" },
  // add real customer names from the client's list here
];

for (const customer of customers) {
  const brief = await researchCustomer(customer.name, customer.domain);
  console.log(`\n=== ${customer.name} ===`);
  console.log(JSON.stringify(brief, null, 2));
}