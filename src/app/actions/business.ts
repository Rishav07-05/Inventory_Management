/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { Decimal } from "@/lib/decimal";
import { convertUnits } from "@/lib/conversions";
import { cookies } from "next/headers";
import { 
  Role, 
  DimensionType, 
  QuotationStatus, 
  OrderStatus, 
  InventoryTransactionType 
} from "@prisma/client";
import { revalidatePath } from "next/cache";

// --- Helper: Verify Authentication and Role ---
async function verifyUserAndRole(allowedRoles: Role[]) {
  let userId: string | null = null;
  
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === "true") {
    const cookieStore = await cookies();
    const role = cookieStore.get("mock_role")?.value || "ADMIN";
    userId = `mock_${role.toLowerCase()}_clerk_id`;
  } else {
    const session = await auth();
    userId = session.userId;
  }

  if (!userId) {
    throw new Error("Unauthenticated");
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!dbUser || !allowedRoles.includes(dbUser.role)) {
    throw new Error("Unauthorized");
  }

  return dbUser;
}

// --- Helper: Serialize Decimal values for Server Action Return ---
function serializeDbObject<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Decimal || (obj as any).constructor?.name === "Decimal") {
    return (obj as any).toString();
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeDbObject);
  }
  if (typeof obj === "object") {
    const res: any = {};
    for (const key in obj) {
      res[key] = serializeDbObject(obj[key]);
    }
    return res;
  }
  return obj;
}

// ==========================================
// 1. ADMIN ACTIONS: Product & Category & Users
// ==========================================

export async function createCategory(name: string, description?: string) {
  const actor = await verifyUserAndRole([Role.ADMIN]);

  const category = await prisma.category.create({
    data: { name, description },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "CATEGORY_CREATE",
      targetType: "CATEGORY",
      targetId: category.id,
      newValue: JSON.stringify({ name, description }),
    },
  });

  revalidatePath("/");
  return serializeDbObject(category);
}

export async function createProduct(data: {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  dimensionType: DimensionType;
  baseUnit: string;
  pricePerBaseUnit: string;
  initialQuantity: string;
  density?: string;
}) {
  const actor = await verifyUserAndRole([Role.ADMIN, Role.SELLER]);

  const price = new Decimal(data.pricePerBaseUnit);
  const qty = new Decimal(data.initialQuantity);
  const densityVal = data.density && data.density.trim() !== "" ? new Decimal(data.density) : null;

  if (densityVal) {
    if (densityVal.lessThanOrEqualTo(0) || densityVal.greaterThan(100)) {
      throw new Error("Density must be greater than 0 and less than or equal to 100 g/mL");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create product
    const product = await tx.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        dimensionType: data.dimensionType,
        baseUnit: data.baseUnit,
        pricePerBaseUnit: price,
        availableQuantity: qty,
        density: densityVal,
        sellerId: actor.role === Role.SELLER ? actor.id : null,
      },
    });

    // 2. Create inventory record
    await tx.inventory.create({
      data: {
        productId: product.id,
        quantity: qty,
        location: "Warehouse A",
      },
    });

    // 3. Create initial inventory transaction
    await tx.inventoryTransaction.create({
      data: {
        productId: product.id,
        quantity: qty,
        type: InventoryTransactionType.STOCK_ADDED,
        notes: "Product initialization",
      },
    });

    return product;
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "PRODUCT_CREATE",
      targetType: "PRODUCT",
      targetId: result.id,
      newValue: JSON.stringify(data),
    },
  });

  revalidatePath("/");
  return serializeDbObject(result);
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    description?: string;
    pricePerBaseUnit: string;
    density?: string;
  }
) {
  const actor = await verifyUserAndRole([Role.ADMIN, Role.SELLER]);

  const price = new Decimal(data.pricePerBaseUnit);
  const densityVal = data.density && data.density.trim() !== "" ? new Decimal(data.density) : null;

  if (densityVal) {
    if (densityVal.lessThanOrEqualTo(0) || densityVal.greaterThan(100)) {
      throw new Error("Density must be greater than 0 and less than or equal to 100 g/mL");
    }
  }

  const prevProduct = await prisma.product.findUnique({ where: { id } });
  if (!prevProduct) throw new Error("Product not found");

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      pricePerBaseUnit: price,
      density: densityVal,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "PRODUCT_UPDATE",
      targetType: "PRODUCT",
      targetId: product.id,
      previousValue: JSON.stringify(serializeDbObject(prevProduct)),
      newValue: JSON.stringify(data),
    },
  });

  revalidatePath("/");
  return serializeDbObject(product);
}

