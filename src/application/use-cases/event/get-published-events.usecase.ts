import { findPublishedEvents } from "@/infrastructure/repositories/event.repository";

/**
 * Use case: Ambil daftar artikel promosi event untuk halaman publik.
 *
 * Hanya mengembalikan event yang sudah di-publish (isPublished: true).
 * Tidak memerlukan autentikasi.
 */
export async function getPublishedEventsUseCase() {
  return findPublishedEvents();
}
