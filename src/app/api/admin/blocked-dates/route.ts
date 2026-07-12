import { NextRequest, NextResponse } from "next/server";
import { BlockedDateUseCase } from "@/application/use-cases/blocked-date/blocked-date.usecase";
import { requireAdminApiSession } from "@/lib/require-admin-api";

const readBody = async (req: NextRequest) => {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      throw new Error("Invalid JSON");
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const obj: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") obj[key] = value;
    }
    return obj;
  }

  // If no content-type but has body, Next may still parse text
  const text = await req.text();
  if (!text.trim()) return {};

  throw new Error("Unsupported Content-Type");
};

export async function GET() {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;
    const blockedDates = await BlockedDateUseCase.getBlockedDatesAction();
    return NextResponse.json({ success: true, data: blockedDates });
  } catch (error: any) {

    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;
    const body = await readBody(req);
    const created = await BlockedDateUseCase.createBlockedDatesAction(body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {

    if (typeof error?.message === "string") {
      if (error.message === "Invalid JSON") {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      if (error.message === "Unsupported Content-Type") {
        return NextResponse.json({ success: false, error: error.message }, { status: 415 });
      }
      if (error.message === "Invalid date") {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      if (error.message.includes("Provide either") || error.message.includes("dateStart must be")) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      if (error.message.includes("confirmed reservations")) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      if (error.name === "ZodError") {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
