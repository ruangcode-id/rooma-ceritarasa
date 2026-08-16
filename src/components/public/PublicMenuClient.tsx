"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import { CaretDown, Image as ImageIcon } from "@phosphor-icons/react";
import {
  MENU_CATEGORIES,
  TASTING_MENUS,
  type MenuCategorySection,
  type TastingMenuItem,
} from "@/data/menu-data";

/* ------------------------------------------------------------------ */
/* Scroll-reveal wrapper component                                      */
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
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */
export function PublicMenuClient() {
  const [activeTabId, setActiveTabId] = useState<string>(
    MENU_CATEGORIES.length > 0 ? MENU_CATEGORIES[0].id : ""
  );
  const [expandedTastingId, setExpandedTastingId] = useState<string | null>(null);

  const activeSection: MenuCategorySection | undefined =
    MENU_CATEGORIES.find((s) => s.id === activeTabId) || MENU_CATEGORIES[0];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-primary selection:text-white scroll-smooth">

      {/* ============================================================ */}
      {/* 1. HERO HEADER                                                */}
      {/* ============================================================ */}
      <section className="pt-28 pb-14 md:pt-36 md:pb-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal delay={0}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-sans mb-4">
              A carefully curated collection
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-normal text-slate-950 leading-[1.12] max-w-3xl">
              We don&apos;t just serve food,<br />
              <span className="text-primary">we craft true experiences</span>
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. SIGNATURE MENUS & PAIRINGS                                 */}
      {/* ============================================================ */}
      <section className="py-12 md:py-16 border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">

          {/* Heading */}
          <Reveal delay={0}>
            <div className="mb-10 max-w-xl">
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold block mb-3">
                Chapter I
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif text-slate-900 leading-snug">
                Signature Menus &amp; Pairings
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                All signature menus and pairings priced per person.
              </p>
              <blockquote className="mt-4 pl-3 border-l-2 border-primary/40">
                <p className="text-xs sm:text-sm text-slate-500 italic leading-relaxed">
                  &ldquo;This volume explores purity around local ingredients; open-fire cooking reduced to its essence, where every element matters.&rdquo;
                </p>
                <cite className="block mt-1 text-[11px] text-slate-400 not-italic font-medium">
                  — Rooma Ceritarasa
                </cite>
              </blockquote>
            </div>
          </Reveal>

          {/* 2-Col: Image + Accordion */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">

            {/* Image Box */}
            <Reveal delay={100} className="lg:col-span-5">
              <div className="relative w-full max-w-sm mx-auto lg:mx-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 shadow-sm"
                style={{ aspectRatio: "3/4", maxHeight: "420px" }}>
                <ImageIcon size={40} className="text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mb-0" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-6">
                  <ImageIcon size={40} className="text-slate-300" />
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-2">
                    Featured Photo
                  </p>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    Signature menu photo container
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Accordion */}
            <div className="lg:col-span-7">
              {TASTING_MENUS.length === 0 ? (
                <Reveal delay={200}>
                  <div className="border-t border-b border-slate-100 py-14 text-center">
                    <p className="text-sm font-serif text-slate-600">
                      Degustation &amp; Pairings Menu Container
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Tasting menus and pairings will appear here once populated.
                    </p>
                  </div>
                </Reveal>
              ) : (
                <div className="divide-y divide-slate-100">
                  {TASTING_MENUS.map((menu: TastingMenuItem, i) => {
                    const isExpanded = expandedTastingId === menu.id;
                    return (
                      <Reveal key={menu.id} delay={i * 80}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTastingId(isExpanded ? null : menu.id)
                          }
                          className="w-full flex items-center justify-between py-4 text-left group cursor-pointer"
                        >
                          <h3 className="text-base sm:text-lg font-serif uppercase tracking-wider text-slate-800 group-hover:text-primary transition-colors duration-200">
                            {menu.title}
                          </h3>
                          <div className="flex items-center gap-3 shrink-0">
                            {menu.price && (
                              <span className="text-sm font-semibold text-slate-700">
                                {menu.price.toLocaleString("en-US")}
                              </span>
                            )}
                            <CaretDown
                              size={14}
                              weight="bold"
                              className={`text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </div>
                        </button>
                        <div
                          style={{
                            maxHeight: isExpanded ? "200px" : "0px",
                            overflow: "hidden",
                            transition: "max-height 0.4s ease",
                          }}
                        >
                          {menu.description && (
                            <div className="pb-4 text-xs sm:text-sm text-slate-500 leading-relaxed">
                              <p>{menu.description}</p>
                              {menu.subnotes && (
                                <p className="mt-2 text-[11px] text-slate-400 italic">
                                  {menu.subnotes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. A LA CARTE MENU & TABS                                     */}
      {/* ============================================================ */}
      <section className="py-14 md:py-20 border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">

          {/* Heading */}
          <Reveal delay={0}>
            <div className="mb-8">
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold block mb-3">
                Chapter II
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif text-slate-900">
                The Menu
              </h2>
            </div>
          </Reveal>

          {/* Category Tabs */}
          <Reveal delay={80}>
            {/* Outer: clips overflow. Inner: inline-flex centered so md+ shows centered, mobile scrolls */}
            <div className="overflow-x-auto scrollbar-hide pb-4 mb-10 border-b border-slate-100">
              <div className="flex items-center gap-6 md:justify-center min-w-max md:min-w-0 px-2">
                {MENU_CATEGORIES.length > 0 ? (
                  MENU_CATEGORIES.map((cat) => {
                    const isActive = activeTabId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveTabId(cat.id)}
                        className={`whitespace-nowrap shrink-0 px-5 py-2 rounded-full transition-all duration-200 cursor-pointer text-center leading-tight ${
                          isActive
                            ? "border border-slate-900 text-slate-900 font-semibold text-base"
                            : "text-slate-400 text-base font-normal hover:text-slate-700"
                        }`}
                      >
                        {cat.title}
                      </button>
                    );
                  })
                ) : (
                  /* Placeholder skeleton tabs when no data yet */
                  ["Snacks", "Mains", "Grills", "Sides", "Desserts", "Cocktails", "Wines"].map(
                    (label, i) => (
                      <span
                        key={label}
                        className={`whitespace-nowrap shrink-0 px-5 py-2 rounded-full text-base text-center leading-tight select-none ${
                          i === 0
                            ? "border border-slate-300 text-slate-400 font-semibold"
                            : "text-slate-300 font-normal"
                        }`}
                      >
                        {label}
                      </span>
                    )
                  )
                )}
              </div>
            </div>
          </Reveal>

          {/* Split Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">

            {/* Image Box */}
            <Reveal delay={100} className="lg:col-span-5">
              <div
                className="relative w-full max-w-sm mx-auto lg:mx-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 shadow-sm"
                style={{ aspectRatio: "3/4", maxHeight: "420px" }}
              >
                {activeSection?.featuredImage ? (
                  <Image
                    src={activeSection.featuredImage}
                    alt={activeSection.title}
                    fill
                    sizes="(max-width: 1024px) 384px, 384px"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-6">
                    <ImageIcon size={40} className="text-slate-300" />
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-2">
                      Category Photo
                    </p>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      Category photo container
                    </p>
                  </div>
                )}
              </div>
            </Reveal>

            {/* Menu Items List */}
            <div className="lg:col-span-7">
              {MENU_CATEGORIES.length === 0 || !activeSection ? (
                <Reveal delay={150}>
                  <div className="border-t border-b border-slate-100 py-16 text-center">
                    <p className="text-base font-serif text-slate-700 mb-2">
                      Food &amp; Beverage Menu Catalogue
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Page structure is ready. Dish items and categories will appear here once connected to the data source.
                    </p>
                  </div>
                </Reveal>
              ) : (
                <div>
                  <Reveal delay={100}>
                    <h3 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold border-b border-slate-100 pb-3 mb-1">
                      {activeSection.title}
                    </h3>
                  </Reveal>
                  <div className="divide-y divide-slate-100">
                    {activeSection.items.map((item, i) => (
                      <Reveal key={item.id} delay={i * 60}>
                        <div className="py-4">
                          <div className="flex items-baseline justify-between gap-4">
                            <h4 className="text-sm sm:text-base font-serif text-slate-900 leading-snug">
                              {item.name}
                            </h4>
                            {item.price && (
                              <span className="text-sm font-semibold text-slate-700 shrink-0">
                                {item.price.toLocaleString("en-US")}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
