import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';

export async function GET() {
  try {
    await prisma.reservationTable.deleteMany({});
    await prisma.table.deleteMany({});

    const tables = [
      { tableNumber: "Table 1", capacity: 2, posX: 10, posY: 10 },
      { tableNumber: "Table 2", capacity: 3, posX: 20, posY: 10 },
      { tableNumber: "Table 3", capacity: 2, posX: 30, posY: 10 },
      { tableNumber: "Table 4", capacity: 2, posX: 10, posY: 30 },
      { tableNumber: "Table 5", capacity: 5, posX: 20, posY: 30 },
      { tableNumber: "Table 6", capacity: 2, posX: 30, posY: 30 },
      { tableNumber: "Table 7", capacity: 2, posX: 10, posY: 50 },
      { tableNumber: "Table 8", capacity: 2, posX: 20, posY: 50 },
      { tableNumber: "Table 9", capacity: 6, posX: 30, posY: 50 },
      { tableNumber: "Table 10", capacity: 3, posX: 10, posY: 70 },
    ];

    for (const table of tables) {
      await prisma.table.create({
        data: {
          ...table,
          status: "AVAILABLE",
          isActive: true,
        }
      });
    }

    return NextResponse.json({ success: true, message: "Tables seeded" });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
