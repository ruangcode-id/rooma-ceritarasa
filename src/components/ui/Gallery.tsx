'use client';

import React, { useRef, useEffect, useCallback } from 'react';

// --- Configuration ---
const CONFIG = {
  parallax: { factor: -0.15 },
  observer: { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
  reveal: { delayMs: 300 },
};

const GALLERY_IMAGES = [
  { src: '/assets/slider1.webp', alt: 'Gallery Image 1' },
  { src: '/assets/slider2.webp', alt: 'Gallery Image 2' },
  { src: '/assets/slider3.webp', alt: 'Gallery Image 3' },
  { src: '/assets/slider4.webp', alt: 'Gallery Image 4' },
  { src: '/assets/slider5.webp', alt: 'Gallery Image 5' },
  { src: '/assets/slider6.webp', alt: 'Gallery Image 6' },
];

// --- Custom Hooks ---
const useRevealOnScroll = (sectionRef: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      }),
      CONFIG.observer
    );

    section.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionRef]);
};

const useParallaxScroll = (
  scrollRef: React.RefObject<HTMLDivElement | null>,
  cardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
) => {
  const updateParallax = useCallback(() => {
    if (!scrollRef.current) return;
    const center = window.innerWidth / 2;

    cardRefs.current.forEach((card) => {
      if (!card) return;
      const cardCenter = card.getBoundingClientRect().left + card.offsetWidth / 2;
      card.style.setProperty('--px', `${(cardCenter - center) * CONFIG.parallax.factor}px`);
    });
  }, [scrollRef, cardRefs]);

  useEffect(() => {
    updateParallax();
    window.addEventListener('resize', updateParallax);
    return () => window.removeEventListener('resize', updateParallax);
  }, [updateParallax]);

  return useCallback(() => requestAnimationFrame(updateParallax), [updateParallax]);
};

// --- Sub-Component ---
const GalleryCard = ({ src, alt, isPriority, cardRef }: { src: string, alt: string, isPriority: boolean, cardRef: (el: HTMLDivElement | null) => void }) => (
  <div
    ref={cardRef}
    style={{ '--px': '0px' } as React.CSSProperties}
    className="snap-center shrink-0 w-[90vw] sm:w-[65vw] md:w-[50vw] lg:w-[40vw] xl:w-[30vw] aspect-4/5 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:shadow-2xl transition-shadow duration-500 relative group cursor-grab active:cursor-grabbing"
  >
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 z-10 pointer-events-none" />
    <div className="w-full h-full translate-x-(--px) will-change-transform">
      <img
        src={src}
        alt={alt}
        decoding="async"
        fetchPriority={isPriority ? 'high' : 'auto'}
        className="w-full h-full object-cover object-center scale-[1.2] transition-transform duration-700 group-hover:scale-[1.25]"
      />
    </div>
  </div>
);

// --- Main Component ---
export default function Gallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useRevealOnScroll(sectionRef);
  const handleScroll = useParallaxScroll(scrollRef, cardRefs);

  return (
    <section ref={sectionRef} className="bg-white py-24 relative w-full overflow-hidden">

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 reveal">
        <div className="flex justify-center">
          <img
            src="/assets/logo_no_background.png"
            alt="Rooma"
            className="h-24 sm:h-28 md:h-32 w-auto object-contain"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>

      {/* Slider */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="reveal flex overflow-x-auto snap-x snap-mandatory gap-6 px-4 sm:px-6 lg:px-8 pb-12 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mask-edge-fading"
        style={{ scrollBehavior: 'smooth', transitionDelay: `${CONFIG.reveal.delayMs}ms` }}
      >
        {GALLERY_IMAGES.map(({ src, alt }, index) => (
          <GalleryCard
            key={index}
            src={src}
            alt={alt}
            isPriority={index === 0}
            cardRef={(el) => (cardRefs.current[index] = el)}
          />
        ))}
      </div>

      {/* Footer */}
      <p className="px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
        slide photos
      </p>
    </section>
  );
}
