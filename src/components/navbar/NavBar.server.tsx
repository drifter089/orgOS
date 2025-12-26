import { signOut, withAuth } from "@workos-inc/authkit-nextjs";

import { NavWrapper } from "./NavWrapper.client";

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

  // Server action for sign out
  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <NavWrapper
      user={user ? { id: user.id, firstName: user.firstName } : null}
      signOutAction={handleSignOut}
    />
  );
}
