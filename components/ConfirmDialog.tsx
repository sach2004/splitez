"use client";
import { useEffect, useState } from "react";

type State = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  resolve: (b: boolean) => void;
} | null;

export default function ConfirmDialog() {
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    const handler = (e: Event) => setState((e as CustomEvent).detail);
    document.addEventListener("app:confirm", handler);
    return () => document.removeEventListener("app:confirm", handler);
  }, []);

  if (!state) return null;
  const close = (v: boolean) => { state.resolve(v); setState(null); };

  return (
    <div className="animate-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-6" onClick={() => close(false)}>
      <div className="animate-in w-full max-w-[340px] rounded-[20px] bg-[var(--card)] p-5 shadow-[0_20px_60px_rgba(0,0,0,.3)]" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] font-black tracking-tight">{state.title}</h3>
        {state.message && <p className="mt-1.5 text-[14px] leading-5 text-[var(--muted)]">{state.message}</p>}
        <div className="mt-5 flex gap-2.5">
          <button onClick={() => close(false)} className="btn-secondary tap-scale flex-1 text-[14px]">
            {state.cancelText || "Cancel"}
          </button>
          <button
            onClick={() => close(true)}
            className={`tap-scale flex-1 rounded-[14px] py-3 text-[14px] font-black text-white ${state.danger ? "bg-red-500" : "bg-mint-600"}`}
          >
            {state.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
