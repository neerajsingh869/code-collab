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
});
