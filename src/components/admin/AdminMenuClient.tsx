"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  Plus,
  Image as ImageIcon,
  UploadSimple,
  X,
  Eye,
  EyeSlash,
  Trash,
  Tag,
  MagnifyingGlass,
  ArrowsDownUp,
} from "@phosphor-icons/react";
import { handleApiError } from "@/lib/handle-api-error";

const DEFAULT_MENU_CATEGORIES = [
  "Signature",
  "A La Carte",
  "Appetizer",
  "Main Course",
  "Dessert",
  "Beverage",
  "Cocktail",
  "Wine",
  "Set Menu",
];

const STORAGE_KEY_CATEGORIES = "rooma_admin_menu_categories";
const STORAGE_KEY_DELETED = "rooma_admin_deleted_categories";

const AVAILABLE_TAGS = [
  { id: "Chef's Special", label: "Chef's Special ⭐" },
  { id: "Spicy", label: "Spicy 🌶️" },
  { id: "Vegetarian", label: "Vegetarian 🥦" },
  { id: "Gluten-Free", label: "Gluten-Free 🌾" },
  { id: "Signature", label: "Signature 👑" },
];

type MenuPhotoData = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string;
  price: number | null;
  sortOrder: number;
  isActive: boolean;
  isAvailable?: boolean;
  tags?: string[];
  createdAt: string;
};

async function fetchMenuPhotos(signal?: AbortSignal): Promise<MenuPhotoData[]> {
  const res = await fetch("/api/admin/menu?limit=100", { cache: "no-store", signal });
  if (!res.ok) throw new Error(await handleApiError(res));
  const payload = await res.json();
  if (!payload.success) throw new Error(payload.error || payload.message || "Failed to load menu");
  return payload.data || [];
}

