import { prisma } from "@/lib/db";
import { syncAuthUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import OrderManager from "../../admin/orders/OrderManager";

export const revalidate = 0;

export default async function BuyerOrdersPage() {
  const { dbUser } = await syncAuthUser();
  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch orders placed by this buyer
  const orders = await prisma.order.findMany({
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

  const serializedOrders = orders.map((o) => ({
    ...o,
    totalAmount: o.totalAmount.toString(),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((i) => ({
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
        <h1 className="text-3xl font-extrabold tracking-tight text-white">My Orders</h1>
        <p className="text-slate-400">Track delivery status, review historical orders, and view conversions breakdown sheets.</p>
      </div>

      <OrderManager role={Role.BUYER} initialOrders={serializedOrders} />
    </div>
  );
}
