import { getSignUpUrl, signOut, withAuth } from "@workos-inc/authkit-nextjs";

import { FancyNav } from "./FancyNav.client";

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

  // Server action for sign out
  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <FancyNav
      user={user ? { firstName: user.firstName } : null}
      signUpUrl={signUpUrl}
      signOutAction={handleSignOut}
    />
  );
}
