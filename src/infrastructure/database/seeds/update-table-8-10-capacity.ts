import { prisma } from "../prisma";

const TARGETS: Array<{ keys: string[]; capacity: number; label: string }> = [
  { keys: ["8", "Table 8", "T8"], capacity: 3, label: "Table 8" },
  { keys: ["10", "Table 10", "T10"], capacity: 2, label: "Table 10" },
];

export async function updateTable8And10Capacity() {
  const results: Array<{ tableNumber: string; capacity: number }> = [];

  for (const target of TARGETS) {
    const updated = await prisma.table.updateMany({
      where: { tableNumber: { in: target.keys } },
      data: { capacity: target.capacity },
    });

    if (updated.count === 0) {
      throw new Error(`${target.label} was not found. Check table_number values in tables.`);
    }

    const rows = await prisma.table.findMany({
      where: { tableNumber: { in: target.keys } },
      select: { tableNumber: true, capacity: true },
    });
    results.push(...rows);
  }

  return results;
}

if (process.argv[1]?.includes("update-table-8-10-capacity")) {
  updateTable8And10Capacity()
    .then((rows) => {
      console.log("Updated table capacities:", rows);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error updating table 8/10 capacity:", err);
      process.exit(1);
    });
}
