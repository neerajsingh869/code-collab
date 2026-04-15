"use client";

import { Trash2, X } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";

export default function OutputPanel() {
  const { outputLines, clearOutput, toggleOutput, isRunning } =
    useEditorStore();

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            Output
          </span>
          {isRunning && (
            <span className="text-green-400 text-xs animate-pulse">
              running...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearOutput}
            title="Clear output"
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={toggleOutput}
            title="Close panel"
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Output lines */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {outputLines.length === 0 ? (
          <span className="text-gray-700">
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
              <span className="text-gray-600 select-none mr-2">
                {line.type === "error" ? "✖" : "›"}
              </span>
              {line.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
