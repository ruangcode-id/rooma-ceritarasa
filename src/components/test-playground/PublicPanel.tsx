import Footer from "@/components/layout/Footer";
import Gallery from "@/components/ui/Gallery";
import Navbar from "@/components/layout/Navbar";

export function PublicPanel() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <Navbar />
      </section>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <Gallery />
      </section>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <Footer />
      </section>
    </div>
  );
}
