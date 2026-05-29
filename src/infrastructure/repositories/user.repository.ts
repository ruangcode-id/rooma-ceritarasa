import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@/generated/prisma/client";

export const UserRepository = {
  /**
   * Retrieves all users (admins and owners) with pagination
   */
  getUsers: async (skip: number = 0, take: number = 20) => {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    return { users, total };
  },

  /**
   * Retrieves a single user by ID
   */
  getUserById: async (id: string) => {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  /**
   * Creates a new user in the database
   */
  createUser: async (data: Prisma.UserCreateInput) => {
    return prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  /**
   * Updates an existing user
   */
  updateUser: async (id: string, data: Prisma.UserUpdateInput) => {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  /**
   * Deactivates a user (soft delete) to avoid breaking FK relations
   */
  deleteUser: async (id: string) => {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });
  },
};
