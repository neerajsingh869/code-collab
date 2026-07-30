import { describe, it, expect } from "vitest";
import vm from "node:vm";
import { buildWorkerSource } from "./executionRuntime";

type Message = { type: string; text?: string };

// A worker's global object is `self`, which is why reassigning self.setTimeout
// inside the harness also rebinds the bare setTimeout that user code calls. A
// vm context reproduces that exactly — the sandbox's global and its `self` are
// the same object — which jsdom cannot do and a hand-written mock would only
// pretend to.
function runInSandbox(code: string, waitMs = 500): Promise<string[]> {
  const messages: Message[] = [];

  const context: Record<string, unknown> = {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console: {},
    postMessage: (message: Message) => messages.push(message),
  };

  vm.createContext(context);
  context.self = context;
  vm.runInContext(buildWorkerSource(code), context);

  // Reading back in arrival order is the whole point: it shows that "done"
  // lands after everything the program still had to say.
  const transcript = () =>
    messages.map((message) =>
      message.type === "done" ? "done" : String(message.text),
    );

  return new Promise((resolve) => {
    const deadline = Date.now() + waitMs;

    const poll = setInterval(() => {
      const finished = messages.some((message) => message.type === "done");
      if (finished || Date.now() > deadline) {
        clearInterval(poll);
        resolve(transcript());
      }
    }, 5);
  });
}

describe("execution runtime", () => {
  it("reports done once synchronous code has run", async () => {
    expect(await runInSandbox("console.log('only sync')")).toEqual([
      "only sync",
      "done",
    ]);
  });

  // The bug this guards: done used to fire the moment the synchronous body
  // returned, so the worker was killed with this callback still pending.
  it("waits for a pending timer before reporting done", async () => {
    expect(
      await runInSandbox("setTimeout(() => console.log('late'), 20)"),
    ).toEqual(["late", "done"]);
  });

  it("lets a promise chain settle first", async () => {
    const code = [
      "Promise.resolve()",
      "  .then(() => console.log('microtask 1'))",
      "  .then(() => console.log('microtask 2'))",
      "console.log('sync')",
    ].join("\n");

    expect(await runInSandbox(code)).toEqual([
      "sync",
      "microtask 1",
      "microtask 2",
      "done",
    ]);
  });

  it("waits for work a timer schedules while it runs", async () => {
    const code = [
      "setTimeout(() => {",
      "  console.log('outer')",
      "  setTimeout(() => console.log('inner'), 10)",
      "}, 10)",
    ].join("\n");

    expect(await runInSandbox(code)).toEqual(["outer", "inner", "done"]);
  });

  it("treats an interval as unfinished until it is cleared", async () => {
    const code = [
      "let ticks = 0",
      "const id = setInterval(() => {",
      "  ticks += 1",
      "  console.log('tick ' + ticks)",
      "  if (ticks === 3) clearInterval(id)",
      "}, 5)",
    ].join("\n");

    expect(await runInSandbox(code)).toEqual([
      "tick 1",
      "tick 2",
      "tick 3",
      "done",
    ]);
  });

  it("still waits for timers scheduled before the code threw", async () => {
    const code = [
      "setTimeout(() => console.log('scheduled before the throw'), 10)",
      "notDefined()",
    ].join("\n");

    expect(await runInSandbox(code)).toEqual([
      "ReferenceError: notDefined is not defined",
      "scheduled before the throw",
      "done",
    ]);
  });

  it("does not count a cleared timer as outstanding work", async () => {
    const code = [
      "const id = setTimeout(() => console.log('never runs'), 50)",
      "clearTimeout(id)",
      "console.log('cleared it')",
    ].join("\n");

    expect(await runInSandbox(code)).toEqual(["cleared it", "done"]);
  });
});
