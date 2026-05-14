import { getPublicTableAvailability } from "@/features/tables/table.service";

export const PublicTableUseCase = {
  /**
   * Ambil seluruh meja aktif + flag `isAvailable` untuk sesi + tanggal tertentu.
   * - `isAvailable: false` → meja sudah confirmed/checked_in, ATAU sedang pending dalam window 15 menit.
   * - `isAvailable: true`  → meja bebas dipilih guest.
   */
  getAvailableTablesAction: async (sessionId: string, date: string) => {
    return getPublicTableAvailability(sessionId, date);
  },
};
