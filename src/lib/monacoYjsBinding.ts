import type * as Y from "yjs";
import type { editor } from "monaco-editor";
import { rangeAt } from "./monacoOffsets";

// Type-only imports: monaco-editor is loaded from a CDN at runtime by
// @monaco-editor/loader, so importing it for real would put a second copy of
// the editor in the bundle. The binding is handed its model instead.

// Tags transactions this binding starts, so its own observer can tell the echo
// of a local edit from a genuinely remote one.
const LOCAL_ORIGIN = Symbol("monacoYjsBinding");

type Options = {
  // Called only for edits the user actually made, never for applied remote ones
  onLocalEdit?: () => void;
};

export function bindMonacoToYText(
  yText: Y.Text,
  model: editor.ITextModel,
  { onLocalEdit }: Options = {},
): () => void {
  const doc = yText.doc;
  if (!doc) throw new Error("yText is not attached to a Y.Doc");

  // Guards the two directions against each other. Applying a remote delta
  // makes Monaco fire a change event, which would otherwise be written
  // straight back into the document.
  let applyingRemote = false;

  const withRemoteGuard = (apply: () => void) => {
    applyingRemote = true;
    try {
      apply();
    } finally {
      applyingRemote = false;
    }
  };

  const observer = (event: Y.YTextEvent) => {
    if (event.transaction.origin === LOCAL_ORIGIN) return;

    withRemoteGuard(() => {
      // Yjs deltas walk one cursor through the document: retain moves it,
      // insert leaves it after the new text, delete leaves it in place. Each
      // edit is applied on its own so the model has already caught up by the
      // time the next offset is resolved.
      let offset = 0;
      for (const op of event.delta) {
        if (op.retain !== undefined) {
          offset += op.retain;
        } else if (typeof op.insert === "string") {
          model.applyEdits([{ range: rangeAt(model, offset, 0), text: op.insert }]);
          offset += op.insert.length;
        } else if (op.delete !== undefined) {
          model.applyEdits([{ range: rangeAt(model, offset, op.delete), text: "" }]);
        }
      }
    });
  };

  const listener = model.onDidChangeContent((event) => {
    if (applyingRemote) return;

    doc.transact(() => {
      // Monaco orders changes from the end of the document backwards, so an
      // earlier change's offset is still valid after a later one is applied.
      for (const change of event.changes) {
        if (change.rangeLength > 0) {
          yText.delete(change.rangeOffset, change.rangeLength);
        }
        if (change.text) {
          yText.insert(change.rangeOffset, change.text);
        }
      }
    }, LOCAL_ORIGIN);

    onLocalEdit?.();
  });

  // The document is the source of truth on connect, not whatever Monaco was
  // showing. Empty on both sides until the provider syncs, at which point the
  // observer above fills it in.
  const initial = yText.toString();
  if (model.getValue() !== initial) {
    withRemoteGuard(() => model.setValue(initial));
  }

  yText.observe(observer);

  return () => {
    yText.unobserve(observer);
    listener.dispose();
  };
}