export async function adjustInventory(
  productId: string,
  quantityDelta: string,
  notes: string
) {
  const actor = await verifyUserAndRole([Role.ADMIN]);
  const delta = new Decimal(quantityDelta);

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new Error("Product not found");

    const inventory = await tx.inventory.findUnique({
      where: { productId },
    });
    if (!inventory) throw new Error("Inventory not found");

    const newQuantity = new Decimal(inventory.quantity).add(delta);
    if (newQuantity.lessThan(0)) {
      throw new Error("Insufficient stock. Inventory cannot be negative.");
    }

    // Update inventory
    const updatedInventory = await tx.inventory.update({
      where: { productId },
      data: { quantity: newQuantity },
    });

    // Update cached availableQuantity on Product
    await tx.product.update({
      where: { id: productId },
      data: { availableQuantity: newQuantity },
    });

    // Write transaction ledger
    const trans = await tx.inventoryTransaction.create({
      data: {
        productId,
        quantity: delta,
        type: InventoryTransactionType.MANUAL_ADJUSTMENT,
        notes: notes || "Manual adjustment",
      },
    });

    return { product, newQuantity, trans };
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "INVENTORY_ADJUST",
      targetType: "PRODUCT",
      targetId: productId,
      previousValue: result.product.availableQuantity.toString(),
      newValue: result.newQuantity.toString(),
    },
  });

  revalidatePath("/");
  return serializeDbObject(result.trans);
}

export async function updateUserRole(targetUserId: string, newRole: Role) {
  const actor = await verifyUserAndRole([Role.ADMIN]);

  const prevUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!prevUser) throw new Error("User not found");

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "ROLE_CHANGE",
      targetType: "USER",
      targetId: targetUserId,
      previousValue: prevUser.role,
      newValue: newRole,
    },
  });

  // Sync to Clerk publicMetadata
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(updatedUser.clerkId, {
      publicMetadata: {
        role: newRole,
      },
    });
  } catch (err) {
    console.error("Failed to sync updated role to Clerk:", err);
  }

  revalidatePath("/");
  return serializeDbObject(updatedUser);
}

// ==========================================
// 2. QUOTATION ACTIONS: Create, Review, Convert
// ==========================================

export async function createQuotation(items: {
  productId: string;
  enteredQuantity: string;
  unit: string;
}[]) {
  const actor = await verifyUserAndRole([Role.BUYER, Role.SELLER, Role.ADMIN]);

  if (items.length === 0) {
    throw new Error("Cannot create an empty quotation.");
  }

  const result = await prisma.$transaction(async (tx) => {
    let totalAmount = new Decimal(0);
    const quotationItemsData = [];

    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) throw new Error(`Product not found for ID: ${item.productId}`);

      const qty = new Decimal(item.enteredQuantity);
      if (qty.lessThanOrEqualTo(0)) {
        throw new Error("Quantity must be greater than 0");
      }

      // Convert quantity to base unit
      const baseQty = convertUnits({
        quantity: qty,
        fromUnit: item.unit,
        toUnit: product.baseUnit,
        density: product.density,
      });

      // Calculate total price
      const totalPrice = baseQty.mul(new Decimal(product.pricePerBaseUnit));
      totalAmount = totalAmount.add(totalPrice);

      quotationItemsData.push({
        productId: product.id,
        quantity: baseQty,
        unit: item.unit,
        enteredQuantity: qty,
        pricePerBaseUnit: product.pricePerBaseUnit,
        totalPrice,
      });
    }

    const quotation = await tx.quotation.create({
      data: {
        buyerId: actor.role === Role.BUYER ? actor.id : actor.id, // for now, actor is creator
        sellerId: actor.role === Role.SELLER ? actor.id : null,
        status: QuotationStatus.PENDING,
        totalAmount,
        items: {
          create: quotationItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    return quotation;
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "QUOTATION_CREATE",
      targetType: "QUOTATION",
      targetId: result.id,
      newValue: JSON.stringify({
        totalAmount: result.totalAmount.toString(),
        itemCount: result.items.length,
      }),
    },
  });

  revalidatePath("/");
  return serializeDbObject(result);
}

export async function updateQuotationStatus(
  quotationId: string,
  newStatus: QuotationStatus
) {
  const actor = await verifyUserAndRole([Role.SELLER, Role.ADMIN]);

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
  if (!quotation) throw new Error("Quotation not found");

  if (actor.role === Role.SELLER) {
    const sellerOwnsAllItems = quotation.items.every(
      (item) => item.product?.sellerId === actor.id
    );

    if (!sellerOwnsAllItems) {
      throw new Error("Sellers can only update quotations containing their own products.");
    }
  }

  // Validate state transitions
  // PENDING -> REVIEWED
  // REVIEWED -> APPROVED or REJECTED
  // APPROVED -> CONVERTED_TO_ORDER
  const current = quotation.status;
  let isValid = false;

  if (current === QuotationStatus.PENDING && newStatus === QuotationStatus.REVIEWED) {
    isValid = true;
  } else if (
    current === QuotationStatus.REVIEWED &&
    (newStatus === QuotationStatus.APPROVED || newStatus === QuotationStatus.REJECTED)
  ) {
    isValid = true;
  } else if (current === QuotationStatus.APPROVED && newStatus === QuotationStatus.CONVERTED_TO_ORDER) {
    // Handled in convertToOrder action, but let it pass if explicitly updated
    isValid = true;
  }

  if (!isValid) {
    throw new Error(`Invalid quotation status transition from ${current} to ${newStatus}`);
  }

  const updatedQuotation = await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: newStatus },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "QUOTATION_STATUS_CHANGE",
      targetType: "QUOTATION",
      targetId: quotationId,
      previousValue: current,
      newValue: newStatus,
    },
  });

  revalidatePath("/");
  return serializeDbObject(updatedQuotation);
}

