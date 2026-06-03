"use client";

import { useEffect } from "react";
export default function AdminBypassPage() {

  useEffect(() => {
    // Set the cookie for routing in middleware and server actions
    document.cookie = "mock_role=ADMIN; path=/; max-age=31536000";
    // Redirect directly via hard navigation to avoid reload loops and ensure server components read the cookie
    window.location.href = "/admin/dashboard/1weirdroute4Lxyz";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-t-2 border-r-2 border-teal-500 animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-white">
          Bypassing authentication and logging in as Admin...
        </h2>
        <p className="mt-2 text-sm text-slate-400">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}
