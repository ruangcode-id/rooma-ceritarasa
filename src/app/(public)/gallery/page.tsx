import { listPublicGalleryImages } from "@/features/gallery/gallery.service";
import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery | Rooma Ceritarasa",
  description: "Visual exploration of the atmosphere, dishes, and special moments at Rooma Ceritarasa.",
};

export default async function GalleryPage() {
  let images = await listPublicGalleryImages({ sort: "sort_order" });



  return (
    <div className="min-h-screen bg-white font-sans pt-32 pb-24 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8 text-center mb-16">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-8 leading-tight">
          GALLERY
        </h1>
      </div>

      {/* Masonry Gallery Section */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 md:gap-4 space-y-3 md:space-y-4">
          {images.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-slate-400">No photos in the gallery yet.</p>
            </div>
          ) : (
            <>
              {images.map((img) => (
                <div
                  key={img.id}
                  className="break-inside-avoid relative group overflow-hidden bg-slate-100 shadow-sm hover:shadow-xl transition-all duration-500"
                >
                  <div className="relative w-full" style={{ aspectRatio: img.width && img.height ? `${img.width} / ${img.height}` : "4/3" }}>
                    <Image
                      src={img.imageUrl}
                      alt={img.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 pb-16">
                    <span className="text-primary text-xs font-bold uppercase tracking-widest mb-2 block">
                      {img.category}
                    </span>
                    <h3 className="text-white font-bold text-lg leading-tight mb-2">
                      {img.title}
                    </h3>
                    {img.description && (
                      <p className="text-slate-300 text-sm line-clamp-2">
                        {img.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
