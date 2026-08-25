"use client";

import { useEffect, useState, useSyncExternalStore, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Briefcase, CalendarBlank, X, CheckCircle, Image as ImageIcon, UploadSimple } from "@phosphor-icons/react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { handleApiError } from "@/lib/handle-api-error";

const emptySubscribe = () => () => {};

type CareerJob = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  deadline: string | null;
  imageUrl: string | null;
  isOpen: boolean;
  createdAt: string;
};

async function fetchJobs(signal?: AbortSignal): Promise<CareerJob[]> {
  const res = await fetch("/api/hr/careers", {
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error(await handleApiError(res));

  const payload = await res.json();
  if (!payload.success) throw new Error(payload.error || payload.message || "Failed to load jobs");

  return payload.data || [];
}

export default function HrCareersClient() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingJob, setEditingJob] = useState<CareerJob | null>(null);
  const [deleteJobPrompt, setDeleteJobPrompt] = useState<CareerJob | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newRequirements, setNewRequirements] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newIsOpen, setNewIsOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadJobs() {
    setIsLoading(true);
    setError("");
    try {
      setJobs(await fetchJobs());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    void fetchJobs(controller.signal)
      .then((loadedJobs) => {
        if (!controller.signal.aborted) setJobs(loadedJobs);
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
    setEditingJob(null);
    setNewTitle("");
    setNewDescription("");
    setNewRequirements("");
    setNewDeadline("");
    setNewIsOpen(true);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEditClick = (job: CareerJob) => {
    setEditingJob(job);
    setNewTitle(job.title);
    setNewDescription(job.description);
    setNewRequirements(job.requirements);
    setNewDeadline(job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : "");
    setNewIsOpen(job.isOpen);
    setPreviewUrl(job.imageUrl);
    setIsAdding(true);
  };

  const handleToggleStatus = async (job: CareerJob) => {
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/hr/careers/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: !job.isOpen }),
      });
      if (!res.ok) throw new Error(await handleApiError(res));

      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "Failed to update status");

      setJobs(jobs.map((j) => (j.id === job.id ? data.data : j)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (job: CareerJob) => {
    setDeleteJobPrompt(job);
  };

  const executeDeleteJob = async () => {
    if (!deleteJobPrompt) return;
    setIsSaving(true);
    
    try {
      const res = await fetch(`/api/hr/careers/${deleteJobPrompt.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await handleApiError(res));

      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "Failed to delete job posting");
      
      void loadJobs();
      setDeleteJobPrompt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription || !newRequirements) return;
    
    setIsSaving(true);
    setError("");
    try {
      let res;
      
      if (editingJob) {
        const hasTextChanges = newTitle !== editingJob.title || newDescription !== editingJob.description || newRequirements !== editingJob.requirements || newIsOpen !== editingJob.isOpen || newDeadline !== (editingJob.deadline ? new Date(editingJob.deadline).toISOString().split('T')[0] : "");
        
        if (!selectedFile && !hasTextChanges) {
          resetForm();
          return;
        }

        if (selectedFile) {
          const formData = new FormData();
          formData.append("image", selectedFile);
          formData.append("title", newTitle);
          formData.append("description", newDescription);
          formData.append("requirements", newRequirements);
          if (newDeadline) formData.append("deadline", new Date(newDeadline).toISOString());
          formData.append("isOpen", String(newIsOpen));
          res = await fetch(`/api/hr/careers/${editingJob.id}`, { method: "PUT", body: formData });
        } else {
          res = await fetch(`/api/hr/careers/${editingJob.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: newTitle,
              description: newDescription,
              requirements: newRequirements,
              deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
              isOpen: newIsOpen,
            }),
          });
        }
      } else {
        const formData = new FormData();
        if (selectedFile) formData.append("image", selectedFile);
        formData.append("title", newTitle);
        formData.append("description", newDescription);
        formData.append("requirements", newRequirements);
        if (newDeadline) formData.append("deadline", new Date(newDeadline).toISOString());
        formData.append("isOpen", String(newIsOpen));

        res = await fetch("/api/hr/careers", {
          method: "POST",
          body: formData,
        });
      }

      if (!res.ok) throw new Error(await handleApiError(res));

      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || data.message || "Failed to save job posting");
      }
      
      if (editingJob) {
        setJobs(jobs.map(j => j.id === editingJob.id ? data.data : j));
      } else {
        setJobs([data.data, ...jobs]);
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
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Job Openings</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Manage restaurant recruitment. Active job openings will be displayed on the public Careers page.
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-colors"
          >
            <Plus weight="bold" />
            Open a Job
          </button>
        </div>
      </header>

      {error && !isAdding && (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Add Job Modal */}
      {mounted && isAdding && createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">{editingJob ? "Edit Job Opening" : "Create New Job Opening"}</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} weight="bold" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">{error}</div>}

              {/* Image Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">{editingJob ? "Change Banner Image (Optional)" : "Banner Image *"}</label>
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                      }
                    }} 
                  />
                  
                  {previewUrl ? (
                    <div className="relative aspect-21/9 w-full">
                      <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-semibold flex items-center gap-2"><UploadSimple weight="bold" /> Change Image</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-slate-500 group-hover:text-primary">
                      <div className="w-10 h-10 bg-slate-100 group-hover:bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <ImageIcon size={20} className="text-slate-400 group-hover:text-primary" />
                      </div>
                      <p className="text-sm font-medium">Click to select a banner image</p>
                      <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, WEBP</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Position / Job Title *</label>
                <input 
                  type="text" required
                  placeholder="Example: Executive Chef"
                  value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Job Description *</label>
                <textarea 
                  required rows={4}
                  placeholder="Write an overview and responsibilities of the job..."
                  value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Requirements *</label>
                <textarea 
                  required rows={4}
                  placeholder="Write the required qualifications, experience, or skills..."
                  value={newRequirements} onChange={e => setNewRequirements(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Deadline (Optional)</label>
                  <input 
                    type="date"
                    value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Publication Status</label>
                  <label className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newIsOpen} 
                      onChange={(e) => setNewIsOpen(e.target.checked)}
                      className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800">Open Job Now</span>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Will be displayed immediately on the website</p>
                    </div>
                  </label>
                </div>
              </div>
            </form>

            <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
              <button 
                onClick={handleAddSubmit} 
                disabled={isSaving} 
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-md disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : "Save Job Opening"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Careers List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <Briefcase size={48} className="mx-auto text-slate-300 mb-4" weight="light" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Job Openings Yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">You haven&apos;t created any job openings yet. Click Open a Job to start recruiting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1 z-10 h-full ${job.isOpen ? 'bg-green-500' : 'bg-slate-300'}`} />
              
              {job.imageUrl && (
                <div className="relative w-full aspect-21/9 bg-slate-100">
                  <Image src={job.imageUrl} alt={job.title} fill className="object-cover" />
                </div>
              )}
              
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{job.title}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shrink-0 ml-3 ${
                    job.isOpen ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {job.isOpen ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
              
              <p className="text-sm text-slate-600 line-clamp-3 mb-5 flex-1">{job.description}</p>
              
              <div className="pt-4 border-t border-slate-100 mt-auto space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle size={14} className="text-slate-400" />
                  <span className="truncate">Created: {format(parseISO(job.createdAt), "dd MMM yyyy", { locale: enUS })}</span>
                </div>
                {job.deadline && (
                  <div className="flex items-center gap-2 text-xs text-red-500 font-medium">
                    <CalendarBlank size={14} />
                    <span className="truncate">Deadline: {format(parseISO(job.deadline), "dd MMM yyyy", { locale: enUS })}</span>
                  </div>
                )}
                
                <div className="pt-3 mt-3 border-t border-slate-50 flex gap-1 justify-end">
                  <button 
                    onClick={() => handleToggleStatus(job)} 
                    disabled={isSaving}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded transition-colors uppercase tracking-wider ${
                      job.isOpen ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"
                    }`}
                  >
                    {job.isOpen ? "Close Job" : "Reopen Job"}
                  </button>
                  <button onClick={() => handleEditClick(job)} className="text-[11px] font-bold text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded transition-colors uppercase tracking-wider">Edit</button>
                  <button onClick={() => handleDeleteClick(job)} className="text-[11px] font-bold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded transition-colors uppercase tracking-wider">Delete</button>
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {mounted && deleteJobPrompt && createPortal(
        <div className="fixed inset-0 z-10000 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase size={32} weight="fill" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Job Opening?</h3>
              <p className="text-sm text-slate-500">
                The job <strong>&quot;{deleteJobPrompt.title}&quot;</strong> will be permanently deleted along with all its applications. This action cannot be undone.
              </p>
            </div>
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setDeleteJobPrompt(null)} 
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteJob} 
                disabled={isSaving} 
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Deleting..." : "Yes, Delete Job"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
