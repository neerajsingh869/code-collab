import type { OutputLine } from "@/types";
import { buildWorkerSource } from "./executionRuntime";

const TIMEOUT_MS = 5000;

// Worker rather than iframe. A blob: URL inherits the origin of the document
// that created it, so the old iframe was same-origin with the app and could
// read its DOM and localStorage. It also shared the main thread, so a blocking
// loop froze the page and the timeout never fired. A worker has neither.
// Still open: a worker can reach the network. That needs a CSP.
export const executeCode = (
  code: string,
  onOutput: (line: OutputLine) => void,
): Promise<void> => {
  return new Promise((resolve) => {
    const blobUrl = URL.createObjectURL(
      new Blob([buildWorkerSource(code)], { type: "text/javascript" }),
    );
    const worker = new Worker(blobUrl);

    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
      resolve();
    };

    // backstop for work that never drains: blocking loop, uncleared interval,
    // a request that never returns
    const timer = setTimeout(() => {
      onOutput({
        type: "error",
        text: `Error: execution timed out after ${TIMEOUT_MS / 1000} seconds`,
      });
      cleanup();
    }, TIMEOUT_MS);

    // bound to this worker, unlike the old window listener which took
    // messages from any frame on the page
    worker.onmessage = (event: MessageEvent) => {
      const { type, text } = event.data ?? {};
      if (type === "log" || type === "error") {
        onOutput({ type, text });
      } else if (type === "done") {
        cleanup();
      }
    };

    // fires when the worker script fails to parse at all, e.g. a SyntaxError
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      onOutput({ type: "error", text: event.message || "Uncaught error" });
      cleanup();
    };
  });
};
