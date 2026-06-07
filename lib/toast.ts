export type ToastType = "success" | "error" | "info";
export function toast(message: string, type: ToastType = "info") {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent("app:toast", { detail: { message, type, id: Date.now() + Math.random() } })
  );
}
