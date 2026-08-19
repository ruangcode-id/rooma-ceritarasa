import { prisma } from "../prisma";
import { TableStatus } from "@/generated/prisma/client";

export const OUTDOOR_TABLES = [
  { tableNumber: "OUT-1", capacity: 4, posX: 10, posY: 10 },
  { tableNumber: "OUT-2", capacity: 4, posX: 20, posY: 10 },
  { tableNumber: "OUT-3", capacity: 4, posX: 30, posY: 10 },
  { tableNumber: "OUT-4", capacity: 4, posX: 40, posY: 10 },
];

export async function seedOutdoorTables() {
  console.log("Seeding / Ensuring 4 Outdoor Tables (4 Pax each)...");
  
  const results = [];
  for (const t of OUTDOOR_TABLES) {
    const table = await prisma.table.upsert({
      where: { tableNumber: t.tableNumber },
      update: {
        capacity: t.capacity,
        posX: t.posX,
        posY: t.posY,
      },
      create: {
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        posX: t.posX,
        posY: t.posY,
        isActive: true,
        status: TableStatus.AVAILABLE,
      },
    });
    results.push(table);
  }
  
  console.log(`Successfully ensured ${results.length} outdoor tables:`, results.map(r => r.tableNumber).join(", "));
  return results;
}

// Allow direct execution
if (process.argv[1]?.includes("add-outdoor-tables")) {
  seedOutdoorTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error seeding outdoor tables:", err);
      process.exit(1);
    });
}
