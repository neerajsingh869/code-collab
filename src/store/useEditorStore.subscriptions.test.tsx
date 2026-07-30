import { describe, it, expect, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, act } from "@testing-library/react";
import { useEditorStore } from "./useEditorStore";

// These assert how often components render, not what they show.

const initialState = useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState(initialState, true);
});

type State = ReturnType<typeof useEditorStore.getState>;

function renderProbe<T>(selector: (state: State) => T) {
  const counter = { renders: 0 };

  function Probe() {
    const value = useEditorStore(selector);
    // in an effect because mutating during render trips the compiler lint,
    // and this counts committed renders anyway
    useEffect(() => {
      counter.renders += 1;
    });
    return <span>{String(value)}</span>;
  }

  render(<Probe />);
  return counter;
}

describe("store subscriptions", () => {
  it("does not re-render a panel-state reader when output lines are appended", () => {
    const counter = renderProbe((s) => s.isChatOpen);
    const before = counter.renders;

    act(() => {
      useEditorStore.getState().addOutputLine({ type: "log", text: "one" });
      useEditorStore.getState().addOutputLine({ type: "log", text: "two" });
      useEditorStore.getState().addOutputLine({ type: "log", text: "three" });
    });

    expect(counter.renders).toBe(before);
  });

  it("does not re-render an output reader when chat messages arrive", () => {
    const counter = renderProbe((s) => s.outputLines);
    const before = counter.renders;

    act(() => {
      useEditorStore.getState().addMessage({
        id: "1",
        user: "Someone",
        color: "#58a6ff",
        text: "hi",
        timestamp: Date.now(),
      });
    });

    expect(counter.renders).toBe(before);
  });

  it("still re-renders a reader when its own slice changes", () => {
    const counter = renderProbe((s) => s.isChatOpen);
    const before = counter.renders;

    act(() => {
      useEditorStore.getState().toggleChat();
    });

    expect(counter.renders).toBeGreaterThan(before);
  });

  // why selecting actions individually is free
  it("keeps action identities stable across state updates", () => {
    const before = useEditorStore.getState().toggleChat;

    act(() => {
      useEditorStore.getState().addOutputLine({ type: "log", text: "x" });
      useEditorStore.getState().setIsRunning(true);
    });

    expect(useEditorStore.getState().toggleChat).toBe(before);
  });
});
