type Opts = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};
export function confirmDialog(opts: Opts): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    document.dispatchEvent(new CustomEvent("app:confirm", { detail: { ...opts, resolve } }));
  });
}
