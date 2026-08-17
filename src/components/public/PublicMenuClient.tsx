"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Image from "next/image";
import { X, MagnifyingGlassPlus, CaretLeft, CaretRight } from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */
export type MenuPhotoItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string;
  price: number | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  createdAt: string;
};

type Props = {
  photos: MenuPhotoItem[];
  categories: string[];
};

/* ------------------------------------------------------------------ */
/* Scroll-reveal wrapper                                                 */
/* ------------------------------------------------------------------ */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lightbox — with fixed keyboard handler and Prev/Next nav             */
/* ------------------------------------------------------------------ */
const currencyFmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

function Lightbox({
  photo,
  allPhotos,
  onClose,
  onSelectPhoto,
}: {
  photo: MenuPhotoItem;
  allPhotos: MenuPhotoItem[];
  onClose: () => void;
  onSelectPhoto: (p: MenuPhotoItem) => void;
}) {
  const currentIndex = allPhotos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1;

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) onSelectPhoto(allPhotos[currentIndex - 1]);
  }, [allPhotos, currentIndex, onSelectPhoto]);

  const handleNext = useCallback(() => {
    if (currentIndex < allPhotos.length - 1) onSelectPhoto(allPhotos[currentIndex + 1]);
  }, [allPhotos, currentIndex, onSelectPhoto]);

  // ✅ Bug fix: useEffect with proper dep array so keyboard listeners
  //    are correctly re-bound when the photo changes
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, handlePrev, handleNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/25 rounded-full p-2.5"
        aria-label="Tutup lightbox"
      >
        <X size={18} weight="bold" />
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          aria-label="Foto sebelumnya"
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center text-white/70 hover:text-white transition-colors bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full p-3"
        >
          <CaretLeft size={20} weight="bold" />
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          aria-label="Foto berikutnya"
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center text-white/70 hover:text-white transition-colors bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full p-3"
        >
          <CaretRight size={20} weight="bold" />
        </button>
      )}

      {/* Card */}
      <div
        className="relative bg-white rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image panel — blurred bg fills space, sharp image centered on top */}
        <div className="relative flex-1 min-h-[240px] md:min-h-[420px] overflow-hidden">
          {/* Blurred backdrop — same image, scaled up, desaturated slightly */}
          <Image
            src={photo.imageUrl}
            alt=""
            fill
            sizes="60vw"
            className="object-cover scale-110 blur-xl brightness-50"
            aria-hidden="true"
            priority
          />
          {/* Soft dark vignette over blur */}
          <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
          {/* Sharp main image centered */}
          <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
            <div className="relative w-full h-full max-h-[70vh]">
              <Image
                src={photo.imageUrl}
                alt={photo.title}
                fill
                sizes="(max-width: 768px) 90vw, 55vw"
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="p-6 md:w-68 shrink-0 flex flex-col justify-center bg-white border-t md:border-t-0 md:border-l border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-semibold">
              {photo.category}
            </span>
            {allPhotos.length > 1 && (
              <span className="text-[11px] text-slate-400 font-medium tabular-nums">
                {currentIndex + 1} / {allPhotos.length}
              </span>
            )}
          </div>

          <h3 className="text-lg font-serif text-slate-900 leading-snug mb-2">
            {photo.title}
          </h3>

          {photo.price != null && (
            <p className="text-sm font-semibold text-slate-800 mb-3">
              {currencyFmt.format(photo.price)}
            </p>
          )}

          {photo.description && (
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {photo.description}
            </p>
          )}

          {/* Mobile Prev/Next */}
          {allPhotos.length > 1 && (
            <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-slate-100 sm:hidden">
              <button
                disabled={!hasPrev}
                onClick={handlePrev}
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CaretLeft size={14} weight="bold" /> Sebelumnya
              </button>
              <button
                disabled={!hasNext}
                onClick={handleNext}
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Berikutnya <CaretRight size={14} weight="bold" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Public Menu Component                                            */
/* ------------------------------------------------------------------ */
export function PublicMenuClient({ photos, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>(
    categories.length > 0 ? categories[0] : ""
  );
  const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<MenuPhotoItem | null>(null);

  const filteredPhotos = photos.filter((p) => p.category === activeCategory);

  // Featured = hovered item OR first item in category
  const activeFeaturedPhoto =
    (hoveredPhotoId ? filteredPhotos.find((p) => p.id === hoveredPhotoId) : null) ??
    filteredPhotos[0] ??
    null;

  const hasData = photos.length > 0;

  // Reset hover when category changes
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setHoveredPhotoId(null);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-primary/20 selection:text-primary scroll-smooth">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="pt-28 pb-12 md:pt-36 md:pb-16">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal delay={0}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-4">
              A carefully curated collection
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-normal text-slate-950 leading-[1.1] max-w-3xl">
              We don&apos;t just serve food,<br />
              <span className="text-primary">we craft true experiences</span>
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ── MENU GALLERY ──────────────────────────────────────────── */}
      <section className="py-12 md:py-20 border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">

          {/* Section heading */}
          <Reveal delay={0}>
            <div className="mb-8">
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold block mb-3">
                Our Menu
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif text-slate-900">
                The Menu
              </h2>
            </div>
          </Reveal>

          {/* Category Tabs */}
          <Reveal delay={80}>
            <div className="overflow-x-auto scrollbar-hide -mx-2 px-2 pb-0.5">
              <div className="flex items-center gap-1.5 md:gap-2 min-w-max md:min-w-0 mb-8 border-b border-slate-100 pb-0">
                {hasData ? (
                  categories.map((cat) => {
                    const isActive = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        className={`whitespace-nowrap shrink-0 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                          isActive
                            ? "border-slate-900 text-slate-900 font-semibold"
                            : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })
                ) : (
                  /* Skeleton tabs */
                  ["Signature", "A La Carte", "Beverage", "Dessert", "Wine"].map((label, i) => (
                    <span
                      key={label}
                      className={`whitespace-nowrap shrink-0 px-4 py-2.5 text-sm border-b-2 -mb-px select-none ${
                        i === 0
                          ? "border-slate-300 text-slate-400 font-semibold"
                          : "border-transparent text-slate-300"
                      }`}
                    >
                      {label}
                    </span>
                  ))
                )}
              </div>
            </div>
          </Reveal>

          {/* Content grid */}
          {hasData ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

              {/* Left — Featured Image */}
              <Reveal delay={100} className="lg:col-span-5">
                {activeFeaturedPhoto ? (
                  <div
                    className="relative w-full max-w-sm mx-auto lg:mx-0 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-md cursor-zoom-in group"
                    style={{ aspectRatio: "3/4", maxHeight: "500px" }}
                    onClick={() => setLightboxPhoto(activeFeaturedPhoto)}
                    title="Klik untuk melihat foto penuh"
                  >
                    <Image
                      src={activeFeaturedPhoto.imageUrl}
                      alt={activeFeaturedPhoto.title}
                      fill
                      sizes="(max-width: 1024px) 384px, 384px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      priority
                    />
                    {/* Hover hint */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-5">
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                        <MagnifyingGlassPlus size={14} weight="bold" />
                        Lihat foto penuh
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="relative w-full max-w-sm mx-auto lg:mx-0 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center"
                    style={{ aspectRatio: "3/4", maxHeight: "500px" }}
                  >
                    <p className="text-xs text-slate-300 text-center px-6">Belum ada foto untuk kategori ini.</p>
                  </div>
                )}
              </Reveal>

              {/* Right — Menu List */}
              <div className="lg:col-span-7">
                {filteredPhotos.length === 0 ? (
                  <Reveal delay={120}>
                    <div className="py-16 text-center border-y border-slate-100">
                      <p className="text-sm text-slate-400">Belum ada item di kategori ini.</p>
                    </div>
                  </Reveal>
                ) : (
                  <>
                    <Reveal delay={100}>
                      <div className="flex items-center justify-between pb-3 mb-1 border-b border-slate-100">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                          {activeCategory}
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {filteredPhotos.length} {filteredPhotos.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </Reveal>

                    <div
                      className="divide-y divide-slate-100"
                      onMouseLeave={() => setHoveredPhotoId(null)}
                    >
                      {filteredPhotos.map((photo, i) => {
                        const isHighlighted = activeFeaturedPhoto?.id === photo.id;
                        return (
                          <Reveal key={photo.id} delay={i * 40}>
                            <div
                              onMouseEnter={() => setHoveredPhotoId(photo.id)}
                              onClick={() => setLightboxPhoto(photo)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") setLightboxPhoto(photo);
                              }}
                              className={`flex items-start gap-4 py-4 px-3 rounded-xl cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                isHighlighted
                                  ? "bg-slate-50"
                                  : "hover:bg-slate-50/60"
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="relative shrink-0 w-[60px] h-[60px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
                                <Image
                                  src={photo.imageUrl}
                                  alt={photo.title}
                                  fill
                                  sizes="60px"
                                  className="object-cover"
                                />
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-3">
                                  <h4
                                    className={`text-sm sm:text-base font-serif leading-snug transition-colors duration-150 ${
                                      isHighlighted ? "text-primary" : "text-slate-900"
                                    }`}
                                  >
                                    {photo.title}
                                  </h4>
                                  {photo.price != null && (
                                    <span className="text-sm font-semibold text-slate-800 shrink-0 tabular-nums">
                                      {currencyFmt.format(photo.price)}
                                    </span>
                                  )}
                                </div>
                                {photo.description && (
                                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                                    {photo.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Reveal>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Empty state */
            <Reveal delay={120}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                <div className="lg:col-span-5">
                  <div
                    className="relative w-full max-w-sm mx-auto lg:mx-0 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center"
                    style={{ aspectRatio: "3/4", maxHeight: "420px" }}
                  >
                    <div className="text-center px-6">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <MagnifyingGlassPlus size={22} className="text-slate-300" />
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-300 font-semibold">
                        Featured Photo
                      </p>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-7 py-16 text-center border-y border-slate-100">
                  <p className="text-base font-serif text-slate-700 mb-2">
                    Food &amp; Beverage Menu Catalogue
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Menu kami segera hadir. Silakan hubungi kami langsung untuk informasi menu lengkap.
                  </p>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          allPhotos={filteredPhotos}
          onClose={() => setLightboxPhoto(null)}
          onSelectPhoto={(p) => setLightboxPhoto(p)}
        />
      )}
    </div>
  );
}
