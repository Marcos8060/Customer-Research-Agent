// A tiny in-process queue so simultaneous requests from different teammates
// don't all fire Tavily + Anthropic calls at once. Good enough for a
// single-instance internal tool; would need a real queue (e.g. a DB-backed
// one) if this ever runs on more than one server process.

type Task = () => Promise<void>;

const CONCURRENCY = 2;
let active = 0;
const queue: Task[] = [];

function runNext(): void {
  if (active >= CONCURRENCY) return;
  const task = queue.shift();
  if (!task) return;

  active++;
  task()
    .catch((err) => {
      // Tasks are expected to handle their own errors (and record them via
      // failJob); this is a last-resort net so a bug can't wedge the queue.
      console.error("Unhandled error in queued job:", err);
    })
    .finally(() => {
      active--;
      runNext();
    });
}

export function enqueue(task: Task): void {
  queue.push(task);
  runNext();
}

export function queueDepth(): number {
  return queue.length + active;
}
