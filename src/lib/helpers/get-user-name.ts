/**
 * Helper to get user display name from members list
 * Used across dashboard components to display assigned user names
 */
export function getUserName(
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
