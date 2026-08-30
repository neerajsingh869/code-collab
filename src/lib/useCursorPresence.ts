import { useEffect } from "react";
import { useRoom, useUpdateMyPresence } from "@liveblocks/react";
import type { editor } from "monaco-editor";
import type * as Y from "yjs";
import { colorIndexForConnection } from "./constants";
import { decodeAnchor, encodeAnchor, type CursorPresence } from "./cursorAnchor";
import { createRemoteCursorLayer, type RemoteCursor } from "./remoteCursors";
import { useThrottledCallback } from "./useThrottledCallback";

// Presence is cheap and ephemeral, so a caret can go out far more often than
// the document write next door, which is a debounce because nobody needs a
// half-typed identifier. 60ms is roughly a frame at the rate a drag-select
// generates events.
const CURSOR_INTERVAL_MS = 60;

type Participant = {
  connectionId: number;
  presence: { name: string; cursor: CursorPresence | null };
};

// An anchor that no longer resolves is dropped rather than clamped to a nearby
// offset: a caret drawn in the wrong place reads as a bug, an absent one reads
// as someone who hasn't put their cursor in the file yet.
export const resolveRemoteCursors = (
  doc: Y.Doc,
  participants: readonly Participant[],
): RemoteCursor[] =>
  participants.flatMap((participant) => {
    const { cursor, name } = participant.presence;
    if (!cursor) return [];

    const anchor = decodeAnchor(doc, cursor.anchor);
    const head = decodeAnchor(doc, cursor.head);
    if (anchor === null || head === null) return [];

    return [
      {
        connectionId: participant.connectionId,
        name,
        colorIndex: colorIndexForConnection(participant.connectionId),
        anchor,
        head,
      },
    ];
  });

export const useBroadcastCursor = (
  monacoEditor: editor.IStandaloneCodeEditor | null,
  yText: Y.Text,
) => {
  const updateMyPresence = useUpdateMyPresence();

  const publish = useThrottledCallback((cursor: CursorPresence) => {
    updateMyPresence({ cursor });
  }, CURSOR_INTERVAL_MS);

  useEffect(() => {
    if (!monacoEditor) return;

    const listener = monacoEditor.onDidChangeCursorSelection(({ selection }) => {
      const model = monacoEditor.getModel();
      if (!model) return;

      // Encoded here rather than inside the throttle: the offsets are only
      // true at the moment of the event, while the relative positions they
      // become stay true however long the send waits.
      publish({
        anchor: encodeAnchor(yText, model.getOffsetAt(selection.getSelectionStart())),
        head: encodeAnchor(yText, model.getOffsetAt(selection.getPosition())),
      });
    });

    return () => {
      listener.dispose();
      // otherwise the caret is left behind on everyone else's screen
      updateMyPresence({ cursor: null });
    };
  }, [monacoEditor, yText, publish, updateMyPresence]);
};

export const useRemoteCursors = (
  monacoEditor: editor.IStandaloneCodeEditor | null,
  yText: Y.Text,
) => {
  const room = useRoom();

  // Subscribed to the room directly instead of through useOthers, so a caret
  // moving on someone else's machine redraws in Monaco without re-rendering
  // this component and the editor under it.
  useEffect(() => {
    const doc = yText.doc;
    if (!monacoEditor || !doc) return;

    const layer = createRemoteCursorLayer(monacoEditor);
    const render = () =>
      layer.render(resolveRemoteCursors(doc, room.getOthers()));

    render();
    const unsubscribe = room.subscribe("others", render);
    // a remote edit shifts every anchor in the file, so redraw on those too
    doc.on("update", render);

    return () => {
      unsubscribe();
      doc.off("update", render);
      layer.dispose();
    };
  }, [monacoEditor, yText, room]);
};
