import LoginForm from "@/components/forms/LoginForm";
import Image from "next/image";

export const runtime = "nodejs";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#fcfbf9] flex flex-col md:flex-row">
      {/* Left side - Image with overlay quote */}
      <div className="hidden md:block md:w-1/2 relative bg-[#1f0609]">
        <Image
          src="/assets/slider2.webp"
          alt="Rooma Ceritarasa Interior"
          fill
          className="object-cover opacity-80"
          priority
        />
        {/* dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1f0609] via-[#1f0609]/30 to-transparent" />

        {/* Brand quote */}
        <div className="absolute bottom-12 left-8 right-8 text-white">
          <p className="text-2xl font-bold leading-snug tracking-wide">
            &ldquo;Where every table<br />tells a story.&rdquo;
          </p>
          <div className="mt-4 w-10 h-0.5 bg-rose-400/70" />
          <p className="mt-3 text-sm text-rose-200/70 uppercase tracking-[0.2em]">
            Rooma Ceritarasa
          </p>
        </div>
      </div>


      {/* Right side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-white relative">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center mb-10">
            <Image
              src="/assets/logo_no_background.png"
              alt="Rooma Ceritarasa"
              width={160}
              height={80}
              className="mx-auto mb-6 h-16 w-auto object-contain drop-shadow-sm"
            />
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-[0.2em] text-[#1f0609]">
              Staff Portal
            </h1>
            <p className="mt-3 text-sm tracking-wider text-slate-500 uppercase">
              Admin &amp; Owner Access
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Use your staff credentials to continue
            </p>
          </div>

          <LoginForm />
          
          <div className="mt-12 text-center">
             <p className="text-xs text-slate-400">
               &copy; {new Date().getFullYear()} Rooma Ceritarasa. All rights reserved.
             </p>
          </div>
        </div>
      </div>
    </main>
  );
}
