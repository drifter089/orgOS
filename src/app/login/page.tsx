import { redirect } from "next/navigation";

import { getSignInUrl, withAuth } from "@workos-inc/authkit-nextjs";

export default async function LoginPage() {
  // Check if user is already authenticated
  const { user } = await withAuth();

  if (user) {
    // User is signed in, redirect to /org
    redirect("/org");
  }

  // User is not signed in, redirect to WorkOS sign-in
  const signInUrl = await getSignInUrl();
  redirect(signInUrl);
}
