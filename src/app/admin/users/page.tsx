import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import UserManager from "./UserManager";

export const revalidate = 0;

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
  });

  const serializedUsers = users.map((u) => ({
    id: u.id,
    clerkId: u.clerkId,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">User Accounts</h1>
        <p className="text-slate-400">View registered buyer and seller accounts, and elevate users to sales representatives or administrators.</p>
      </div>

      <UserManager initialUsers={serializedUsers} />
    </div>
  );
}
