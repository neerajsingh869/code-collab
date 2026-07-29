import { create } from "zustand";
import type { OutputLine, ChatMessage } from "@/types";

// local-only UI state (panels, output, chat) — kept separate from Liveblocks
// storage so it never syncs across users

type EditorState = {
  // Panel visibility
  isChatOpen: boolean;
  isOutputOpen: boolean;
  unreadCount: number;

  // Code execution output
  outputLines: OutputLine[];
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

// The store is a module singleton, so it outlives any one room. Everything in
// here is scoped to a single room, which is what `reset` exists for.
const initialState: EditorState = {
  isChatOpen: false,
  isOutputOpen: false,
  unreadCount: 0,
  outputLines: [],
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
    set((s) => ({ outputLines: [...s.outputLines, line] })),
  clearOutput: () => set({ outputLines: [] }),
  setIsRunning: (val) => set({ isRunning: val }),

  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg],
      unreadCount: s.isChatOpen ? s.unreadCount : s.unreadCount + 1,
    })),

  reset: () => set(initialState),
}));
