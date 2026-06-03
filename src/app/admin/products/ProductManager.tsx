"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/app/actions/business";
import { DimensionType } from "@prisma/client";
import { toast } from "sonner";
import { Edit3, Plus, Search, Trash2, X, Calculator, Tags } from "lucide-react";
import { z } from "zod";

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

interface ProductManagerProps {
  initialProducts: Product[];
  categories: Category[];
}

const productFormSchema = z.object({
  sku: z.string().min(3, "SKU must be at least 3 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  dimensionType: z.nativeEnum(DimensionType),
  baseUnit: z.string().min(1, "Base unit is required"),
  pricePerBaseUnit: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Price must be a positive number"),
  initialQuantity: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, "Quantity must be 0 or more"),
  density: z.string().optional().refine(val => {
    if (!val || val.trim() === "") return true;
    const num = Number(val);
    return !isNaN(num) && num > 0 && num <= 100;
  }, "Density must be between 0 and 100 g/mL"),
});

export default function ProductManager({ initialProducts, categories }: ProductManagerProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Create Form State
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [dimensionType, setDimensionType] = useState<DimensionType>(DimensionType.WEIGHT);
  const [baseUnit, setBaseUnit] = useState("g");
  const [price, setPrice] = useState("0");
  const [initialQty, setInitialQty] = useState("0");
  const [density, setDensity] = useState("");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("0");
  const [editDensity, setEditDensity] = useState("");

  // Adjust base unit suggestions based on dimension type
  const handleDimensionChange = (val: DimensionType) => {
    setDimensionType(val);
    if (val === DimensionType.WEIGHT) {
      setBaseUnit("g");
    } else if (val === DimensionType.VOLUME) {
      setBaseUnit("mL");
    } else {
      setBaseUnit("item");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      sku,
      name,
      description: description || undefined,
      categoryId,
      dimensionType,
      baseUnit,
      pricePerBaseUnit: price,
      initialQuantity: initialQty,
      density: density || undefined,
    };

    const validate = productFormSchema.safeParse(payload);
    if (!validate.success) {
      toast.error(validate.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    try {
      const res = await createProduct(payload);
      toast.success("Product created successfully!");
      setIsCreateOpen(false);
      
      // Reset fields
      setSku("");
      setName("");
      setDescription("");
      setPrice("0");
      setInitialQty("0");
      setDensity("");
      
      router.refresh();
      window.location.reload(); // Refresh the list
    } catch (err: any) {
      toast.error(err.message || "Failed to create product.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsLoading(true);

    const payload = {
      name: editName,
      description: editDesc || undefined,
      pricePerBaseUnit: editPrice,
      density: editDensity || undefined,
    };

    // Partial validation for editing
    if (isNaN(Number(editPrice)) || Number(editPrice) <= 0) {
      toast.error("Price must be a positive number.");
      setIsLoading(false);
      return;
    }
    if (editDensity && (isNaN(Number(editDensity)) || Number(editDensity) <= 0 || Number(editDensity) > 100)) {
      toast.error("Density must be between 0 and 100 g/mL.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await updateProduct(editingProduct.id, payload);
      toast.success("Product updated successfully!");
      setEditingProduct(null);
      router.refresh();
      window.location.reload(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || "Failed to update product.");
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditDesc(p.description || "");
    setEditPrice(p.pricePerBaseUnit);
    setEditDensity(p.density || "");
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) || 
    p.category.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search and Top Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, name, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/30 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-300 transition"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Catalog Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-2xs font-bold font-sans">
              <th className="p-4">SKU / Chemical</th>
              <th className="p-4">Category</th>
              <th className="p-4">Dim Type</th>
              <th className="p-4">Base Unit</th>
              <th className="p-4 text-right">Rate</th>
              <th className="p-4 text-right">Available Qty</th>
              <th className="p-4 text-right">Density</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-300">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No products registered in the database.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/10 transition">
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">{p.name}</div>
                    <div className="text-slate-500 font-mono text-2xs">{p.sku}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center rounded-md bg-slate-850 px-2 py-1 text-2xs font-medium text-slate-400 border border-slate-800">
                      {p.category.name}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-2xs">{p.dimensionType}</td>
                  <td className="p-4 font-mono text-2xs">{p.baseUnit}</td>
                  <td className="p-4 text-right font-bold text-teal-400 font-mono text-sm">₹{parseFloat(p.pricePerBaseUnit).toFixed(2)}</td>
                  <td className="p-4 text-right font-bold text-white font-mono">
                    {parseFloat(p.availableQuantity).toFixed(2)}
                  </td>
                  <td className="p-4 text-right text-slate-400 font-mono">
                    {p.density ? `${parseFloat(p.density).toFixed(2)} g/mL` : "N/A"}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-teal-400" /> Create Chemical Product
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHEM-ETH-99"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Chemical Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Absolute Ethanol 99.8%"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  placeholder="Chemical spec details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Dim Type</label>
                  <select
                    value={dimensionType}
                    onChange={(e) => handleDimensionChange(e.target.value as DimensionType)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  >
                    <option value={DimensionType.WEIGHT}>Weight</option>
                    <option value={DimensionType.VOLUME}>Volume</option>
                    <option value={DimensionType.COUNT}>Count</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Base Unit</label>
                  <select
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  >
                    {dimensionType === DimensionType.WEIGHT && (
                      <>
                        <option value="g">g (Grams)</option>
                        <option value="kg">kg (Kilograms)</option>
                      </>
                    )}
                    {dimensionType === DimensionType.VOLUME && (
                      <>
                        <option value="mL">mL (Milliliters)</option>
                        <option value="L">L (Liters)</option>
                      </>
                    )}
                    {dimensionType === DimensionType.COUNT && (
                      <option value="item">item (Count)</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Price Per Base Unit (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Initial Stock Qty</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={initialQty}
                    onChange={(e) => setInitialQty(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Density (g/mL, optional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 0.789"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-350 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-300 transition"
                >
                  {isLoading ? "Saving..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-teal-400" /> Edit Chemical Specs
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Chemical Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none h-24 resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Price Per Base Unit (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Density (g/mL, optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={editDensity}
                    onChange={(e) => setEditDensity(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-355 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-300 transition"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
