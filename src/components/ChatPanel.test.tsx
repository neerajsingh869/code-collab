import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEditorStore } from "@/store/useEditorStore";
import ChatPanel from "./ChatPanel";

vi.mock("@liveblocks/react", () => ({
  useBroadcastEvent: () => vi.fn(),
  useSelf: () => 1,
}));

const initialState = useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState(initialState, true);
});

describe("ChatPanel accessibility", () => {
  it("labels the message field and the close button", () => {
    render(<ChatPanel userName="Neeraj" />);

    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close chat" }),
    ).toBeInTheDocument();
  });

  it("announces incoming messages through a log region", () => {
    useEditorStore.setState({
      messages: [
        {
          id: "1",
          user: "Asha",
          color: "#f00",
          text: "shipping it",
          timestamp: 0,
        },
      ],
    });
    render(<ChatPanel userName="Neeraj" />);

    const log = screen.getByRole("log", { name: "Chat messages" });
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveTextContent("shipping it");
  });

  it("moves focus into the message field when the panel opens", () => {
    render(<ChatPanel userName="Neeraj" />);

    expect(screen.getByLabelText("Message")).toHaveFocus();
  });
});
