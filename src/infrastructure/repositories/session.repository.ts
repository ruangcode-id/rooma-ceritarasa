import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@/generated/prisma/client";

export const SessionRepository = {
  /**
   * Retrieves all sessions with optional filtering and pagination
   */
  getSessions: async (skip: number = 0, take: number = 20, isActive?: boolean) => {
    const where: Prisma.SessionWhereInput = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take,
        orderBy: { startTime: "asc" },
      }),
      prisma.session.count({ where }),
    ]);

    return { sessions, total };
  },

  /**
   * Retrieves a single session by ID
   */
  getSessionById: async (id: string) => {
    return prisma.session.findUnique({
      where: { id },
    });
  },

  /**
   * Creates a new session
   */
  createSession: async (data: Prisma.SessionCreateInput) => {
    return prisma.session.create({
      data,
    });
  },

  /**
   * Updates an existing session
   */
  updateSession: async (id: string, data: Prisma.SessionUpdateInput) => {
    return prisma.session.update({
      where: { id },
      data,
    });
  },

  /**
   * Checks if a session has any active reservations (not cancelled/no-show)
   */
  hasActiveReservations: async (id: string) => {
    const count = await prisma.reservation.count({
      where: {
        sessionId: id,
        status: {
          in: ["pending", "confirmed", "checked_in"]
        }
      }
    });
    return count > 0;
  },

  /**
   * Hard deletes a session
   */
  deleteSession: async (id: string) => {
    return prisma.session.delete({
      where: { id },
    });
  },
};
