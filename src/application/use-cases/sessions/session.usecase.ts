import { SessionRepository } from "@/infrastructure/repositories/session.repository";
import { createSessionSchema, updateSessionSchema } from "@/validations/session.validation";
import { requireRole } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

// Helper to convert HH:MM to Prisma DateTime
const parseTime = (timeStr: string) => {
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`1970-01-01T${normalized}Z`);
};

export const SessionUseCase = {
  /**
   * Admin/Owner: List all sessions
   */
  getSessionsAction: async (args: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    date?: Date;
  }) => {
    await requireRole(["admin", "owner"]);

    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const skip = (page - 1) * limit;

    const weekday = args.date ? args.date.getUTCDay() : undefined;

    return SessionRepository.getSessions({
      skip,
      take: limit,
      isActive: args.isActive,
      date: args.date,
      weekday,
    });
  },

  /**
   * Public: List only active sessions (for booking page)
   */
  getPublicSessionsAction: async (date: Date) => {
    // No role check needed
    const sessions = await SessionRepository.getSessions({
      skip: 0,
      take: 100,
      isActive: true,
      date,
      weekday: date.getUTCDay(),
    });

    return sessions.sessions
      .filter((s) => s.availableSlots > 0);
  },

  /**
   * Admin/Owner: Detail session
   */
  getSessionByIdAction: async (id: string, date?: Date) => {
    await requireRole(["admin", "owner"]);

    const session = await SessionRepository.getSessionByIdWithAvailability(id, date);
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
      name: parsedData.name,
      startTime: parseTime(parsedData.startTime),
      endTime: parseTime(parsedData.endTime),
      maxCapacity: parsedData.maxCapacity,
      isActive: parsedData.isActive ?? true,
      dayOfWeek: parsedData.dayOfWeek,
    });
  },

  /**
   * Admin/Owner: Update session
   */
  updateSessionAction: async (id: string, data: unknown) => {
    await requireRole(["admin", "owner"]);

    const parsedData = updateSessionSchema.parse(data);

    const { startTime, endTime, ...otherFields } = parsedData;
    const updatePayload: Prisma.RestaurantSessionUpdateInput = {
      ...otherFields,
      ...(startTime ? { startTime: parseTime(startTime) } : {}),
      ...(endTime ? { endTime: parseTime(endTime) } : {}),
    };

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
