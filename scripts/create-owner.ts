/**
 * Buat user owner di DB lokal (development).
 *
 * Usage:
 *   npx tsx scripts/create-owner.ts "Nama Owner" "owner@example.com" "password-kuat-min8"
 *
 * Requires: .env dengan DATABASE_URL valid, Postgres jalan.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/infrastructure/database/prisma";

async function main() {
  const [, , name, email, plainPassword] = process.argv;
  if (!name || !email || !plainPassword) {
    console.error(
      'Usage: npx tsx scripts/create-owner.ts "Nama" "email@domain.com" "password"',
    );
    process.exit(1);
  }

  if (plainPassword.length < 8) {
    console.error("Password minimal 8 karakter.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.error(`User dengan email ${email} sudah ada.`);
    process.exit(1);
  }

  const password = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.create({
    data: {
      name: name.slice(0, 100),
      email: email.trim().toLowerCase(),
      password,
      role: "owner",
      isActive: true,
    },
    select: { id: true, email: true, role: true },
  });

  console.log("Owner dibuat:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
