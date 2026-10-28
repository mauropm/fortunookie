import { useCallback, useState } from "react";

const KEY = "fc.count";

function readCount(): number {
  try {
    const raw = sessionStorage.getItem(KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Session-scoped cookie counter. Lives in sessionStorage so it resets when
 * the tab session ends — nothing is sent to any server.
 */
export function useSessionCounter(): [number, () => void] {
  const [count, setCount] = useState<number>(readCount);

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      try {
        sessionStorage.setItem(KEY, String(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return [count, increment];
}
