import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      "/", // Public home page
      //   "/api/trpc/*", // Let tRPC handle its own auth
    ],
  },
});

// export const config = {
//   matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
// };

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/trpc (let tRPC handle auth)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    "/((?!api/trpc|_next/static|_next/image|favicon.ico).*)",
  ],
};
