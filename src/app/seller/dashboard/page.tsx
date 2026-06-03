import { prisma } from "@/lib/db";
import { syncAuthUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";
import { OrderStatus, QuotationStatus } from "@prisma/client";
import { Decimal } from "@/lib/decimal";
import Link from "next/link";
import { ShoppingCart, FileText, DollarSign, ChevronRight, Users } from "lucide-react";

export const revalidate = 0;

export default async function SellerDashboardPage() {
  const { dbUser } = await syncAuthUser();
  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch quotations managed by this seller OR containing products listed by this seller
  const quotations = await prisma.quotation.findMany({
    where: {
      OR: [
        { sellerId: dbUser.id },
        {
          items: {
            some: {
              product: {
                sellerId: dbUser.id,
              },
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { buyer: true },
  });

  // Fetch orders managed by this seller OR containing products listed by this seller
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { sellerId: dbUser.id },
        {
          items: {
            some: {
              product: {
                sellerId: dbUser.id,
              },
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { buyer: true },
  });

  const totalOrders = orders.length;
  const activeOrdersVal = orders
    .filter((o) => o.status !== OrderStatus.CANCELLED)
    .reduce((sum, o) => sum.add(new Decimal(o.totalAmount)), new Decimal(0));

  const totalQuotes = quotations.length;
  const pendingReviewQuotes = quotations.filter((q) => q.status === QuotationStatus.PENDING).length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Seller Dashboard</h1>
        <p className="text-slate-400">Welcome, {dbUser.name || dbUser.email}. Oversee customer accounts, create instant quotes, and process deals.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Total Value */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Sales Volume</span>
            <h3 className="mt-2 text-3xl font-bold text-teal-400">₹{activeOrdersVal.toFixed(2)}</h3>
            <span className="mt-2 text-xs text-slate-400 block">From orders assisted by me</span>
          </div>
          <div className="rounded-lg bg-teal-500/10 p-3 text-teal-400">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Managed Orders */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assisted Orders</span>
            <h3 className="mt-2 text-3xl font-bold text-white">{totalOrders}</h3>
            <span className="mt-2 text-xs text-slate-400 block">Orders placed for clients</span>
          </div>
          <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-400">
            <ShoppingCart className="h-6 w-6" />
          </div>
        </div>

        {/* Managed Quotes */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Quotations</span>
            <h3 className="mt-2 text-3xl font-bold text-white">{totalQuotes}</h3>
            <span className="mt-2 text-xs text-amber-400 block font-semibold">{pendingReviewQuotes} awaiting sales review</span>
          </div>
          <div className="rounded-lg bg-sky-500/10 p-3 text-sky-400">
            <FileText className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-white text-base">Client on the line requesting immediate pricing?</h3>
          <p className="text-xs text-slate-400 mt-1">Open the catalog to input custom weight/volume quantities and get real-time density-adjusted price sheets.</p>
        </div>
        <Link
          href="/seller/catalog"
          className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 transition shrink-0"
        >
          Open Catalog
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Managed Quotations */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-400" /> Managed Quotations
            </h3>
            <Link
              href="/seller/quotations"
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              Manage All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {quotations.slice(0, 5).length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-sm">No quotations assisted by you.</div>
            ) : (
              quotations.slice(0, 5).map((q) => (
                <div key={q.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold text-white text-sm">Quote #{q.id.substring(q.id.length - 8).toUpperCase()}</div>
                    <div className="text-xs text-slate-400">Client: {q.buyer.name || q.buyer.email}</div>
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

        {/* Managed Orders */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-400" /> Assisted Orders
            </h3>
            <Link
              href="/seller/orders"
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {orders.slice(0, 5).length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-sm">No orders processed yet.</div>
            ) : (
              orders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold text-white text-sm">Order #{o.id.substring(o.id.length - 8).toUpperCase()}</div>
                    <div className="text-xs text-slate-400">Client: {o.buyer.name || o.buyer.email}</div>
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
