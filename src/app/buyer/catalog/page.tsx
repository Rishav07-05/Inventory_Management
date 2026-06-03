import { prisma } from "@/lib/db";
import ProductCatalog from "@/components/ProductCatalog";
import { Role } from "@prisma/client";

export const revalidate = 0;

export default async function BuyerCatalogPage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  const serializedProducts = products.map((p) => ({
    ...p,
    pricePerBaseUnit: p.pricePerBaseUnit.toString(),
    availableQuantity: p.availableQuantity.toString(),
    density: p.density ? p.density.toString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const serializedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Chemical Catalog</h1>
        <p className="text-slate-400">Browse raw materials, view available inventory, and request quotations or place direct orders.</p>
      </div>

      <ProductCatalog 
        role={Role.BUYER} 
        products={serializedProducts} 
        categories={serializedCategories} 
      />
    </div>
  );
}
