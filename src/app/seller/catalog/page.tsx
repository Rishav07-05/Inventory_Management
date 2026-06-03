import { prisma } from "@/lib/db";
import ProductCatalog from "@/components/ProductCatalog";
import { Role } from "@prisma/client";

export const revalidate = 0;

export default async function SellerCatalogPage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  // Serialize Decimal database structures for the catalog client component
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
        <p className="text-slate-400">Search chemical stock, view live prices, and draft quotations or orders for customers.</p>
      </div>

      <ProductCatalog 
        role={Role.SELLER} 
        products={serializedProducts} 
        categories={serializedCategories} 
      />
    </div>
  );
}
