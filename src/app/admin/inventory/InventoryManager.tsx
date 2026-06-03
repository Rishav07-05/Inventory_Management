"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adjustInventory } from "@/app/actions/business";
import { InventoryTransactionType } from "@prisma/client";
import { toast } from "sonner";
import { X, Search, ShieldAlert, SlidersHorizontal, History, Archive } from "lucide-react";
import { Decimal } from "@/lib/decimal";

interface SerializedProduct {
  id: string;
  sku: string;
  name: string;
  dimensionType: string;
  baseUnit: string;
  availableQuantity: string;
  categoryName: string;
  location: string;
}

interface SerializedTransaction {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  baseUnit: string;
  quantity: string;
  type: string;
  notes: string;
  createdAt: string;
}

interface InventoryManagerProps {
  products: SerializedProduct[];
  transactions: SerializedTransaction[];
}

export default function InventoryManager({ products, transactions }: InventoryManagerProps) {
  const [activeTab, setActiveTab] = useState<"stocks" | "ledger">("stocks");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<SerializedProduct | null>(null);
  const [qtyDelta, setQtyDelta] = useState("0");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsLoading(true);

    if (qtyDelta === "0" || isNaN(Number(qtyDelta))) {
      toast.error("Please enter a valid quantity delta (non-zero).");
      setIsLoading(false);
      return;
    }

    try {
      await adjustInventory(selectedProduct.id, qtyDelta, notes);
      toast.success("Stock level adjusted successfully!");
      setSelectedProduct(null);
      setQtyDelta("0");
      setNotes("");
      router.refresh();
      window.location.reload(); // Hard refresh to update both tables
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust stock. Make sure inventory is not negative.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t =>
    t.productName.toLowerCase().includes(search.toLowerCase()) ||
    t.productSku.toLowerCase().includes(search.toLowerCase()) ||
    t.type.toLowerCase().includes(search.toLowerCase())
  );

  const getTransactionBadgeStyle = (type: string) => {
    switch (type) {
      case "STOCK_ADDED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "ORDER_APPROVED":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "ORDER_CANCELLED":
        return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      case "MANUAL_ADJUSTMENT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs Switcher & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("stocks")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === "stocks"
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            <Archive className="h-4 w-4" /> Stock Levels
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === "ledger"
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            <History className="h-4 w-4" /> Transaction Ledger
          </button>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === "stocks" ? "Search stock catalog..." : "Search ledger entries..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/30 py-1.5 pl-10 pr-4 text-xs text-slate-105 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* STOCKS TAB */}
      {activeTab === "stocks" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-2xs font-bold font-sans">
                <th className="p-4">SKU / Chemical</th>
                <th className="p-4">Category</th>
                <th className="p-4">Storage Location</th>
                <th className="p-4 text-right">Available Qty (Base)</th>
                <th className="p-4 text-center">Adjust Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No products matching search found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.dimensionType === "COUNT" 
                    ? parseFloat(p.availableQuantity) < 15 
                    : parseFloat(p.availableQuantity) < 15000;
                  return (
                    <tr key={p.id} className="hover:bg-slate-900/10 transition">
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{p.name}</div>
                        <div className="text-slate-500 font-mono text-2xs">{p.sku}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center rounded-md bg-slate-850 px-2 py-0.5 text-2xs font-medium text-slate-400 border border-slate-800">
                          {p.categoryName}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-2xs text-slate-400">{p.location}</td>
                      <td className="p-4 text-right">
                        <span className={`font-bold font-mono text-sm ${isLow ? "text-amber-500" : "text-white"}`}>
                          {parseFloat(p.availableQuantity).toFixed(2)}
                        </span>
                        <span className="text-slate-500 ml-1 text-2xs font-mono">{p.baseUnit}</span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="rounded-lg bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-400 hover:bg-teal-550 transition flex items-center gap-1.5 mx-auto"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* LEDGER TAB */}
      {activeTab === "ledger" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-2xs font-bold font-sans">
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">SKU / Chemical</th>
                <th className="p-4">Trans Type</th>
                <th className="p-4 text-right">Qty Delta</th>
                <th className="p-4">Ledger Notes / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No transactions recorded.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const qty = parseFloat(t.quantity);
                  return (
                    <tr key={t.id} className="hover:bg-slate-900/10 transition">
                      <td className="p-4 font-mono text-slate-500 text-2xs">
                        #{t.id.substring(t.id.length - 8).toUpperCase()}
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-200">{t.productName}</div>
                        <div className="text-slate-500 font-mono text-2xs">{t.productSku}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-2xs font-semibold uppercase ${getTransactionBadgeStyle(t.type)}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className={`p-4 text-right font-mono font-bold text-sm ${qty > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {qty > 0 ? `+${qty.toFixed(2)}` : qty.toFixed(2)}
                        <span className="text-slate-500 ml-1 text-2xs font-normal">{t.baseUnit}</span>
                      </td>
                      <td className="p-4 text-slate-400 max-w-xs truncate" title={t.notes}>
                        {t.notes}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADJUSTMENT MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" /> Manual Stock Adjustment
              </h3>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3 flex gap-2.5 text-amber-400 text-xs leading-relaxed">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <strong>Warning:</strong> Adjustments write directly to the double-entry transaction ledger. Adjustments cannot be deleted and will modify inventory values immediately.
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <span className="text-slate-500 block text-2xs uppercase font-semibold">Chemical SKU / Item</span>
                <div className="font-bold text-white text-sm">{selectedProduct.name}</div>
                <div className="text-slate-500 font-mono text-2xs">SKU: {selectedProduct.sku} | Current: {parseFloat(selectedProduct.availableQuantity).toFixed(2)} {selectedProduct.baseUnit}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Quantity Delta (Base Unit: {selectedProduct.baseUnit})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. +500 to add, -200 to remove"
                  value={qtyDelta}
                  onChange={(e) => setQtyDelta(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none"
                />
                <span className="text-slate-500 text-3xs mt-1 block">Use a positive sign to increment stock, negative to decrement.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Adjustment Reason / Notes</label>
                <textarea
                  required
                  placeholder="e.g. Received shipment lot #B28, Spill write-off audit"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-350 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-300 transition"
                >
                  {isLoading ? "Processing..." : "Confirm adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
