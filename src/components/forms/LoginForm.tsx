"use client";

import { useActionState } from "react";
import { loginAction } from "@/application/use-cases/auth/login.action";

const initialState = { error: null as string | null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-bg-dark/60 dark:text-gray-100"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-bg-dark/60 dark:text-gray-100"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-primary" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-70"
      >
        {pending ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}
