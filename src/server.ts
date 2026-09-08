import express from "express";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { researchCustomer } from "./orchestrate.js";
import { evaluateBrief } from "./evaluate.js";
import { exportBriefsToExcel } from "./export.js";
import {
  insertJob,
  updateJobStatus,
  completeJob,
  failJob,
  getJob,
  listJobs,
} from "./db.js";
import { enqueue } from "./jobQueue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

function toClientJob(job: NonNullable<ReturnType<typeof getJob>>) {
  return {
    id: job.id,
    customerName: job.customer_name,
    domain: job.domain,
    status: job.status,
    result: job.result ? JSON.parse(job.result) : null,
    error: job.error,
    createdAt: job.created_at,
    finishedAt: job.finished_at,
  };
}

// Kick off a new research job. Returns immediately with a job id — the
// research itself (multiple LLM + search calls) runs in the background,
// since it routinely takes 20-60+ seconds and shouldn't hold an HTTP
// request open.
app.post("/api/research", (req, res) => {
  const customerName = typeof req.body?.customerName === "string" ? req.body.customerName.trim() : "";
  const domain = typeof req.body?.domain === "string" && req.body.domain.trim() ? req.body.domain.trim() : undefined;

  if (!customerName) {
    res.status(400).json({ error: "customerName is required" });
    return;
  }

  const id = randomUUID();
  insertJob(id, customerName, domain);

  enqueue(async () => {
    updateJobStatus(id, "running");
    try {
      const brief = await researchCustomer(customerName, domain);
      const quality = await evaluateBrief(brief);
      completeJob(id, { brief, quality });
    } catch (err) {
      failJob(id, err instanceof Error ? err.message : String(err));
    }
  });

  res.status(202).json({ id });
});

// Poll a single job's status/result.
app.get("/api/research/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(toClientJob(job));
});

// Recent history, for the sidebar list.
app.get("/api/research", (_req, res) => {
  const jobs = listJobs(100).map((job) => ({
    id: job.id,
    customerName: job.customer_name,
    domain: job.domain,
    status: job.status,
    createdAt: job.created_at,
    finishedAt: job.finished_at,
  }));
  res.json(jobs);
});

// Download a single completed brief as an .xlsx, reusing the existing
// exporter used by the CLI batch script.
app.get("/api/research/:id/export", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job || job.status !== "done" || !job.result) {
    res.status(404).json({ error: "brief not ready" });
    return;
  }

  const { brief } = JSON.parse(job.result);
  const safeName = job.customer_name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "brief";
  const tmpPath = path.join(os.tmpdir(), `brief-${job.id}.xlsx`);

  try {
    await exportBriefsToExcel([brief], tmpPath);
    res.download(tmpPath, `${safeName}-brief.xlsx`);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`Customer Research Agent running at http://localhost:${PORT}`);
});
