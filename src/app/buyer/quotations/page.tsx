import { prisma } from "@/lib/db";
import { syncAuthUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import QuotationManager from "../../admin/quotations/QuotationManager";

export const revalidate = 0;

export default async function BuyerQuotationsPage() {
  const { dbUser } = await syncAuthUser();
  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch quotations submitted by this buyer
  const quotations = await prisma.quotation.findMany({
    where: { buyerId: dbUser.id },
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
        <h1 className="text-3xl font-extrabold tracking-tight text-white">My Quotation Requests</h1>
        <p className="text-slate-400">Track pending quotes, view price breakdowns, and convert approved quotations directly into active orders.</p>
      </div>

      <QuotationManager role={Role.BUYER} initialQuotations={serializedQuotations} />
    </div>
  );
}
