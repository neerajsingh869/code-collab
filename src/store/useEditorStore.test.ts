import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "./useEditorStore";

const initialState = useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState(initialState, true);
});

describe("useEditorStore", () => {
  it("toggles chat and output panels independently", () => {
    useEditorStore.getState().toggleChat();
    expect(useEditorStore.getState().isChatOpen).toBe(true);
    expect(useEditorStore.getState().isOutputOpen).toBe(false);

    useEditorStore.getState().toggleOutput();
    expect(useEditorStore.getState().isOutputOpen).toBe(true);
  });

  it("openOutput is idempotent", () => {
    useEditorStore.getState().openOutput();
    useEditorStore.getState().openOutput();
    expect(useEditorStore.getState().isOutputOpen).toBe(true);
  });

  it("appends output lines and clears them", () => {
    useEditorStore.getState().addOutputLine({ type: "log", text: "hello" });
    useEditorStore.getState().addOutputLine({ type: "error", text: "oops" });
    expect(useEditorStore.getState().outputLines).toHaveLength(2);

    useEditorStore.getState().clearOutput();
    expect(useEditorStore.getState().outputLines).toHaveLength(0);
  });

  it("tracks isRunning", () => {
    useEditorStore.getState().setIsRunning(true);
    expect(useEditorStore.getState().isRunning).toBe(true);
  });

  it("appends chat messages", () => {
    useEditorStore.getState().addMessage({
      id: "1",
      user: "Neeraj",
      color: "#58a6ff",
      text: "hi",
      timestamp: Date.now(),
    });
    expect(useEditorStore.getState().messages).toHaveLength(1);
  });

  it("counts messages as unread only while the chat panel is closed", () => {
    useEditorStore.getState().addMessage({
      id: "1",
      user: "Someone",
      color: "#58a6ff",
      text: "while closed",
      timestamp: Date.now(),
    });
    expect(useEditorStore.getState().unreadCount).toBe(1);

    useEditorStore.getState().toggleChat();
    expect(useEditorStore.getState().unreadCount).toBe(0);

    useEditorStore.getState().addMessage({
      id: "2",
      user: "Someone",
      color: "#58a6ff",
      text: "while open",
      timestamp: Date.now(),
    });
    expect(useEditorStore.getState().unreadCount).toBe(0);
  });

  // Guards the leak between rooms: the store is a module singleton, so without
  // this every room inherited the previous room's output and chat history.
  it("reset clears room-scoped state but keeps the actions callable", () => {
    const store = useEditorStore.getState();
    store.addOutputLine({ type: "log", text: "from the old room" });
    store.addMessage({
      id: "1",
      user: "Someone",
      color: "#58a6ff",
      text: "old chat",
      timestamp: Date.now(),
    });
    store.toggleOutput();
    store.setIsRunning(true);

    useEditorStore.getState().reset();

    const after = useEditorStore.getState();
    expect(after.outputLines).toEqual([]);
    expect(after.messages).toEqual([]);
    expect(after.unreadCount).toBe(0);
    expect(after.isOutputOpen).toBe(false);
    expect(after.isChatOpen).toBe(false);
    expect(after.isRunning).toBe(false);

    after.addOutputLine({ type: "log", text: "new room" });
    expect(useEditorStore.getState().outputLines).toHaveLength(1);
  });

  it("keeps the tail of a runaway log and says how much it dropped", () => {
    // appending copies the array, so an uncapped log is quadratic
    for (let i = 0; i < 2050; i += 1) {
      useEditorStore.getState().addOutputLine({ type: "log", text: `line ${i}` });
    }

    const after = useEditorStore.getState();
    expect(after.outputLines).toHaveLength(2000);
    expect(after.outputLines[0].text).toBe("line 50");
    expect(after.outputLines.at(-1)?.text).toBe("line 2049");
    expect(after.droppedLines).toBe(50);
  });

  it("forgets the dropped count when the output is cleared", () => {
    for (let i = 0; i < 2010; i += 1) {
      useEditorStore.getState().addOutputLine({ type: "log", text: `${i}` });
    }
    useEditorStore.getState().clearOutput();

    expect(useEditorStore.getState().droppedLines).toBe(0);
  });
});
