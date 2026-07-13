import { prisma } from "@/infrastructure/database/prisma";
import { Prisma, ReservationStatus, type RestaurantSession } from "@/generated/prisma/client";

type SessionWithAvailability =
  RestaurantSession & {
    currentCapacity: number;
    availableSlots: number;
  };

const CONFIRMED_STATUS = ReservationStatus.confirmed;

export const SessionRepository = {
  /**
   * GET ALL SESSIONS
   */
  getSessions: async (args: {
    skip?: number;
    take?: number;
    isActive?: boolean;
    date?: Date;
    weekday?: number;
  }): Promise<{ sessions: SessionWithAvailability[]; total: number }> => {
    const {
      skip = 0,
      take = 20,
      isActive,
      date,
      weekday,
    } = args;

    const where: Prisma.RestaurantSessionWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (weekday !== undefined) {
      where.dayOfWeek = {
        has: weekday,
      };
    }

    const [sessions, total] = await Promise.all([
      prisma.restaurantSession.findMany({
        where,
        skip,
        take,
        orderBy: {
          startTime: "asc",
        },
      }),

      prisma.restaurantSession.count({
        where,
      }),
    ]);

    if (!date || sessions.length === 0) {
      return {
        sessions: sessions.map((session) => ({
          ...session,
          currentCapacity: 0,
          availableSlots: session.maxCapacity,
        })),
        total,
      };
    }

    const reservationCounts = await prisma.reservation.groupBy({
      by: ["sessionId"],

      where: {
        date,
        status: CONFIRMED_STATUS,

        sessionId: {
          in: sessions.map((session) => session.id),
        },
      },

      _count: {
        _all: true,
      },
    });

    const countBySessionId = new Map<string, number>(
      reservationCounts.map((reservation) => [
        reservation.sessionId,
        reservation._count._all,
      ])
    );

    return {
      sessions: sessions.map((session) => {
        const currentCapacity =
          countBySessionId.get(session.id) ?? 0;

        return {
          ...session,
          currentCapacity,
          availableSlots: Math.max(
            0,
            session.maxCapacity - currentCapacity
          ),
        };
      }),

      total,
    };
  },

  /**
   * GET SESSION BY ID
   */
  getSessionById: async (id: string) => {
    return prisma.restaurantSession.findUnique({
      where: {
        id,
      },
    });
  },

  /**
   * GET SESSION WITH AVAILABILITY
   */
  getSessionByIdWithAvailability: async (
    id: string,
    date?: Date
  ): Promise<SessionWithAvailability | null> => {
    const session =
      await prisma.restaurantSession.findUnique({
        where: {
          id,
        },
      });

    if (!session) return null;

    if (!date) {
      return {
        ...session,
        currentCapacity: 0,
        availableSlots: session.maxCapacity,
      };
    }

    const currentCapacity =
      await prisma.reservation.count({
        where: {
          sessionId: id,
          date,
          status: CONFIRMED_STATUS,
        },
      });

    return {
      ...session,
      currentCapacity,

      availableSlots: Math.max(
        0,
        session.maxCapacity - currentCapacity
      ),
    };
  },

  /**
   * CREATE SESSION
   */
  createSession: async (
    data: Prisma.RestaurantSessionCreateInput
  ) => {
    return prisma.restaurantSession.create({
      data,
    });
  },

  /**
   * UPDATE SESSION
   */
  updateSession: async (
    id: string,
    data: Prisma.RestaurantSessionUpdateInput
  ) => {
    return prisma.restaurantSession.update({
      where: {
        id,
      },

      data,
    });
  },

  /**
   * CHECK ACTIVE RESERVATIONS
   */
  hasActiveReservations: async (id: string) => {
    const count = await prisma.reservation.count({
      where: {
        sessionId: id,
        status: CONFIRMED_STATUS,
      },
    });

    return count > 0;
  },

  /**
   * DELETE SESSION
   */
  deleteSession: async (id: string) => {
    return prisma.restaurantSession.delete({
      where: {
        id,
      },
    });
  },
};
