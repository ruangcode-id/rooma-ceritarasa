"use server";

import { signIn } from "@/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { headers } from "next/headers";
import rateLimit from "@/lib/rate-limit";

const limiter = rateLimit({ uniqueTokenPerInterval: 500, interval: 60000 });

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

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
  
  try {
    await limiter.check(5, `login_${ip}_${email}`);
  } catch {
    console.warn(`[SECURITY] Excessive login attempts for email ${email} from IP ${ip}`);
    return { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." };
  }

  let user: { role: "admin" | "owner"; isActive: boolean } | null;

  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: { role: true, isActive: true },
    });
  } catch (error) {
    console.error("[LOGIN DB ERROR]", error);
    return { error: "Terjadi kesalahan sistem. Silakan coba lagi nanti." };
  }

  if (!user?.isActive) {
    return { error: "Email atau password tidak valid." };
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
        return { error: "Email atau password tidak valid." };
      }
      return { error: "Gagal login. Coba lagi." };
    }
    throw error;
  }

  // In some NextAuth/Next.js combinations, `signIn()` may not throw a redirect
  // for Credentials provider. Ensure we always land on the correct dashboard.
  redirect(redirectTo);
}
