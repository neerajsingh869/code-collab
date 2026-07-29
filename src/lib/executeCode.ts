import type { OutputLine } from "@/types";

const TIMEOUT_MS = 5000;

// Runs user code in a Worker rather than an iframe. Two reasons, both learned
// the hard way from the iframe version this replaces:
//
// 1. Isolation. A blob: URL inherits the origin of the document that created
//    it, so the old blob: iframe was same-origin with the app — user code could
//    read window.parent.document and localStorage. A worker has no DOM, no
//    window.parent and no localStorage at all, so there is nothing to reach.
// 2. Termination. A same-origin iframe shares our event loop, so a blocking
//    loop froze the main thread and the "timeout" timer could never fire.
//    A worker is a separate thread, so terminate() actually stops it.
//
// Remaining hole, deliberately left for a CSP to close: a worker can still
// fetch() arbitrary origins. It cannot touch app state, only the network.
const buildWorkerSource = (code: string) => `
const serialize = (value) => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    try { return JSON.stringify(value, null, 2) } catch (e) { return String(value) }
  }
  return String(value)
}

const emit = (type, args) => {
  self.postMessage({ type, text: Array.from(args).map(serialize).join(' ') })
}

console.log = function () { emit('log', arguments) }
console.info = console.log
console.debug = console.log
console.warn = console.log
console.error = function () { emit('error', arguments) }

// async throws land here rather than in the try/catch below
self.onerror = (message) => {
  self.postMessage({ type: 'error', text: String(message) })
  self.postMessage({ type: 'done' })
}
self.onunhandledrejection = (event) => {
  self.postMessage({ type: 'error', text: 'Unhandled rejection: ' + String(event.reason) })
  self.postMessage({ type: 'done' })
}

try {
${code}
  self.postMessage({ type: 'done' })
} catch (e) {
  self.postMessage({ type: 'error', text: e && e.message ? e.message : String(e) })
  self.postMessage({ type: 'done' })
}
`;

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

    const timer = setTimeout(() => {
      onOutput({
        type: "error",
        text: `Error: execution timed out after ${TIMEOUT_MS / 1000} seconds`,
      });
      cleanup();
    }, TIMEOUT_MS);

    // messages arrive only from this worker — unlike the old window-level
    // listener, which accepted postMessage from any frame on the page
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
