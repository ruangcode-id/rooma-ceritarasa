import { prisma } from "@/infrastructure/database/prisma";
import { 
  CreateTableInput, 
  UpdateTableInput, 
  BulkUpdatePositionInput 
} from "../validations/table.validation";
import { TableEntity } from "@/domain/table/types";
import { Prisma } from "@/generated/prisma/client";

type TableWithReservations = Prisma.TableGetPayload<{
  include: {
    reservationTables: {
      include: { reservation: true };
    };
  };
}>;

function formatTableResponse(table: TableWithReservations): TableEntity {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentReservation = table.reservationTables?.length > 0
    ? table.reservationTables
        .map((reservationTable) => reservationTable.reservation)
        .filter((reservation) =>
          reservation.date >= today &&
          (reservation.status === "confirmed" || reservation.status === "checked_in")
        )
        .map((reservation) => ({
          id: reservation.id,
          date: reservation.date.toISOString().split('T')[0],
          status: reservation.status,
          sessionId: reservation.sessionId,
          partySize: reservation.partySize,
        }))[0] || null
    : null;

  return {
    id: table.id,
    tableNumber: table.tableNumber,
    capacity: table.capacity,
    posX: table.posX,
    posY: table.posY,
    isActive: table.isActive,
    status: table.status,
    currentReservation,
  };
}

export const tableRepository = {
  getAll: async () => {
    const tables = await prisma.table.findMany({
      orderBy: { tableNumber: 'asc' },
      include: {
        reservationTables: {
          include: {
            reservation: true,
          },
        },
      },
    });
    return tables.map(formatTableResponse);
  },

  getById: async (id: string) => {
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        reservationTables: {
          include: {
            reservation: true,
          },
        },
      },
    });
    return table ? formatTableResponse(table) : null;
  },

  create: async (data: CreateTableInput) => {
    return await prisma.table.create({
      data: {
        tableNumber: data.tableNumber,
        capacity: data.capacity,
        posX: data.posX,
        posY: data.posY,
        status: "AVAILABLE",
      },
    });
  },

  update: async ({ id, ...data }: UpdateTableInput) => {
    return await prisma.table.update({
      where: { id },
      data: {
        ...data,
        posX: data.posX,
        posY: data.posY,
      },
    });
  },

  delete: async (id: string) => {
    return await prisma.table.delete({
      where: { id },
    });
  },

  bulkUpdatePosition: async ({ updates }: BulkUpdatePositionInput) => {
    return await prisma.$transaction(
      updates.map((update) =>
        prisma.table.update({
          where: { id: update.id },
          data: { 
            posX: update.posX,
            posY: update.posY 
          },
        })
      )
    );
  }
};
