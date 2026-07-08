import crypto from "node:crypto";
import QRCode from "qrcode";
import type { VipTier } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import type {
  AdminVipListQuery,
  AssignVipCardInput,
} from "@/features/vip/vip.validation";

const TOKEN_BYTES = 24;
const MAX_TOKEN_ATTEMPTS = 8;

function normalizeAppUrl(url: string | undefined) {
  return url?.trim().replace(/\/+$/, "");
}

function buildVipPublicUrl(token: string) {
  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  return appUrl ? `${appUrl}/vip/${token}` : `/vip/${token}`;
}

async function generateUniqueVipToken() {
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt += 1) {
    const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
    const existing = await prisma.vipCard.findUnique({
      where: { token },
      select: { id: true },
    });

    if (!existing) return token;
  }

  throw new Error("Gagal membuat token VIP unik.");
}

function serializeAdminVipCard(card: {
  id: string;
  guestId: string;
  tier: VipTier;
  token: string;
  qrCodeUrl: string | null;
  benefits: string | null;
  isActive: boolean;
  issuedAt: Date;
  guest: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
}) {
  return {
    id: card.id,
    guestId: card.guestId,
    guest: {
      id: card.guest.id,
      name: card.guest.name,
      phone: card.guest.phone,
      email: card.guest.email,
    },
    tier: card.tier,
    token: card.token,
    qrCodeUrl: card.qrCodeUrl,
    benefits: card.benefits,
    isActive: card.isActive,
    issuedAt: card.issuedAt.toISOString(),
  };
}

export async function assignVipCard(input: AssignVipCardInput) {
  const guest = await prisma.guest.findFirst({
    where: {
      id: input.guestId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      vipCard: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  if (!guest) {
    throw new Error("GUEST_NOT_FOUND");
  }

  if (guest.vipCard?.isActive) {
    throw new Error("ACTIVE_VIP_CARD_EXISTS");
  }

  if (guest.vipCard) {
    throw new Error("VIP_CARD_EXISTS");
  }

  const token = await generateUniqueVipToken();
  const qrCodeUrl = await QRCode.toDataURL(buildVipPublicUrl(token));

  const card = await prisma.$transaction(async (tx) => {
    const created = await tx.vipCard.create({
      data: {
        guestId: guest.id,
        tier: input.tier,
        token,
        qrCodeUrl,
        benefits: input.benefits,
      },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    await tx.guest.update({
      where: { id: guest.id },
      data: { isVip: true },
    });

    return created;
  });

  return serializeAdminVipCard(card);
}

export async function listVipCards(query: AdminVipListQuery) {
  const where = {
    ...(query.tier ? { tier: query.tier } : {}),
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
  };

  const skip = (query.page - 1) * query.limit;

  const [cards, total] = await Promise.all([
    prisma.vipCard.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { issuedAt: "desc" },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    }),
    prisma.vipCard.count({ where }),
  ]);

  return {
    data: cards.map(serializeAdminVipCard),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export async function getPublicVipCardByToken(token: string) {
  const card = await prisma.vipCard.findUnique({
    where: { token },
    include: {
      guest: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!card || !card.isActive) {
    return null;
  }

  return {
    guestName: card.guest.name,
    tier: card.tier,
    benefits: card.benefits,
    issuedAt: card.issuedAt.toISOString(),
    isActive: card.isActive,
  };
}
