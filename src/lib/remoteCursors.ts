import type { editor } from "monaco-editor";
import { rangeAt } from "./monacoOffsets";

// Type-only import again, so Monaco's enums aren't available as values here.
// TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges keeps a caret from
// swallowing text typed next to it; the label prefers
// ContentWidgetPositionPreference.ABOVE and falls back to BELOW on line one.
const NEVER_GROWS = 1;
const ABOVE = 1;
const BELOW = 2;

export type RemoteCursor = {
  connectionId: number;
  name: string;
  colorIndex: number;
  // where the selection started and where the caret is; equal when collapsed
  anchor: number;
  head: number;
};

// Colours are six static classes in globals.css rather than inline styles,
// because a decoration is addressed by class name and colorForConnection
// already reduces every connection to one of six.
export const decorationsFor = (
  model: editor.ITextModel,
  cursors: RemoteCursor[],
): editor.IModelDeltaDecoration[] =>
  cursors.flatMap((cursor) => {
    const start = Math.min(cursor.anchor, cursor.head);
    const end = Math.max(cursor.anchor, cursor.head);

    const caret: editor.IModelDeltaDecoration = {
      range: rangeAt(model, cursor.head, 0),
      options: {
        className: `remote-caret remote-color-${cursor.colorIndex}`,
        // a caret is an empty range, which Monaco skips by default
        showIfCollapsed: true,
        stickiness: NEVER_GROWS,
        zIndex: 1,
      },
    };

    if (end === start) return [caret];

    return [
      {
        range: rangeAt(model, start, end - start),
        options: {
          className: `remote-selection remote-color-${cursor.colorIndex}`,
          stickiness: NEVER_GROWS,
        },
      },
      caret,
    ];
  });

// Names go in content widgets, not in the decoration's injected text: injected
// text is laid out inline, so a label appearing beside someone's caret would
// shove the code on that line sideways while you were reading it. A content
// widget floats over the text and Monaco keeps it pinned through scrolling.
const nameWidget = (cursor: RemoteCursor, position: () => editor.IContentWidgetPosition | null) => {
  const node = document.createElement("div");
  node.className = `remote-label remote-color-${cursor.colorIndex}`;
  node.textContent = cursor.name;
  // decoration, and duplicated by the presence avatars in the header
  node.setAttribute("aria-hidden", "true");

  return {
    getId: () => `remote-cursor-${cursor.connectionId}`,
    getDomNode: () => node,
    getPosition: position,
    // labels near the right-hand edge should escape the editor box, not clip
    allowEditorOverflow: true,
    suppressMouseDown: true,
  } satisfies editor.IContentWidget;
};

export const createRemoteCursorLayer = (
  monacoEditor: editor.IStandaloneCodeEditor,
) => {
  const decorations = monacoEditor.createDecorationsCollection();
  const widgets = new Map<number, editor.IContentWidget>();

  const removeWidget = (connectionId: number) => {
    const widget = widgets.get(connectionId);
    if (!widget) return;
    monacoEditor.removeContentWidget(widget);
    widgets.delete(connectionId);
  };

  const render = (cursors: RemoteCursor[]) => {
    const model = monacoEditor.getModel();
    if (!model) return;

    decorations.set(decorationsFor(model, cursors));

    // Rebuilt every render rather than diffed: the name and colour are fixed
    // for a connection, so only the position moves, and a widget's position is
    // read back from Monaco on each layout.
    for (const connectionId of [...widgets.keys()]) {
      if (!cursors.some((cursor) => cursor.connectionId === connectionId)) {
        removeWidget(connectionId);
      }
    }

    for (const cursor of cursors) {
      removeWidget(cursor.connectionId);
      const { lineNumber, column } = model.getPositionAt(cursor.head);
      const widget = nameWidget(cursor, () => ({
        position: { lineNumber, column },
        preference: [ABOVE, BELOW],
      }));
      widgets.set(cursor.connectionId, widget);
      monacoEditor.addContentWidget(widget);
    }
  };

  const dispose = () => {
    decorations.clear();
    for (const connectionId of [...widgets.keys()]) removeWidget(connectionId);
  };

  return { render, dispose };
};
