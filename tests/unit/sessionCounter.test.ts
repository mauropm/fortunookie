import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionCounter } from "../../src/hooks/useSessionCounter";

describe("useSessionCounter", () => {
  beforeEach(() => sessionStorage.clear());

  it("starts at zero and increments", () => {
    const { result } = renderHook(() => useSessionCounter());
    expect(result.current[0]).toBe(0);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(1);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(2);
  });

  it("persists within the session storage", () => {
    const { result } = renderHook(() => useSessionCounter());
    act(() => result.current[1]());
    expect(sessionStorage.getItem("fc.count")).toBe("1");
    const { result: again } = renderHook(() => useSessionCounter());
    expect(again.current[0]).toBe(1);
  });
});
