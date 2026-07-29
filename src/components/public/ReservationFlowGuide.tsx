"use client";

import { useState } from "react";
import { Info, X, CaretRight, CaretLeft, CalendarPlus, UserList, CreditCard, Ticket } from "@phosphor-icons/react";

const STEPS = [
  {
    title: "Pilih Jadwal & Meja",
    description: "Tentukan tanggal kedatangan, sesi (Lunch/Dinner), dan pilih meja yang sesuai dengan jumlah tamu Anda.",
    icon: CalendarPlus,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Isi Data Diri",
    description: "Lengkapi informasi kontak Anda agar kami dapat mengirimkan e-ticket dan menghubungi Anda jika diperlukan.",
    icon: UserList,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Pembayaran DP",
    description: "Selesaikan pembayaran Down Payment (DP) dengan aman melalui Midtrans (QRIS/Transfer/Wallet) untuk mengamankan meja.",
    icon: CreditCard,
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "Terima e-Ticket QR",
    description: "Reservasi berhasil! Anda akan menerima e-Ticket berisi kode QR yang wajib ditunjukkan ke resepsionis saat kedatangan.",
    icon: Ticket,
    color: "bg-purple-100 text-purple-600",
  }
];

export default function ReservationFlowGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(curr => curr + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(curr => curr - 1);
  };

  const close = () => {
    setIsOpen(false);
    setTimeout(() => setCurrentStep(0), 300); // Reset step after closing transition
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 sm:px-5 py-3 rounded-full text-sm font-semibold transition-transform hover:scale-105 shadow-xl active:scale-95"
      >
        <Info size={20} weight="bold" />
        <span className="hidden sm:inline">Cara Reservasi</span>
        <span className="sm:hidden">Panduan</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col transform scale-100 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Panduan Reservasi</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 bg-white rounded-full shadow-sm hover:bg-slate-100">
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 text-center flex flex-col items-center min-h-[320px] relative overflow-hidden">
              <div className="flex gap-2 mb-8 z-10">
                {STEPS.map((_, idx) => (
                  <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? "w-8 bg-slate-900" : "w-3 bg-slate-200"}`} />
                ))}
              </div>

              <div className="relative w-full flex-1">
                {STEPS.map((step, idx) => {
                  const StepIcon = step.icon;
                  return (
                    <div 
                      key={idx} 
                      className={`absolute inset-0 flex flex-col items-center transition-all duration-500 ease-in-out ${
                        idx === currentStep 
                          ? "opacity-100 translate-x-0" 
                          : idx < currentStep 
                            ? "opacity-0 -translate-x-full pointer-events-none" 
                            : "opacity-0 translate-x-full pointer-events-none"
                      }`}
                    >
                      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${step.color}`}>
                        <StepIcon size={40} weight="fill" />
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-slate-100 bg-white flex justify-between items-center">
              <button 
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`flex items-center gap-1 font-semibold text-sm transition-colors ${currentStep === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-600 hover:text-slate-900"}`}
              >
                <CaretLeft size={16} weight="bold" />
                Kembali
              </button>
              
              {currentStep === STEPS.length - 1 ? (
                <button 
                  onClick={close}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                >
                  Mulai Reservasi
                </button>
              ) : (
                <button 
                  onClick={nextStep}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1 active:scale-95"
                >
                  Lanjut
                  <CaretRight size={16} weight="bold" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
