import type { editor, IRange } from "monaco-editor";

// Monaco addresses text by line and column; Yjs and the cursor anchors both
// work in flat offsets. Everything crossing that boundary goes through here.
export const rangeAt = (
  model: editor.ITextModel,
  offset: number,
  length: number,
): IRange => {
  const start = model.getPositionAt(offset);
  const end = model.getPositionAt(offset + length);
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  };
};
