import Midtrans from "midtrans-client";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? "Mid-server-P7_oMJL9HUczcjQk_3H0CGmz";
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY ?? "Mid-client-xLbqncSSEFAmcHjT";
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

let snap: InstanceType<typeof Midtrans.Snap> | null = null;
let core: InstanceType<typeof Midtrans.CoreApi> | null = null;

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

export function getMidtransCore() {
  if (core) return core;

  if (!MIDTRANS_SERVER_KEY || !MIDTRANS_CLIENT_KEY) {
    throw new Error("Missing MIDTRANS_SERVER_KEY or MIDTRANS_CLIENT_KEY");
  }

  core = new Midtrans.CoreApi({
    isProduction: MIDTRANS_IS_PRODUCTION,
    serverKey: MIDTRANS_SERVER_KEY,
    clientKey: MIDTRANS_CLIENT_KEY,
  });

  return core;
}
