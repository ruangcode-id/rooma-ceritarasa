import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SettingsUseCase } from "@/application/use-cases/settings/settings.usecase";
import { prisma } from "@/infrastructure/database/prisma";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await SettingsUseCase.getSettingsAction();
  const sessionsRaw = await prisma.restaurantSession.findMany({
    where: { isActive: true },
    orderBy: { startTime: "asc" }
  });

  // Serialize Date objects from Prisma to strings for the Client Component
  const sessions = sessionsRaw.map(s => ({
    id: s.id,
    name: s.name,
    startTime: s.startTime instanceof Date ? s.startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : s.startTime,
    endTime: s.endTime instanceof Date ? s.endTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : s.endTime,
  }));
  return (
    <>
      <Navbar />
      {/* 
        Area <main> tidak diberi margin-top karena pada halaman beranda, 
        video hero akan berada di bawah navbar transparan.
        Untuk halaman selain beranda, bisa ditambahkan padding-top di halamannya sendiri.
      */}
      <main className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-grow">
          {children}
        </div>
        <Footer settings={settings} sessions={sessions} />
      </main>
    </>
  );
}
