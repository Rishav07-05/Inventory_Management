import { prisma } from "@/lib/db";
import { ClipboardList, ShieldAlert, ArrowRight } from "lucide-react";

export const revalidate = 0;

export default async function AdminAuditLogsPage() {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      actor: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Security Audit Log</h1>
        <p className="text-slate-400">View real-time records of security, configuration, role, and manual stock adjustment changes.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-2xs font-bold font-sans">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Actor</th>
              <th className="p-4">Action</th>
              <th className="p-4">Target Type</th>
              <th className="p-4">Target ID</th>
              <th className="p-4">Previous Value</th>
              <th className="p-4"></th>
              <th className="p-4">New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-300">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No security events recorded.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/10 transition">
                  <td className="p-4 text-slate-400 font-mono text-2xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">
                      {log.actor?.name || "System"}
                    </div>
                    <div className="text-slate-500 font-mono text-2xs">{log.actor?.email || ""}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center rounded-md bg-teal-500/10 px-2 py-0.5 text-2xs font-bold text-teal-400 border border-teal-500/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-2xs">{log.targetType}</td>
                  <td className="p-4 font-mono text-slate-500 text-2xs">
                    #{log.targetId ? log.targetId.substring(log.targetId.length - 8).toUpperCase() : "N/A"}
                  </td>
                  <td className="p-4 max-w-xs truncate text-slate-500 font-mono text-2xs" title={log.previousValue || ""}>
                    {log.previousValue || "N/A"}
                  </td>
                  <td className="p-4 text-slate-600">
                    {log.newValue && log.previousValue && <ArrowRight className="h-3 w-3" />}
                  </td>
                  <td className="p-4 max-w-xs truncate text-slate-200 font-mono text-2xs" title={log.newValue || ""}>
                    {log.newValue || "N/A"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
