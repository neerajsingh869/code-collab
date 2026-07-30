"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Play, MessageSquare } from "lucide-react";
import { useStorage, useMutation, useEventListener } from "@liveblocks/react";
import { useEditorStore } from "@/store/useEditorStore";
import { LANGUAGES, STARTER_CODE } from "@/lib/constants";
import { executeCode } from "@/lib/executeCode";
import { transpileTypeScript } from "@/lib/transpileTypeScript";
import type { Language } from "@/types";
import CollaborativeEditor from "./CollaborativeEditor";
import OutputPanel from "./OutputPanel";
import ChatPanel from "./ChatPanel";
import UserPresence from "./UserPresence";

const RUNNABLE_LANGUAGES = ["javascript", "typescript"];

type Props = {
  roomId: string;
  userName: string;
};

export default function EditorLayout({ roomId, userName }: Props) {
  const [copied, setCopied] = useState(false);

  // Selector per value: useEditorStore() with no selector subscribes to every
  // field, so one output line re-rendered this and the editor below it.
  // Action identities never change, so selecting them is free.
  const isChatOpen = useEditorStore((s) => s.isChatOpen);
  const isOutputOpen = useEditorStore((s) => s.isOutputOpen);
  const unreadCount = useEditorStore((s) => s.unreadCount);
  const isRunning = useEditorStore((s) => s.isRunning);

  const toggleChat = useEditorStore((s) => s.toggleChat);
  const openOutput = useEditorStore((s) => s.openOutput);
  const addOutputLine = useEditorStore((s) => s.addOutputLine);
  const addMessage = useEditorStore((s) => s.addMessage);
  const clearOutput = useEditorStore((s) => s.clearOutput);
  const setIsRunning = useEditorStore((s) => s.setIsRunning);
  const reset = useEditorStore((s) => s.reset);

  // the store is a module singleton and outlives the room. Clearing on the
  // way out rather than on entry avoids a blank flash on mount.
  useEffect(() => {
    return () => reset();
  }, [roomId, reset]);

  // here rather than in ChatPanel, which unmounts when closed and missed
  // anything sent meanwhile. Liveblocks doesn't echo our own broadcasts back.
  useEventListener(({ event }) => {
    if (event.type === "CHAT_MESSAGE") {
      addMessage({
        id: event.id,
        user: event.user,
        color: event.color,
        text: event.text,
        timestamp: event.timestamp,
      });
    }
  });

  const language = useStorage((root) => root.language);
  const code = useStorage((root) => root.code);

  // Only swap the starter if nothing has been written. Rooms predating the
  // pristine flag report undefined and are left alone.
  const updateLanguage = useMutation(({ storage }, lang: Language) => {
    if (storage.get("pristine") === true) {
      storage.set("code", STARTER_CODE[lang]);
    }
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
    openOutput();

    let source = code;

    if (language === "typescript") {
      addOutputLine({
        type: "log",
        text: "// Compiled to JavaScript — type errors show in the editor, not here",
      });
      try {
        source = await transpileTypeScript(code);
      } catch {
        addOutputLine({
          type: "error",
          text: "Error: could not compile TypeScript",
        });
        setIsRunning(false);
        return;
      }
    }

    await executeCode(source, (line) => addOutputLine(line));
    setIsRunning(false);
  };

  if (!language) return null;

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] overflow-hidden">
      <header className="h-12 bg-[#161b22] border-b border-[#30363d] flex items-center px-4 gap-3 flex-shrink-0">
        <span className="text-blue-400 font-semibold text-sm tracking-wide">
          ⚡ CodeCollab
        </span>

        <span className="text-gray-700 text-xs font-mono hidden sm:block">
          #{roomId}
        </span>

        <div className="flex-1" />

        {/* shared across the room — switching language switches it for everyone */}
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

        <UserPresence />

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
          {unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-[10px] leading-none min-w-4 px-1 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={isOutputOpen ? "h-[60%]" : "h-full"}>
            <CollaborativeEditor />
          </div>

          {isOutputOpen && (
            <div className="h-[40%] border-t border-[#30363d] flex-shrink-0">
              <OutputPanel />
            </div>
          )}
        </div>

        {isChatOpen && (
          <div className="w-72 border-l border-[#30363d] flex-shrink-0">
            <ChatPanel userName={userName} />
          </div>
        )}
      </div>
    </div>
  );
}
