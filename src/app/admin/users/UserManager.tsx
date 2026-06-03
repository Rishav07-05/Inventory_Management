"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserRole } from "@/app/actions/business";
import { Role } from "@prisma/client";
import { toast } from "sonner";
import { ShieldAlert, User, Mail, Calendar } from "lucide-react";

interface SerializedUser {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
}

interface UserManagerProps {
  initialUsers: SerializedUser[];
}

export default function UserManager({ initialUsers }: UserManagerProps) {
  const [users, setUsers] = useState<SerializedUser[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleRoleUpdate = async (userId: string, newRole: Role) => {
    setLoadingId(userId);
    try {
      await updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user role.");
    } finally {
      setLoadingId(null);
    }
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case Role.SELLER:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case Role.BUYER:
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-2xs font-bold font-sans">
            <th className="p-4">User profile</th>
            <th className="p-4">Email Address</th>
            <th className="p-4">Registration Date</th>
            <th className="p-4">Active Role Classification</th>
            <th className="p-4 text-center">Modify Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-850 text-slate-300">
          {users.map((u) => {
            const isLoading = loadingId === u.id;
            return (
              <tr key={u.id} className="hover:bg-slate-900/10 transition">
                <td className="p-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold shrink-0">
                    {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{u.name || "N/A"}</div>
                    <div className="text-slate-500 font-mono text-2xs">ID: {u.id.substring(u.id.length - 8).toUpperCase()}</div>
                  </div>
                </td>
                <td className="p-4 font-mono text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-600" /> {u.email}
                  </span>
                </td>
                <td className="p-4 text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-600" /> {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-semibold uppercase ${getRoleBadgeStyle(u.role)}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <select
                    disabled={isLoading}
                    value={u.role}
                    onChange={(e) => handleRoleUpdate(u.id, e.target.value as Role)}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:border-teal-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value={Role.BUYER}>BUYER</option>
                    <option value={Role.SELLER}>SELLER</option>
                    <option value={Role.ADMIN}>ADMIN</option>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
