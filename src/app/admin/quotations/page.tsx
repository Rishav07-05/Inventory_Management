import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import QuotationManager from "./QuotationManager";

export const revalidate = 0;

export default async function AdminQuotationsPage() {
  const quotations = await prisma.quotation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      buyer: true,
      seller: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  const serializedQuotations = quotations.map((q) => ({
    ...q,
    totalAmount: q.totalAmount.toString(),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    items: q.items.map((i) => ({
      ...i,
      quantity: i.quantity.toString(),
      enteredQuantity: i.enteredQuantity.toString(),
      pricePerBaseUnit: i.pricePerBaseUnit.toString(),
      totalPrice: i.totalPrice.toString(),
      product: {
        ...i.product,
        pricePerBaseUnit: i.product.pricePerBaseUnit.toString(),
        availableQuantity: i.product.availableQuantity.toString(),
        density: i.product.density ? i.product.density.toString() : null,
      },
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Quotation Requests</h1>
        <p className="text-slate-400">Review chemical quotations, update workflow status, and approve pricing for purchase orders.</p>
      </div>

      <QuotationManager role={Role.ADMIN} initialQuotations={serializedQuotations} />
    </div>
  );
}
