import { prisma } from "@/lib/db";
import ProductManager from "@/app/admin/products/ProductManager";

export const revalidate = 0;

export default async function SellerProductsPage() {
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
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Sell & List Chemicals</h1>
        <p className="text-slate-400">Input new chemical products, describe their specifications, configure rates, and set starting stocks.</p>
      </div>

      <ProductManager 
        initialProducts={serializedProducts} 
        categories={serializedCategories} 
      />
    </div>
  );
}
