import { redirect } from "next/navigation";
import { syncAuthUser } from "@/lib/auth-sync";
import DashboardSidebar from "./DashboardSidebar";
import { UserButton } from "@clerk/nextjs";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: LayoutProps) {
  // Sync the authenticated user with PostgreSQL
  const { dbUser, needsOnboarding } = await syncAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  if (needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-950">
      {/* Sidebar Navigation */}
      <DashboardSidebar 
        role={dbUser.role} 
        userName={dbUser.name} 
        userEmail={dbUser.email} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="hidden lg:flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/10 px-8 backdrop-blur-md">
          <div className="text-sm font-medium text-slate-400">
            Welcome back, <span className="text-teal-400 font-semibold">{dbUser.name || dbUser.email}</span>
          </div>
          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
