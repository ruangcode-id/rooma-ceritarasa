import { NextRequest, NextResponse } from "next/server";
import { requireOwnerApiSession } from "@/lib/require-owner-api";
import { UserUseCase } from "@/application/use-cases/users/user.usecase";

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
  } catch (error: any) {

    if (error.message === "User not found") {
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
  } catch (error: any) {

    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.issues[0]?.message || "Validation Error", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
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
  } catch (error: any) {

    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}


