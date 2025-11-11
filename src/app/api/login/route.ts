import { redirect } from "next/navigation";

import { getSignInUrl } from "@workos-inc/authkit-nextjs";

export const GET = async () => {
  const signInUrl = await getSignInUrl();

  return redirect(signInUrl);
};
