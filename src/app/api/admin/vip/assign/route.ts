import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { z } from "zod";
import QRCode from "qrcode";
import { uploadToCloudinary } from "@/lib/cloudinary";
import crypto from "crypto";
import { VipTier } from "@/generated/prisma/client";

const assignVipSchema = z.object({
  guestId: z.string().uuid("Invalid Guest ID"),
  benefits: z.string().optional(),
});

function generateUniqueToken() {
  // Generates something like RVIP-A8B9C2
  const randomStr = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RVIP-${randomStr}`;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const body = await req.json().catch(() => null);
    const parsed = assignVipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { guestId, benefits } = parsed.data;

    // Check if guest exists and not already VIP
    const guest = await prisma.guest.findUnique({ where: { id: guestId }, include: { vipCard: true } });
    if (!guest) {
      return NextResponse.json({ success: false, error: "Tamu tidak ditemukan" }, { status: 404 });
    }
    if (guest.isVip || guest.vipCard) {
      return NextResponse.json({ success: false, error: "Tamu ini sudah menjadi VIP" }, { status: 400 });
    }

    // 1. Generate token
    const token = generateUniqueToken();

    // 2. Generate QR Code Buffer
    const qrBuffer = await QRCode.toBuffer(token, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 400,
      color: {
        dark: "#1F0609", // Deep red/black
        light: "#FFFFFF",
      },
    });

    // 3. Upload to Cloudinary
    const uploaded = await uploadToCloudinary(qrBuffer, {
      folder: "rooma_vip_qrcodes",
      publicId: token,
    });
    
    const qrCodeUrl = uploaded.secureUrl;

    // 4. Save to DB atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create VipCard
      const vipCard = await tx.vipCard.create({
        data: {
          guestId,
          tier: VipTier.SILVER, // Default fallback backend
          token,
          qrCodeUrl,
          benefits: benefits || null,
        },
      });

      // Update Guest
      await tx.guest.update({
        where: { id: guestId },
        data: { isVip: true },
      });

      return vipCard;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    console.error("[VIP ASSIGN ERROR]", error);
    const message = error instanceof Error ? error.message : "Internal Error";

    return NextResponse.json({ success: false, error: "Gagal mendaftarkan VIP. Coba lagi." }, { status: 500 });
  }
}
