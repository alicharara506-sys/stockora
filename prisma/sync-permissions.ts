/**
 * Re-syncs system roles for every existing business.
 *
 * New permissions added to PERMISSION_DEFINITIONS only reach a business when
 * its system roles are seeded, which normally happens once at signup. Run this
 * after deploying a release that introduces permissions, or existing tenants
 * keep the old grants and the new screens stay invisible to them.
 *
 * Only system roles (Owner, Admin, Manager, ...) are rewritten — custom roles
 * a business created itself are left untouched.
 */
import { prisma } from "../src/lib/prisma";
import { ensureSystemRolesSeeded } from "../src/lib/permissions/seed";

async function main() {
  const businesses = await prisma.business.findMany({ select: { id: true, name: true } });
  if (businesses.length === 0) {
    console.log("No businesses found — nothing to sync.");
    return;
  }

  for (const business of businesses) {
    await ensureSystemRolesSeeded(business.id);
    console.log(`Synced system roles for "${business.name}"`);
  }
  console.log(`\nDone — ${businesses.length} business(es) updated.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
