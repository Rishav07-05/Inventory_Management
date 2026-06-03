"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateQuotationStatus, convertQuotationToOrder } from "@/app/actions/business";
import { QuotationStatus, Role } from "@prisma/client";
import { toast } from "sonner";
import { 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  ArrowRight,
  Calculator,
  Info
} from "lucide-react";
import { getConversionBreakdown } from "@/lib/conversions";
import { Decimal } from "@/lib/decimal";

interface Product {
  id: string;
  sku: string;
  name: string;
  dimensionType: string;
  baseUnit: string;
  pricePerBaseUnit: string;
  availableQuantity: string;
  density: string | null;
}

interface QuotationItem {
  id: string;
  productId: string;
  quantity: string;
  unit: string;
  enteredQuantity: string;
  pricePerBaseUnit: string;
  totalPrice: string;
  product: Product;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
}

interface Quotation {
  id: string;
  buyerId: string;
  sellerId: string | null;
  status: QuotationStatus;
  totalAmount: string;
  createdAt: string;
  buyer: UserProfile;
  seller: UserProfile | null;
  items: QuotationItem[];
}

interface ManagerProps {
  role: Role;
  initialQuotations: Quotation[];
}

export default function QuotationManager({ role, initialQuotations }: ManagerProps) {
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleStatusChange = async (qId: string, status: QuotationStatus) => {
    setLoadingId(qId);
    try {
      const res = await updateQuotationStatus(qId, status);
      toast.success(`Quotation marked as ${status}`);
      
      // Update local state
      setQuotations(prev => prev.map(q => q.id === qId ? { ...q, status: res.status } : q));
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleConvertToOrder = async (qId: string) => {
    setLoadingId(qId);
    try {
      const res = await convertQuotationToOrder(qId);
      toast.success(`Converted to Order #${res.id.substring(res.id.length - 8).toUpperCase()}`);
      
      // Update local state status
      setQuotations(prev => prev.map(q => q.id === qId ? { ...q, status: QuotationStatus.CONVERTED_TO_ORDER } : q));
      router.refresh();
      router.push(role === Role.BUYER ? "/buyer/orders" : role === Role.SELLER ? "/seller/orders" : "/admin/orders");
    } catch (err: any) {
      toast.error(err.message || "Failed to convert quotation.");
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusStyle = (status: QuotationStatus) => {
    switch (status) {
      case QuotationStatus.PENDING:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case QuotationStatus.REVIEWED:
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case QuotationStatus.APPROVED:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case QuotationStatus.REJECTED:
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case QuotationStatus.CONVERTED_TO_ORDER:
        return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl overflow-hidden">
      {quotations.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <Clock className="mx-auto h-12 w-12 text-slate-700 animate-pulse mb-3" />
          <h3 className="text-lg font-bold text-white">No quotations found</h3>
          <p className="text-sm text-slate-600 mt-1">There are currently no quotation requests in this account.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {quotations.map((q) => {
            const isExpanded = expandedId === q.id;
            const isLoading = loadingId === q.id;
            
            return (
              <div key={q.id} className="transition hover:bg-slate-900/10">
                {/* Header Summary Row */}
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        Quote #{q.id.substring(q.id.length - 8).toUpperCase()}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase ${getStatusStyle(q.status)}`}>
                        {q.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-500" /> Buyer: {q.buyer.name || q.buyer.email}
                      </span>
                      {q.seller && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-500" /> Sales: {q.seller.name || q.seller.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-500" /> {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-slate-500 block text-2xs uppercase tracking-wider font-semibold">Total Amount</span>
                      <span className="font-extrabold text-teal-400 text-base">₹{parseFloat(q.totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="text-slate-500">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="bg-slate-950/40 px-6 py-5 border-t border-slate-850 space-y-5 animate-fadeIn">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chemical Item Details</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-2xs font-bold">
                            <th className="py-2.5">Chemical Item</th>
                            <th className="py-2.5">Entered Qty</th>
                            <th className="py-2.5">Base Converted Qty</th>
                            <th className="py-2.5 text-right">Unit Rate</th>
                            <th className="py-2.5 text-right">Total Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-300">
                          {q.items.map((item) => {
                            // Calculate client breakdown for display
                            const mathDetails = getConversionBreakdown({
                              quantity: new Decimal(item.enteredQuantity),
                              fromUnit: item.unit,
                              toUnit: item.product.baseUnit,
                              density: item.product.density,
                            });
                            
                            return (
                              <tr key={item.id} className="group">
                                <td className="py-3">
                                  <div className="font-bold text-white text-sm">{item.product.name}</div>
                                  <div className="text-slate-500 font-mono text-2xs">SKU: {item.product.sku}</div>
                                </td>
                                <td className="py-3 font-semibold text-slate-200">
                                  {parseFloat(item.enteredQuantity)} {item.unit}
                                </td>
                                <td className="py-3 text-slate-400 font-mono">
                                  {parseFloat(item.quantity).toFixed(2)} {item.product.baseUnit}
                                </td>
                                <td className="py-3 text-right text-slate-400 font-mono">
                                  ₹{parseFloat(item.pricePerBaseUnit).toFixed(2)} / {item.product.baseUnit}
                                </td>
                                <td className="py-3 text-right font-bold text-teal-400 font-mono">
                                  ₹{parseFloat(item.totalPrice).toFixed(2)}
                                  <div className="hidden group-hover:block absolute right-6 bg-slate-900 border border-slate-800 p-3 rounded shadow-xl text-left z-10 max-w-xs space-y-1 w-64 text-2xs text-slate-400">
                                    <div className="font-semibold text-slate-200 flex items-center gap-1">
                                      <Calculator className="h-3.5 w-3.5 text-teal-400" /> Formula:
                                    </div>
                                    <div className="font-mono text-slate-500 bg-slate-950 p-1.5 rounded">{mathDetails.formula}</div>
                                    <ul className="list-decimal pl-3 space-y-1 mt-1 text-slate-500">
                                      {mathDetails.steps.map((s, idx) => <li key={idx}>{s}</li>)}
                                    </ul>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Action Panel */}
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-850 pt-4 gap-4">
                      <div className="text-xs text-slate-400">
                        * Hover over any total price to view the exact math step conversions.
                      </div>
                      
                      <div className="flex gap-2">
                        {/* Admin or Seller actions */}
                        {(role === Role.ADMIN || role === Role.SELLER) && (
                          <>
                            {q.status === QuotationStatus.PENDING && (
                              <button
                                onClick={() => handleStatusChange(q.id, QuotationStatus.REVIEWED)}
                                disabled={isLoading}
                                className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400 transition"
                              >
                                Mark as Reviewed
                              </button>
                            )}

                            {q.status === QuotationStatus.REVIEWED && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(q.id, QuotationStatus.REJECTED)}
                                  disabled={isLoading}
                                  className="rounded-lg bg-red-600/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition"
                                >
                                  Reject Quote
                                </button>
                                <button
                                  onClick={() => handleStatusChange(q.id, QuotationStatus.APPROVED)}
                                  disabled={isLoading}
                                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-400 transition"
                                >
                                  Approve Quote
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {/* Buyer or Seller converting approved quotation to Order */}
                        {q.status === QuotationStatus.APPROVED && (
                          <button
                            onClick={() => handleConvertToOrder(q.id)}
                            disabled={isLoading}
                            className="rounded-lg bg-teal-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-teal-300 transition flex items-center gap-1.5"
                          >
                            Convert to Order <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
