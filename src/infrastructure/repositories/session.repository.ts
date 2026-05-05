import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@/generated/prisma/client";

type SessionWithAvailability = Prisma.SessionGetPayload<{}> & {
  currentCapacity: number;
  availableSlots: number;
};

export const SessionRepository = {
  /**
   * Retrieves all sessions with optional filtering and pagination
   */
  getSessions: async (args: {
    skip?: number;
    take?: number;
    isActive?: boolean;
    date?: Date;
    weekday?: number;
  }): Promise<{ sessions: SessionWithAvailability[]; total: number }> => {
    const { skip = 0, take = 20, isActive, date, weekday } = args;

    const where: Prisma.SessionWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (weekday !== undefined) where.dayOfWeek = { has: weekday };

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take,
        orderBy: { startTime: "asc" },
      }),
      prisma.session.count({ where }),
    ]);

    if (!date || sessions.length === 0) {
      return {
        sessions: sessions.map((s) => ({
          ...s,
          currentCapacity: 0,
          availableSlots: s.maxCapacity,
        })),
        total,
      };
    }

    const reservationCounts = await prisma.reservation.groupBy({
      by: ["sessionId"],
      where: {
        date,
        status: "confirmed",
        sessionId: { in: sessions.map((s) => s.id) },
      },
      _count: { _all: true },
    });

    const countBySessionId = new Map<string, number>(
      reservationCounts.map((r) => [r.sessionId, r._count._all])
    );

    return {
      sessions: sessions.map((s) => {
        const currentCapacity = countBySessionId.get(s.id) ?? 0;
        return {
          ...s,
          currentCapacity,
          availableSlots: Math.max(0, s.maxCapacity - currentCapacity),
        };
      }),
      total,
    };
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
   * Retrieves a single session by ID with availability for a given date
   */
  getSessionByIdWithAvailability: async (id: string, date?: Date): Promise<SessionWithAvailability | null> => {
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) return null;

    if (!date) {
      return {
        ...session,
        currentCapacity: 0,
        availableSlots: session.maxCapacity,
      };
    }

    const currentCapacity = await prisma.reservation.count({
      where: {
        sessionId: id,
        date,
        status: "confirmed",
      },
    });

    return {
      ...session,
      currentCapacity,
      availableSlots: Math.max(0, session.maxCapacity - currentCapacity),
    };
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
   * Checks if a session has any confirmed reservations
   */
  hasActiveReservations: async (id: string) => {
    const count = await prisma.reservation.count({
      where: {
        sessionId: id,
        status: "confirmed",
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
