import LoginForm from "@/components/forms/LoginForm";

export const runtime = "nodejs";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-texture flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md glass rounded-xl p-6 dark:text-gray-100">
        <h1 className="text-2xl font-semibold text-center">Login</h1>
        <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-300">
          Masuk sebagai <span className="font-medium">admin</span> atau <span className="font-medium">owner</span>.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
