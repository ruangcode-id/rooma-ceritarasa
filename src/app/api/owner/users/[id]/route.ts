import { NextRequest, NextResponse } from "next/server";
import { requireOwnerApiSession } from "@/lib/require-owner-api";
import { UserUseCase } from "@/application/use-cases/users/user.usecase";
import { jsonValidationError } from "@/lib/api-envelope";
import { ZodError } from "zod";

// Error helper removed to prevent error.message leakage

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireOwnerApiSession();
    if (!authResult.ok) return authResult.response;
    const { id } = await params;
    const user = await UserUseCase.getUserByIdAction(id);
    return NextResponse.json({ success: true, data: user });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireOwnerApiSession();
    if (!authResult.ok) return authResult.response;
    const { id } = await params;
    const body = await req.json();
    const updatedUser = await UserUseCase.updateUserAction(id, body);

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }
    console.error("ERROR PATCH /api/owner/users/[id]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireOwnerApiSession();
    if (!authResult.ok) return authResult.response;
    const { id } = await params;
    await UserUseCase.deleteUserAction(id);

    return NextResponse.json({ success: true, message: "User deactivated successfully" });
  } catch (error: unknown) {
    console.error("ERROR DELETE /api/owner/users/[id]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to deactivate user" },
      { status: 400 },
    );
  }
}


