import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "./ThemeSwitch.client";
import { getSignUpUrl, withAuth, signOut } from "@workos-inc/authkit-nextjs";

export async function NavBar() {
  const { user } = await withAuth();
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
            <Link href="/shadcn">Shadcn</Link>
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
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Link href={signUpUrl}>Sign up</Link>
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
