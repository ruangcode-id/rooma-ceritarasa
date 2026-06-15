import {
  EventRequestPaymentClient,
  type PublicEventRequestDetail,
} from "@/components/public/EventRequestPaymentClient";
import { getPublicEventRequestDetail } from "@/features/event/public-event.service";

function getSnapScriptUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

function toPublicDetail(
  detail: Awaited<ReturnType<typeof getPublicEventRequestDetail>>
): PublicEventRequestDetail {
  return {
    ...detail,
    eventDate: detail.eventDate.toISOString(),
    offer: detail.offer
      ? {
          ...detail.offer,
          price:
            detail.offer.price === null ? null : Number(detail.offer.price),
          createdAt: detail.offer.createdAt.toISOString(),
        }
      : null,
    payment: detail.payment
      ? {
          ...detail.payment,
          amount:
            detail.payment.amount === null
              ? null
              : Number(detail.payment.amount),
          paidAt: detail.payment.paidAt?.toISOString() ?? null,
        }
      : null,
  };
}

async function getEventRequestPaymentDetail(id: string) {
  try {
    return toPublicDetail(await getPublicEventRequestDetail(id));
  } catch {
    return null;
  }
}

export default async function EventRequestPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snapClientKey = process.env.MIDTRANS_CLIENT_KEY ?? "";
  const snapScriptUrl = getSnapScriptUrl();
  const detail = await getEventRequestPaymentDetail(id);

  if (detail) {
    return (
      <EventRequestPaymentClient
        detail={detail}
        snapClientKey={snapClientKey}
        snapScriptUrl={snapScriptUrl}
      />
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#fcfbf9] px-4 py-12 text-slate-900">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Event Payment
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Pengajuan tidak ditemukan
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Link pembayaran event tidak valid atau sudah tidak tersedia. Silakan
          hubungi tim Rooma Ceritarasa.
        </p>
      </section>
    </main>
  );
}
