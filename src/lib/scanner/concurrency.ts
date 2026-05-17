/**
 * Run async tasks with a concurrency limit.
 * Returns results in the same order as the input tasks.
 * Failed tasks return Error objects instead of throwing.
 */
export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  options?: {
    onProgress?: (completed: number, total: number) => void;
    timeoutMs?: number;
  }
): Promise<(T | Error)[]> {
  const results: (T | Error)[] = new Array(tasks.length);
  let nextIndex = 0;
  let completed = 0;
  const startTime = Date.now();

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      // Check timeout
      if (options?.timeoutMs && Date.now() - startTime > options.timeoutMs) {
        // Mark remaining as timed out
        for (let i = nextIndex; i < tasks.length; i++) {
          if (results[i] === undefined) {
            results[i] = new Error("Skipped: timeout exceeded");
          }
        }
        return;
      }

      const index = nextIndex++;
      try {
        results[index] = await tasks[index]();
      } catch (err) {
        results[index] = err instanceof Error ? err : new Error(String(err));
      }
      completed++;
      options?.onProgress?.(completed, tasks.length);
    }
  }

  // Start `concurrency` number of workers
  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => runNext()
  );

  await Promise.all(workers);

  return results;
}
