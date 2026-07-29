"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Plus, Image as ImageIcon, UploadSimple, X } from "@phosphor-icons/react";
import { handleApiError } from "@/lib/handle-api-error";

type GalleryImage = {
  id: string;
  imageUrl: string;
  title: string | null;
  description: string | null;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
};

async function fetchGalleryImages(signal?: AbortSignal): Promise<GalleryImage[]> {
  const res = await fetch("/api/admin/gallery", {
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error(await handleApiError(res));

  const payload = await res.json();
  if (!payload.success) throw new Error(payload.error || payload.message || "Failed to load gallery");

  return payload.data || [];
}

export default function AdminGalleryClient() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Form/Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [deleteImagePrompt, setDeleteImagePrompt] = useState<GalleryImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void fetchGalleryImages(controller.signal)
      .then((loadedImages) => {
        if (!controller.signal.aborted) setImages(loadedImages);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const resetForm = () => {
    setIsAdding(false);
    setEditingImage(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setTitle("");
    setDescription("");
    setCategory("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEditClick = (img: GalleryImage) => {
    setEditingImage(img);
    setTitle(img.title || "");
    setDescription(img.description || "");
    setCategory(img.category || "");
    setPreviewUrl(img.imageUrl);
    setIsAdding(true);
  };

  const handleDeleteClick = (img: GalleryImage) => {
    setDeleteImagePrompt(img);
  };

  const executeDeleteImage = async () => {
    if (!deleteImagePrompt) return;
    setIsSaving(true);
    
    try {
      const res = await fetch(`/api/admin/gallery/${deleteImagePrompt.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await handleApiError(res));

      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "Failed to delete photo");
      
      setImages(images.filter(i => i.id !== deleteImagePrompt.id));
      setDeleteImagePrompt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !category) {
      setError("Title and Category are required.");
      return;
    }
    
    setIsSaving(true);
    setError("");
    try {
      let res;
      
      if (editingImage) {
        // Editing Mode (PUT)
        // Check if we have file or text changes
        const hasTextChanges = title !== editingImage.title || description !== editingImage.description || category !== editingImage.category;
        
        if (!selectedFile && !hasTextChanges) {
          resetForm();
          return;
        }

        if (selectedFile) {
          const formData = new FormData();
          formData.append("image", selectedFile);
          formData.append("title", title);
          formData.append("category", category);
          if (description) formData.append("description", description);
          res = await fetch(`/api/admin/gallery/${editingImage.id}`, { method: "PUT", body: formData });
        } else {
          res = await fetch(`/api/admin/gallery/${editingImage.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, category, description })
          });
        }
      } else {
        // Adding Mode (POST)
        if (!selectedFile) {
          setError("Please select an image first.");
          setIsSaving(false);
          return;
        }
        
        const formData = new FormData();
        formData.append("image", selectedFile);
        formData.append("title", title);
        formData.append("category", category);
        if (description) formData.append("description", description);
        formData.append("sortOrder", "0");
        formData.append("isActive", "true");

        res = await fetch("/api/admin/gallery", { method: "POST", body: formData });
      }

      if (!res.ok) throw new Error(await handleApiError(res));

      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || data.message || "Failed to save photo");
      }
      
      if (editingImage) {
        setImages(images.map(img => img.id === editingImage.id ? data.data : img));
      } else {
        setImages([data.data, ...images]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Content & CRM</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Photo Gallery</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Upload the latest photos of your restaurant. These photos will be displayed publicly on the guest Gallery page.
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800"
          >
            <Plus weight="bold" />
            Upload Photo
          </button>
        </div>
      </header>

      {error && !isAdding && (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Upload Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">{editingImage ? "Edit Photo" : "Upload New Photo"}</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} weight="bold" />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">{error}</div>}

              {/* Image Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">{editingImage ? "Change Photo (Optional)" : "Select Photo *"}</label>
                <div 
                  className={`relative border-2 border-dashed rounded-xl overflow-hidden group cursor-pointer transition-colors ${
                    previewUrl ? 'border-primary/50' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                  />
                  
                  {previewUrl ? (
                    <div className="relative aspect-video w-full">
                      <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-semibold flex items-center gap-2"><UploadSimple weight="bold" /> Change Photo</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-500 group-hover:text-primary">
                      <div className="w-12 h-12 bg-slate-100 group-hover:bg-primary/10 rounded-full flex items-center justify-center mb-3">
                        <ImageIcon size={24} className="text-slate-400 group-hover:text-primary" />
                      </div>
                      <p className="text-sm font-medium">Click to select an image</p>
                      <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, WEBP</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Photo Title *</label>
                <input 
                  type="text" required
                  placeholder="Example: Afternoon Ambience"
                  value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Category *</label>
                <input 
                  type="text" required
                  placeholder="Example: ambience, food, interior"
                  value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Short Description (Optional)</label>
                <textarea 
                  rows={3}
                  placeholder="Add a short story about this photo..."
                  value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>
            </form>

            <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
              <button 
                onClick={handleUploadSubmit} 
                disabled={isSaving} 
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-md disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : (editingImage ? "Save Changes" : "Start Upload")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading gallery...</div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" weight="light" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Empty Gallery</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">No photos uploaded yet. Add the best photos of your restaurant to attract guests.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {images.map((img) => (
            <div key={img.id} className="relative group break-inside-avoid rounded-2xl overflow-hidden bg-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="relative w-full">
                <Image 
                  src={img.imageUrl || ""} 
                  alt={img.title || "Gallery photo"} 
                  width={500} 
                  height={500}
                  className="w-full object-cover"
                />
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="flex justify-between items-start w-full">
                    {img.category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-white/20 text-white backdrop-blur-md mb-2">
                        {img.category}
                      </span>
                    )}
                    <div className="flex gap-1 bg-white/20 backdrop-blur-md rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-[-10px] group-hover:translate-y-0">
                      <button onClick={() => handleEditClick(img)} className="text-white hover:text-primary px-1.5 py-0.5 rounded transition-colors text-xs font-bold">Edit</button>
                      <button onClick={() => handleDeleteClick(img)} className="text-red-300 hover:text-red-400 px-1.5 py-0.5 rounded transition-colors text-xs font-bold">Delete</button>
                    </div>
                  </div>
                  {img.title && <h4 className="text-white font-bold text-sm leading-tight drop-shadow-md">{img.title}</h4>}
                  {img.description && <p className="text-white/80 text-xs mt-1 line-clamp-2">{img.description}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteImagePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon size={32} weight="fill" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Photo?</h3>
              <p className="text-sm text-slate-500">
                Are you sure you want to delete the photo <strong>&quot;{deleteImagePrompt.title || 'Untitled'}&quot;</strong>? This photo will be permanently deleted.
              </p>
            </div>
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setDeleteImagePrompt(null)} 
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteImage} 
                disabled={isSaving} 
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Deleting..." : "Yes, Delete Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
