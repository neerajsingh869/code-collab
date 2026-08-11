"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { nanoid } from "nanoid";
import { useBroadcastEvent, useSelf } from "@liveblocks/react";
import { useEditorStore } from "@/store/useEditorStore";
import { colorForConnection } from "@/lib/constants";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import type { ChatMessage } from "@/types";

type Props = {
  userName: string;
};

export default function ChatPanel({ userName }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const messages = useEditorStore((s) => s.messages);
  const addMessage = useEditorStore((s) => s.addMessage);
  const toggleChat = useEditorStore((s) => s.toggleChat);
  const broadcast = useBroadcastEvent();

  // carried on the message: a broadcast outlives the sender's presence
  const connectionId = useSelf((me) => me.connectionId);

  // opened by a header button that unmounts nothing, so focus has to be moved
  // in deliberately
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [messages, prefersReducedMotion]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const msg: ChatMessage = {
      id: nanoid(),
      user: userName,
      color: colorForConnection(connectionId ?? 0),
      text: trimmed,
      timestamp: Date.now(),
    };

    addMessage(msg);

    broadcast({
      type: "CHAT_MESSAGE",
      ...msg,
    });

    setInput("");
  };

  return (
    <div className="h-full flex flex-col bg-[#161b22]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] flex-shrink-0">
        <h2 className="text-gray-300 text-sm font-medium">Live Chat</h2>
        <button
          onClick={toggleChat}
          aria-label="Close chat"
          className="text-gray-400 hover:text-white transition-colors
                     focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-4"
      >
        {messages.length === 0 ? (
          <p className="text-gray-400 text-xs text-center mt-8">
            No messages yet. Say hi <span aria-hidden="true">👋</span>
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              <div
                className="text-xs font-semibold mb-0.5"
                style={{ color: msg.color }}
              >
                {msg.user}
              </div>
              <div className="text-gray-300 text-sm leading-relaxed break-words">
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* bottom padding clears the Liveblocks badge, fixed 12px from the
          corner at z-index 9999 and otherwise sitting on top of Send */}
      <div className="p-3 pb-16 border-t border-[#30363d] flex-shrink-0">
        <div className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message..."
            maxLength={300}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2
                       text-sm text-white placeholder-gray-400 outline-none
                       focus-visible:border-blue-500 focus-visible:ring-2
                       focus-visible:ring-blue-500 transition-colors"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs
                       px-3 py-2 rounded transition-colors font-medium
                       focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
