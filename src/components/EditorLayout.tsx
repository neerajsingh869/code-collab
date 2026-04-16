"use client";

import { useState } from "react";
import { Copy, Check, Play, MessageSquare } from "lucide-react";
import { useStorage, useMutation } from "@liveblocks/react";
import { useEditorStore } from "@/store/useEditorStore";
import { LANGUAGES } from "@/lib/constants";
import { executeCode } from "@/lib/executeCode";
import type { Language } from "@/types";
import CollaborativeEditor from "./CollaborativeEditor";
import OutputPanel from "./OutputPanel";
import ChatPanel from "./ChatPanel";
import UserPresence from "./UserPresence";

const RUNNABLE_LANGUAGES = ["javascript", "typescript"];

type Props = {
  roomId: string;
  userName: string;
  userColor: string;
};

export default function EditorLayout({ roomId, userName, userColor }: Props) {
  const [copied, setCopied] = useState(false);

  const {
    isChatOpen,
    isOutputOpen,
    toggleChat,
    openOutput,
    addOutputLine,
    clearOutput,
    isRunning,
    setIsRunning,
  } = useEditorStore();

  // Read shared state from Liveblocks — these update for ALL users when changed
  const language = useStorage((root) => root.language);
  const code = useStorage((root) => root.code);

  // Write language to Liveblocks — all users switch language together
  const updateLanguage = useMutation(({ storage }, lang: Language) => {
    storage.set("language", lang);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRunCode = async () => {
    if (!code || isRunning) return;
    clearOutput();
    setIsRunning(true);
    openOutput(); // slide open the output panel automatically

    // Note for TypeScript: type annotations are stripped at runtime in the browser
    // so TypeScript code runs as JavaScript — interfaces, types etc are ignored
    if (language === "typescript") {
      addOutputLine({
        type: "log",
        text: "// Note: running as JavaScript (type annotations are ignored)",
      });
    }

    await executeCode(code, (line) => addOutputLine(line));
    setIsRunning(false);
  };

  // Don't render until Liveblocks has loaded the room data
  if (!language) return null;

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] overflow-hidden">
      {/* ── HEADER ───────────────────────────────────────── */}
      <header className="h-12 bg-[#161b22] border-b border-[#30363d] flex items-center px-4 gap-3 flex-shrink-0">
        <span className="text-blue-400 font-semibold text-sm tracking-wide">
          ⚡ CodeCollab
        </span>

        {/* Room ID — subtle reference */}
        <span className="text-gray-700 text-xs font-mono hidden sm:block">
          #{roomId}
        </span>

        <div className="flex-1" />

        {/* Language selector — changing this updates everyone in the room */}
        <select
          value={language}
          onChange={(e) => updateLanguage(e.target.value as Language)}
          className="bg-[#21262d] border border-[#30363d] text-gray-300 text-xs
                     rounded px-2 py-1.5 outline-none cursor-pointer"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>

        {/* Live user avatars */}
        <UserPresence />

        {/* Copy shareable URL */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white
                     bg-[#21262d] border border-[#30363d] px-3 py-1.5 rounded
                     transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy size={12} />
              Share
            </>
          )}
        </button>

        {/* Run button — only enabled for JS/TS, disabled for Python and CSS */}
        {RUNNABLE_LANGUAGES.includes(language) ? (
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 text-xs text-white
               bg-green-700 hover:bg-green-600 disabled:opacity-40
               px-3 py-1.5 rounded transition-colors"
          >
            <Play size={12} />
            {isRunning ? "Running..." : "Run"}
          </button>
        ) : (
          // For CSS and Python — show a greyed out button with a tooltip explaining why
          <div
            title={`${language === "css" ? "CSS" : "Python"} cannot run in the browser — switch to JavaScript to execute code`}
            className="flex items-center gap-1.5 text-xs text-gray-600
               bg-[#21262d] border border-[#30363d] cursor-not-allowed
               px-3 py-1.5 rounded"
          >
            <Play size={12} />
            Run
          </div>
        )}

        {/* Toggle chat panel */}
        <button
          onClick={toggleChat}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border
                      transition-colors ${
                        isChatOpen
                          ? "text-white bg-[#21262d] border-blue-500"
                          : "text-gray-400 hover:text-white bg-[#21262d] border-[#30363d]"
                      }`}
        >
          <MessageSquare size={12} />
          Chat
        </button>
      </header>

      {/* ── MAIN AREA ────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: editor + output panel stacked */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor takes remaining height. Shrinks when output is open */}
          <div className={isOutputOpen ? "h-[60%]" : "h-full"}>
            <CollaborativeEditor />
          </div>

          {/* Output panel slides in from the bottom */}
          {isOutputOpen && (
            <div className="h-[40%] border-t border-[#30363d] flex-shrink-0">
              <OutputPanel />
            </div>
          )}
        </div>

        {/* Right: chat panel */}
        {isChatOpen && (
          <div className="w-72 border-l border-[#30363d] flex-shrink-0">
            <ChatPanel userName={userName} userColor={userColor} />
          </div>
        )}
      </div>
    </div>
  );
}
