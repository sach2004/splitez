"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import Toaster from "@/components/Toaster";
import ConfirmDialog from "@/components/ConfirmDialog";
import NavProgress from "@/components/NavProgress";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        {children}
        <NavProgress />
        <Toaster />
        <ConfirmDialog />
      </ThemeProvider>
    </SessionProvider>
  );
}
