import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import InventoryManager from "./InventoryManager";

export const revalidate = 0;

export default async function AdminInventoryPage() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      inventory: true,
    },
    orderBy: { name: "asc" },
  });

  const transactions = await prisma.inventoryTransaction.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
    },
  });

  const serializedProducts = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    dimensionType: p.dimensionType,
    baseUnit: p.baseUnit,
    availableQuantity: p.availableQuantity.toString(),
    categoryName: p.category.name,
    location: p.inventory?.location || "Warehouse A",
  }));

  const serializedTransactions = transactions.map((t) => ({
    id: t.id,
    productId: t.productId,
    productName: t.product.name,
    productSku: t.product.sku,
    baseUnit: t.product.baseUnit,
    quantity: t.quantity.toString(),
    type: t.type,
    notes: t.notes || "",
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Stock Ledger & Inventory</h1>
        <p className="text-slate-400">Perform double-entry manual stock adjustments and audit historical inventory movements.</p>
      </div>

      <InventoryManager 
        products={serializedProducts} 
        transactions={serializedTransactions} 
      />
    </div>
  );
}
