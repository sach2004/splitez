import { uuid } from "@/lib/uuid";

export const GUEST_KEY = "splitez_guest_session_id";

export function getGuestSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch (_) {
    // localStorage can throw in private mode — return an ephemeral id
    return uuid();
  }
}
