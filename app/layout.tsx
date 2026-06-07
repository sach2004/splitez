import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "SplitEZ",
  description: "Split expenses with friends, the easy way",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SplitEZ" },
  // app/icon.svg and app/apple-icon.png are auto-detected by Next.js,
  // so no manual icons config is required here.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
