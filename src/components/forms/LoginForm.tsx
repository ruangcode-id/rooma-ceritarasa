"use client";

import { useState } from "react";
import { useActionState } from "react";
import { loginAction } from "@/application/use-cases/auth/login.action";
import {
  Eye,
  EyeSlash,
  CircleNotch,
  Envelope,
  Lock,
  Warning,
} from "@phosphor-icons/react";

const initialState = { error: null as string | null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-6 w-full">

      {/* ── Email ── */}
      <div className="group">
        <label
          htmlFor="email"
          className={`block text-[10px] font-bold uppercase tracking-widest mb-2 transition-colors duration-200 ${
            emailFocused ? "text-[#1f0609]" : "text-slate-400"
          }`}
        >
          Email
        </label>
        <div
          className={`flex items-center gap-3 border-b-2 pb-2 transition-all duration-200 ${
            emailFocused ? "border-[#1f0609]" : "border-slate-200"
          }`}
        >
          <Envelope
            size={16}
            className={`flex-shrink-0 transition-colors duration-200 ${
              emailFocused ? "text-[#1f0609]" : "text-slate-300"
            }`}
          />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* ── Password ── */}
      <div className="group">
        <label
          htmlFor="password"
          className={`block text-[10px] font-bold uppercase tracking-widest mb-2 transition-colors duration-200 ${
            passFocused ? "text-[#1f0609]" : "text-slate-400"
          }`}
        >
          Password
        </label>
        <div
          className={`flex items-center gap-3 border-b-2 pb-2 transition-all duration-200 ${
            passFocused ? "border-[#1f0609]" : "border-slate-200"
          }`}
        >
          <Lock
            size={16}
            className={`flex-shrink-0 transition-colors duration-200 ${
              passFocused ? "text-[#1f0609]" : "text-slate-300"
            }`}
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            onFocus={() => setPassFocused(true)}
            onBlur={() => setPassFocused(false)}
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="flex-shrink-0 text-slate-300 hover:text-[#1f0609] transition-colors"
          >
            {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* ── Error message ── */}
      {state.error ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300"
          role="alert"
        >
          <Warning size={16} className="mt-0.5 flex-shrink-0 text-red-500" weight="fill" />
          <p className="text-xs font-medium leading-relaxed text-red-600">
            {state.error}
          </p>
        </div>
      ) : null}

      {/* ── Submit button ── */}
      <button
        type="submit"
        disabled={pending}
        className="group relative mt-2 w-full overflow-hidden bg-[#1f0609] py-4 text-xs font-bold uppercase tracking-[0.25em] text-white shadow-lg transition-all duration-300 hover:bg-[#3a0d13] hover:shadow-rose-900/30 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* Shine sweep effect on hover */}
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full skew-x-12 bg-white/10 transition-transform duration-700 group-hover:translate-x-full"
        />

        <span className="relative flex items-center justify-center gap-2.5">
          {pending && (
            <CircleNotch size={15} className="animate-spin" aria-hidden="true" />
          )}
          {pending ? "Authenticating..." : "Sign In"}
        </span>
      </button>
    </form>
  );
}
