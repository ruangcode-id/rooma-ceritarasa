import { auth } from "@/auth";

export type Role = "admin" | "owner";

/**
 * Retrieves the current user from the session.
 * Used primarily in server components and server actions.
 */
export const getCurrentUser = async () => {
  const session = await auth();
  return session?.user;
};

/**
 * Ensures the current user has one of the allowed roles.
 * Throws an error if not authenticated or not authorized.
 */
export const requireRole = async (allowedRoles: Role[]) => {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized: Please log in.");
  }

  // The role is injected in the session callback in src/auth.ts
  const userRole = user.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error(`Forbidden: You do not have the required role to access this resource.`);
  }

  return user;
};
