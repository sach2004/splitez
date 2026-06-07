import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "SplitEZ",
  description: "Split expenses with friends, the easy way",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SplitEZ" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101413",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // className="dark" + style ensures the first paint is dark, no white flash.
    // next-themes still controls it after hydration (and the toggle works).
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
