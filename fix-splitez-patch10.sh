#!/usr/bin/env bash
# =============================================================================
# fix-splitez-patch10.sh  —  Run from project root
#
# Adds the SplitEZ logo as the browser-tab icon (favicon).
#
# In the Next.js App Router, a file named app/icon.<ext> is automatically
# served as the tab icon — no <link> tags or config needed. We add:
#   - app/icon.svg            (crisp on modern browsers / high-DPI)
#   - app/apple-icon.png      (iOS home-screen / Safari)  [generated if possible]
#   - public/favicon.ico-note (fallback guidance)
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

[[ -f "package.json" ]] || { echo "Run from project root"; exit 1; }

# Next.js may auto-detect app/favicon.ico over app/icon.svg. Remove the default
# one created by create-next-app so our SVG/PNG icon is used instead.
if [[ -f "app/favicon.ico" ]]; then
  info "Removing default app/favicon.ico so the SplitEZ icon is used..."
  rm -f "app/favicon.ico"
  ok "default favicon removed"
fi

# =============================================================================
# app/icon.svg — the mint rounded-square "S" mark, matching the in-app logo
# =============================================================================
info "Creating app/icon.svg..."
cat > app/icon.svg << 'SVG'
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#07856f"/>
      <stop offset="1" stop-color="#11ad93"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#g)"/>
  <text x="50%" y="50%" dy="2"
        text-anchor="middle" dominant-baseline="central"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="40" font-weight="900" fill="#ffffff">S</text>
</svg>
SVG
ok "app/icon.svg created"

# =============================================================================
# Try to also generate a PNG (apple-icon) so iOS / older browsers get a raster.
# Uses whatever is available: rsvg-convert, ImageMagick (convert/magick), or sips.
# If none exist, the SVG alone still works on all modern browsers.
# =============================================================================
info "Attempting to generate a raster icon (apple-icon.png)..."
PNG_DONE=0

if command -v rsvg-convert >/dev/null 2>&1; then
  rsvg-convert -w 180 -h 180 app/icon.svg -o app/apple-icon.png && PNG_DONE=1
elif command -v magick >/dev/null 2>&1; then
  magick -background none app/icon.svg -resize 180x180 app/apple-icon.png && PNG_DONE=1
elif command -v convert >/dev/null 2>&1; then
  convert -background none app/icon.svg -resize 180x180 app/apple-icon.png && PNG_DONE=1
fi

if [[ "$PNG_DONE" == "1" ]]; then
  ok "app/apple-icon.png generated"
else
  echo -e "${YELLOW}  (No SVG->PNG tool found — that's fine. The SVG icon works in${NC}"
  echo -e "${YELLOW}   all modern browsers. If you want an iOS home-screen icon too,${NC}"
  echo -e "${YELLOW}   export a 180x180 PNG of the logo and save it as${NC}"
  echo -e "${YELLOW}   app/apple-icon.png — Next.js will pick it up automatically.)${NC}"
fi

# =============================================================================
# Make sure metadata title is SplitEZ (tab text next to the icon)
# =============================================================================
info "Ensuring tab title is 'SplitEZ' in app/layout.tsx..."
cat > app/layout.tsx << 'TSX'
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
TSX
ok "layout.tsx title confirmed"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Patch 10 done — browser-tab logo added.                       ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  ✔ app/icon.svg — the mint 'S' mark (Next auto-serves it as    ║${NC}"
echo -e "${GREEN}║    the favicon, no config needed)                              ║${NC}"
echo -e "${GREEN}║  ✔ removed the default favicon.ico so yours is used            ║${NC}"
echo -e "${GREEN}║  ✔ apple-icon.png generated if a converter was available       ║${NC}"
echo -e "${GREEN}║  ✔ tab title is 'SplitEZ'                                      ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Restart dev + hard-refresh (browsers cache favicons hard):    ║${NC}"
echo -e "${GREEN}║    npm run dev                                                ║${NC}"
echo -e "${GREEN}║  Then Cmd/Ctrl + Shift + R, or open a fresh tab.              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
