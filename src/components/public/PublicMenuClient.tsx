"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export type MenuPhotoItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string;
  price?: number | null;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  isAvailable?: boolean;
  tags?: string[];
  createdAt?: string;
};

type Props = {
  photos: MenuPhotoItem[];
  categories?: string[];
};

export function PublicMenuClient({ photos }: Props) {
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);

  const togglePhoto = (id: string) => {
    setActivePhotoId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!activePhotoId) return;

    const handleDocumentClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-menu-card]")) {
        setActivePhotoId(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [activePhotoId]);

  return (
    <div className="min-h-screen bg-white font-sans pt-32 pb-24 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8 text-center mb-16">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-8 leading-tight">
          Menu
        </h1>
      </div>

      {/* Masonry Menu Section */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 md:gap-4 space-y-3 md:space-y-4">
          {photos.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-slate-400">No photos in the menu yet.</p>
            </div>
          ) : (
            <>
              {photos.map((img) => {
                const isActive = activePhotoId === img.id;
                return (
                  <div
                    key={img.id}
                    data-menu-card
                    role="button"
                    tabIndex={0}
                    aria-expanded={isActive}
                    onClick={() => togglePhoto(img.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        togglePhoto(img.id);
                      }
                    }}
                    className="cursor-pointer select-none break-inside-avoid relative group overflow-hidden bg-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div
                      className="relative w-full"
                      style={{
                        aspectRatio:
                          img.width && img.height
                            ? `${img.width} / ${img.height}`
                            : "3/4",
                      }}
                    >
                      <Image
                        src={img.imageUrl}
                        alt={img.title || "Menu photo"}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className={`object-cover transition-transform duration-700 ${
                          isActive ? "scale-105" : "group-hover:scale-105"
                        }`}
                      />
                    </div>

                    {/* Hover & Tap Overlay */}
                    <div
                      className={`absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 flex flex-col justify-end p-6 pb-12 ${
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {img.category && (
                        <span className="text-primary text-xs font-bold uppercase tracking-widest mb-2 block">
                          {img.category}
                        </span>
                      )}
                      <h3 className="text-white font-bold text-lg leading-tight mb-2">
                        {img.title}
                      </h3>
                      {img.description && (
                        <p className="text-slate-200 text-sm leading-relaxed line-clamp-3 sm:line-clamp-4">
                          {img.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
