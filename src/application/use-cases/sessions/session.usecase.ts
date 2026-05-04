import { SessionRepository } from "@/infrastructure/repositories/session.repository";
import { createSessionSchema, updateSessionSchema } from "@/validations/session.validation";
import { requireRole } from "@/lib/auth";

// Helper to convert HH:MM to Prisma DateTime
const parseTime = (timeStr: string) => {
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`1970-01-01T${normalized}Z`);
};

export const SessionUseCase = {
  /**
   * Admin/Owner: List all sessions
   */
  getSessionsAction: async (page: number = 1, limit: number = 20, isActive?: boolean) => {
    await requireRole(["admin", "owner"]);
    
    const skip = (page - 1) * limit;
    return SessionRepository.getSessions(skip, limit, isActive);
  },

  /**
   * Public: List only active sessions (for booking page)
   */
  getPublicSessionsAction: async () => {
    // No role check needed
    const result = await SessionRepository.getSessions(0, 100, true);
    return result.sessions;
  },

  /**
   * Admin/Owner: Detail session
   */
  getSessionByIdAction: async (id: string) => {
    await requireRole(["admin", "owner"]);
    
    const session = await SessionRepository.getSessionById(id);
    if (!session) throw new Error("Session not found");
    
    return session;
  },

  /**
   * Admin/Owner: Create new session
   */
  createSessionAction: async (data: unknown) => {
    await requireRole(["admin", "owner"]);

    const parsedData = createSessionSchema.parse(data);

    return SessionRepository.createSession({
      label: parsedData.label,
      startTime: parseTime(parsedData.startTime),
      endTime: parseTime(parsedData.endTime),
      capacity: parsedData.capacity,
      isActive: parsedData.isActive ?? true,
    });
  },

  /**
   * Admin/Owner: Update session
   */
  updateSessionAction: async (id: string, data: unknown) => {
    await requireRole(["admin", "owner"]);

    const parsedData = updateSessionSchema.parse(data);

    const updatePayload: any = { ...parsedData };
    if (parsedData.startTime) updatePayload.startTime = parseTime(parsedData.startTime);
    if (parsedData.endTime) updatePayload.endTime = parseTime(parsedData.endTime);

    return SessionRepository.updateSession(id, updatePayload);
  },

  /**
   * Admin/Owner: Delete session
   */
  deleteSessionAction: async (id: string) => {
    await requireRole(["admin", "owner"]);

    // Check if session exists
    const session = await SessionRepository.getSessionById(id);
    if (!session) throw new Error("Session not found");

    // Check for active reservations
    const hasReservations = await SessionRepository.hasActiveReservations(id);
    if (hasReservations) {
      throw new Error("Cannot delete session because it has active reservations");
    }

    return SessionRepository.deleteSession(id);
  },
};
