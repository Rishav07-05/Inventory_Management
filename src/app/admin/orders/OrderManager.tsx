"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/app/actions/business";
import { OrderStatus, Role } from "@prisma/client";
import { toast } from "sonner";
import { 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  User, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Calculator,
  ShieldAlert
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

interface OrderItem {
  id: string;
  orderId: string;
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

interface Order {
  id: string;
  buyerId: string;
  sellerId: string | null;
  status: OrderStatus;
  totalAmount: string;
  createdAt: string;
  buyer: UserProfile;
  seller: UserProfile | null;
  items: OrderItem[];
}

interface ManagerProps {
  role: Role;
  initialOrders: Order[];
}

export default function OrderManager({ role, initialOrders }: ManagerProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleStatusChange = async (oId: string, status: OrderStatus) => {
    setLoadingId(oId);
    try {
      const res = await updateOrderStatus(oId, status);
      toast.success(`Order status updated to ${status}`);
      
      // Update local state
      setOrders(prev => prev.map(o => o.id === oId ? { ...o, status: res.status } : o));
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update order status. Check stock availability.");
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case OrderStatus.APPROVED:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case OrderStatus.PROCESSING:
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case OrderStatus.SHIPPED:
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case OrderStatus.DELIVERED:
        return "bg-teal-550/10 text-teal-400 border-teal-500/20";
      case OrderStatus.CANCELLED:
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl overflow-hidden">
      {orders.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <Clock className="mx-auto h-12 w-12 text-slate-700 animate-pulse mb-3" />
          <h3 className="text-lg font-bold text-white">No orders found</h3>
          <p className="text-sm text-slate-600 mt-1">There are currently no orders processed.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {orders.map((o) => {
            const isExpanded = expandedId === o.id;
            const isLoading = loadingId === o.id;
            
            return (
              <div key={o.id} className="transition hover:bg-slate-900/10">
                {/* Header Summary Row */}
                <div
                  onClick={() => toggleExpand(o.id)}
                  className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        Order #{o.id.substring(o.id.length - 8).toUpperCase()}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase ${getStatusStyle(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-500" /> Client: {o.buyer.name || o.buyer.email}
                      </span>
                      {o.seller && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-500" /> Sales: {o.seller.name || o.seller.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-500" /> {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-slate-500 block text-2xs uppercase tracking-wider font-semibold">Total Invoice</span>
                      <span className="font-extrabold text-teal-400 text-base">₹{parseFloat(o.totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="text-slate-500">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="bg-slate-950/40 px-6 py-5 border-t border-slate-850 space-y-5 animate-fadeIn">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Items list</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-2xs font-bold font-sans">
                            <th className="py-2.5">Chemical Item</th>
                            <th className="py-2.5">Ordered Qty</th>
                            <th className="py-2.5">Base Converted Qty</th>
                            <th className="py-2.5 text-right">Unit Rate</th>
                            <th className="py-2.5 text-right">Total Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-300">
                          {o.items.map((item) => {
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
                        * Status changes in PENDING state run double-entry stock transactions.
                      </div>
                      
                      <div className="flex gap-2">
                        {/* Admin and Seller actions */}
                        {role === Role.ADMIN || role === Role.SELLER ? (
                          <>
                            {o.status === OrderStatus.PENDING && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(o.id, OrderStatus.CANCELLED)}
                                  disabled={isLoading}
                                  className="rounded-lg bg-red-650/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition"
                                >
                                  Cancel Order
                                </button>
                                <button
                                  onClick={() => handleStatusChange(o.id, OrderStatus.APPROVED)}
                                  disabled={isLoading}
                                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-400 transition"
                                >
                                  Approve & Allocate Stock
                                </button>
                              </>
                            )}

                            {o.status === OrderStatus.APPROVED && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(o.id, OrderStatus.CANCELLED)}
                                  disabled={isLoading}
                                  className="rounded-lg bg-red-650/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition mr-2"
                                >
                                  Cancel & Restore Stock
                                </button>
                                <button
                                  onClick={() => handleStatusChange(o.id, OrderStatus.PROCESSING)}
                                  disabled={isLoading}
                                  className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400 transition"
                                >
                                  Start Processing
                                </button>
                              </>
                            )}

                            {o.status === OrderStatus.PROCESSING && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(o.id, OrderStatus.CANCELLED)}
                                  disabled={isLoading}
                                  className="rounded-lg bg-red-650/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition mr-2"
                                >
                                  Cancel & Restore Stock
                                </button>
                                <button
                                  onClick={() => handleStatusChange(o.id, OrderStatus.SHIPPED)}
                                  disabled={isLoading}
                                  className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 transition"
                                >
                                  Mark as Shipped
                                </button>
                              </>
                            )}

                            {o.status === OrderStatus.SHIPPED && (
                              <button
                                onClick={() => handleStatusChange(o.id, OrderStatus.DELIVERED)}
                                disabled={isLoading}
                                className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-300 transition"
                              >
                                Mark as Delivered
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 font-semibold italic">
                            Only administrators and sales representatives can update order shipping status.
                          </span>
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
