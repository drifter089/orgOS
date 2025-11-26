import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      "/", // Public home page
      "/login", // Login page - handles auth check and redirect
      "/api/nango/webhook", // Nango webhook endpoint (must be public for Nango servers)
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
