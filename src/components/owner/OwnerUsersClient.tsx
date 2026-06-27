"use client";

import { useEffect, useState } from "react";
import { Plus, X, UserCircle, Crown, Trash, PencilSimple } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";

type UserRole = "admin" | "owner";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

export default function OwnerUsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserPrompt, setDeleteUserPrompt] = useState<User | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("admin");

  async function loadUsers() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/owner/users?page=1&limit=50", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || "Failed to load staff");
      
      setUsers(payload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const resetForm = () => {
    setIsAdding(false);
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("admin");
    setError("");
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(""); // Leave empty unless they want to change it
    setRole(user.role);
    setIsAdding(true);
  };

  const handleDeleteClick = (user: User) => {
    setDeleteUserPrompt(user);
  };

  const executeDeleteUser = async () => {
    if (!deleteUserPrompt) return;
    setIsSaving(true);
    
    try {
      const res = await fetch(`/api/owner/users/${deleteUserPrompt.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete staff");
      
      setUsers(users.filter(u => u.id !== deleteUserPrompt.id));
      setDeleteUserPrompt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    if (!editingUser && !password) {
      setError("Password is required for new users.");
      return;
    }
    
    setIsSaving(true);
    setError("");
    
    try {
      const payload: any = { name, email, role };
      if (password) payload.password = password; // Only send password if changed

      let res;
      if (editingUser) {
        res = await fetch(`/api/owner/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/owner/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save staff account");
      }
      
      if (editingUser) {
        setUsers(users.map(u => u.id === editingUser.id ? data.data : u));
      } else {
        setUsers([data.data, ...users]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Owner Configuration</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Staff Accounts</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Manage Admin accounts that have access to the restaurant operations panel.
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800"
          >
            <Plus weight="bold" />
            Add Account
          </button>
        </div>
      </header>

      {error && !isAdding && !deleteUserPrompt && (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">{editingUser ? "Edit Account" : "Create New Account"}</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} weight="bold" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">{error}</div>}

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Full Name *</label>
                <input 
                  type="text" required
                  placeholder="e.g. John Doe"
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email Address *</label>
                <input 
                  type="email" required
                  placeholder="admin@rooma.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">{editingUser ? "Change Password (Optional)" : "Password *"}</label>
                <input 
                  type="password" required={!editingUser}
                  placeholder={editingUser ? "Leave empty to keep current password" : "Min. 8 characters"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Access Role *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`border rounded-xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${role === 'admin' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:border-primary/50 hover:bg-slate-50'}`}>
                    <input type="radio" name="role" value="admin" checked={role === "admin"} onChange={() => setRole("admin")} className="hidden" />
                    <UserCircle size={28} weight={role === "admin" ? "fill" : "regular"} />
                    <span className="text-xs font-bold uppercase tracking-wider">Admin</span>
                  </label>
                  <label className={`border rounded-xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${role === 'owner' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-amber-500/50 hover:bg-amber-50/50'}`}>
                    <input type="radio" name="role" value="owner" checked={role === "owner"} onChange={() => setRole("owner")} className="hidden" />
                    <Crown size={28} weight={role === "owner" ? "fill" : "regular"} />
                    <span className="text-xs font-bold uppercase tracking-wider">Owner</span>
                  </label>
                </div>
              </div>
            </form>

            <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
              <button 
                onClick={handleFormSubmit} 
                disabled={isSaving} 
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-md disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : "Save Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading staff data...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <UserCircle size={48} className="mx-auto text-slate-300 mb-4" weight="light" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Staff Found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">Add an admin account so your staff can manage restaurant reservations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div key={user.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-inner ${user.role === 'owner' ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-slate-700 to-slate-900'}`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{user.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      {user.role === 'owner' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          <Crown size={12} weight="fill" /> Owner
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          <UserCircle size={12} weight="fill" /> Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditClick(user)} className="text-slate-400 hover:text-primary p-1.5 rounded transition-colors bg-slate-50 hover:bg-primary/10">
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button onClick={() => handleDeleteClick(user)} className="text-slate-400 hover:text-red-500 p-1.5 rounded transition-colors bg-slate-50 hover:bg-red-50">
                    <Trash size={16} weight="bold" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-24 shrink-0 font-medium text-xs uppercase tracking-wider text-slate-400">Email</span>
                  <span className="truncate text-slate-900 font-medium">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 shrink-0 font-medium text-xs uppercase tracking-wider text-slate-400">Joined</span>
                  <span className="truncate text-slate-900 font-medium">{format(parseISO(user.createdAt), "dd MMM yyyy", { locale: enUS })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUserPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Trash size={32} weight="fill" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Staff Account?</h3>
              <p className="text-sm text-slate-500">
                Are you sure you want to delete <strong>"{deleteUserPrompt.name}"</strong>? This account will no longer be able to access the admin panel.
              </p>
            </div>
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setDeleteUserPrompt(null)} 
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteUser} 
                disabled={isSaving} 
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
