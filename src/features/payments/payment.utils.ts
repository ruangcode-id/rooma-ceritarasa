import { createHash, randomUUID } from "crypto";
import {
  MIDTRANS_FRAUD_CHALLENGE_STATUS,
  MIDTRANS_STATUS_MAP,
} from "./payment.constants";
import { PaymentStatus, PaymentType } from "./payment.types";

export function generateOrderId(prefix = "ROOMA") {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  return `${prefix}-${Date.now()}-${suffix}`;
}

export function buildSignatureKey(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
}) {
  const { orderId, statusCode, grossAmount, serverKey } = params;
  return createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}

export function verifySignature(
  payload: {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
  },
  serverKey: string
) {
  if (!payload.order_id || !payload.status_code || !payload.gross_amount) return false;
  if (!payload.signature_key || !serverKey) return false;

  const expected = buildSignatureKey({
    orderId: payload.order_id,
    statusCode: payload.status_code,
    grossAmount: payload.gross_amount,
    serverKey,
  });

  return expected === payload.signature_key;
}

export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): PaymentStatus {
  if (transactionStatus === "capture" && fraudStatus === MIDTRANS_FRAUD_CHALLENGE_STATUS) {
    return PaymentStatus.Pending;
  }

  return MIDTRANS_STATUS_MAP[transactionStatus] ?? PaymentStatus.Pending;
}

export function mapMidtransPaymentType(type?: string): PaymentType {
  switch (type) {
    case "credit_card":
      return PaymentType.CreditCard;
    case "bank_transfer":
      return PaymentType.BankTransfer;
    case "gopay":
    case "shopeepay":
      return PaymentType.Ewallet;
    case "qris":
      return PaymentType.Qris;
    default:
      return PaymentType.Unknown;
  }
}
