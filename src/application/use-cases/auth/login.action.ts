"use server";

import { signIn } from "@/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@/generated/prisma/client";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

type LoginState = {
  error: string | null;
};

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email atau password tidak valid." };
  }

  const { email, password } = parsed.data;

  let user: { role: "admin" | "owner"; isActive: boolean } | null;

  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: { role: true, isActive: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "ECONNREFUSED"
    ) {
      return {
        error:
          "Database belum bisa diakses. Pastikan PostgreSQL/Docker sedang berjalan.",
      };
    }

    throw error;
  }

  if (!user?.isActive) {
    return { error: "Akun tidak aktif atau tidak ditemukan." };
  }

  const redirectTo = user.role === "admin" ? "/admin/dashboard" : "/owner/dashboard";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Email atau password salah." };
      }
      return { error: "Gagal login. Coba lagi." };
    }
    throw error;
  }

  // In some NextAuth/Next.js combinations, `signIn()` may not throw a redirect
  // for Credentials provider. Ensure we always land on the correct dashboard.
  redirect(redirectTo);
}
