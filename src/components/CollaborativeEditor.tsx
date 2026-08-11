"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";
import { useStorage, useMutation, useOthers } from "@liveblocks/react";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { colorForConnection } from "@/lib/constants";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[#0d1117]">
      <span className="text-gray-400 text-sm motion-safe:animate-pulse">
        Loading editor...
      </span>
    </div>
  ),
});

const SYNC_DELAY_MS = 200;

export default function CollaborativeEditor() {
  const code = useStorage((root) => root.code);
  const language = useStorage((root) => root.language);
  const others = useOthers();
  const prefersReducedMotion = usePrefersReducedMotion();

  const updateCode = useMutation(({ storage }, newCode: string) => {
    storage.set("code", newCode);
    // first keystroke retires the starter so a language switch won't wipe it
    if (storage.get("pristine")) {
      storage.set("pristine", false);
    }
  }, []);

  // Typing stays instant locally; the write to shared storage is debounced
  // so we're not hitting the network on every keystroke. `lastSynced` tracks
  // what we last sent, so a remote update isn't mistaken for an echo of our
  // own write — only adopt it into local state if it's genuinely someone else's.
  const [localCode, setLocalCode] = useState(code ?? "");
  const lastSynced = useRef(localCode);

  useLayoutEffect(() => {
    if (code !== null && code !== lastSynced.current) {
      // Adopting a remote Liveblocks update into local state — a legitimate
      // external-system sync, not state derived from props/render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalCode(code);
      lastSynced.current = code;
    }
  }, [code]);

  const syncCode = useDebouncedCallback((newCode: string) => {
    lastSynced.current = newCode;
    updateCode(newCode);
  }, SYNC_DELAY_MS);

  if (code === null || language === null) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0d1117]">
        <span className="text-gray-400 text-sm">Joining room...</span>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* Monaco keeps Tab for indentation, so say how to get back out */}
      <p className="sr-only">
        Code editor, shared with everyone in this room. Press Escape and then
        Tab to move focus out of the editor.
      </p>

      {others.length > 0 && (
        <div
          role="status"
          className="absolute top-2 right-2 z-10 flex flex-wrap gap-1"
        >
          {others.map((user) => (
            <span
              key={user.connectionId}
              className="text-xs text-[#0d1117] px-2 py-0.5 rounded-full"
              style={{ background: colorForConnection(user.connectionId) }}
            >
              {user.presence.name} is here
            </span>
          ))}
        </div>
      )}

      <MonacoEditor
        height="100%"
        language={String(language)}
        value={localCode}
        onChange={(value) => {
          if (value === undefined) return;
          setLocalCode(value);
          syncCode(value);
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
          cursorBlinking: prefersReducedMotion ? "solid" : "smooth",
          smoothScrolling: !prefersReducedMotion,
          tabSize: 2,
          wordWrap: "on",
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  );
}
