import * as Y from "yjs";

// A caret sent to other clients as a character offset is stale on arrival:
// anyone inserting above it shifts the text underneath without the offset
// changing. A Yjs relative position anchors to the character itself, so it
// stays right through edits made anywhere else in the document.
//
// Carried as bytes rather than through relativePositionToJSON, whose shape Yjs
// types as `any` — presence has to be strictly typed JSON.
export type CursorAnchor = number[];

export type CursorPresence = {
  anchor: CursorAnchor;
  head: CursorAnchor;
};

export const encodeAnchor = (yText: Y.Text, index: number): CursorAnchor =>
  Array.from(
    Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(yText, index)),
  );

// Returns null when the anchor can't be placed: the character it pointed at
// was deleted, the bytes came from a client on a document we haven't caught up
// with, or another client sent something malformed.
export const decodeAnchor = (
  doc: Y.Doc,
  anchor: CursorAnchor,
): number | null => {
  try {
    const relative = Y.decodeRelativePosition(Uint8Array.from(anchor));
    return Y.createAbsolutePositionFromRelativePosition(relative, doc)?.index ?? null;
  } catch {
    return null;
  }
};
