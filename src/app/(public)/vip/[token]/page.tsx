import { getVipInvitationByToken } from "@/features/reservations/reservation.service";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { VipDownloadButton } from "@/components/public/VipDownloadButton";

export const metadata: Metadata = {
  title: "VIP Invitation | Rooma Ceritarasa",
  description: "Your exclusive invitation to Rooma Ceritarasa.",
};

export default async function VipPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const invitation = await getVipInvitationByToken(resolvedParams.token);

  if (!invitation) {
    notFound();
  }

  // Determine VIP card styling based on tier
  const tierLabel = (invitation.vipTier || "SILVER").toUpperCase();
  const cardGradient = "from-[#2a080d] via-[#150306] to-[#0a0103]";

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 font-sans text-slate-900 relative overflow-hidden flex flex-col items-center justify-center">
      {/* Global Shimmer & Gift Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
        @keyframes gift-reveal {
          0% {
            transform: scale(0) translateY(100px) rotateX(45deg) rotateZ(-10deg);
            opacity: 0;
          }
          60% {
            transform: scale(1.1) translateY(-20px) rotateX(-10deg) rotateZ(5deg);
            opacity: 1;
          }
          80% {
            transform: scale(0.95) translateY(10px) rotateX(5deg) rotateZ(-2deg);
          }
          100% {
            transform: scale(1) translateY(0) rotateX(0) rotateZ(0);
            opacity: 1;
          }
        }
        @keyframes glow-burst {
          0% {
            box-shadow: 0 0 0 0 rgba(220,38,38,0);
          }
          40% {
            box-shadow: 0 0 100px 30px rgba(220,38,38,0.6);
          }
          100% {
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-gift-bounce {
          animation: gift-reveal 1.5s cubic-bezier(0.2, 0.8, 0.2, 1.2) forwards;
          transform-origin: center center;
        }
        .animate-gift-glow {
          animation: glow-burst 2s ease-out forwards;
        }
        .animate-fade-in-delayed {
          opacity: 0;
          animation: fade-in-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 1s forwards;
        }
        .animate-fade-in-delayed-2 {
          opacity: 0;
          animation: fade-in-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 1.2s forwards;
        }
      `}} />

      {/* Abstract Background Elements (Subtle on white bg) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-slate-200 blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px]"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full px-4 text-center">
        <h1 className="text-sm font-bold tracking-[0.3em] uppercase text-primary mb-8">
          Exclusive Invitation
        </h1>

        {/* 3D VIP Card Container */}
        <div className="group perspective-1000 mb-12 relative animate-gift-bounce">
          <div className={`
            relative w-full aspect-[1.586/1] rounded-2xl p-5 sm:p-8
            bg-linear-to-br ${cardGradient}
            border border-white/10
            overflow-hidden
            transition-transform duration-700 ease-out
            group-hover:rotate-y-6 group-hover:rotate-x-6 group-hover:scale-105
            flex flex-col justify-between text-left
            animate-gift-glow
          `}>
            {/* Shimmer Effect */}
            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300">
              <div 
                className="w-full h-full bg-linear-to-r from-transparent via-white to-transparent" 
                style={{
                  transform: 'translateX(-150%) skewX(-12deg)',
                  animation: 'shimmer 2.5s infinite ease-in-out'
                }}
              ></div>
            </div>

            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            {/* Card Content (Top) */}
            <div className="relative z-10 flex justify-between items-start gap-2">
              <div>
                <h3 className="text-white font-serif font-bold text-lg sm:text-2xl tracking-tight leading-none">
                  Rooma Ceritarasa
                </h3>
                <p className="text-white/40 text-[8px] sm:text-[10px] font-bold tracking-widest uppercase mt-1">
                  Exclusive VIP Membership
                </p>
              </div>
              <span className="text-amber-400 font-serif italic font-bold text-sm sm:text-xl tracking-wider uppercase">
                {tierLabel}
              </span>
            </div>

            {/* Card Content (Middle) - Centered Metallic Chip & Large QR Code */}
            <div className="relative z-10 my-auto flex items-center justify-between gap-4 py-2">
              {/* Metallic Chip */}
              <div className="w-10 h-7 sm:w-12 sm:h-8 rounded bg-linear-to-br from-amber-200/40 to-amber-500/20 border border-amber-100/30 shrink-0"></div>
              
              {/* Large Centered Barcode / QR Code Box */}
              <div className="bg-white p-2 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl shrink-0 mx-auto">
                {invitation.qrCodeUrl ? (
                  <Image 
                    src={invitation.qrCodeUrl}
                    alt="VIP QR Code"
                    width={140}
                    height={140}
                    className="w-24 h-24 sm:w-36 sm:h-36 object-contain"
                    unoptimized
                  />
                ) : (
                  <Image 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${invitation.token}&margin=0`}
                    alt="VIP QR Code Fallback"
                    width={140}
                    height={140}
                    className="w-24 h-24 sm:w-36 sm:h-36 object-contain"
                    unoptimized
                  />
                )}
              </div>

              {/* Spacer on right for symmetry */}
              <div className="w-10 sm:w-12 shrink-0 opacity-0"></div>
            </div>

            {/* Card Content (Bottom) */}
            <div className="relative z-10 flex flex-col justify-end text-left">
              <p className="text-[8px] sm:text-[10px] tracking-widest uppercase text-white/50 mb-0.5">
                Specially Issued To
              </p>
              <h2 className="text-base sm:text-2xl font-bold text-white tracking-wider drop-shadow-md truncate uppercase">
                {invitation.guestName}
              </h2>
              <p className="text-[9px] sm:text-xs font-mono text-amber-400 tracking-wider truncate mt-0.5">
                TOKEN: {invitation.token}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-6 animate-fade-in-delayed">
          <p className="text-slate-600 text-lg font-light leading-relaxed">
            We are delighted to invite you to experience an unforgettable culinary journey at Rooma Ceritarasa.
          </p>
          
          <div className="animate-fade-in-delayed-2 flex flex-col gap-3">
            <VipDownloadButton
              guestName={invitation.guestName}
              token={invitation.token}
              tier={invitation.vipTier}
              qrCodeUrl={invitation.qrCodeUrl}
            />
            <Link 
              href={`/reservasi?vipToken=${invitation.token}`}
              className="
                inline-block w-full py-4 px-8 
                bg-primary hover:bg-primary-dark 
                text-white font-bold tracking-[0.2em] text-sm uppercase
                transition-all duration-300
                shadow-lg hover:shadow-xl
                hover:-translate-y-1
              "
            >
              Claim Your Reservation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
