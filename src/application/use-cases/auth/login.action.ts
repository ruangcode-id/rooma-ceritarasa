"use server";

import { signIn } from "@/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { AuthError } from "next-auth";
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

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, isActive: true },
  });

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

  return { error: null };
}
