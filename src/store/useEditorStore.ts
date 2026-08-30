import { create } from "zustand";
import type { OutputLine, ChatMessage } from "@/types";

// local-only UI state (panels, output, chat) — kept separate from Liveblocks
// storage so it never syncs across users

// A run that prints from inside a loop can emit faster than anyone can read.
// Appending copies the array each time, so an uncapped log is quadratic; this
// keeps the tail and counts what fell off the front.
const MAX_OUTPUT_LINES = 2000;

type EditorState = {
  // Panel visibility
  isChatOpen: boolean;
  isOutputOpen: boolean;
  unreadCount: number;

  // Code execution output
  outputLines: OutputLine[];
  droppedLines: number;
  isRunning: boolean;

  // Chat messages (received from Liveblocks broadcast events)
  messages: ChatMessage[];
};

type EditorStore = EditorState & {
  toggleChat: () => void;
  toggleOutput: () => void;
  openOutput: () => void;
  addOutputLine: (line: OutputLine) => void;
  clearOutput: () => void;
  setIsRunning: (val: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  reset: () => void;
};

// all per-room, but the store is a module singleton — hence reset
const initialState: EditorState = {
  isChatOpen: false,
  isOutputOpen: false,
  unreadCount: 0,
  outputLines: [],
  droppedLines: 0,
  isRunning: false,
  messages: [],
};

export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,

  toggleChat: () =>
    set((s) => ({
      isChatOpen: !s.isChatOpen,
      unreadCount: s.isChatOpen ? s.unreadCount : 0,
    })),
  toggleOutput: () => set((s) => ({ isOutputOpen: !s.isOutputOpen })),
  openOutput: () => set({ isOutputOpen: true }),

  addOutputLine: (line) =>
    set((s) => {
      const lines = [...s.outputLines, line];
      const overflow = lines.length - MAX_OUTPUT_LINES;
      if (overflow <= 0) return { outputLines: lines };
      return {
        outputLines: lines.slice(overflow),
        droppedLines: s.droppedLines + overflow,
      };
    }),
  clearOutput: () => set({ outputLines: [], droppedLines: 0 }),
  setIsRunning: (val) => set({ isRunning: val }),

  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg],
      unreadCount: s.isChatOpen ? s.unreadCount : s.unreadCount + 1,
    })),

  reset: () => set(initialState),
}));