export default function AdminMenuClient() {
  const [photos, setPhotos] = useState<MenuPhotoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<MenuPhotoData | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<MenuPhotoData | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [targetReassignCategory, setTargetReassignCategory] = useState<string>("Signature");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Signature");
  const [customCategory, setCustomCategory] = useState("");
  const [price, setPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Category Management State (initialized from localStorage lazily)
  const [managedCategories, setManagedCategories] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_MENU_CATEGORIES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      return saved ? JSON.parse(saved) : DEFAULT_MENU_CATEGORIES;
    } catch {
      return DEFAULT_MENU_CATEGORIES;
    }
  });

  const [deletedCategories, setDeletedCategories] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DELETED);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [categoryError, setCategoryError] = useState("");

  // Compute final available categories:
  const availableCategories = Array.from(
    new Set([
      ...managedCategories,
      ...photos.map((p) => p.category).filter(Boolean),
    ])
  ).filter((cat) => !deletedCategories.includes(cat));

  useEffect(() => {
    const controller = new AbortController();
    void fetchMenuPhotos(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setPhotos(data); })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, []);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingPhoto(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setTitle("");
    setDescription("");
    setCategory(availableCategories[0] || "Signature");
    setCustomCategory("");
    setPrice("");
    setSortOrder("0");
    setIsAvailable(true);
    setSelectedTags([]);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEditForm = (photo: MenuPhotoData) => {
    setEditingPhoto(photo);
    setTitle(photo.title);
    setDescription(photo.description ?? "");
    setCategory(availableCategories.includes(photo.category) ? photo.category : "custom");
    setCustomCategory(availableCategories.includes(photo.category) ? "" : photo.category);
    setPrice(photo.price != null ? String(photo.price) : "");
    setSortOrder(String(photo.sortOrder));
    setIsAvailable(photo.isAvailable ?? true);
    setSelectedTags(photo.tags ?? []);
    setPreviewUrl(photo.imageUrl);
    setIsFormOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const getEffectiveCategory = () =>
    category === "custom" ? customCategory.trim() : category;

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  // Add new category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    if (availableCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError("Category already exists.");
      return;
    }

    const updated = [...managedCategories, trimmed];
    const updatedDeleted = deletedCategories.filter((c) => c.toLowerCase() !== trimmed.toLowerCase());

    setManagedCategories(updated);
    setDeletedCategories(updatedDeleted);
    setNewCategoryInput("");
    setCategoryError("");

    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(updatedDeleted));
    } catch {
      // ignore
    }
  };

  // Delete category from list (with optional photo reassignment)
  const handleDeleteCategory = async (catName: string, reassignTo?: string) => {
    const affectedPhotos = photos.filter((p) => p.category === catName);

    // If there are affected photos and a target reassign category is chosen, update them
    if (affectedPhotos.length > 0 && reassignTo && reassignTo !== catName) {
      setIsSaving(true);
      try {
        await Promise.all(
          affectedPhotos.map((p) =>
            fetch(`/api/admin/menu/${p.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ category: reassignTo }),
            })
          )
        );
        // Update local state photos
        setPhotos((prev) =>
          prev.map((p) => (p.category === catName ? { ...p, category: reassignTo } : p))
        );
      } catch (err) {
        console.error("Failed to reassign photos:", err);
      } finally {
        setIsSaving(false);
      }
    }

    const updated = managedCategories.filter((c) => c !== catName);
    const updatedDeleted = Array.from(new Set([...deletedCategories, catName]));

    setManagedCategories(updated);
    setDeletedCategories(updatedDeleted);
    setCategoryToDelete(null);

    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(updatedDeleted));
    } catch {
      // ignore
    }

    if (category === catName) {
      setCategory(updated[0] || "Signature");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCategory = getEffectiveCategory();

    if (!title.trim()) { setError("Title is required."); return; }
    if (!effectiveCategory) { setError("Category is required."); return; }
    if (!editingPhoto && !selectedFile) { setError("Please select an image."); return; }

    setIsSaving(true);
    setError("");

    try {
      let res: Response;

      if (editingPhoto) {
        if (selectedFile) {
          const formData = new FormData();
          formData.append("image", selectedFile);
          formData.append("title", title);
          formData.append("category", effectiveCategory);
          if (description) formData.append("description", description);
          if (price) formData.append("price", price);
          formData.append("sortOrder", sortOrder);
          formData.append("isAvailable", String(isAvailable));
          formData.append("tags", JSON.stringify(selectedTags));
          res = await fetch(`/api/admin/menu/${editingPhoto.id}`, { method: "PUT", body: formData });
        } else {
          res = await fetch(`/api/admin/menu/${editingPhoto.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              category: effectiveCategory,
              description: description || null,
              price: price ? parseInt(price) : null,
              sortOrder: parseInt(sortOrder),
              isAvailable,
              tags: selectedTags,
            }),
          });
        }
      } else {
        const formData = new FormData();
        formData.append("image", selectedFile!);
        formData.append("title", title);
        formData.append("category", effectiveCategory);
        if (description) formData.append("description", description);
        if (price) formData.append("price", price);
        formData.append("sortOrder", sortOrder);
        formData.append("isActive", "true");
        formData.append("isAvailable", String(isAvailable));
        formData.append("tags", JSON.stringify(selectedTags));
        res = await fetch("/api/admin/menu", { method: "POST", body: formData });
      }

      if (!res.ok) throw new Error(await handleApiError(res));
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "Failed to save");

      // Save custom category if user typed a new one
      if (category === "custom" && !managedCategories.includes(effectiveCategory)) {
        const updated = [...managedCategories, effectiveCategory];
        setManagedCategories(updated);
        try {
          localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }

      if (editingPhoto) {
        setPhotos((prev) => prev.map((p) => (p.id === editingPhoto.id ? data.data : p)));
      } else {
        setPhotos((prev) => [data.data, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (photo: MenuPhotoData) => {
    try {
      const res = await fetch(`/api/admin/menu/${photo.id}`, { method: "PATCH" });
      if (!res.ok) throw new Error(await handleApiError(res));
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to toggle status");
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? data.data : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 4000);
    }
  };

  const handleToggleAvailability = async (photo: MenuPhotoData) => {
    try {
      const nextAvailable = photo.isAvailable === false ? true : false;
      const res = await fetch(`/api/admin/menu/${photo.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: nextAvailable }),
      });
      if (!res.ok) throw new Error(await handleApiError(res));
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to toggle availability");
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? data.data : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 4000);
    }
  };

  const executeDelete = async () => {
    if (!deletePrompt) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/menu/${deletePrompt.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await handleApiError(res));
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to delete");
      setPhotos((prev) => prev.filter((p) => p.id !== deletePrompt.id));
      setDeletePrompt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });

  // Filtered photos based on category tab & search query
  const filteredPhotos = photos.filter((p) => {
    const matchesCategory = selectedCategoryFilter === "ALL" || p.category === selectedCategoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Content & CRM</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Menu Management</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Upload photos of your dishes or menu pages. Manage categories, prices, and descriptions that appear publicly on the guest Menu page.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-400 transition-colors"
            title="Manage menu categories"
          >
            <Tag size={16} weight="bold" />
            Manage Categories
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-colors"
          >
            <Plus weight="bold" />
            Upload Menu Photo
          </button>
        </div>
      </header>

      {error && !isFormOpen && !isCategoryModalOpen && (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">{error}</div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search menu by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-sm rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          <button
            onClick={() => setSelectedCategoryFilter("ALL")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              selectedCategoryFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({photos.length})
          </button>
          {availableCategories.map((cat) => {
            const count = photos.filter((p) => p.category === cat).length;
            if (count === 0 && selectedCategoryFilter !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategoryFilter === cat
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Tag size={20} className="text-primary" weight="bold" />
                <h3 className="text-lg font-bold text-slate-900">Manage Categories</h3>
              </div>
              <button
                onClick={() => { setIsCategoryModalOpen(false); setCategoryError(""); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <p className="text-xs text-slate-500 leading-relaxed">
                Add new categories or delete categories you don&apos;t use. The categories listed here will appear in your upload/edit dropdown and as tabs on the public menu page.
              </p>

              {/* Add category form */}
              <form onSubmit={handleAddCategory} className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Add New Category
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Mocktails, Specials, Chef Tasting..."
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    + Add
                  </button>
                </div>
                {categoryError && (
                  <p className="text-xs text-red-600 font-medium">{categoryError}</p>
                )}
              </form>

              {/* Active categories list */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2.5">
                  Active Categories ({availableCategories.length})
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {availableCategories.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3 text-center">No categories left. Add one above or reset.</p>
                  ) : (
                    availableCategories.map((cat) => {
                      const itemCount = photos.filter((p) => p.category === cat).length;
                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{cat}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({itemCount} {itemCount === 1 ? "photo" : "photos"})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryToDelete(cat);
                              if (itemCount > 0) {
                                setTargetReassignCategory(
                                  availableCategories.find((c) => c !== cat) || "Signature"
                                );
                              }
                            }}
                            title={`Delete "${cat}" category`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-70 group-hover:opacity-100"
                          >
                            <Trash size={15} weight="bold" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => { setIsCategoryModalOpen(false); setCategoryError(""); }}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal (with photos reassignment or empty category confirmation) */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              {photos.filter((p) => p.category === categoryToDelete).length > 0 ? (
                /* Has photos -> Reassign & Delete */
                <>
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Trash size={24} weight="fill" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
                    Delete &quot;{categoryToDelete}&quot;?
                  </h3>
                  <p className="text-xs text-slate-500 text-center leading-relaxed mb-4">
                    There are{" "}
                    <strong>
                      {photos.filter((p) => p.category === categoryToDelete).length} photos
                    </strong>{" "}
                    currently using this category. Choose where to move them:
                  </p>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Move photos to category:
                    </label>
                    <select
                      value={targetReassignCategory}
                      onChange={(e) => setTargetReassignCategory(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:border-primary outline-none bg-white"
                    >
                      {availableCategories
                        .filter((c) => c !== categoryToDelete)
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              ) : (
                /* Empty category -> Simple confirmation popup */
                <>
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Trash size={24} weight="fill" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
                    Delete &quot;{categoryToDelete}&quot;?
                  </h3>
                  <p className="text-xs text-slate-500 text-center leading-relaxed">
                    Are you sure you want to remove <strong>&quot;{categoryToDelete}&quot;</strong> from active categories?
                  </p>
                </>
              )}
            </div>
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-2.5">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const hasPhotos = photos.filter((p) => p.category === categoryToDelete).length > 0;
                  void handleDeleteCategory(
                    categoryToDelete,
                    hasPhotos ? targetReassignCategory : undefined
                  );
                }}
                disabled={isSaving}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs disabled:opacity-50 transition-colors"
              >
                {isSaving
                  ? "Deleting..."
                  : photos.filter((p) => p.category === categoryToDelete).length > 0
                  ? "Move & Delete"
                  : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPhoto ? "Edit Menu Photo" : "Upload New Menu Photo"}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">{error}</div>
              )}

              {/* Image Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  {editingPhoto ? "Change Photo (Optional)" : "Select Photo *"}
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-xl overflow-hidden group cursor-pointer transition-colors ${
                    previewUrl ? "border-primary/50" : "border-slate-300 hover:border-primary hover:bg-slate-50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  {previewUrl ? (
                    <div className="relative aspect-video w-full">
                      <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-semibold flex items-center gap-2">
                          <UploadSimple weight="bold" /> Change Photo
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-500 group-hover:text-primary">
                      <div className="w-12 h-12 bg-slate-100 group-hover:bg-primary/10 rounded-full flex items-center justify-center mb-3">
                        <ImageIcon size={24} className="text-slate-400 group-hover:text-primary" />
                      </div>
                      <p className="text-sm font-medium">Click to select an image</p>
                      <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, WEBP (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Menu Title *
                </label>
                <input
                  type="text" required
                  placeholder="e.g. Crispy Duck Leg, Wagyu Sei Sapi, Mocktails..."
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Tag size={12} weight="bold" />
                    Manage List
                  </button>
                </div>
                <select
                  value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="custom">+ Add Custom Category...</option>
                </select>
                {category === "custom" && (
                  <input
                    type="text" required
                    placeholder="Enter custom category name"
                    value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-2 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                )}
              </div>

              {/* Price */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Price (IDR, Optional)
                </label>
                <input
                  type="number" min="0"
                  placeholder="e.g. 185000 — leave empty if not applicable"
                  value={price} onChange={(e) => setPrice(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Dietary / Highlight Tags */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Dietary &amp; Special Tags (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Availability Status */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Stock Availability</p>
                  <p className="text-[11px] text-slate-500">
                    {isAvailable ? "Available for ordering" : "Sold Out / Unavailable today"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    isAvailable
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {isAvailable ? "● In Stock" : "○ Sold Out"}
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="A brief description of this menu item or photo..."
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>

              {/* Sort Order */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Sort Order Priority
                  </label>
                  <span className="text-[11px] text-slate-400">Smaller number = appears first</span>
                </div>
                <div className="relative">
                  <ArrowsDownUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number" min="0"
                    placeholder="0"
                    value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
            </form>

            <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-md disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : editingPhoto ? "Save Changes" : "Start Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading menu photos...</div>
      ) : filteredPhotos.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" weight="light" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {searchQuery || selectedCategoryFilter !== "ALL" ? "No matching photos found" : "No Menu Photos Yet"}
          </h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            {searchQuery || selectedCategoryFilter !== "ALL"
              ? "Try clearing your search query or selecting a different category filter."
              : "Upload photos of your menu pages or signature dishes to showcase them to your guests."}
          </p>
          {(searchQuery || selectedCategoryFilter !== "ALL") && (
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategoryFilter("ALL"); }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => {
            const isSoldOut = photo.isAvailable === false;
            return (
              <div
                key={photo.id}
                className={`relative group rounded-2xl overflow-hidden bg-white shadow-xs border transition-all ${
                  photo.isActive ? "border-slate-200 hover:shadow-md hover:border-slate-300" : "border-slate-200 opacity-60"
                }`}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={photo.imageUrl}
                    alt={photo.title}
                    fill
                    sizes="(max-width:640px) 100vw,(max-width:768px) 50vw,25vw"
                    className={`object-cover transition-transform duration-500 group-hover:scale-105 ${isSoldOut ? "grayscale-30 brightness-95" : ""}`}
                  />

                  {/* Badges: Priority + Availability */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white/90 backdrop-blur-md">
                      #{photo.sortOrder}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleAvailability(photo); }}
                      className={`pointer-events-auto px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs transition-colors ${
                        isSoldOut
                          ? "bg-rose-600 text-white hover:bg-rose-700"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                      title="Click to toggle In Stock / Sold Out"
                    >
                      {isSoldOut ? "Sold Out" : "In Stock"}
                    </button>
                  </div>

                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <div className="flex justify-between items-end w-full">
                      {/* Eye toggle */}
                      <button
                        onClick={() => handleToggleStatus(photo)}
                        title={photo.isActive ? "Deactivate" : "Activate"}
                        className="text-white/80 hover:text-white px-1.5 py-0.5 rounded bg-white/10 backdrop-blur-md transition-colors text-xs font-bold -translate-y-1 group-hover:translate-y-0"
                      >
                        {photo.isActive ? (
                          <span className="flex items-center gap-1"><EyeSlash size={13} weight="bold" /> Hide</span>
                        ) : (
                          <span className="flex items-center gap-1"><Eye size={13} weight="bold" /> Show</span>
                        )}
                      </button>
                      {/* Edit + Delete */}
                      <div className="flex gap-1 bg-white/20 backdrop-blur-md rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-2.5 group-hover:translate-y-0">
                        <button
                          onClick={() => openEditForm(photo)}
                          className="text-white hover:text-primary px-1.5 py-0.5 rounded transition-colors text-xs font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletePrompt(photo)}
                          className="text-red-300 hover:text-red-400 px-1.5 py-0.5 rounded transition-colors text-xs font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-semibold text-slate-900 leading-tight line-clamp-1">{photo.title}</h4>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {photo.category}
                    </span>
                  </div>

                  {/* Dietary / Special Tags */}
                  {photo.tags && photo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {photo.tags.map((t) => (
                        <span key={t} className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {photo.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-1.5">{photo.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    {photo.price != null ? (
                      <p className={`text-xs font-semibold ${isSoldOut ? "text-slate-400 line-through" : "text-slate-800"}`}>
                        {currencyFormatter.format(photo.price)}
                      </p>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No price</span>
                    )}

                    {!photo.isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash size={32} weight="fill" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Menu Photo?</h3>
              <p className="text-sm text-slate-500">
                Are you sure you want to delete{" "}
                <strong>&quot;{deletePrompt.title}&quot;</strong>? This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-3">
              <button
                onClick={() => setDeletePrompt(null)}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
