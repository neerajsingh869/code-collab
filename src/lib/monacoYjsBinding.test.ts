import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { bindMonacoToYText } from "./monacoYjsBinding";
import { asModel, FakeModel } from "@/test/fakeModel";

// One peer: a document, its editor buffer, and the binding joining them
const createPeer = () => {
  const doc = new Y.Doc();
  const yText = doc.getText("code");
  const model = new FakeModel();
  const dispose = bindMonacoToYText(yText, asModel(model));
  return { doc, yText, model, dispose };
};

const sync = (a: Y.Doc, b: Y.Doc) => {
  const fromA = Y.encodeStateAsUpdate(a, Y.encodeStateVector(b));
  const fromB = Y.encodeStateAsUpdate(b, Y.encodeStateVector(a));
  Y.applyUpdate(b, fromA);
  Y.applyUpdate(a, fromB);
};

// Deterministic, so a failing case can be replayed
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe("monaco/yjs binding", () => {
  it("writes an editor change into the document", () => {
    const peer = createPeer();
    peer.model.edit(0, 0, "hello");

    expect(peer.yText.toString()).toBe("hello");
  });

  it("applies a remote change to the editor", () => {
    const a = createPeer();
    const b = createPeer();

    b.model.edit(0, 0, "from b");
    sync(a.doc, b.doc);

    expect(a.model.getValue()).toBe("from b");
  });

  it("does not echo a remote change back into the document", () => {
    const a = createPeer();
    const b = createPeer();

    b.model.edit(0, 0, "once");
    sync(a.doc, b.doc);

    expect(a.yText.toString()).toBe("once");
    expect(a.model.getValue()).toBe("once");
  });

  it("keeps concurrent edits in different places — the bug this replaces", () => {
    const a = createPeer();
    const b = createPeer();

    a.model.edit(0, 0, "line one\nline two\nline three");
    sync(a.doc, b.doc);

    // both type before either update reaches the other
    a.model.edit(0, 0, "A");
    b.model.edit(b.model.getValue().length, 0, "B");
    sync(a.doc, b.doc);

    expect(a.model.getValue()).toBe(b.model.getValue());
    expect(a.model.getValue()).toContain("A");
    expect(a.model.getValue()).toContain("B");
    expect(a.model.getValue()).toBe("Aline one\nline two\nline threeB");
  });

  it("survives a multi-line replacement", () => {
    const a = createPeer();
    const b = createPeer();

    a.model.edit(0, 0, "one\ntwo\nthree");
    sync(a.doc, b.doc);

    a.model.edit(4, 3, "TWO\nTWO-AND-A-HALF");
    sync(a.doc, b.doc);

    expect(b.model.getValue()).toBe("one\nTWO\nTWO-AND-A-HALF\nthree");
    expect(b.yText.toString()).toBe(b.model.getValue());
  });

  it("converges under randomised concurrent editing", () => {
    const random = mulberry32(20260825);
    const words = ["const ", "x", "()\n", " => {", "}\n", "return ", "42"];

    for (let round = 0; round < 200; round += 1) {
      const a = createPeer();
      const b = createPeer();

      a.model.edit(0, 0, "start\n");
      sync(a.doc, b.doc);

      for (const peer of [a, b, a, b]) {
        const length = peer.model.getValue().length;
        const offset = Math.floor(random() * (length + 1));

        if (length > 2 && random() < 0.4) {
          const deleteLength = Math.min(
            1 + Math.floor(random() * 3),
            length - offset,
          );
          if (deleteLength > 0) peer.model.edit(offset, deleteLength, "");
        } else {
          peer.model.edit(offset, 0, words[Math.floor(random() * words.length)]);
        }
      }

      sync(a.doc, b.doc);

      expect(a.model.getValue()).toBe(b.model.getValue());
      // the editor buffer never drifts from the document driving it
      expect(a.model.getValue()).toBe(a.yText.toString());
      expect(b.model.getValue()).toBe(b.yText.toString());
    }
  });

  it("stops writing through once disposed", () => {
    const peer = createPeer();
    peer.model.edit(0, 0, "kept");
    peer.dispose();
    peer.model.edit(4, 0, " dropped");

    expect(peer.yText.toString()).toBe("kept");
  });
});
