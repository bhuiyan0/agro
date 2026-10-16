// Seed one owner, one manager and two sample projects.
// Safe to run more than once: existing users keep their password and name,
// and projects use fixed ids so they are not duplicated.
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { normalizePhone } from "../src/lib/phone";

const PROJECTS = [
  { id: "00000000-0000-4000-8000-000000000001", name: "বাগানের ফল" },
  { id: "00000000-0000-4000-8000-000000000002", name: "খামার" },
];

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value;
}

async function upsertUser(prefix: "SEED_OWNER" | "SEED_MANAGER", role: "OWNER" | "MANAGER") {
  const phone = normalizePhone(required(`${prefix}_PHONE`));
  if (!phone) throw new Error(`${prefix}_PHONE is not a valid Bangladeshi mobile number`);
  return db.user.upsert({
    where: { phone },
    // Only the role is re-applied on an existing user, so a seed run can
    // promote the owner after the role column was added.
    update: { role },
    create: {
      name: required(`${prefix}_NAME`),
      phone,
      role,
      passwordHash: await hashPassword(required(`${prefix}_PASSWORD`)),
    },
  });
}

async function main() {
  const owner = await upsertUser("SEED_OWNER", "OWNER");
  const manager = await upsertUser("SEED_MANAGER", "MANAGER");

  for (const project of PROJECTS) {
    await db.project.upsert({ where: { id: project.id }, update: {}, create: project });
    for (const [user, role] of [
      [owner, "OWNER"],
      [manager, "MANAGER"],
    ] as const) {
      await db.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: user.id } },
        update: {},
        create: { projectId: project.id, userId: user.id, role },
      });
    }
  }
  console.log(
    `Seeded users ${owner.phone} (owner), ${manager.phone} (manager) and ${PROJECTS.length} projects.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
