import { UserRepository } from "@/infrastructure/repositories/user.repository";
import { createUserSchema, updateUserSchema } from "@/validations/user.validation";
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
   * Retrieves a paginated list of users.
   * Auth is enforced at the route handler via requireOwnerApiSession().
   */
  getUsersAction: async (page: number = 1, limit: number = 20) => {
    const skip = (page - 1) * limit;
    return UserRepository.getUsers(skip, limit);
  },

  /**
   * Retrieves a single user by ID.
   * Auth is enforced at the route handler via requireOwnerApiSession().
   */
  getUserByIdAction: async (id: string) => {
    const user = await UserRepository.getUserById(id);
    if (!user) throw new Error("User not found");
    return user;
  },

  /**
   * Creates a new user.
   * Auth is enforced at the route handler via requireOwnerApiSession().
   */
  createUserAction: async (data: unknown) => {
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
   * Updates an existing user.
   * Auth is enforced at the route handler via requireOwnerApiSession().
   */
  updateUserAction: async (id: string, data: unknown) => {
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
   * Soft-deletes (deactivates) a user.
   * Auth is enforced at the route handler via requireOwnerApiSession().
   * The caller (route handler) passes its own userId to prevent self-deletion.
   */
  deleteUserAction: async (id: string, requestingUserId: string) => {
    if (requestingUserId === id) {
      throw new Error("Cannot delete your own account");
    }
    return UserRepository.deleteUser(id);
  },
};
