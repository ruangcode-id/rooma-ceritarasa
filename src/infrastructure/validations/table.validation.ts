import { z } from "zod";

export const TableStatusEnum = z.enum(["AVAILABLE", "OCCUPIED", "RESERVED"]);

// Schema untuk membuat Table baru
export const createTableSchema = z.object({
  tableNumber: z.string().min(1, "Nomor meja wajib diisi"),
  capacity: z.number().min(1, "Kapasitas minimal 1"),
  posX: z.number().optional(), // Sesuaikan dengan Prisma: posX (Int?)
  posY: z.number().optional(), // Sesuaikan dengan Prisma: posY (Int?)
});

// Schema untuk update Table (single)
export const updateTableSchema = createTableSchema.partial().extend({
  id: z.string(),
  status: TableStatusEnum.optional(),
});

// Schema untuk Bulk Update Position
export const bulkUpdatePositionSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string(),
      posX: z.number(), // Ubah dari position object ke posX & posY terpisah
      posY: z.number(),
    })
  ),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type BulkUpdatePositionInput = z.infer<typeof bulkUpdatePositionSchema>;