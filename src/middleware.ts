import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      "/", // Public home page
      "/mission", // Public mission page
      "/login", // Login page - handles auth check and redirect
      "/api/nango/webhook", // Nango webhook endpoint (must be public for Nango servers)
      "/public/:path*", // Public display routes (read-only shared views)
    ],
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - docs (all documentation routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|docs).*)",
  ],
};
