import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
        <Footer />
      </main>
    </>
  );
}
