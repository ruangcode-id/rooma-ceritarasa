export async function handleApiError(res: Response): Promise<string> {
  if (res.status === 401) {
    window.location.href = "/login?callbackUrl=" + encodeURIComponent(window.location.pathname);
    return "Sesi Anda telah habis, mengalihkan ke halaman login...";
  }
  if (res.status === 403) {
    return "Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.";
  }
  if (res.status === 413) {
    return "Data yang dikirim terlalu besar. Harap kurangi panjang isian Anda.";
  }
  if (res.status === 429) {
    return "Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.";
  }

  try {
    const data = await res.json();
    return data.error || data.message || "Terjadi kesalahan internal server.";
  } catch {
    return "Terjadi kesalahan jaringan atau server tidak merespons.";
  }
}
