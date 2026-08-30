import { describe, expect, it } from "vitest";
import type { editor } from "monaco-editor";
import { asModel, FakeModel } from "@/test/fakeModel";
import { createRemoteCursorLayer, decorationsFor } from "./remoteCursors";

const cursor = (overrides: Partial<Parameters<typeof decorationsFor>[1][0]> = {}) => ({
  connectionId: 1,
  name: "Priya",
  colorIndex: 2,
  anchor: 0,
  head: 0,
  ...overrides,
});

// Only the four members the layer touches; the collection and widget list are
// readable so the test can assert on what was handed to Monaco.
const fakeEditor = (model: FakeModel) => {
  let decorations: editor.IModelDeltaDecoration[] = [];
  const widgets = new Map<string, editor.IContentWidget>();

  const instance = {
    getModel: () => asModel(model),
    createDecorationsCollection: () => ({
      set: (next: editor.IModelDeltaDecoration[]) => {
        decorations = next;
      },
      clear: () => {
        decorations = [];
      },
    }),
    addContentWidget: (widget: editor.IContentWidget) =>
      widgets.set(widget.getId(), widget),
    removeContentWidget: (widget: editor.IContentWidget) =>
      widgets.delete(widget.getId()),
  };

  return {
    instance: instance as unknown as editor.IStandaloneCodeEditor,
    decorations: () => decorations,
    widgets: () => widgets,
  };
};

describe("decorationsFor", () => {
  it("draws only a caret for a collapsed cursor", () => {
    const model = asModel(new FakeModel("const x = 1"));

    const [caret, ...rest] = decorationsFor(model, [cursor({ head: 6, anchor: 6 })]);

    expect(rest).toHaveLength(0);
    expect(caret.options.className).toContain("remote-caret");
    expect(caret.options.showIfCollapsed).toBe(true);
    expect(caret.range).toMatchObject({
      startLineNumber: 1,
      startColumn: 7,
      endLineNumber: 1,
      endColumn: 7,
    });
  });

  it("draws the selection and the caret when text is selected", () => {
    const model = asModel(new FakeModel("const x = 1"));

    const [selection, caret] = decorationsFor(model, [
      cursor({ anchor: 6, head: 9 }),
    ]);

    expect(selection.options.className).toContain("remote-selection");
    expect(selection.range).toMatchObject({ startColumn: 7, endColumn: 10 });
    // caret sits at the head, which is where the user's cursor actually is
    expect(caret.range).toMatchObject({ startColumn: 10, endColumn: 10 });
  });

  it("puts the caret at the head of a selection dragged backwards", () => {
    const model = asModel(new FakeModel("const x = 1"));

    const [selection, caret] = decorationsFor(model, [
      cursor({ anchor: 9, head: 6 }),
    ]);

    expect(selection.range).toMatchObject({ startColumn: 7, endColumn: 10 });
    expect(caret.range).toMatchObject({ startColumn: 7, endColumn: 7 });
  });

  it("maps offsets across lines", () => {
    const model = asModel(new FakeModel("one\ntwo\nthree"));

    const [caret] = decorationsFor(model, [cursor({ anchor: 5, head: 5 })]);

    expect(caret.range).toMatchObject({ startLineNumber: 2, startColumn: 2 });
  });

  it("colours each connection with its own class", () => {
    const model = asModel(new FakeModel("abc"));

    const [a, b] = decorationsFor(model, [
      cursor({ connectionId: 1, colorIndex: 0 }),
      cursor({ connectionId: 2, colorIndex: 4 }),
    ]);

    expect(a.options.className).toContain("remote-color-0");
    expect(b.options.className).toContain("remote-color-4");
  });
});

describe("remote cursor layer", () => {
  it("adds one labelled widget per remote user", () => {
    const model = new FakeModel("one\ntwo");
    const monaco = fakeEditor(model);
    const layer = createRemoteCursorLayer(monaco.instance);

    layer.render([
      cursor({ connectionId: 7, name: "Priya", head: 5, anchor: 5 }),
      cursor({ connectionId: 8, name: "Sam", head: 1, anchor: 1 }),
    ]);

    const labels = [...monaco.widgets().values()].map((w) =>
      w.getDomNode().textContent,
    );
    expect(labels).toEqual(["Priya", "Sam"]);
    expect(monaco.decorations()).toHaveLength(2);
  });

  it("keeps the label out of the accessibility tree", () => {
    const model = new FakeModel("one");
    const monaco = fakeEditor(model);

    createRemoteCursorLayer(monaco.instance).render([cursor()]);

    const [widget] = [...monaco.widgets().values()];
    expect(widget.getDomNode()).toHaveAttribute("aria-hidden", "true");
  });

  it("drops a user's widget once they leave", () => {
    const model = new FakeModel("one\ntwo");
    const monaco = fakeEditor(model);
    const layer = createRemoteCursorLayer(monaco.instance);

    layer.render([cursor({ connectionId: 7 }), cursor({ connectionId: 8 })]);
    layer.render([cursor({ connectionId: 7 })]);

    expect([...monaco.widgets().keys()]).toEqual(["remote-cursor-7"]);
  });

  it("moves an existing user rather than stacking a second widget", () => {
    const model = new FakeModel("one\ntwo");
    const monaco = fakeEditor(model);
    const layer = createRemoteCursorLayer(monaco.instance);

    layer.render([cursor({ connectionId: 7, head: 0, anchor: 0 })]);
    layer.render([cursor({ connectionId: 7, head: 6, anchor: 6 })]);

    expect(monaco.widgets().size).toBe(1);
    expect(
      [...monaco.widgets().values()][0].getPosition()?.position,
    ).toMatchObject({ lineNumber: 2, column: 3 });
  });

  it("clears everything on dispose", () => {
    const model = new FakeModel("one");
    const monaco = fakeEditor(model);
    const layer = createRemoteCursorLayer(monaco.instance);

    layer.render([cursor({ connectionId: 7 }), cursor({ connectionId: 8 })]);
    layer.dispose();

    expect(monaco.widgets().size).toBe(0);
    expect(monaco.decorations()).toHaveLength(0);
  });
});
