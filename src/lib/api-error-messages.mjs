const statusMessages = Object.freeze({
  401: "Sesi Anda telah habis, mengalihkan ke halaman login...",
  403: "Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.",
  413: "Data yang dikirim terlalu besar. Harap kurangi panjang isian Anda.",
  429: "Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.",
});

const unsafeErrorPattern =
  /(?:\bat\s+\S+\s*\(|node_modules|[A-Z]:\\|\/src\/|Error:\s|stack trace)/i;

export function getStatusErrorMessage(status) {
  return statusMessages[status] ?? null;
}

export function getSafeApiErrorText(payload) {
  if (!payload || typeof payload !== "object") return null;

  const candidate =
    typeof payload.error === "string"
      ? payload.error
      : typeof payload.message === "string"
        ? payload.message
        : null;

  if (
    !candidate ||
    candidate.length > 300 ||
    unsafeErrorPattern.test(candidate)
  ) {
    return null;
  }

  return candidate;
}
