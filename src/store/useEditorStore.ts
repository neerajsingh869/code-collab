import { create } from "zustand";
import type { OutputLine, ChatMessage } from "@/types";

// Zustand manages LOCAL UI state — things only the current user cares about
// (panels open/closed, output lines, chat messages)
// We use Zustand instead of useState because multiple components share this state
// without needing to pass props up and down the tree

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
