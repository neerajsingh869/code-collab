import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { expectNoA11yViolations } from "./axe";
import { useEditorStore } from "@/store/useEditorStore";
import HomePage from "@/app/page";
import EditorLayout from "@/components/EditorLayout";
import ChatPanel from "@/components/ChatPanel";
import OutputPanel from "@/components/OutputPanel";
import UserPresence from "@/components/UserPresence";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Monaco needs a real layout engine. The editor's own markup is covered by
// the shell render below.
vi.mock("@/components/CollaborativeEditor", () => ({
  default: () => <div>editor</div>,
}));

// A real Y.Doc rather than a stub: EditorLayout reads the document to run it
// and rewrites it on a language switch, so the shape has to behave.
vi.mock("@/lib/useYjsRoom", async () => {
  const Y = await import("yjs");
  const doc = new Y.Doc();
  doc.getText("code").insert(0, "const a = 1");
  return {
    useYjsProvider: () => ({ synced: true, on: () => {}, off: () => {} }),
    useYText: () => doc.getText("code"),
  };
});

const storage: Record<string, unknown> = {
  language: "typescript",
  pristine: true,
};

vi.mock("@liveblocks/react", () => ({
  useStorage: (selector: (root: typeof storage) => unknown) =>
    selector(storage),
  useMutation: () => vi.fn(),
  useEventListener: () => {},
  useBroadcastEvent: () => vi.fn(),
  useSelf: (selector?: (me: { connectionId: number }) => unknown) =>
    selector ? selector({ connectionId: 1 }) : { presence: { name: "Neeraj" }, connectionId: 1 },
  useOthers: () => [{ connectionId: 2, presence: { name: "Asha" } }],
}));

const initialState = useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState(initialState, true);
});

describe("axe", () => {
  it("finds nothing on the landing page", async () => {
    const { container } = render(<HomePage />);
    await expectNoA11yViolations(container);
  });

  it("finds nothing on the editor shell", async () => {
    const { container } = render(
      <EditorLayout roomId="room-1" userName="Neeraj" />,
    );
    await expectNoA11yViolations(container);
  });

  it("finds nothing with both panels open and populated", async () => {
    useEditorStore.setState({
      isChatOpen: true,
      isOutputOpen: true,
      unreadCount: 3,
      outputLines: [
        { type: "log", text: "hello" },
        { type: "error", text: "boom" },
      ],
      messages: [
        { id: "1", user: "Asha", color: "#58a6ff", text: "hi", timestamp: 0 },
      ],
    });

    const { container } = render(
      <EditorLayout roomId="room-1" userName="Neeraj" />,
    );
    await expectNoA11yViolations(container);
  });

  it("finds nothing on the panels rendered on their own", async () => {
    useEditorStore.setState({
      outputLines: [{ type: "error", text: "boom" }],
    });

    const { container } = render(
      <>
        <OutputPanel />
        <ChatPanel userName="Neeraj" />
        <UserPresence />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});

describe("structure that axe can only judge page-wide", () => {
  it("gives the editor a main landmark and a heading", () => {
    render(<EditorLayout roomId="room-1" userName="Neeraj" />);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "CodeCollab" }),
    ).toBeInTheDocument();
  });

  it("offers a way back out of a room that isn't the browser's Back button", () => {
    render(<EditorLayout roomId="room-1" userName="Neeraj" />);

    expect(screen.getByRole("link", { name: "CodeCollab" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("keeps the unrunnable Run button focusable and explained", () => {
    storage.language = "python";
    render(<EditorLayout roomId="room-1" userName="Neeraj" />);
    storage.language = "typescript";

    const run = screen.getByRole("button", { name: "Run" });
    expect(run).toHaveAttribute("aria-disabled", "true");
    expect(run).toHaveAccessibleDescription(/cannot run in the browser/i);
  });
});
