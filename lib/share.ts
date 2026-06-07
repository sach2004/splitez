/**
 * Share or copy a URL safely on ANY origin.
 *
 * navigator.share() and navigator.clipboard both require a secure context.
 * On http://192.168.x.x they are unavailable, so we fall back to a legacy
 * execCommand("copy") that works on plain HTTP too.
 *
 * Returns: "shared" | "copied" | "failed"
 */
export async function shareOrCopy(
  url: string,
  title = "Join my group on SplitEZ"
): Promise<"shared" | "copied" | "failed"> {
  // 1. Native share sheet (mobile, secure context only)
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, url });
      return "shared";
    }
  } catch (_) {
    /* user cancelled or unsupported — try copy */
  }

  // 2. Clipboard API (secure context only)
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(url);
      return "copied";
    }
  } catch (_) {
    /* fall through to legacy */
  }

  // 3. Legacy execCommand — works on plain HTTP / LAN IP
  try {
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok ? "copied" : "failed";
  } catch (_) {
    return "failed";
  }
}
