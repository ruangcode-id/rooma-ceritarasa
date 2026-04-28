export interface VipCardEntity {
  id: string;
  guestId: string;
  cardNumber: string;
  qrCodeUrl: string;
  cardImageUrl: string | null;
  issuedBy: string | null;
  issuedAt: Date;
  expiredAt: Date | null;
  isActive: boolean;
}
