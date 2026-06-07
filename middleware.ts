import { withAuth } from "next-auth/middleware";

// Explicit default export so Next.js recognizes it as a middleware function.
// Redirects unauthenticated users to /login (configured in authOptions.pages).
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/groups/:path*",
    "/expense/:path*",
    "/friends/:path*",
    "/activity/:path*",
    "/account/:path*",
  ],
};
