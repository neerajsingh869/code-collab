import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useEditorStore } from "@/store/useEditorStore";
import OutputPanel from "./OutputPanel";

const initialState = useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState(initialState, true);
});

describe("OutputPanel", () => {
  it("shows a hint to press Run when there's no output yet", () => {
    render(<OutputPanel />);
    expect(screen.getByText(/press Run to execute/i)).toBeInTheDocument();
  });

  it("shows a running indicator while code is executing", () => {
    useEditorStore.setState({ isRunning: true });
    render(<OutputPanel />);
    expect(screen.getByText("running...")).toBeInTheDocument();
  });

  it("renders both log and error lines", () => {
    useEditorStore.setState({
      outputLines: [
        { type: "log", text: "hello world" },
        { type: "error", text: "boom" },
      ],
    });
    render(<OutputPanel />);

    expect(screen.getByText("hello world")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("clears output when the clear button is clicked", () => {
    useEditorStore.setState({
      outputLines: [{ type: "log", text: "hello" }],
    });
    render(<OutputPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Clear output" }));

    expect(useEditorStore.getState().outputLines).toHaveLength(0);
  });

  it("announces output in a log region and marks errors without relying on colour", () => {
    useEditorStore.setState({
      outputLines: [
        { type: "log", text: "hello world" },
        { type: "error", text: "boom" },
      ],
    });
    render(<OutputPanel />);

    const log = screen.getByRole("log", { name: "Program output" });
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveTextContent("Error: boom");
  });

  it("gives both icon buttons an accessible name", () => {
    render(<OutputPanel />);

    expect(
      screen.getByRole("button", { name: "Clear output" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close output panel" }),
    ).toBeInTheDocument();
  });
});
