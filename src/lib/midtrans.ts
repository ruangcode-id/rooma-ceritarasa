import Midtrans from "midtrans-client";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? "";
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY ?? "";
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

let snap: InstanceType<typeof Midtrans.Snap> | null = null;

export function getMidtransSnap() {
  if (snap) return snap;

  if (!MIDTRANS_SERVER_KEY || !MIDTRANS_CLIENT_KEY) {
    throw new Error("Missing MIDTRANS_SERVER_KEY or MIDTRANS_CLIENT_KEY");
  }

  snap = new Midtrans.Snap({
    isProduction: MIDTRANS_IS_PRODUCTION,
    serverKey: MIDTRANS_SERVER_KEY,
    clientKey: MIDTRANS_CLIENT_KEY,
  });

  return snap;
}
