"use client";

import dynamic from "next/dynamic";
import { useStorage, useMutation, useOthers } from "@liveblocks/react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[#0d1117]">
      <span className="text-gray-600 text-sm animate-pulse">
        Loading editor...
      </span>
    </div>
  ),
});

export default function CollaborativeEditor() {
  const code = useStorage((root) => root.code);
  const language = useStorage((root) => root.language);
  const others = useOthers();

  const updateCode = useMutation(({ storage }, newCode: string) => {
    // In v2, storage.set works the same way for top-level keys
    storage.set("code", newCode);
  }, []);

  if (code === null || language === null) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0d1117]">
        <span className="text-gray-600 text-sm">Joining room...</span>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {others.length > 0 && (
        <div className="absolute top-2 right-2 z-10 flex flex-wrap gap-1">
          {others.map((user) => (
            <span
              key={user.connectionId}
              className="text-xs text-white px-2 py-0.5 rounded-full"
              style={{ background: user.presence.color }}
            >
              {user.presence.name} is here
            </span>
          ))}
        </div>
      )}

      <MonacoEditor
        height="100%"
        language={String(language)}
        value={String(code)}
        onChange={(value) => {
          if (value !== undefined) updateCode(value);
        }}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'SF Mono', monospace",
          minimap: { enabled: false },
          padding: { top: 16 },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          renderLineHighlight: "all",
          cursorBlinking: "smooth",
          smoothScrolling: true,
          tabSize: 2,
          wordWrap: "on",
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  );
}