export async function convertQuotationToOrder(quotationId: string) {
  const actor = await verifyUserAndRole([Role.BUYER, Role.SELLER, Role.ADMIN]);

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status !== QuotationStatus.APPROVED) {
    throw new Error("Only APPROVED quotations can be converted to orders.");
  }

  if (actor.role === Role.SELLER) {
    const sellerOwnsAllItems = quotation.items.every(
      (item) => item.product?.sellerId === actor.id
    );

    if (!sellerOwnsAllItems) {
      throw new Error("Sellers can only convert quotations containing their own products.");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create order
    const order = await tx.order.create({
      data: {
        buyerId: quotation.buyerId,
        sellerId: quotation.sellerId || (actor.role === Role.SELLER ? actor.id : null),
        status: OrderStatus.PENDING,
        totalAmount: quotation.totalAmount,
      },
    });

    // 2. Create order items mirroring quotation items
    for (const qItem of quotation.items) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: qItem.productId,
          quantity: qItem.quantity,
          unit: qItem.unit,
          enteredQuantity: qItem.enteredQuantity,
          pricePerBaseUnit: qItem.pricePerBaseUnit,
          totalPrice: qItem.totalPrice,
        },
      });
    }

    // 3. Mark quotation as converted
    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.CONVERTED_TO_ORDER },
    });

    return order;
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "ORDER_CREATE",
      targetType: "ORDER",
      targetId: result.id,
      newValue: JSON.stringify({
        sourceQuotationId: quotationId,
        totalAmount: result.totalAmount.toString(),
      }),
    },
  });

  revalidatePath("/");
  return serializeDbObject(result);
}

// ==========================================
// 3. ORDER ACTIONS: Create, Update Status
// ==========================================

