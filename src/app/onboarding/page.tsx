import { redirect } from "next/navigation";
import { syncAuthUser } from "@/lib/auth-sync";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  // Sync the authenticated user with PostgreSQL
  const { dbUser, needsOnboarding } = await syncAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  // If the user does not need onboarding (already chose role or system admin), redirect to home
  if (!needsOnboarding) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <span className="inline-flex items-center rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-400 border border-teal-500/20 mb-3">
            Onboarding Setup
          </span>
          <h1 className="text-3xl font-extrabold text-white">Select Account Role</h1>
          <p className="mt-2 text-slate-400">
            Welcome to ChemVantage, {dbUser.name || dbUser.email}. Please choose your account type to proceed.
          </p>
        </div>

        <OnboardingForm />
      </div>
    </div>
  );
}
