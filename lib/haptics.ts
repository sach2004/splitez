/**
 * Safe haptic feedback wrapper.
 * Uses navigator.vibrate() directly — no third-party library.
 * Completely safe on HTTP, non-secure origins, and unsupported browsers.
 * Never throws. Never crashes a component.
 */
export function haptic(pattern: number | number[] = 10): void {
  try {
    if (typeof window !== "undefined" && typeof navigator?.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch (_) {
    // Silently ignore — vibration is a nice-to-have, not a requirement
  }
}
