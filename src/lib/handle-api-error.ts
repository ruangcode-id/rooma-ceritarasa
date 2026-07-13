import {
  getSafeApiErrorText,
  getStatusErrorMessage,
} from "@/lib/api-error-messages.mjs";

export async function handleApiError(res: Response): Promise<string> {
  const statusMessage = getStatusErrorMessage(res.status);

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const callbackUrl = `${window.location.pathname}${window.location.search}`;
      window.location.href =
        "/login?callbackUrl=" + encodeURIComponent(callbackUrl);
    }
    return statusMessage ?? "Sesi Anda telah habis.";
  }

  if (statusMessage) return statusMessage;

  if (res.status >= 500) {
    return "Terjadi kesalahan internal server. Silakan coba lagi nanti.";
  }

  try {
    const data = await res.json();
    return getSafeApiErrorText(data) ?? "Permintaan tidak dapat diproses.";
  } catch {
    return "Terjadi kesalahan jaringan atau server tidak merespons.";
  }
}
