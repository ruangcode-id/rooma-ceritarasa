import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** Meta pagination selaras pola Dev A (`total`, `page`, `limit`, `totalPages`). */
export type ApiListMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function jsonSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true as const, data }, init);
}

export function jsonSuccessList<T>(data: T[], meta: ApiListMeta, init?: ResponseInit) {
  return NextResponse.json({ success: true as const, data, meta }, init);
}

export function jsonSuccessMessage(message: string, init?: ResponseInit) {
  return NextResponse.json({ success: true as const, message }, init ?? { status: 200 });
}

export function jsonError(
  error: string,
  status: number,
  extras?: Record<string, unknown>,
) {
  return NextResponse.json({ success: false as const, error, ...extras }, { status });
}

/** Selaras pola Dev A (`/api/owner/users`): validasi Zod → `details` berisi issue array. */
export function jsonValidationError(zodError: ZodError) {
  return NextResponse.json(
    {
      success: false as const,
      error: "Validation Error",
      details: zodError.issues,
    },
    { status: 400 },
  );
}
