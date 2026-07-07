"use client";

import { useEffect, useState } from "react";
import { Plus, Briefcase, CalendarBlank, X, CheckCircle } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";

type CareerJob = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  deadline: string | null;
  isOpen: boolean;
  createdAt: string;
};

export default function AdminCareersClient() {
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

  async function loadJobs() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/careers", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || payload.message || "Failed to load jobs");
      
      setJobs(payload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();
  }, []);

  const resetForm = () => {
    setIsAdding(false);
    setEditingJob(null);
    setNewTitle("");
    setNewDescription("");
    setNewRequirements("");
    setNewDeadline("");
    setNewIsOpen(true);
  };

  const handleEditClick = (job: CareerJob) => {
    setEditingJob(job);
    setNewTitle(job.title);
    setNewDescription(job.description);
    setNewRequirements(job.requirements);
    setNewDeadline(job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : "");
    setNewIsOpen(job.isOpen);
    setIsAdding(true);
  };

  const handleDeleteClick = (job: CareerJob) => {
    setDeleteJobPrompt(job);
  };

  const executeDeleteJob = async () => {
    if (!deleteJobPrompt) return;
    setIsSaving(true);
    
    try {
      const res = await fetch(`/api/admin/careers/${deleteJobPrompt.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.message || "Failed to close job posting");
      
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
      const payload = {
        title: newTitle,
        description: newDescription,
        requirements: newRequirements,
        deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
        isOpen: newIsOpen,
      };

      let res;
      if (editingJob) {
        res = await fetch(`/api/admin/careers/${editingJob.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/careers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      
      if (!res.ok || !data.success) {
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
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">{editingJob ? "Edit Job Opening" : "Create New Job Opening"}</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} weight="bold" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">{error}</div>}

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
        </div>
      )}

      {/* Careers List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <Briefcase size={48} className="mx-auto text-slate-300 mb-4" weight="light" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Job Openings Yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">You haven't created any job openings yet. Click Open a Job to start recruiting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1 h-full ${job.isOpen ? 'bg-green-500' : 'bg-slate-300'}`} />
              
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
                
                <div className="pt-3 mt-3 border-t border-slate-50 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditClick(job)} className="text-[11px] font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded transition-colors uppercase tracking-wider">Edit</button>
                  {job.isOpen && (
                    <button onClick={() => handleDeleteClick(job)} className="text-[11px] font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition-colors uppercase tracking-wider">Close Job</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteJobPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase size={32} weight="fill" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Close Job Opening?</h3>
              <p className="text-sm text-slate-500">
                The job <strong>"{deleteJobPrompt.title}"</strong> will be closed and will no longer appear on the public careers page.
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
                {isSaving ? "Closing..." : "Yes, Close Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
