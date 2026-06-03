import { redirect } from "next/navigation";
import { syncAuthUser } from "@/lib/auth-sync";

export default async function Home() {
  const { dbUser, needsOnboarding } = await syncAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  if (needsOnboarding) {
    redirect("/onboarding");
  }

  // Redirect based on role
  if (dbUser.role === "ADMIN") {
    redirect("/admin/dashboard/1weirdroute4Lxyz");
  } else if (dbUser.role === "SELLER") {
    redirect("/seller/dashboard");
  } else {
    redirect("/buyer/dashboard");
  }
}
