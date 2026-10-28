export interface Fortune {
  id: string;
  t: string;
  c: string;
}

export interface FortuneLibrary {
  locale: string;
  count: number;
  fortunes: Fortune[];
}

export function isFortuneLibrary(value: unknown): value is FortuneLibrary {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<FortuneLibrary>;
  if (typeof v.locale !== "string" || !Array.isArray(v.fortunes) || v.fortunes.length === 0)
    return false;
  return v.fortunes.every(
    (f) =>
      f !== null &&
      typeof f === "object" &&
      typeof f.t === "string" &&
      f.t.trim().length > 0 &&
      typeof f.id === "string",
  );
}

/**
 * A fortune is only ever rendered as React text — never as HTML. This
 * sanitizer strips anything that could be interpreted as markup or control
 * content if a locale file were ever tampered with.
 */
export function sanitizeFortune(text: string): string {
  return (
    text
      .replace(/<[^>]*>/g, "")
      // eslint-disable-next-line no-control-regex -- stripping control chars is the point
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}
