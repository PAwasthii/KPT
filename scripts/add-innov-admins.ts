import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  const password = "Innov@2026";
  const passwordHash = await bcrypt.hash(password, 10);

  const users = [
    { firstName: "Raj", lastName: "S", email: "raj.s@innovunglobal.com" },
    { firstName: "Nisha", lastName: "D", email: "nisha.d@innovunglobal.com" },
  ];

  for (const u of users) {
    const result = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash,
        role: UserRole.SYSTEM_ADMIN,
        region: null,
        countryCode: "91",
      },
    });
    console.log(`✓ ${result.email} — ${result.role}`);
  }

  console.log("\nPassword for both: Innov@2026");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
