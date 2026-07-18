import React from 'react';
import Link from 'next/link';

const ArrowIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="w-5 h-5 md:w-6 md:h-6 ml-2 group-hover:translate-x-1 transition-transform duration-300" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

export default function HeroSection() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover scale-105"
        src="/assets/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      
      <div className="absolute inset-0 z-10 grid place-items-center px-6 text-center bg-linear-to-t from-black/60 via-black/10 to-black/30">
        <div className="animate-fade-in-up pt-20 md:pt-32">
          <Link
            href="/reservasi"
            className="
              group inline-flex items-center justify-center rounded-full 
              px-8 py-3 text-base md:px-10 md:py-4 md:text-xl 
              text-white font-light tracking-wide
              bg-white/15 hover:bg-white/25 
              backdrop-blur-md 
              border border-white/30 hover:border-white/50 
              shadow-lg hover:shadow-2xl hover:shadow-white/10 
              transition-all duration-300 ease-out 
              hover:scale-105 
            "
          >
            Make a reservation
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </div>
  );
}
