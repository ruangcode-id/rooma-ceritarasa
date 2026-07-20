import { UserRepository } from "@/infrastructure/repositories/user.repository";
import { createUserSchema, updateUserSchema } from "@/validations/user.validation";
import { requireRole } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export const UserUseCase = {
  /**
   * Retrieves a paginated list of users
   * Protected: ONLY OWNER
   */
  getUsersAction: async (page: number = 1, limit: number = 20) => {
    await requireRole(["owner"]);
    
    const skip = (page - 1) * limit;
    return UserRepository.getUsers(skip, limit);
  },

  /**
   * Retrieves a single user by ID
   * Protected: ONLY OWNER
   */
  getUserByIdAction: async (id: string) => {
    await requireRole(["owner"]);
    
    const user = await UserRepository.getUserById(id);
    if (!user) throw new Error("User not found");
    
    return user;
  },

  /**
   * Creates a new user
   * Protected: ONLY OWNER
   */
  createUserAction: async (data: unknown) => {
    await requireRole(["owner"]);

    const parsedData = createUserSchema.parse(data);

    // Hash password
    const hashedPassword = await bcrypt.hash(parsedData.password, 12);

    try {
      const newUser = await UserRepository.createUser({
        name: parsedData.name,
        email: parsedData.email,
        password: hashedPassword,
        role: parsedData.role,
      });
      return newUser;
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new Error("Email is already registered");
      }
      throw error;
    }
  },

  /**
   * Updates an existing user
   * Protected: ONLY OWNER
   */
  updateUserAction: async (id: string, data: unknown) => {
    await requireRole(["owner"]);

    const parsedData = updateUserSchema.parse(data);

    const { password, ...otherFields } = parsedData;
    const updatePayload: Prisma.UserUpdateInput = {
      ...otherFields,
      ...(password ? { password: await bcrypt.hash(password, 12) } : {}),
    };

    try {
      const updatedUser = await UserRepository.updateUser(id, updatePayload);
      return updatedUser;
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new Error("Email is already registered");
      }
      throw error;
    }
  },

  /**
   * Deletes a user
   * Protected: ONLY OWNER
   */
  deleteUserAction: async (id: string) => {
    const currentUser = await requireRole(["owner"]);

    if (currentUser.id === id) {
      throw new Error("Cannot delete your own account");
    }

    return UserRepository.deleteUser(id);
  },
};
