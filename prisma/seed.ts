import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@example.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!";
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: "SUPER_ADMIN",
      settings: {
        create: {
          defaultTimezone: process.env.DEFAULT_TIMEZONE || "America/Chicago",
        },
      },
    },
  });

  console.log("Created super admin:");
  console.log(`  email: ${admin.email}`);
  console.log(`  password: ${password}`);
  console.log("  (change this password after first login)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
