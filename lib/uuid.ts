/**
 * Secure-context-safe UUID generator.
 *
 * crypto.randomUUID() ONLY exists in secure contexts (https:// or localhost).
 * On http://192.168.x.x it is `undefined` and throws — which silently kills
 * any onClick handler that calls it. This wrapper falls back to
 * crypto.getRandomValues() (allowed in non-secure contexts) so it works
 * everywhere: HTTP, HTTPS, localhost, phone IPs.
 */
export function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (_) {
    /* fall through */
  }

  const rand = (): number => {
    try {
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        const a = new Uint8Array(1);
        crypto.getRandomValues(a);
        return a[0] / 256;
      }
    } catch (_) {}
    return Math.random();
  };

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (rand() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
