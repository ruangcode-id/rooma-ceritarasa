import { NextRequest, NextResponse } from "next/server";
import { requireOwnerApiSession } from "@/lib/require-owner-api";
import { UserUseCase } from "@/application/use-cases/users/user.usecase";
import { usersListQuerySchema } from "@/lib/users-list-query";
import { buildPaginationMeta } from "@/lib/pagination";
import { jsonValidationError } from "@/lib/api-envelope";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireOwnerApiSession();
    if (!authResult.ok) return authResult.response;
    const { searchParams } = new URL(req.url);
    const parsed = usersListQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }
    const { page, limit } = parsed.data;

    const result = await UserUseCase.getUsersAction(page, limit);

    return NextResponse.json({
      success: true,
      data: result.users,
      meta: buildPaginationMeta(result.total, page, limit),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireOwnerApiSession();
    if (!authResult.ok) return authResult.response;
    const body = await req.json();
    const newUser = await UserUseCase.createUserAction(body);

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error: any) {

    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.issues[0]?.message || "Validation Error", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
