"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useStorage, useMutation, useOthers, useRoom } from "@liveblocks/react";
import type { editor } from "monaco-editor";
import { bindMonacoToYText } from "@/lib/monacoYjsBinding";
import { useBroadcastCursor, useRemoteCursors } from "@/lib/useCursorPresence";
import { useYText, useYjsProvider } from "@/lib/useYjsRoom";
import { wasCreatedHere } from "@/lib/roomCreator";
import { colorForConnection, STARTER_CODE } from "@/lib/constants";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import type { Language } from "@/types";

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

export default function CollaborativeEditor() {
  const language = useStorage((root) => root.language);
  const others = useOthers();
  const prefersReducedMotion = usePrefersReducedMotion();

  const roomId = useRoom().id;
  const provider = useYjsProvider();
  const yText = useYText();

  const [monacoEditor, setMonacoEditor] =
    useState<editor.IStandaloneCodeEditor | null>(null);

  const retirePristine = useMutation(({ storage }) => {
    if (storage.get("pristine")) storage.set("pristine", false);
  }, []);

  useEffect(() => {
    const model = monacoEditor?.getModel();
    if (!model) return;

    // Rebinds if a language switch ever swaps the model out from under us
    return bindMonacoToYText(yText, model, { onLocalEdit: retirePristine });
  }, [monacoEditor, yText, retirePristine, language]);

  useBroadcastCursor(monacoEditor, yText);
  useRemoteCursors(monacoEditor, yText);

  useEffect(() => {
    if (!language || !wasCreatedHere(roomId)) return;

    const seed = () => {
      if (!provider.synced) return;
      if (yText.length === 0) {
        yText.insert(0, STARTER_CODE[language as Language]);
      }
    };

    if (provider.synced) {
      seed();
      return;
    }

    provider.on("synced", seed);
    return () => provider.off("synced", seed);
  }, [provider, yText, language, roomId]);

  if (language === null) {
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

      {/* Carets are drawn in the editor, which a screen reader can't see, so
          the badges stay as the perceivable version of the same information */}
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

      {/* No `value` prop: the binding owns the model's contents now */}
      <MonacoEditor
        height="100%"
        language={String(language)}
        onMount={(instance) => setMonacoEditor(instance)}
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
