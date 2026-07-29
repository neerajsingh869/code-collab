"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { nanoid } from "nanoid";
import { useBroadcastEvent } from "@liveblocks/react";
import { useEditorStore } from "@/store/useEditorStore";
import type { ChatMessage } from "@/types";

type Props = {
  userName: string;
  userColor: string;
};

export default function ChatPanel({ userName, userColor }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = useEditorStore((s) => s.messages);
  const addMessage = useEditorStore((s) => s.addMessage);
  const toggleChat = useEditorStore((s) => s.toggleChat);
  const broadcast = useBroadcastEvent();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const msg: ChatMessage = {
      id: nanoid(),
      user: userName,
      color: userColor,
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
        <span className="text-gray-300 text-sm font-medium">Live Chat</span>
        <button
          onClick={toggleChat}
          className="text-gray-600 hover:text-gray-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {messages.length === 0 ? (
          <p className="text-gray-700 text-xs text-center mt-8">
            No messages yet. Say hi 👋
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

      {/* Input */}
      <div className="p-3 border-t border-[#30363d] flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message..."
            maxLength={300}
            className="flex-1 bg-[#0d1117] border border-[#30363d] focus:border-blue-500
                       rounded px-3 py-2 text-sm text-white placeholder-gray-700
                       outline-none transition-colors"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs
                       px-3 py-2 rounded transition-colors font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
