import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { decodeAnchor, encodeAnchor } from "./cursorAnchor";

const docWith = (text: string) => {
  const doc = new Y.Doc();
  const yText = doc.getText("code");
  yText.insert(0, text);
  return { doc, yText };
};

describe("cursor anchors", () => {
  it("round-trips an offset through an unchanged document", () => {
    const { doc, yText } = docWith("const answer = 42");

    expect(decodeAnchor(doc, encodeAnchor(yText, 6))).toBe(6);
  });

  it("holds position when text is inserted above it", () => {
    const { doc, yText } = docWith("line one\nline two");
    const anchor = encodeAnchor(yText, 13); // inside "line two"

    yText.insert(0, "a new first line\n");

    expect(decodeAnchor(doc, anchor)).toBe(13 + "a new first line\n".length);
  });

  it("stays put when text is inserted below it", () => {
    const { doc, yText } = docWith("line one\n");
    const anchor = encodeAnchor(yText, 4);

    yText.insert(yText.length, "line two");

    expect(decodeAnchor(doc, anchor)).toBe(4);
  });

  it("survives the anchored character being deleted", () => {
    const { doc, yText } = docWith("abcdef");
    const anchor = encodeAnchor(yText, 3);

    yText.delete(2, 2);

    // collapses onto the deletion rather than pointing past the end
    expect(decodeAnchor(doc, anchor)).toBe(2);
  });

  it("resolves an anchor made on another replica of the same document", () => {
    const local = docWith("shared text");
    const remote = new Y.Doc();
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(local.doc));

    const anchor = encodeAnchor(remote.getText("code"), 7);

    expect(decodeAnchor(local.doc, anchor)).toBe(7);
  });

  it("returns null for bytes that aren't a relative position", () => {
    const { doc } = docWith("anything");

    expect(decodeAnchor(doc, [255, 255, 255, 255])).toBeNull();
  });
});
