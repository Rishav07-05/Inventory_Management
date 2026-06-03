"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "../actions";
import { toast } from "sonner";

export default function OnboardingForm() {
  const [selectedRole, setSelectedRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await completeOnboarding(selectedRole);
      if (res.success) {
        toast.success(`Account role set as ${selectedRole}!`);
        // Force refresh and redirect
        router.refresh();
        router.push(selectedRole === "SELLER" ? "/seller/dashboard" : "/buyer/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to set role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Buyer option card */}
        <div
          onClick={() => setSelectedRole("BUYER")}
          className={`group relative flex cursor-pointer flex-col rounded-xl border p-5 shadow-sm transition hover:border-slate-700 hover:bg-slate-800/40 ${
            selectedRole === "BUYER"
              ? "border-teal-500 bg-teal-500/5 ring-1 ring-teal-500"
              : "border-slate-800 bg-slate-900/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                ></path>
              </svg>
            </div>
            <div
              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                selectedRole === "BUYER" ? "border-teal-500 bg-teal-500" : "border-slate-700"
              }`}
            >
              {selectedRole === "BUYER" && (
                <div className="h-1.5 w-1.5 rounded-full bg-slate-950"></div>
              )}
            </div>
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">Buyer Account</h2>
          <p className="mt-2 text-sm text-slate-400">
            For purchasing chemicals. Browse the product catalog, check stock availability, submit quotation requests, and place orders.
          </p>
        </div>

        {/* Seller option card */}
        <div
          onClick={() => setSelectedRole("SELLER")}
          className={`group relative flex cursor-pointer flex-col rounded-xl border p-5 shadow-sm transition hover:border-slate-700 hover:bg-slate-800/40 ${
            selectedRole === "SELLER"
              ? "border-teal-500 bg-teal-500/5 ring-1 ring-teal-500"
              : "border-slate-800 bg-slate-900/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div
              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                selectedRole === "SELLER" ? "border-teal-500 bg-teal-500" : "border-slate-700"
              }`}
            >
              {selectedRole === "SELLER" && (
                <div className="h-1.5 w-1.5 rounded-full bg-slate-950"></div>
              )}
            </div>
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">Seller Account</h2>
          <p className="mt-2 text-sm text-slate-400">
            For sales operations. Process buyer quotation requests, create immediate quotes, place orders on behalf of clients, and track inventory.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-slate-950 bg-teal-400 hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-950"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Saving Role...
          </span>
        ) : (
          "Confirm & Continue"
        )}
      </button>
    </form>
  );
}
