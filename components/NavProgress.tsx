"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start the bar when any HapticLink fires "nav:start"
  useEffect(() => {
    const start = () => {
      setActive(true);
      if (timer.current) clearTimeout(timer.current);
      // safety: never get stuck on
      timer.current = setTimeout(() => setActive(false), 8000);
    };
    document.addEventListener("nav:start", start);
    return () => document.removeEventListener("nav:start", start);
  }, []);

  // Complete when the route actually changes
  useEffect(() => {
    setActive(false);
    if (timer.current) clearTimeout(timer.current);
  }, [pathname]);

  return <div className={`nav-progress ${active ? "nav-progress-on" : ""}`} aria-hidden />;
}
