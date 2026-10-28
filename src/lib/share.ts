export interface ShareResult {
  ok: boolean;
  /** Which mechanism delivered (or attempted) the share. */
  via: "clipboard" | "web-share" | "fallback-link";
  error?: string;
}

/** Copy text to clipboard, using the async API then falling back to execCommand. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Fill a localized share template. Placeholders are replaced literally. */
export function composeShareText(template: string, fortune: string, url: string): string {
  return template.replace(/\{fortune\}/g, fortune).replace(/\{url\}/g, url);
}

/**
 * Share a fortune: Web Share API where supported (mobile), otherwise copy a
 * share message to the clipboard as a graceful desktop fallback. The URL is
 * always the site's own configured origin — never user-supplied data, so no
 * open-redirect risk.
 */
export async function shareFortune(
  fortune: string,
  shareTemplate: string,
  url: string,
  title: string,
): Promise<ShareResult> {
  const message = composeShareText(shareTemplate, fortune, url);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, text: message, url });
      return { ok: true, via: "web-share" };
    }
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === "AbortError") return { ok: false, via: "web-share" };
    // Any other share error falls through to the clipboard path.
  }
  const ok = await copyText(message);
  return {
    ok,
    via: ok ? "clipboard" : "fallback-link",
    error: ok ? undefined : "clipboard-unavailable",
  };
}
