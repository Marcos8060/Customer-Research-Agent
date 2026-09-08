import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, "..", "briefs.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    domain TEXT,
    status TEXT NOT NULL,
    result TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    finished_at TEXT
  )
`);

export type JobStatus = "queued" | "running" | "done" | "error";

export interface JobRow {
  id: string;
  customer_name: string;
  domain: string | null;
  status: JobStatus;
  result: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

export function insertJob(id: string, customerName: string, domain?: string): void {
  db.prepare(
    `INSERT INTO jobs (id, customer_name, domain, status, created_at) VALUES (?, ?, ?, 'queued', ?)`
  ).run(id, customerName, domain ?? null, new Date().toISOString());
}

export function updateJobStatus(id: string, status: JobStatus): void {
  db.prepare(`UPDATE jobs SET status = ? WHERE id = ?`).run(status, id);
}

export function completeJob(id: string, result: unknown): void {
  db.prepare(
    `UPDATE jobs SET status = 'done', result = ?, finished_at = ? WHERE id = ?`
  ).run(JSON.stringify(result), new Date().toISOString(), id);
}

export function failJob(id: string, error: string): void {
  db.prepare(
    `UPDATE jobs SET status = 'error', error = ?, finished_at = ? WHERE id = ?`
  ).run(error, new Date().toISOString(), id);
}

export function getJob(id: string): JobRow | undefined {
  return db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as JobRow | undefined;
}

export function listJobs(limit = 50): JobRow[] {
  return db.prepare(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?`).all(limit) as unknown as JobRow[];
}
