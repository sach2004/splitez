export const GUEST_KEY = "splitwell_guest_session_id";
export function getGuestSessionId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(GUEST_KEY, id); }
  return id;
}
