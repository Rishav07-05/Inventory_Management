import { prisma } from "@/lib/db";
import { createCategory } from "@/app/actions/business";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import CategoryForm from "./CategoryForm";
import { Tags } from "lucide-react";

export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      products: true,
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Category Management</h1>
        <p className="text-slate-400">Add and manage chemical and equipment categories for inventory catalogs.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Creation Form */}
        <div className="md:col-span-1">
          <CategoryForm />
        </div>

        {/* Categories List */}
        <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl p-6 h-fit">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Tags className="h-5 w-5 text-teal-400" /> Existing Categories
          </h3>
          <div className="divide-y divide-slate-800">
            {categories.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">No categories defined yet.</div>
            ) : (
              categories.map((c) => (
                <div key={c.id} className="py-4 flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">{c.name}</h4>
                    <p className="text-xs text-slate-400">{c.description || "No description provided."}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-400 border border-teal-500/20 shrink-0">
                    {c.products.length} Products
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
