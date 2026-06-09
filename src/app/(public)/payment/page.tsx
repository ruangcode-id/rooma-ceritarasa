import PaymentCheckoutForm from "@/components/forms/PaymentCheckoutForm";
import Link from "next/link";

type PaymentPageProps = {
  searchParams: Promise<{
    reservationId?: string;
    orderId?: string;
    order_id?: string;
    transaction_status?: string;
    status_code?: string;
  }>;
};

export const runtime = "nodejs";

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const params = await searchParams;
  const orderId = params.orderId ?? params.order_id ?? "";

  return (
    <main className="min-h-screen bg-essence-ivory px-4 py-5 text-essence-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col justify-center">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            className="font-essence-serif text-xl tracking-[0.22em] text-essence-ink sm:text-2xl"
            href="/"
          >
            ROOMA
          </Link>
          <Link
            className="font-essence-label border border-essence-ink px-4 py-3 text-[11px] font-bold text-essence-ink transition hover:bg-essence-ink hover:text-white sm:px-6 sm:text-xs"
            href="/reservasi"
          >
            Reserve
          </Link>
        </div>

        <PaymentCheckoutForm
          initialReservationId={params.reservationId ?? ""}
          initialOrderId={orderId}
          initialTransactionStatus={params.transaction_status ?? ""}
          initialStatusCode={params.status_code ?? ""}
        />
      </div>
    </main>
  );
}
