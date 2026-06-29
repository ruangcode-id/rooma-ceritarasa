import { getVipInvitationByToken } from "@/features/reservations/reservation.service";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

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
  let cardGradient = "from-black via-[#111] to-black"; // PLATINUM default
  let accentColor = "text-slate-300";
  let tierLabel = "VIP MEMBER";

  if (invitation.vipTier === "GOLD") {
    cardGradient = "from-black via-[#111] to-black";
    accentColor = "text-yellow-500";
  } else if (invitation.vipTier === "SILVER") {
    cardGradient = "from-black via-[#111] to-black";
    accentColor = "text-slate-100";
  }

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
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-slate-200 blur-[120px]"></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px]"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full px-4 text-center">
        <h1 className="text-sm font-bold tracking-[0.3em] uppercase text-primary mb-8">
          Exclusive Invitation
        </h1>

        {/* 3D VIP Card Container */}
        <div className="group perspective-1000 mb-12 relative animate-gift-bounce">
          <div className={`
            relative w-full aspect-[1.586/1] rounded-2xl p-5 sm:p-8
            bg-gradient-to-br ${cardGradient}
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
                className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent" 
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
              <Image 
                src="/assets/logo_no_background.png" 
                alt="Rooma" 
                width={100} 
                height={32} 
                className="brightness-0 invert opacity-90 w-[70px] sm:w-[100px] h-auto"
              />
              <span className={`text-[9px] sm:text-xs font-bold tracking-[0.1em] sm:tracking-[0.2em] uppercase text-right leading-tight ${accentColor}`}>
                {tierLabel}
              </span>
            </div>

            {/* Card Content (Middle) - Chip Simlation */}
            <div className="relative z-10 mt-4 sm:mt-6">
              <div className="w-10 h-7 sm:w-12 sm:h-8 rounded bg-gradient-to-br from-amber-200/40 to-amber-500/20 border border-amber-100/30"></div>
            </div>

            {/* Card Content (Bottom) */}
            <div className="relative z-10 mt-auto flex justify-between items-end gap-2">
              <div className="min-w-0">
                <p className="text-[8px] sm:text-[10px] tracking-widest uppercase text-white/50 mb-0.5 sm:mb-1">
                  Specially Issued To
                </p>
                <h2 className="text-base sm:text-2xl font-bold text-white tracking-wider drop-shadow-md truncate">
                  {invitation.guestName}
                </h2>
              </div>
              
              <div className="bg-white p-1 sm:p-2 rounded flex-shrink-0">
                {invitation.qrCodeUrl ? (
                  <Image 
                    src={invitation.qrCodeUrl}
                    alt="VIP QR Code"
                    width={80}
                    height={80}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                    unoptimized
                  />
                ) : (
                  <Image 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${invitation.token}&margin=0`}
                    alt="VIP QR Code Fallback"
                    width={80}
                    height={80}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                    unoptimized
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-6 animate-fade-in-delayed">
          <p className="text-slate-600 text-lg font-light leading-relaxed">
            We are delighted to invite you to experience an unforgettable culinary journey at Rooma Ceritarasa.
          </p>
          
          <div className="animate-fade-in-delayed-2">
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
