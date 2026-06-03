"use client";

import { useState, useEffect } from "react";
import { Decimal } from "@/lib/decimal";
import { convertUnits, getConversionBreakdown, SUPPORTED_UNITS } from "@/lib/conversions";
import { calculatePricing } from "@/lib/pricing";
import { createQuotation, createOrder } from "@/app/actions/business";
import { Role } from "@prisma/client";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  Trash2, 
  Calculator, 
  Info, 
  Plus, 
  Minus,
  CheckCircle,
  FlaskConical
} from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  dimensionType: string;
  baseUnit: string;
  pricePerBaseUnit: string;
  availableQuantity: string;
  density: string | null;
  category: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

interface CatalogProps {
  role: Role;
  products: Product[];
  categories: Category[];
}

interface CartItem {
  product: Product;
  enteredQuantity: string;
  unit: string;
  baseQuantity: string;
  totalPrice: string;
}

export default function ProductCatalog({ role, products, categories }: CatalogProps) {
  // Search and Filter States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedUnitType, setSelectedUnitType] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Selection modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qtyInput, setQtyInput] = useState("1");
  const [selectedUnit, setSelectedUnit] = useState("");
  
  // Real-time calculation state
  const [calcResult, setCalcResult] = useState<{
    baseQuantity: string;
    totalPrice: string;
    steps: string[];
    formula: string;
  } | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle unit options based on dimension type and density
  const getUnitOptions = (product: Product) => {
    const dim = product.dimensionType;
    const hasDensity = product.density !== null;

    if (dim === "WEIGHT") {
      return hasDensity ? ["g", "kg", "mL", "L"] : ["g", "kg"];
    } else if (dim === "VOLUME") {
      return hasDensity ? ["mL", "L", "g", "kg"] : ["mL", "L"];
    } else {
      return ["item"];
    }
  };

  // Reset selected unit when product changes
  useEffect(() => {
    if (selectedProduct) {
      const units = getUnitOptions(selectedProduct);
      setSelectedUnit(units[0] || selectedProduct.baseUnit);
      setQtyInput("1");
    }
  }, [selectedProduct]);

  // Recalculate client-side Decimal.js conversions in real-time as user types quantity or changes unit
  useEffect(() => {
    if (!selectedProduct || !qtyInput || isNaN(Number(qtyInput))) {
      setCalcResult(null);
      return;
    }

    try {
      const q = new Decimal(qtyInput);
      if (q.lessThanOrEqualTo(0)) {
        setCalcResult(null);
        return;
      }

      const pricing = calculatePricing({
        quantity: q,
        enteredUnit: selectedUnit,
        baseUnit: selectedProduct.baseUnit,
        pricePerBaseUnit: selectedProduct.pricePerBaseUnit,
        density: selectedProduct.density,
      });

      const details = getConversionBreakdown({
        quantity: q,
        fromUnit: selectedUnit,
        toUnit: selectedProduct.baseUnit,
        density: selectedProduct.density,
      });

      setCalcResult({
        baseQuantity: pricing.baseQuantity.toFixed(4),
        totalPrice: pricing.totalPrice.toFixed(2),
        steps: details.steps,
        formula: details.formula,
      });
    } catch (err) {
      setCalcResult(null);
    }
  }, [qtyInput, selectedUnit, selectedProduct]);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "all" || p.categoryId === selectedCategory;
    const matchesUnitType = selectedUnitType === "all" || p.dimensionType === selectedUnitType;
    
    // Convert pricePerBaseUnit to float for filtering
    const price = parseFloat(p.pricePerBaseUnit);
    const matchesMinPrice = minPrice === "" || price >= parseFloat(minPrice);
    const matchesMaxPrice = maxPrice === "" || price <= parseFloat(maxPrice);

    return matchesSearch && matchesCat && matchesUnitType && matchesMinPrice && matchesMaxPrice;
  });

  // Add to cart
  const addToCart = () => {
    if (!selectedProduct || !calcResult) return;

    // Check if item already in cart (merge if same unit)
    const existingIndex = cart.findIndex(
      (item) => item.product.id === selectedProduct.id && item.unit === selectedUnit
    );

    const newItem: CartItem = {
      product: selectedProduct,
      enteredQuantity: qtyInput,
      unit: selectedUnit,
      baseQuantity: calcResult.baseQuantity,
      totalPrice: calcResult.totalPrice,
    };

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const mergedQty = new Decimal(cart[existingIndex].enteredQuantity).add(new Decimal(qtyInput));
      
      const newPricing = calculatePricing({
        quantity: mergedQty,
        enteredUnit: selectedUnit,
        baseUnit: selectedProduct.baseUnit,
        pricePerBaseUnit: selectedProduct.pricePerBaseUnit,
        density: selectedProduct.density,
      });

      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        enteredQuantity: mergedQty.toString(),
        baseQuantity: newPricing.baseQuantity.toFixed(4),
        totalPrice: newPricing.totalPrice.toFixed(2),
      };
      setCart(updatedCart);
      toast.success("Updated existing item quantity in cart.");
    } else {
      setCart([...cart, newItem]);
      toast.success("Item added to cart.");
    }

    setSelectedProduct(null);
  };

  // Remove from cart
  const removeFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
    toast.info("Item removed from cart.");
  };

  // Calculate cart total
  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum.add(new Decimal(item.totalPrice)), new Decimal(0)).toFixed(2);
  };

  // Submit operations
  const handleSubmit = async (type: "QUOTATION" | "ORDER") => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    const itemsPayload = cart.map((item) => ({
      productId: item.product.id,
      enteredQuantity: item.enteredQuantity,
      unit: item.unit,
    }));

    try {
      if (type === "QUOTATION") {
        await createQuotation(itemsPayload);
        toast.success("Quotation request submitted successfully!");
      } else {
        await createOrder(itemsPayload);
        toast.success("Order placed successfully!");
      }
      setCart([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to process request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Product Catalog Grid */}
      <div className="lg:col-span-2 space-y-6">
        {/* Search and Filters Bar */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={selectedUnitType}
                onChange={(e) => setSelectedUnitType(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
              >
                <option value="all">All Dimension Types</option>
                <option value="WEIGHT">Weight</option>
                <option value="VOLUME">Volume</option>
                <option value="COUNT">Count</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 border-t border-slate-800/60 pt-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <span>Price Range (per base unit):</span>
            </div>
            <input
              type="number"
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-24 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-100 placeholder-slate-600 focus:border-teal-500 focus:outline-none"
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-24 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-100 placeholder-slate-600 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/10 py-16 text-center">
            <FlaskConical className="mx-auto h-12 w-12 text-slate-600 animate-pulse" />
            <h3 className="mt-4 text-lg font-bold text-white">No products found</h3>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {filteredProducts.map((p) => {
              const isLowStock = p.dimensionType === "COUNT" 
                ? parseFloat(p.availableQuantity) < 15 
                : parseFloat(p.availableQuantity) < 15000;
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/20 p-5 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-semibold text-slate-500 tracking-wider uppercase bg-slate-850 px-2 py-0.5 rounded border border-slate-800">
                        {p.category.name}
                      </span>
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded ${
                        isLowStock ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
                      }`}>
                        {isLowStock ? "Low Stock" : "In Stock"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-white">{p.name}</h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {p.sku}</div>
                    <p className="mt-2 text-sm text-slate-400 line-clamp-2">{p.description || "No description available."}</p>

                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-850 pt-4 text-xs">
                      <div>
                        <span className="text-slate-500 block uppercase font-semibold text-2xs tracking-wider">Base Price</span>
                        <span className="font-bold text-teal-400 text-sm">₹{parseFloat(p.pricePerBaseUnit).toFixed(2)} / {p.baseUnit}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase font-semibold text-2xs tracking-wider">Density</span>
                        <span className="text-slate-300 font-medium">
                          {p.density ? `${parseFloat(p.density).toFixed(2)} g/mL` : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-850 pt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Available: <span className="font-bold text-white">
                        {p.dimensionType === "WEIGHT" 
                          ? `${(parseFloat(p.availableQuantity) / 1000).toFixed(2)} kg` 
                          : p.dimensionType === "VOLUME" 
                          ? `${(parseFloat(p.availableQuantity) / 1000).toFixed(2)} L` 
                          : `${parseFloat(p.availableQuantity)} items`}
                      </span>
                    </span>
                    <button
                      onClick={() => setSelectedProduct(p)}
                      className="rounded-lg bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-400 hover:bg-teal-500 hover:text-slate-950 transition flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Panel */}
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl flex flex-col min-h-[500px]">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-teal-400" /> Draft Order Cart
          </h2>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 my-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center">
                <ShoppingCart className="h-10 w-10 text-slate-700 mb-2 animate-bounce" />
                <p className="text-sm">Your cart is empty.</p>
                <p className="text-xs mt-1 text-slate-600">Select items from the catalog to build your draft request.</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={`${item.product.id}-${item.unit}-${index}`} className="flex justify-between items-start pt-3">
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">{item.product.name}</div>
                    <div className="text-xs text-slate-400">
                      Qty: <span className="text-teal-400 font-semibold">{item.enteredQuantity} {item.unit}</span>
                      <span className="text-slate-600 block">({item.baseQuantity} {item.product.baseUnit} base equivalent)</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="font-bold text-teal-400 text-sm">₹{parseFloat(item.totalPrice).toFixed(2)}</div>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-slate-800 pt-4 space-y-4">
              <div className="flex items-center justify-between text-white font-bold">
                <span>Estimated Total:</span>
                <span className="text-2xl text-teal-400">₹{getCartTotal()}</span>
              </div>

              <div className="grid gap-2">
                {role === Role.BUYER ? (
                  <>
                    <button
                      onClick={() => handleSubmit("QUOTATION")}
                      disabled={isSubmitting}
                      className="w-full rounded-lg bg-slate-850 border border-slate-700 py-2.5 text-sm font-semibold text-teal-400 hover:bg-slate-800 transition"
                    >
                      Request Quotation
                    </button>
                    <button
                      onClick={() => handleSubmit("ORDER")}
                      disabled={isSubmitting}
                      className="w-full rounded-lg bg-teal-400 py-2.5 text-sm font-bold text-slate-950 hover:bg-teal-300 transition"
                    >
                      Place Order
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSubmit("QUOTATION")}
                      disabled={isSubmitting}
                      className="w-full rounded-lg bg-slate-850 border border-slate-700 py-2.5 text-sm font-semibold text-teal-400 hover:bg-slate-800 transition"
                    >
                      Create Quotation (Immediate Approved)
                    </button>
                    <button
                      onClick={() => handleSubmit("ORDER")}
                      disabled={isSubmitting}
                      className="w-full rounded-lg bg-teal-400 py-2.5 text-sm font-bold text-slate-950 hover:bg-teal-300 transition"
                    >
                      Create Order (Pending status)
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversion Modal / Selection Drawer */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calculator className="h-5 w-5 text-teal-400" /> Quantity Conversion Calculator
              </h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h4 className="font-bold text-white text-base">{selectedProduct.name}</h4>
              <p className="text-xs text-slate-400 mt-1 font-mono">SKU: {selectedProduct.sku} | Base Unit: {selectedProduct.baseUnit}</p>
            </div>

            {/* Inputs grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Unit</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
                >
                  {getUnitOptions(selectedProduct).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Breakdown Box */}
            {calcResult ? (
              <div className="rounded-lg bg-slate-950/60 border border-slate-850 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-900 pb-3 text-sm">
                  <div>
                    <span className="text-slate-500 block text-2xs uppercase font-semibold">Entered</span>
                    <span className="text-slate-200 font-bold">{qtyInput} {selectedUnit}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-2xs uppercase font-semibold">Converted</span>
                    <span className="text-teal-400 font-bold">{calcResult.baseQuantity} {selectedProduct.baseUnit}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-900 pb-3 text-sm">
                  <div>
                    <span className="text-slate-500 block text-2xs uppercase font-semibold">Rate</span>
                    <span className="text-slate-200 font-bold">₹{parseFloat(selectedProduct.pricePerBaseUnit).toFixed(2)} / {selectedProduct.baseUnit}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-2xs uppercase font-semibold">Total Price</span>
                    <span className="text-teal-400 font-bold text-base">₹{parseFloat(calcResult.totalPrice).toFixed(2)}</span>
                  </div>
                </div>

                {calcResult.steps.length > 0 && (
                  <div className="text-xs text-slate-400 space-y-2">
                    <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-teal-400" /> Mathematical Breakdown:
                    </div>
                    <div className="bg-slate-900/50 p-2.5 rounded font-mono text-2xs text-slate-500">
                      Formula: {calcResult.formula}
                    </div>
                    <ul className="list-decimal list-inside space-y-1 pl-1 text-slate-500 text-2xs">
                      {calcResult.steps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-800 p-4 text-center text-slate-500 text-xs">
                Enter a valid quantity to calculate conversions and prices.
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addToCart}
                disabled={!calcResult}
                className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-300 transition disabled:opacity-50"
              >
                Add To Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple internal Close icon as fallback
function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
