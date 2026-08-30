import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useThrottledCallback } from "./useThrottledCallback";

describe("useThrottledCallback", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs the first call immediately", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(spy, 100));

    act(() => result.current("first"));

    expect(spy).toHaveBeenCalledExactlyOnceWith("first");
  });

  it("collapses a burst into the leading call plus the last one", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(spy, 100));

    act(() => {
      result.current(1);
      result.current(2);
      result.current(3);
    });

    expect(spy).toHaveBeenCalledExactlyOnceWith(1);

    act(() => void vi.advanceTimersByTime(100));

    // 2 was superseded before the interval was up; 3 is where the cursor
    // actually ended up
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(3);
  });

  it("keeps firing at the interval while calls keep coming", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(spy, 100));

    act(() => result.current("a"));
    act(() => void vi.advanceTimersByTime(100));
    act(() => result.current("b"));
    act(() => void vi.advanceTimersByTime(100));
    act(() => result.current("c"));

    // unlike a debounce, a steady stream is never starved
    expect(spy.mock.calls).toEqual([["a"], ["b"], ["c"]]);
  });

  it("does not fire again when nothing arrived during the interval", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(spy, 100));

    act(() => result.current("only"));
    act(() => void vi.advanceTimersByTime(500));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("drops a pending trailing call when the caller unmounts", () => {
    const spy = vi.fn();
    const { result, unmount } = renderHook(() =>
      useThrottledCallback(spy, 100),
    );

    act(() => {
      result.current("leading");
      result.current("trailing");
    });
    unmount();
    act(() => void vi.advanceTimersByTime(100));

    expect(spy).toHaveBeenCalledExactlyOnceWith("leading");
  });

  it("calls the newest callback, not the one captured on first render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback }) => useThrottledCallback(callback, 100),
      { initialProps: { callback: first } },
    );

    rerender({ callback: second });
    act(() => result.current());

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
