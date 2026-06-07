import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "SplitEZ",
  description: "Split expenses with friends, the easy way",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SplitEZ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Do NOT set maximumScale — that breaks accessibility and causes layout jank
  // iOS ignores userScalable=false anyway for accessibility, but it keeps the
  // "app" feel on Android without breaking pinch-zoom on iOS 10+
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
