import { handleAuth } from "@workos-inc/authkit-nextjs";

/**
 * Redirect the user to `/` after successful sign in.
 * The redirect can be customized by passing a returnPathname option.
 */
export const GET = handleAuth({ returnPathname: "/" });
