/**
 * Get user display name from a members list (client-side sync lookup).
 * Used across dashboard components to display assigned user names.
 *
 * For server-side async lookup from WorkOS, use fetchUserDisplayName instead.
 */
export function getUserDisplayName(
  userId: string | null,
  members:
    | Array<{ id: string; firstName: string | null; lastName: string | null }>
    | undefined,
): string | null {
  if (!userId || !members) return null;
  const member = members.find((m) => m.id === userId);
  if (!member) return null;
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || null;
}
