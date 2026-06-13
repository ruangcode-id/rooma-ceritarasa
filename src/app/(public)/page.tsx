import { Suspense } from 'react';
import HeroSection from '@/components/layout/HeroSection';
import Gallery from '@/components/ui/Gallery';
import Footer from '@/components/layout/Footer';

export default function PublicPage() {
  return (
    <div className="w-full relative bg-bg-dark font-sans selection:bg-primary selection:text-white">
      <main>
        <div className="fixed top-0 left-0 w-full h-screen z-0">
          <HeroSection />
        </div>
      </main>

      <div className="relative z-10 mt-[100vh]">
        <div
          className="absolute bottom-full left-0 w-full h-64 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 15%, rgba(255,255,255,0.65) 35%, rgba(255,255,255,0.45) 55%, rgba(255,255,255,0.25) 75%, rgba(255,255,255,0.1) 88%, rgba(255,255,255,0) 100%)' }}
        />
        <Suspense fallback={
          <div className="w-full h-screen flex items-center justify-center bg-white">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
          </div>
        }>
          <div className="bg-white">
            <Gallery />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
