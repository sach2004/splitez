"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import Toaster from "@/components/Toaster";
import ConfirmDialog from "@/components/ConfirmDialog";
import NavProgress from "@/components/NavProgress";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* defaultTheme="dark" => everyone starts in dark mode.
          enableSystem stays false so it doesn't follow the OS setting. */}
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        {children}
        <NavProgress />
        <Toaster />
        <ConfirmDialog />
      </ThemeProvider>
    </SessionProvider>
  );
}
