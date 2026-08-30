"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Copy, Check, Play, MessageSquare } from "lucide-react";
import { useStorage, useMutation, useEventListener } from "@liveblocks/react";
import { useEditorStore } from "@/store/useEditorStore";
import { LANGUAGES, STARTER_CODE } from "@/lib/constants";
import { executeCode } from "@/lib/executeCode";
import { useYText } from "@/lib/useYjsRoom";
import { useReturnFocusOnClose } from "@/lib/useReturnFocusOnClose";
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
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const runButtonRef = useRef<HTMLButtonElement>(null);

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

  // the store is a module singleton and outlives the room. Clear on the way
  // out. Clearing on entry flashes blank on mount.
  useEffect(() => {
    return () => reset();
  }, [roomId, reset]);

  useReturnFocusOnClose(isChatOpen, chatButtonRef);
  useReturnFocusOnClose(isOutputOpen, runButtonRef);

  // Liveblocks injects its badge outside React with an icon-only dismiss
  // button and no label. It lands once the room connects, well after mount,
  // so watch for it with an observer and stop as soon as it turns up.
  useEffect(() => {
    const label = () => {
      const btn = document.getElementById("liveblocks-badge-hide-button");
      if (!btn) return false;
      if (!btn.getAttribute("aria-label")) {
        btn.setAttribute("aria-label", "Hide Liveblocks badge");
      }
      return true;
    };

    if (label()) return;

    const observer = new MutationObserver(() => {
      if (label()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // lives here because ChatPanel unmounts when closed and missed anything
  // sent meanwhile. Liveblocks doesn't echo our own broadcasts back.
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
  const isPristine = useStorage((root) => root.pristine);
  const yText = useYText();

  const setLanguage = useMutation(({ storage }, lang: Language) => {
    storage.set("language", lang);
  }, []);

  // Only swap the starter if nothing has been written. Rooms predating the
  // pristine flag report undefined and are left alone.
  const handleLanguageChange = (lang: Language) => {
    if (isPristine === true) {
      yText.doc?.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, STARTER_CODE[lang]);
      });
    }
    setLanguage(lang);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRunCode = async () => {
    // Pulled straight off the document — no local mirror to fall behind it
    const code = yText.toString();
    if (!code.trim() || isRunning) return;
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
        <h1 className="text-sm tracking-wide">
          <Link
            href="/"
            className="text-blue-400 font-semibold hover:text-blue-300
                       transition-colors rounded
                       focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span aria-hidden="true">⚡ </span>CodeCollab
          </Link>
        </h1>

        <span className="text-gray-400 text-xs font-mono hidden sm:block">
          <span className="sr-only">Room </span>#{roomId}
        </span>

        <div className="flex-1" />

        <label htmlFor="language-select" className="sr-only">
          Language, shared with everyone in the room
        </label>
        {/* shared across the room — switching language switches it for everyone */}
        <select
          id="language-select"
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as Language)}
          className="bg-[#21262d] border border-[#30363d] text-gray-300 text-xs
                     rounded px-2 py-1.5 cursor-pointer outline-none
                     focus-visible:ring-2 focus-visible:ring-blue-500"
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
                     transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {copied ? (
            <>
              <Check size={12} aria-hidden="true" className="text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy size={12} aria-hidden="true" />
              Share
            </>
          )}
        </button>
        {/* the button label swaps in place, so the copy needs its own
            announcement */}
        <span role="status" className="sr-only">
          {copied ? "Room link copied to clipboard" : ""}
        </span>

        {RUNNABLE_LANGUAGES.includes(language) ? (
          <button
            ref={runButtonRef}
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 text-xs text-white
               bg-green-700 hover:bg-green-600 disabled:opacity-40
               px-3 py-1.5 rounded transition-colors
               focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Play size={12} aria-hidden="true" />
            {isRunning ? "Running..." : "Run"}
          </button>
        ) : (
          // aria-disabled keeps it in the tab order. A real disabled button
          // would take the only explanation of why it won't run with it
          <button
            ref={runButtonRef}
            aria-disabled="true"
            aria-describedby="run-unavailable"
            className="flex items-center gap-1.5 text-xs text-gray-300
               bg-[#21262d] border border-[#30363d] cursor-not-allowed
               px-3 py-1.5 rounded focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Play size={12} aria-hidden="true" />
            Run
          </button>
        )}
        {!RUNNABLE_LANGUAGES.includes(language) && (
          <span id="run-unavailable" className="sr-only">
            {language === "css" ? "CSS" : "Python"} cannot run in the browser.
            Switch the language to JavaScript or TypeScript to execute code.
          </span>
        )}

        <button
          ref={chatButtonRef}
          onClick={toggleChat}
          aria-expanded={isChatOpen}
          aria-controls="chat-panel"
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border
                      transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isChatOpen
                          ? "text-white bg-[#21262d] border-blue-500"
                          : "text-gray-400 hover:text-white bg-[#21262d] border-[#30363d]"
                      }`}
        >
          <MessageSquare size={12} aria-hidden="true" />
          Chat
          {unreadCount > 0 && (
            <>
              <span
                aria-hidden="true"
                className="bg-blue-500 text-white text-[10px] leading-none min-w-4 px-1 py-0.5 rounded-full"
              >
                {unreadCount}
              </span>
              <span className="sr-only">, {unreadCount} unread</span>
            </>
          )}
        </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <section
            aria-label="Code editor"
            className={isOutputOpen ? "h-[60%]" : "h-full"}
          >
            <CollaborativeEditor />
          </section>

          {isOutputOpen && (
            <section
              aria-label="Output"
              className="h-[40%] border-t border-[#30363d] flex-shrink-0"
            >
              <OutputPanel />
            </section>
          )}
        </div>

        {isChatOpen && (
          <aside
            id="chat-panel"
            aria-label="Live chat"
            className="w-72 border-l border-[#30363d] flex-shrink-0"
          >
            <ChatPanel userName={userName} />
          </aside>
        )}
      </main>
    </div>
  );
}
