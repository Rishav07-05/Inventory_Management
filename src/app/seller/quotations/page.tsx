import { prisma } from "@/lib/db";
import { syncAuthUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import QuotationManager from "../../admin/quotations/QuotationManager";
import { Decimal } from "@/lib/decimal";

export const revalidate = 0;

export default async function SellerQuotationsPage() {
  const { dbUser } = await syncAuthUser();
  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch quotations managed or assisted by this seller
  const quotations = await prisma.quotation.findMany({
    where: {
      OR: [
        { sellerId: dbUser.id },
        {
          items: {
            some: {
              product: {
                sellerId: dbUser.id,
              },
            },
          },
        },
      ],
    },
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

  const serializedQuotations = quotations
    .map((q) => {
      const sellerItems = q.items.filter((i) => i.product.sellerId === dbUser.id);
      if (sellerItems.length === 0) return null;

      const sellerTotal = sellerItems.reduce(
        (acc, item) => acc.add(new Decimal(item.totalPrice)),
        new Decimal(0)
      );

      return {
        ...q,
        totalAmount: sellerTotal.toString(),
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
        items: sellerItems.map((i) => ({
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
      };
    })
    .filter((quotation): quotation is NonNullable<typeof quotation> => Boolean(quotation));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Managed Quotations</h1>
        <p className="text-slate-400">Review quotes created for customers, assist in negotiating terms, and convert approved quotes to orders.</p>
      </div>

      <QuotationManager role={Role.SELLER} initialQuotations={serializedQuotations} />
    </div>
  );
}
