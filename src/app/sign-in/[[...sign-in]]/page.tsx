import { SignIn } from "@clerk/nextjs";
import MockLoginSelector from "./MockLoginSelector";

export default function Page() {
  const isMockAuth = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 transform rounded-full bg-teal-500/10 p-3 shadow-lg border border-teal-500/20">
          <svg
            className="h-10 w-10 text-teal-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            ></path>
          </svg>
        </div>
        <div className="mb-6 mt-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">ChemVantage</h1>
          <p className="mt-1 text-sm text-slate-400">Chemical Inventory & Order Management</p>
        </div>
        <div className="flex justify-center w-full">
          {isMockAuth ? (
            <MockLoginSelector />
          ) : (
            <SignIn
              appearance={{
                variables: {
                  colorPrimary: "#0d9488",
                  colorBackground: "#0f172a",
                  colorText: "#f1f5f9",
                  colorTextSecondary: "#94a3b8",
                  colorInputBackground: "#1e293b",
                  colorInputText: "#f1f5f9",
                  colorBorder: "#334155",
                },
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
