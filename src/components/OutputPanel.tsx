"use client";

import { Trash2, X } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";

export default function OutputPanel() {
  const outputLines = useEditorStore((s) => s.outputLines);
  const droppedLines = useEditorStore((s) => s.droppedLines);
  const isRunning = useEditorStore((s) => s.isRunning);
  const clearOutput = useEditorStore((s) => s.clearOutput);
  const toggleOutput = useEditorStore((s) => s.toggleOutput);

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            Output
          </span>
          <span role="status" className="text-green-400 text-xs motion-safe:animate-pulse">
            {isRunning ? "running..." : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearOutput}
            aria-label="Clear output"
            className="text-gray-400 hover:text-white transition-colors
                       focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
          <button
            onClick={toggleOutput}
            aria-label="Close output panel"
            className="text-gray-400 hover:text-white transition-colors
                       focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* role="log" so appended lines are announced without stealing focus */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Program output"
        className="flex-1 overflow-y-auto p-4 font-mono text-sm"
      >
        {/* saying so beats a log that silently starts mid-run */}
        {droppedLines > 0 && (
          <div className="leading-7 text-gray-400">
            {`// ${droppedLines.toLocaleString()} earlier lines dropped`}
          </div>
        )}

        {outputLines.length === 0 ? (
          <span className="text-gray-400">
            {isRunning ? "// running..." : "// press Run to execute your code"}
          </span>
        ) : (
          outputLines.map((line, i) => (
            <div
              key={i}
              className={`leading-7 ${
                line.type === "error" ? "text-red-400" : "text-green-300"
              }`}
            >
              {/* colour alone can't carry the distinction */}
              <span aria-hidden="true" className="text-gray-400 select-none mr-2">
                {line.type === "error" ? "✖" : "›"}
              </span>
              {line.type === "error" && <span className="sr-only">Error: </span>}
              {line.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
