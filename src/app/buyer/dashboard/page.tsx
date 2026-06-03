import { prisma } from "@/lib/db";
import { syncAuthUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";
import { OrderStatus, QuotationStatus } from "@prisma/client";
import { Decimal } from "@/lib/decimal";
import Link from "next/link";
import { ShoppingCart, FileText, CreditCard, ChevronRight, FlaskConical } from "lucide-react";

export const revalidate = 0;

export default async function BuyerDashboardPage() {
  const { dbUser } = await syncAuthUser();
  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch buyer's orders & quotations
  const orders = await prisma.order.findMany({
    where: { buyerId: dbUser.id },
    orderBy: { createdAt: "desc" },
  });

  const quotations = await prisma.quotation.findMany({
    where: { buyerId: dbUser.id },
    orderBy: { createdAt: "desc" },
  });

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING).length;

  const totalSpend = orders
    .filter((o) => o.status !== OrderStatus.CANCELLED)
    .reduce((sum, o) => sum.add(new Decimal(o.totalAmount)), new Decimal(0));

  const totalQuotes = quotations.length;
  const approvedQuotes = quotations.filter((q) => q.status === QuotationStatus.APPROVED).length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Buyer Hub</h1>
        <p className="text-slate-400">Welcome, {dbUser.name || dbUser.email}. Monitor quotes, manage orders, and check invoices.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Total Spend */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Purchase Volume</span>
            <h3 className="mt-2 text-3xl font-bold text-teal-400">₹{totalSpend.toFixed(2)}</h3>
            <span className="mt-2 text-xs text-slate-400 block">Non-cancelled orders total</span>
          </div>
          <div className="rounded-lg bg-teal-500/10 p-3 text-teal-400">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        {/* Orders Placed */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Orders Status</span>
            <h3 className="mt-2 text-3xl font-bold text-white">{totalOrders}</h3>
            <span className="mt-2 text-xs text-slate-400 block">{pendingOrders} awaiting approval</span>
          </div>
          <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-400">
            <ShoppingCart className="h-6 w-6" />
          </div>
        </div>

        {/* Quotation Requests */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quotations</span>
            <h3 className="mt-2 text-3xl font-bold text-white">{totalQuotes}</h3>
            <span className="mt-2 text-xs text-emerald-400 block font-semibold">{approvedQuotes} approved and ready to order</span>
          </div>
          <div className="rounded-lg bg-sky-500/10 p-3 text-sky-400">
            <FileText className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-500/5 to-slate-900/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-10 w-10 text-teal-400 animate-pulse" />
          <div>
            <h3 className="font-bold text-white text-lg">Need to buy raw chemicals or reagents?</h3>
            <p className="text-sm text-slate-400">Use our instant density-aware conversion calculator in the product catalog.</p>
          </div>
        </div>
        <Link
          href="/buyer/catalog"
          className="rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-300 transition shrink-0"
        >
          Browse Catalog
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quotations */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-400" /> My Recent Quotations
            </h3>
            <Link
              href="/buyer/quotations"
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {quotations.slice(0, 5).length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-sm">No quotations requested yet.</div>
            ) : (
              quotations.slice(0, 5).map((q) => (
                <div key={q.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold text-white text-sm">Quotation #{q.id.substring(q.id.length - 8).toUpperCase()}</div>
                    <div className="text-xs text-slate-400">Requested: {new Date(q.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-sm">₹{new Decimal(q.totalAmount).toFixed(2)}</div>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-2xs font-semibold uppercase ${
                      q.status === QuotationStatus.APPROVED
                        ? "bg-emerald-500/10 text-emerald-400"
                        : q.status === QuotationStatus.PENDING
                        ? "bg-amber-500/10 text-amber-400"
                        : q.status === QuotationStatus.REJECTED
                        ? "bg-red-500/10 text-red-400"
                        : "bg-teal-500/10 text-teal-400"
                    }`}>
                      {q.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Orders */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-400" /> My Recent Orders
            </h3>
            <Link
              href="/buyer/orders"
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {orders.slice(0, 5).length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-sm">No orders placed yet.</div>
            ) : (
              orders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold text-white text-sm">Order #{o.id.substring(o.id.length - 8).toUpperCase()}</div>
                    <div className="text-xs text-slate-400">Placed: {new Date(o.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-sm">₹{new Decimal(o.totalAmount).toFixed(2)}</div>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-2xs font-semibold uppercase ${
                      o.status === OrderStatus.DELIVERED
                        ? "bg-emerald-500/10 text-emerald-400"
                        : o.status === OrderStatus.PENDING
                        ? "bg-amber-500/10 text-amber-400"
                        : o.status === OrderStatus.CANCELLED
                        ? "bg-red-500/10 text-red-400"
                        : "bg-indigo-500/10 text-indigo-400"
                    }`}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
