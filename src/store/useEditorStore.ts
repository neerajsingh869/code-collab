import { create } from "zustand";
import type { OutputLine, ChatMessage } from "@/types";

// local-only UI state (panels, output, chat) — kept separate from Liveblocks
// storage so it never syncs across users

type EditorStore = {
  // Panel visibility
  isChatOpen: boolean;
  isOutputOpen: boolean;
  toggleChat: () => void;
  toggleOutput: () => void;
  openOutput: () => void;

  // Code execution output
  outputLines: OutputLine[];
  addOutputLine: (line: OutputLine) => void;
  clearOutput: () => void;
  isRunning: boolean;
  setIsRunning: (val: boolean) => void;

  // Chat messages (received from Liveblocks broadcast events)
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
};

export const useEditorStore = create<EditorStore>((set) => ({
  isChatOpen: false,
  isOutputOpen: false,
  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
  toggleOutput: () => set((s) => ({ isOutputOpen: !s.isOutputOpen })),
  openOutput: () => set({ isOutputOpen: true }),

  outputLines: [],
  addOutputLine: (line) =>
    set((s) => ({ outputLines: [...s.outputLines, line] })),
  clearOutput: () => set({ outputLines: [] }),
  isRunning: false,
  setIsRunning: (val) => set({ isRunning: val }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
}));
