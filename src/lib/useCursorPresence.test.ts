import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { encodeAnchor } from "./cursorAnchor";
import { resolveRemoteCursors } from "./useCursorPresence";

const docWith = (text: string) => {
  const doc = new Y.Doc();
  const yText = doc.getText("code");
  yText.insert(0, text);
  return { doc, yText };
};

const participant = (
  connectionId: number,
  name: string,
  cursor: { anchor: number[]; head: number[] } | null,
) => ({ connectionId, presence: { name, cursor } });

describe("resolveRemoteCursors", () => {
  it("turns presence anchors into editor offsets", () => {
    const { doc, yText } = docWith("const answer = 42");

    const [cursor] = resolveRemoteCursors(doc, [
      participant(3, "Priya", {
        anchor: encodeAnchor(yText, 6),
        head: encodeAnchor(yText, 12),
      }),
    ]);

    expect(cursor).toMatchObject({
      connectionId: 3,
      name: "Priya",
      anchor: 6,
      head: 12,
    });
  });

  it("gives each connection the colour its avatar already uses", () => {
    const { doc, yText } = docWith("abc");
    const at = (index: number) => ({
      anchor: encodeAnchor(yText, index),
      head: encodeAnchor(yText, index),
    });

    const cursors = resolveRemoteCursors(doc, [
      participant(0, "A", at(0)),
      participant(7, "B", at(1)),
    ]);

    expect(cursors.map((c) => c.colorIndex)).toEqual([0, 1]);
  });

  it("skips someone who has no cursor in the editor", () => {
    const { doc } = docWith("abc");

    expect(resolveRemoteCursors(doc, [participant(1, "Idle", null)])).toEqual([]);
  });

  it("skips an anchor that no longer resolves rather than guessing at one", () => {
    const { doc } = docWith("abc");

    const cursors = resolveRemoteCursors(doc, [
      participant(1, "Broken", { anchor: [255, 255], head: [255, 255] }),
    ]);

    expect(cursors).toEqual([]);
  });

  it("follows the text when someone else edits above the caret", () => {
    const { doc, yText } = docWith("line one\nline two");
    const others = [
      participant(1, "Priya", {
        anchor: encodeAnchor(yText, 12),
        head: encodeAnchor(yText, 12),
      }),
    ];

    yText.insert(0, "inserted\n");

    const [cursor] = resolveRemoteCursors(doc, others);
    expect(cursor.head).toBe(12 + "inserted\n".length);
  });
});
