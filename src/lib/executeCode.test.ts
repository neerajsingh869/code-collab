import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeCode } from "./executeCode";
import type { OutputLine } from "@/types";

// jsdom has no Worker, so drive a stand-in by hand.
class MockWorker {
  static instances: MockWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;

  constructor(public url: string) {
    MockWorker.instances.push(this);
  }

  terminate() {
    this.terminated = true;
  }

  send(data: unknown) {
    // real workers go silent once terminated
    if (this.terminated) return;
    this.onmessage?.({ data } as MessageEvent);
  }

  fail(message: string) {
    this.onerror?.({
      message,
      preventDefault: () => {},
    } as ErrorEvent);
  }
}

const latestWorker = () =>
  MockWorker.instances[MockWorker.instances.length - 1];

let revoked: string[] = [];

beforeEach(() => {
  MockWorker.instances = [];
  revoked = [];
  vi.stubGlobal("Worker", MockWorker);
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: () => "blob:mock-url",
    revokeObjectURL: (url: string) => revoked.push(url),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("executeCode", () => {
  it("forwards log and error output, then resolves when the worker is done", async () => {
    const lines: OutputLine[] = [];
    const run = executeCode("console.log('hi')", (line) => lines.push(line));

    const worker = latestWorker();
    worker.send({ type: "log", text: "hi" });
    worker.send({ type: "error", text: "boom" });
    worker.send({ type: "done" });

    await run;

    expect(lines).toEqual([
      { type: "log", text: "hi" },
      { type: "error", text: "boom" },
    ]);
    expect(worker.terminated).toBe(true);
    expect(revoked).toEqual(["blob:mock-url"]);
  });

  // guards the old iframe bug: it shared the main thread, so a blocking loop
  // meant this timer never fired
  it("terminates the worker and reports a timeout when code never finishes", async () => {
    vi.useFakeTimers();
    const lines: OutputLine[] = [];
    const run = executeCode("while (true) {}", (line) => lines.push(line));

    const worker = latestWorker();
    expect(worker.terminated).toBe(false);

    await vi.advanceTimersByTimeAsync(5000);
    await run;

    expect(lines).toEqual([
      { type: "error", text: "Error: execution timed out after 5 seconds" },
    ]);
    expect(worker.terminated).toBe(true);
  });

  it("surfaces a script that fails to parse", async () => {
    const lines: OutputLine[] = [];
    const run = executeCode("interface User {}", (line) => lines.push(line));

    latestWorker().fail("Unexpected identifier 'User'");
    await run;

    expect(lines).toEqual([
      { type: "error", text: "Unexpected identifier 'User'" },
    ]);
  });

  it("ignores anything that is not a recognised message", async () => {
    const lines: OutputLine[] = [];
    const run = executeCode("noop()", (line) => lines.push(line));

    const worker = latestWorker();
    worker.send({ type: "something-else", text: "ignored" });
    worker.send(null);
    worker.send({ type: "done" });

    await run;
    expect(lines).toEqual([]);
  });

  it("only cleans up once when a timeout and a done message race", async () => {
    vi.useFakeTimers();
    const lines: OutputLine[] = [];
    const run = executeCode("slow()", (line) => lines.push(line));

    const worker = latestWorker();
    await vi.advanceTimersByTimeAsync(5000);
    worker.send({ type: "done" });
    await run;

    expect(lines).toHaveLength(1);
    expect(revoked).toEqual(["blob:mock-url"]);
  });
});
