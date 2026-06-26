"use client";

import { useActionState } from "react";
import { loginAction } from "@/application/use-cases/auth/login.action";

const initialState = { error: null as string | null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-8 w-full mt-8">
      <div>
        <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@rooma.com"
          className="w-full border-b-2 border-slate-200 bg-transparent px-0 py-2 text-base text-slate-900 outline-none transition-all focus:border-[#1f0609] placeholder:text-slate-300"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full border-b-2 border-slate-200 bg-transparent px-0 py-2 text-base text-slate-900 outline-none transition-all focus:border-[#1f0609] placeholder:text-slate-300"
        />
      </div>

      {state.error ? (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg animate-in fade-in">
          <p className="text-sm text-red-600 text-center font-medium" role="alert">
            {state.error}
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#1f0609] text-white font-bold uppercase tracking-[0.2em] py-4 hover:bg-[#3a0d13] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {pending ? "Authenticating..." : "Sign In"}
      </button>
    </form>
  );
}
