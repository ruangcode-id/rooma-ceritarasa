import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SettingsUseCase } from "@/application/use-cases/settings/settings.usecase";
import { prisma } from "@/infrastructure/database/prisma";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let settings;
  let sessionsRaw: Awaited<ReturnType<typeof prisma.restaurantSession.findMany>> = [];

  try {
    settings = await SettingsUseCase.getSettingsAction();
    sessionsRaw = await prisma.restaurantSession.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
    });
  } catch (error) {
    console.error("[PublicLayout] Failed to load footer data", error);
  }

  // Serialize Date objects from Prisma to strings for the Client Component
  const sessions = sessionsRaw.map((session) => ({
    id: session.id,
    name: session.name,
    startTime: session.startTime instanceof Date ? session.startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : session.startTime,
    endTime: session.endTime instanceof Date ? session.endTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : session.endTime,
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