export async function createOrder(items: {
  productId: string;
  enteredQuantity: string;
  unit: string;
}[]) {
  const actor = await verifyUserAndRole([Role.BUYER, Role.SELLER, Role.ADMIN]);

  if (items.length === 0) {
    throw new Error("Cannot place an empty order.");
  }

  const result = await prisma.$transaction(async (tx) => {
    let totalAmount = new Decimal(0);
    const orderItemsData = [];

    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) throw new Error(`Product not found for ID: ${item.productId}`);

      const qty = new Decimal(item.enteredQuantity);
      if (qty.lessThanOrEqualTo(0)) {
        throw new Error("Quantity must be greater than 0");
      }

      // Convert quantity to base unit
      const baseQty = convertUnits({
        quantity: qty,
        fromUnit: item.unit,
        toUnit: product.baseUnit,
        density: product.density,
      });

      // Calculate total price
      const totalPrice = baseQty.mul(new Decimal(product.pricePerBaseUnit));
      totalAmount = totalAmount.add(totalPrice);

      orderItemsData.push({
        productId: product.id,
        quantity: baseQty,
        unit: item.unit,
        enteredQuantity: qty,
        pricePerBaseUnit: product.pricePerBaseUnit,
        totalPrice,
      });
    }

    const order = await tx.order.create({
      data: {
        buyerId: actor.role === Role.BUYER ? actor.id : actor.id, // buyer placing order or assisted
        sellerId: actor.role === Role.SELLER ? actor.id : null,
        status: OrderStatus.PENDING,
        totalAmount,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    return order;
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "ORDER_CREATE",
      targetType: "ORDER",
      targetId: result.id,
      newValue: JSON.stringify({
        totalAmount: result.totalAmount.toString(),
        itemCount: result.items.length,
      }),
    },
  });

  revalidatePath("/");
  return serializeDbObject(result);
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
) {
  // Admin is responsible for status transitions.
  // Note: Sellers can track status, but Admin controls state changes.
  const actor = await verifyUserAndRole([Role.ADMIN, Role.SELLER]);

  const result = await prisma.$transaction(async (tx) => {
    // Lock order for update
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) throw new Error("Order not found");

    if (actor.role === Role.SELLER) {
      const sellerOwnsAllItems = order.items.every(
        (item) => item.product?.sellerId === actor.id
      );

      if (!sellerOwnsAllItems) {
        throw new Error("Sellers can only update orders containing their own products.");
      }
    }

    const current = order.status;
    if (current === newStatus) return order;

    // Validate state transitions
    // PENDING -> APPROVED or CANCELLED
    // APPROVED -> PROCESSING
    // PROCESSING -> SHIPPED
    // SHIPPED -> DELIVERED
    let isValid = false;

    if (current === OrderStatus.PENDING && (newStatus === OrderStatus.APPROVED || newStatus === OrderStatus.CANCELLED)) {
      isValid = true;
    } else if (current === OrderStatus.APPROVED && newStatus === OrderStatus.PROCESSING) {
      isValid = true;
    } else if (current === OrderStatus.PROCESSING && newStatus === OrderStatus.SHIPPED) {
      isValid = true;
    } else if (current === OrderStatus.SHIPPED && newStatus === OrderStatus.DELIVERED) {
      isValid = true;
    }

    if (!isValid) {
      throw new Error(`Invalid order status transition from ${current} to ${newStatus}`);
    }

    // --- Core Stock Mechanics ---

    // 1. Transaction Approval: Decrement stock, write to ledger
    if (newStatus === OrderStatus.APPROVED) {
      for (const item of order.items) {
        // Query current stock levels
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (!inventory) {
          throw new Error(`Inventory record not found for product ID ${item.productId}`);
        }

        const currentQty = new Decimal(inventory.quantity);
        const requestedQty = new Decimal(item.quantity);

        // Insufficient inventory protection
        if (currentQty.lessThan(requestedQty)) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          throw new Error(
            `Insufficient stock for product ${product?.name || item.productId}. Available: ${currentQty.toString()} ${product?.baseUnit}, Requested: ${requestedQty.toString()} ${product?.baseUnit}`
          );
        }

        const nextQty = currentQty.sub(requestedQty);

        // Update inventory record
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: nextQty },
        });

        // Update cached product field
        await tx.product.update({
          where: { id: item.productId },
          data: { availableQuantity: nextQty },
        });

        // Write ledger transaction
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            quantity: requestedQty.negated(),
            type: InventoryTransactionType.ORDER_APPROVED,
            referenceId: orderId,
            notes: `Stock allocated for order approval ${orderId}`,
          },
        });
      }
    }

    // 2. Transaction Cancellation: If order was approved and is cancelled, restore stock
    if (newStatus === OrderStatus.CANCELLED) {
      // Stock was only decremented if order was APPROVED (or beyond)
      const wasStockDecremented =
        current === OrderStatus.APPROVED ||
        current === OrderStatus.PROCESSING ||
        current === OrderStatus.SHIPPED ||
        current === OrderStatus.DELIVERED;

      if (wasStockDecremented) {
        for (const item of order.items) {
          const inventory = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });

          if (!inventory) throw new Error("Inventory record not found");

          const restoredQty = new Decimal(inventory.quantity).add(new Decimal(item.quantity));

          // Update inventory record
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantity: restoredQty },
          });

          // Update product cached available quantity
          await tx.product.update({
            where: { id: item.productId },
            data: { availableQuantity: restoredQty },
          });

          // Write ledger transaction
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              quantity: new Decimal(item.quantity),
              type: InventoryTransactionType.ORDER_CANCELLED,
              referenceId: orderId,
              notes: `Stock restored from cancelled order ${orderId}`,
            },
          });
        }
      }
    }

    // 3. Save new status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    return updatedOrder;
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "ORDER_STATUS_CHANGE",
      targetType: "ORDER",
      targetId: orderId,
      previousValue: result.status, // previous status was cached or from query
      newValue: newStatus,
    },
  });

  revalidatePath("/");
  return serializeDbObject(result);
}
