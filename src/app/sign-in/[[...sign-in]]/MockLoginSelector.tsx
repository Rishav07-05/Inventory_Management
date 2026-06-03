"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { User, ShieldCheck, Lock } from "lucide-react";
import { mockAdminSignIn } from "@/app/actions";

export default function MockLoginSelector() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelectRole = (role: string) => {
    // Set the cookie for routing in middleware and server actions
    document.cookie = `mock_role=${role}; path=/; max-age=31536000`;
    router.push("/");
    
    // Trigger window reload to ensure all Server Components reload with new cookie
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const handleAdminLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await mockAdminSignIn(email, password);
        document.cookie = "mock_role=ADMIN; path=/; max-age=31536000";
        window.location.href = "/";
      } catch (err: any) {
        setError(err?.message || "Failed to sign in as admin.");
      }
    });
  };

  return (
    <div className="space-y-4 w-full">
      <div className="rounded-lg bg-teal-500/5 border border-teal-500/20 p-3 text-center text-xs text-teal-400 leading-relaxed">
        <strong>🧪 Development Bypass Mode:</strong> Clerk is disabled. Use admin credentials from .env or pick a role below.
      </div>

      <form
        onSubmit={handleAdminLogin}
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Lock className="h-4 w-4 text-rose-400" /> Admin access (uses .env credentials)
        </div>
        <input
          type="email"
          name="email"
          autoComplete="username"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          required
        />
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          required
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 transition disabled:opacity-60"
        >
          {isPending ? "Signing in..." : "Sign in as Admin"}
        </button>
      </form>
      
      <button
        type="button"
        onClick={() => handleSelectRole("SELLER")}
        className="w-full flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" /> Login as Sales Representative
        </span>
        <span className="text-2xs font-mono text-emerald-500/80 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">SELLER</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelectRole("BUYER")}
        className="w-full flex items-center justify-between rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-400 hover:bg-sky-500/20 transition cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <User className="h-5 w-5 text-sky-400" /> Login as Buyer / Client
        </span>
        <span className="text-2xs font-mono text-sky-500/80 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-900/30">BUYER</span>
      </button>
    </div>
  );
}
