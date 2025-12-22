/**
 * One-time migration script to backfill assignedUserName for existing roles.
 *
 * Run with: node scripts/backfill-role-names.mjs
 *
 * Requires: WORKOS_API_KEY and DATABASE_URL in environment
 */

import { PrismaClient } from "@prisma/client";
import { WorkOS } from "@workos-inc/node";

const prisma = new PrismaClient();
const workos = new WorkOS(process.env.WORKOS_API_KEY);

async function getUserDisplayName(userId) {
  if (!userId) return null;
  try {
    const user = await workos.userManagement.getUser(userId);
    return (
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
    );
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("Starting backfill of role assignedUserName...\n");

  const rolesToBackfill = await prisma.role.findMany({
    where: {
      assignedUserId: { not: null },
      assignedUserName: null,
    },
    select: {
      id: true,
      title: true,
      assignedUserId: true,
    },
  });

  console.log(`Found ${rolesToBackfill.length} roles to backfill\n`);

  if (rolesToBackfill.length === 0) {
    console.log("Nothing to do!");
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const role of rolesToBackfill) {
    const name = await getUserDisplayName(role.assignedUserId);

    if (name) {
      await prisma.role.update({
        where: { id: role.id },
        data: { assignedUserName: name },
      });
      console.log(`✓ Updated "${role.title}" → ${name}`);
      successCount++;
    } else {
      console.log(`✗ Failed to get name for "${role.title}"`);
      failCount++;
    }
  }

  console.log(`\nBackfill complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
