"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type T = { id: number; message: string; type: "success" | "error" | "info" };

export default function Toaster() {
  const [toasts, setToasts] = useState<T[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as T;
      setToasts((v) => [...v, d]);
      setTimeout(() => setToasts((v) => v.filter((t) => t.id !== d.id)), 3200);
    };
    document.addEventListener("app:toast", handler);
    return () => document.removeEventListener("app:toast", handler);
  }, []);

  return (
    <div className="toast-wrap">
      {toasts.map((t) => {
        const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? AlertCircle : Info;
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
