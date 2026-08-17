"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Image from "next/image";
import {
  X,
  MagnifyingGlassPlus,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Sparkle,
  Pepper,
  Plant,
  WarningCircle,
} from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/* Types                                                              */
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
  isAvailable?: boolean;
  tags?: string[];
  createdAt: string;
};

type Props = {
  photos: MenuPhotoItem[];
  categories: string[];
};

/* ------------------------------------------------------------------ */
/* Scroll-reveal wrapper                                              */
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
/* Tag Badge Component                                                */
/* ------------------------------------------------------------------ */
function TagBadge({ tag }: { tag: string }) {
  const cleanTag = tag.trim().toLowerCase();

  if (cleanTag.includes("chef") || cleanTag.includes("special") || cleanTag.includes("signature")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
        <Sparkle size={11} weight="fill" className="text-amber-500" />
        {tag}
      </span>
    );
  }

  if (cleanTag.includes("spicy") || cleanTag.includes("pedas")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
        <Pepper size={11} weight="fill" className="text-rose-500" />
        {tag}
      </span>
    );
  }

  if (cleanTag.includes("veg") || cleanTag.includes("plant") || cleanTag.includes("vegan")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
        <Plant size={11} weight="fill" className="text-emerald-500" />
        {tag}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      {tag}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Lightbox — with keyboard handler and Prev/Next nav                 */
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

  const isSoldOut = photo.isAvailable === false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/25 rounded-full p-2.5"
        aria-label="Close lightbox"
      >
        <X size={18} weight="bold" />
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          aria-label="Previous photo"
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center text-white/70 hover:text-white transition-colors bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full p-3"
        >
          <CaretLeft size={20} weight="bold" />
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          aria-label="Next photo"
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
        {/* Image panel */}
        <div className="relative flex-1 min-h-[240px] md:min-h-[420px] overflow-hidden bg-slate-950">
          <Image
            src={photo.imageUrl}
            alt=""
            fill
            sizes="60vw"
            className="object-cover scale-110 blur-xl brightness-50"
            aria-hidden="true"
            priority
          />
          <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
          <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
            <div className="relative w-full h-full max-h-[70vh]">
              <Image
                src={photo.imageUrl}
                alt={photo.title}
                fill
                sizes="(max-width: 768px) 90vw, 55vw"
                className={`object-contain drop-shadow-2xl ${isSoldOut ? "grayscale-30 brightness-90" : ""}`}
                priority
              />
              {isSoldOut && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-slate-900/85 backdrop-blur-md text-rose-200 border border-rose-500/30 px-4 py-2 rounded-xl text-sm font-semibold tracking-wider uppercase shadow-xl">
                    Sold Out for Today
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="p-6 md:w-72 shrink-0 flex flex-col justify-center bg-white border-t md:border-t-0 md:border-l border-slate-100">
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

          {/* Tags */}
          {photo.tags && photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {photo.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}

          {photo.price != null && (
            <div className="flex items-center gap-2 mb-3">
              <p className="text-base font-semibold text-slate-900">
                {currencyFmt.format(photo.price)}
              </p>
              {isSoldOut && (
                <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-md">
                  Sold Out
                </span>
              )}
            </div>
          )}

          {photo.description && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
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
                <CaretLeft size={14} weight="bold" /> Previous
              </button>
              <button
                disabled={!hasNext}
                onClick={handleNext}
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <CaretRight size={14} weight="bold" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Public Menu Component                                         */
/* ------------------------------------------------------------------ */
export function PublicMenuClient({ photos, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>(
    categories.length > 0 ? categories[0] : ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<MenuPhotoItem | null>(null);

  // Filter logic: search query matches title, description, or tags; category matches activeCategory (or all if search is active)
  const isSearching = searchQuery.trim().length > 0;
  const searchLower = searchQuery.trim().toLowerCase();

  const filteredPhotos = photos.filter((p) => {
    const matchesSearch = isSearching
      ? p.title.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchLower))) ||
        p.category.toLowerCase().includes(searchLower)
      : true;

    const matchesCategory = isSearching ? true : p.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // Featured = hovered item OR first item in filtered list
  const activeFeaturedPhoto =
    (hoveredPhotoId ? filteredPhotos.find((p) => p.id === hoveredPhotoId) : null) ??
    filteredPhotos[0] ??
    null;

  const hasData = photos.length > 0;

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setSearchQuery("");
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

          {/* Section heading + Search Bar */}
          <Reveal delay={0}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold block mb-2">
                  Our Menu
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-slate-900">
                  The Menu
                </h2>
              </div>

              {/* Instant Search Bar */}
              <div className="w-full md:w-72 relative">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search dishes or ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-full border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all shadow-2xs"
                />
                {isSearching && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          </Reveal>

          {/* Category Tabs (hidden during active search) */}
          {!isSearching && (
            <Reveal delay={80}>
              <div className="overflow-x-auto scrollbar-hide -mx-2 px-2 pb-0.5 mb-8 border-b border-slate-100">
                <div className="flex items-center gap-1.5 md:gap-2 min-w-max md:min-w-0">
                  {hasData ? (
                    categories.map((cat) => {
                      const isActive = activeCategory === cat;
                      const count = photos.filter((p) => p.category === cat).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryChange(cat)}
                          className={`whitespace-nowrap shrink-0 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5 ${
                            isActive
                              ? "border-slate-900 text-slate-900 font-semibold"
                              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    ["Signature", "A La Carte", "Beverage", "Dessert"].map((label, i) => (
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
          )}

          {/* Search indicator */}
          {isSearching && (
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <p className="text-xs text-slate-500">
                Showing results for <span className="font-semibold text-slate-900">&ldquo;{searchQuery}&rdquo;</span>
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Clear filter
              </button>
            </div>
          )}

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
                    title="Click to view full photo"
                  >
                    <Image
                      src={activeFeaturedPhoto.imageUrl}
                      alt={activeFeaturedPhoto.title}
                      fill
                      sizes="(max-width: 1024px) 384px, 384px"
                      className={`object-cover transition-transform duration-700 group-hover:scale-105 ${activeFeaturedPhoto.isAvailable === false ? "grayscale-30" : ""}`}
                      priority
                    />
                    
                    {/* Sold out overlay on featured */}
                    {activeFeaturedPhoto.isAvailable === false && (
                      <div className="absolute top-4 left-4 z-10 bg-slate-900/85 backdrop-blur-sm text-rose-200 border border-rose-500/30 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
                        Sold Out for Today
                      </div>
                    )}

                    {/* Hover hint */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-5">
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                        <MagnifyingGlassPlus size={14} weight="bold" />
                        View full photo
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="relative w-full max-w-sm mx-auto lg:mx-0 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center"
                    style={{ aspectRatio: "3/4", maxHeight: "500px" }}
                  >
                    <p className="text-xs text-slate-300 text-center px-6">No dishes matching your search.</p>
                  </div>
                )}
              </Reveal>

              {/* Right — Menu List */}
              <div className="lg:col-span-7">
                {filteredPhotos.length === 0 ? (
                  <Reveal delay={120}>
                    <div className="py-16 text-center border-y border-slate-100">
                      <WarningCircle size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">No dishes found.</p>
                      <p className="text-xs text-slate-400 mt-1">Try searching with a different keyword or browse categories.</p>
                    </div>
                  </Reveal>
                ) : (
                  <>
                    <Reveal delay={100}>
                      <div className="flex items-center justify-between pb-3 mb-1 border-b border-slate-100">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                          {isSearching ? "Search Results" : activeCategory}
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
                        const isSoldOut = photo.isAvailable === false;

                        return (
                          <Reveal key={photo.id} delay={i * 30}>
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
                              <div className="relative shrink-0 w-[64px] h-[64px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
                                <Image
                                  src={photo.imageUrl}
                                  alt={photo.title}
                                  fill
                                  sizes="64px"
                                  className={`object-cover ${isSoldOut ? "grayscale-30 brightness-90" : ""}`}
                                />
                                {isSoldOut && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider bg-black/60 px-1 py-0.5 rounded">
                                      Sold Out
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4
                                      className={`text-sm sm:text-base font-serif leading-snug transition-colors duration-150 ${
                                        isHighlighted ? "text-primary font-medium" : "text-slate-900"
                                      }`}
                                    >
                                      {photo.title}
                                    </h4>

                                    {/* Dietary / Special Badges */}
                                    {photo.tags && photo.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {photo.tags.slice(0, 2).map((tag) => (
                                          <TagBadge key={tag} tag={tag} />
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Price */}
                                  {photo.price != null && (
                                    <span className={`text-sm font-semibold shrink-0 tabular-nums ${isSoldOut ? "text-slate-400 line-through" : "text-slate-800"}`}>
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
                    Our seasonal menu catalogue is coming soon. Please contact us directly for reservations and special dining inquiries.
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
