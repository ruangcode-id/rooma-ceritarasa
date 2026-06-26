"use client";

import { useState } from "react";
import { useActionState } from "react";
import { loginAction } from "@/application/use-cases/auth/login.action";
import { Eye, EyeSlash, CircleNotch } from "@phosphor-icons/react";

const initialState = { error: null as string | null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-8 w-full mt-8">
      {/* Email field */}
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@rooma.com"
          className="w-full border-b-2 border-slate-200 bg-transparent px-0 py-2 text-base text-slate-900 outline-none transition-all duration-200 focus:border-[#1f0609] placeholder:text-slate-300"
        />
      </div>

      {/* Password field with show/hide toggle */}
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2"
        >
          Password
        </label>
        <div className="relative flex items-center">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full border-b-2 border-slate-200 bg-transparent px-0 py-2 pr-10 text-base text-slate-900 outline-none transition-all duration-200 focus:border-[#1f0609] placeholder:text-slate-300"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-0 bottom-2 text-slate-400 hover:text-[#1f0609] transition-colors"
          >
            {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Error message */}
      {state.error ? (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg animate-in fade-in duration-300">
          <p className="text-sm text-red-600 text-center font-medium" role="alert">
            {state.error}
          </p>
        </div>
      ) : null}

      {/* Submit button with loading spinner */}
      <button
        type="submit"
        disabled={pending}
        className="relative w-full flex items-center justify-center gap-3 bg-[#1f0609] text-white font-bold uppercase tracking-[0.2em] py-4 hover:bg-[#3a0d13] transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {pending && (
          <CircleNotch
            size={18}
            className="animate-spin"
            aria-hidden="true"
          />
        )}
        {pending ? "Authenticating..." : "Sign In"}
      </button>
    </form>
  );
}
