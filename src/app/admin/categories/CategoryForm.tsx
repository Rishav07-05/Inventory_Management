"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/app/actions/business";
import { toast } from "sonner";
import { Tags } from "lucide-react";

export default function CategoryForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);

    try {
      await createCategory(name.trim(), description.trim() || undefined);
      toast.success("Category created successfully!");
      setName("");
      setDescription("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create category.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl p-6">
      <h3 className="text-base font-bold text-white mb-4">Add New Category</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Category Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Organic Solvents"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description (Optional)</label>
          <textarea
            placeholder="Reagents, alcohols, etc..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-105 focus:border-teal-500 focus:outline-none h-24 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="w-full rounded-lg bg-teal-400 py-2.5 text-xs font-bold text-slate-950 hover:bg-teal-300 transition"
        >
          {isLoading ? "Saving..." : "Create Category"}
        </button>
      </form>
    </div>
  );
}
