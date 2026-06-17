import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Menjalankan Seeding Master Settings & Sessions...");

  // 1. Seed Restaurant Settings
  const existingSetting = await prisma.restaurantSetting.findFirst();

  const defaultSettings = {
    name: "Rooma Ceritarasa",
    tagline: "Refined Comfort Dish, Intimate Casual Dining",
    address: "Jl. Lawu No.2, Kotabaru, Kec. Gondokusuman,\nKota Yogyakarta, DI Yogyakarta 55224",
    phone: "+6285725539262",
    whatsappNumber: "6285725539262",
    email: "info@roomaceritarasa.com",
    socialLinks: {
      instagram: "https://www.instagram.com/rooma.ceritarasa/",
    },
  };

  if (!existingSetting) {
    await prisma.restaurantSetting.create({
      data: defaultSettings,
    });
    console.log("✅ Restaurant Settings berhasil dibuat.");
  } else {
    await prisma.restaurantSetting.update({
      where: { id: existingSetting.id },
      data: defaultSettings,
    });
    console.log("✅ Restaurant Settings berhasil diperbarui.");
  }

  // 2. Seed Admin Sessions
  const sessionCount = await prisma.restaurantSession.count();
  if (sessionCount === 0) {
    await prisma.restaurantSession.createMany({
      data: [
        { name: "Session one", startTime: "15:00", endTime: "17:00", isActive: true },
        { name: "Session two", startTime: "17:30", endTime: "19:30", isActive: true },
        { name: "Session three", startTime: "20:00", endTime: "22:00", isActive: true },
      ],
    });
    console.log("✅ 3 Sesi Bawaan (15.00, 17.30, 20.00) berhasil dibuat.");
  } else {
    console.log(`ℹ️ Sudah ada ${sessionCount} sesi di database. Melewati pembuatan sesi bawaan.`);
  }

  console.log("Seeding selesai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
