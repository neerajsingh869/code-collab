import type { OutputLine } from "@/types";

// Why Blob URL instead of srcdoc with sandbox?
// sandbox="allow-scripts" blocks parent.postMessage in some browsers
// because the sandboxed iframe treats parent as inaccessible.
//
// Blob URLs solve this cleanly:
// - The iframe gets a unique blob: origin — completely isolated from our app
// - window.parent.postMessage() works fine from a blob origin with wildcard *
// - No sandbox attribute needed — the different origin provides natural isolation
// - Works consistently across all modern browsers

export const executeCode = (
  code: string,
  onOutput: (line: OutputLine) => void,
): Promise<void> => {
  return new Promise((resolve) => {
    // Build the full HTML page that will run inside the iframe
    // console.log and console.error are overridden to send output back via postMessage
    const html = `<!DOCTYPE html>
<html>
<body>
<script>
  // Override console methods to pipe output back to our app
  console.log = function() {
    var out = Array.from(arguments).map(function(a) {
      if (a === null) return 'null'
      if (a === undefined) return 'undefined'
      if (typeof a === 'object') {
        try { return JSON.stringify(a, null, 2) } catch(e) { return String(a) }
      }
      return String(a)
    }).join(' ')
    window.parent.postMessage({ type: 'log', value: out }, '*')
  }

  console.error = function() {
    var out = Array.from(arguments).map(String).join(' ')
    window.parent.postMessage({ type: 'error', value: out }, '*')
  }

  console.warn = console.log

  // Catch any uncaught errors (like ReferenceError, SyntaxError)
  window.onerror = function(msg, src, line, col, err) {
    window.parent.postMessage({ type: 'error', value: String(err ? err.message : msg) }, '*')
    window.parent.postMessage({ type: 'done' }, '*')
    return true
  }

  // Run code inside setTimeout so the iframe is fully ready
  setTimeout(function() {
    try {
      ${code}
      window.parent.postMessage({ type: 'done' }, '*')
    } catch(e) {
      window.parent.postMessage({ type: 'error', value: e.message }, '*')
      window.parent.postMessage({ type: 'done' }, '*')
    }
  }, 0)
<\/script>
</body>
</html>`;

    // Create a Blob URL — gives the iframe its own isolated blob: origin
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.style.position = "absolute";

    // Kill after 5 seconds to prevent infinite loops hanging the browser
    const timeout = setTimeout(() => {
      onOutput({
        type: "error",
        text: "Error: execution timed out after 5 seconds",
      });
      cleanup();
    }, 5000);

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
      // Always revoke the blob URL to free memory
      URL.revokeObjectURL(blobUrl);
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      resolve();
    };

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data.type !== "string") return;
      if (event.data.type === "log") {
        onOutput({ type: "log", text: event.data.value });
      } else if (event.data.type === "error") {
        onOutput({ type: "error", text: event.data.value });
      } else if (event.data.type === "done") {
        cleanup();
      }
    };

    window.addEventListener("message", handleMessage);

    // Set src to blob URL and add to DOM — this triggers the script to run
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
  });
};
