import Link from "next/link";

import { getSignUpUrl, signOut, withAuth } from "@workos-inc/authkit-nextjs";

import { Button } from "@/components/ui/button";

import { ThemeSwitch } from "./ThemeSwitch.client";

export async function NavBar() {
  // Handle optional authentication - gracefully handle routes without auth
  let user = null;
  try {
    const auth = await withAuth();
    user = auth.user ?? null;
  } catch {
    // Auth not available on this route (e.g., /docs excluded from middleware)
    user = null;
  }

  const signUpUrl = await getSignUpUrl();

  return (
    <nav className="border-border bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            asChild
            className="hover:bg-accent hover:text-accent-foreground font-semibold"
          >
            <Link href="/">Home</Link>
          </Button>
          <Button
            variant="ghost"
            asChild
            className="hover:bg-accent hover:text-accent-foreground"
          >
            <Link href="/design-strategy" prefetch={false}>
              Design Strategy
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/render-strategy" prefetch={false}>
              Render Strategy
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/workflow" prefetch={false}>
              Workflow
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/docs">Docs</Link>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Button
                variant="ghost"
                asChild
                className="hover:bg-accent hover:text-accent-foreground"
              >
                <Link href="/login" prefetch={false}>
                  Sign in
                </Link>
              </Button>
              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Link href={signUpUrl} prefetch={false}>
                  Sign up
                </Link>
              </Button>
            </>
          ) : (
            <>
              <span className="text-muted-foreground hidden text-sm font-medium sm:inline-block">
                Welcome{user.firstName && `, ${user.firstName}`}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <Button
                  type="submit"
                  variant="outline"
                  className="border-border hover:bg-accent hover:text-accent-foreground"
                >
                  Sign out
                </Button>
              </form>
            </>
          )}
          <div className="border-border ml-2 border-l pl-3">
            <ThemeSwitch />
          </div>
        </div>
      </div>
    </nav>
  );
}
