import { prisma } from "@/lib/db";
import { syncAuthUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import OrderManager from "../../admin/orders/OrderManager";
import { Decimal } from "@/lib/decimal";

export const revalidate = 0;

export default async function SellerOrdersPage() {
  const { dbUser } = await syncAuthUser();
  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch orders that contain only this seller's products
  const orders = await prisma.order.findMany({
    where: {
      items: {
        every: {
          product: {
            sellerId: dbUser.id,
          },
        },
      },
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

  const serializedOrders = orders
    .map((o) => {
      const sellerItems = o.items.filter((i) => i.product.sellerId === dbUser.id);
      if (sellerItems.length === 0) return null;

      const sellerTotal = sellerItems.reduce(
        (acc, item) => acc.add(new Decimal(item.totalPrice)),
        new Decimal(0)
      );

      return {
        ...o,
        totalAmount: sellerTotal.toString(),
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
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
    .filter((order): order is NonNullable<typeof order> => Boolean(order));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Assisted Deals</h1>
        <p className="text-slate-400">Monitor client order statuses, review total spendings, and coordinate on-site client details.</p>
      </div>

      <OrderManager role={Role.SELLER} initialOrders={serializedOrders} />
    </div>
  );
}
