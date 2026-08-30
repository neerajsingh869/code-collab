import type { editor } from "monaco-editor";

// Monaco needs a DOM and a layout engine, so anything that talks to a text
// model is exercised against this instead: offset/position mapping, applyEdits
// and the change event, and nothing else. The contract that matters is
// Monaco's ordering guarantee — changes arrive from the end of the document
// backwards — which this reproduces.
export class FakeModel {
  private text: string;
  private listeners = new Set<(event: { changes: Change[] }) => void>();

  constructor(text = "") {
    this.text = text;
  }

  getValue() {
    return this.text;
  }

  getPositionAt(offset: number) {
    const clamped = Math.max(0, Math.min(offset, this.text.length));
    const lines = this.text.slice(0, clamped).split("\n");
    return {
      lineNumber: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  }

  getOffsetAt(position: { lineNumber: number; column: number }) {
    const lines = this.text.split("\n");
    let offset = 0;
    for (let i = 0; i < position.lineNumber - 1; i += 1) {
      offset += lines[i].length + 1;
    }
    return offset + position.column - 1;
  }

  applyEdits(edits: { range: Rangeish; text: string | null }[]) {
    const changes = edits
      .map((edit) => {
        const start = this.getOffsetAt({
          lineNumber: edit.range.startLineNumber,
          column: edit.range.startColumn,
        });
        const end = this.getOffsetAt({
          lineNumber: edit.range.endLineNumber,
          column: edit.range.endColumn,
        });
        return { rangeOffset: start, rangeLength: end - start, text: edit.text ?? "" };
      })
      .sort((a, b) => b.rangeOffset - a.rangeOffset);

    for (const change of changes) {
      this.text =
        this.text.slice(0, change.rangeOffset) +
        change.text +
        this.text.slice(change.rangeOffset + change.rangeLength);
    }

    this.emit(changes);
  }

  setValue(text: string) {
    const previous = this.text;
    this.text = text;
    this.emit([{ rangeOffset: 0, rangeLength: previous.length, text }]);
  }

  onDidChangeContent(listener: (event: { changes: Change[] }) => void) {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  // Stands in for a keystroke: goes through the same path a real edit would
  edit(offset: number, length: number, text: string) {
    const start = this.getPositionAt(offset);
    const end = this.getPositionAt(offset + length);
    this.applyEdits([
      {
        range: {
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column,
        },
        text,
      },
    ]);
  }

  private emit(changes: Change[]) {
    for (const listener of [...this.listeners]) listener({ changes });
  }
}

type Change = { rangeOffset: number; rangeLength: number; text: string };
type Rangeish = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

export const asModel = (model: FakeModel) => model as unknown as editor.ITextModel;
