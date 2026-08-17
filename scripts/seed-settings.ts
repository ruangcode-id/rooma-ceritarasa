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

  const defaultWaTemplate = [
    "Halo Kak *{{nama}}* 😊,",
    "",
    "Terima kasih. Reservasi Kakak di Rooma Ceritarasa telah berhasil dikonfirmasi.",
    "",
    "Berikut detail reservasinya:",
    "",
    "• Tanggal: {{tanggal}}",
    "• Waktu: {{waktu}}",
    "• Kode Check-in: {{check_in_code}}",
    "",
    "QR Code untuk proses check-in telah kami kirim ke email yang digunakan saat melakukan reservasi. Mohon tunjukkan QR Code tersebut atau kode check-in di atas kepada petugas saat kedatangan.",
    "",
    "Mohon hadir tepat waktu. Reservasi akan dibatalkan secara otomatis apabila keterlambatan melebihi 15 menit🙏🏻",
    "",
    "Sampai jumpa di Rooma Ceritarasa. Terima kasih telah melakukan reservasi.",
    "",
    "Salam hangat,",
    " *Rooma Ceritarasa*",
  ].join("\n");

  const defaultSettings = {
    name: "Rooma Ceritarasa",
    tagline: "Refined Comfort Dish, Intimate Casual Dining",
    address: "Jl. Lawu No.4, Kotabaru, Kec. Gondokusuman,\nKota Yogyakarta, DI Yogyakarta 55224",
    phone: "+6285725539262",
    whatsappNumber: "6285725539262",
    email: "info@roomaceritarasa.com",
    socialLinks: {
      instagram: "https://www.instagram.com/rooma.ceritarasa/",
    },
    waTemplates: {
      reservasi_konfirmasi: defaultWaTemplate,
      payment_success: defaultWaTemplate,
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
        { name: "Session one",   startTime: new Date("1970-01-01T15:00:00Z"), endTime: new Date("1970-01-01T17:00:00Z"), maxCapacity: 40, isActive: true, dayOfWeek: [1, 2, 3, 4, 5, 6, 7] },
        { name: "Session two",   startTime: new Date("1970-01-01T17:30:00Z"), endTime: new Date("1970-01-01T19:30:00Z"), maxCapacity: 40, isActive: true, dayOfWeek: [1, 2, 3, 4, 5, 6, 7] },
        { name: "Session three", startTime: new Date("1970-01-01T20:00:00Z"), endTime: new Date("1970-01-01T22:00:00Z"), maxCapacity: 40, isActive: true, dayOfWeek: [1, 2, 3, 4, 5, 6, 7] },
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
