import "dotenv/config";
import { PrismaClient, Role, DimensionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import Decimal from "decimal.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is missing");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Clean existing database
  await prisma.auditLog.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log("Database cleaned.");

  // 2. Create Users
  const adminEmail = process.env.ADMIN_EMAIL || "zorin4x@gmail.com";
  console.log(`Creating Admin user with email: ${adminEmail}`);
  
  const admin = await prisma.user.create({
    data: {
      clerkId: "user_admin_123",
      email: adminEmail,
      name: "System Admin",
      role: Role.ADMIN,
    },
  });

  const seller1 = await prisma.user.create({
    data: {
      clerkId: "user_seller_1",
      email: "seller1@example.com",
      name: "Alice Seller",
      role: Role.SELLER,
    },
  });

  const seller2 = await prisma.user.create({
    data: {
      clerkId: "user_seller_2",
      email: "seller2@example.com",
      name: "Bob Seller",
      role: Role.SELLER,
    },
  });

  const buyer1 = await prisma.user.create({
    data: {
      clerkId: "user_buyer_1",
      email: "buyer1@example.com",
      name: "Charlie Buyer",
      role: Role.BUYER,
    },
  });

  const buyer2 = await prisma.user.create({
    data: {
      clerkId: "user_buyer_2",
      email: "buyer2@example.com",
      name: "David Buyer",
      role: Role.BUYER,
    },
  });

  const buyer3 = await prisma.user.create({
    data: {
      clerkId: "user_buyer_3",
      email: "buyer3@example.com",
      name: "Emma Buyer",
      role: Role.BUYER,
    },
  });

  console.log("Users created.");

  // 3. Create Categories
  const chemicals = await prisma.category.create({
    data: { name: "Chemicals", description: "Industrial and organic chemicals" },
  });

  const solvents = await prisma.category.create({
    data: { name: "Solvents", description: "Chemical solvents and thinning agents" },
  });

  const labEquipment = await prisma.category.create({
    data: { name: "Laboratory Equipment", description: "Glassware, tools, and instruments" },
  });

  const packaging = await prisma.category.create({
    data: { name: "Packaging Materials", description: "Bottles, drums, and boxes" },
  });

  console.log("Categories created.");

  // 4. Products definition with realistic densities and pricing
  const productsData = [
    {
      sku: "SOL-H2O-001",
      name: "Distilled Water",
      description: "High-purity distilled water for laboratory and industrial use.",
      categoryId: solvents.id,
      dimensionType: DimensionType.VOLUME,
      baseUnit: "mL",
      pricePerBaseUnit: new Decimal("0.005"), // ₹5.00 per Liter (₹0.005 per mL)
      quantity: new Decimal("100000"), // 100 Liters (100,000 mL)
      density: new Decimal("1.0000"), // 1.00 g/mL
    },
    {
      sku: "SOL-ETH-002",
      name: "Ethanol",
      description: "99.9% Pure Denatured Ethanol Solvent.",
      categoryId: solvents.id,
      dimensionType: DimensionType.VOLUME,
      baseUnit: "mL",
      pricePerBaseUnit: new Decimal("0.05"), // ₹50.00 per Liter
      quantity: new Decimal("50000"), // 50 Liters
      density: new Decimal("0.7890"), // 0.789 g/mL
    },
    {
      sku: "SOL-ACE-003",
      name: "Acetone",
      description: "Industrial grade acetone for cleaning and synthesis.",
      categoryId: solvents.id,
      dimensionType: DimensionType.VOLUME,
      baseUnit: "mL",
      pricePerBaseUnit: new Decimal("0.04"), // ₹40.00 per Liter
      quantity: new Decimal("50000"), // 50 Liters
      density: new Decimal("0.7840"), // 0.784 g/mL
    },
    {
      sku: "CHM-SUL-004",
      name: "Sulfuric Acid",
      description: "Concentrated 98% Sulfuric Acid (H2SO4) for chemical processes.",
      categoryId: chemicals.id,
      dimensionType: DimensionType.VOLUME,
      baseUnit: "mL",
      pricePerBaseUnit: new Decimal("0.12"), // ₹120.00 per Liter
      quantity: new Decimal("20000"), // 20 Liters
      density: new Decimal("1.8400"), // 1.84 g/mL
    },
    {
      sku: "CHM-HYD-005",
      name: "Hydrochloric Acid",
      description: "Concentrated 37% Hydrochloric Acid (HCl) for titration and synthesis.",
      categoryId: chemicals.id,
      dimensionType: DimensionType.VOLUME,
      baseUnit: "mL",
      pricePerBaseUnit: new Decimal("0.09"), // ₹90.00 per Liter
      quantity: new Decimal("20000"), // 20 Liters
      density: new Decimal("1.1800"), // 1.18 g/mL
    },
    {
      sku: "EQP-BEA-006",
      name: "Laboratory Beaker",
      description: "500mL Borosilicate glass beaker, heat resistant.",
      categoryId: labEquipment.id,
      dimensionType: DimensionType.COUNT,
      baseUnit: "item",
      pricePerBaseUnit: new Decimal("150.00"), // ₹150 per beaker
      quantity: new Decimal("100"),
      density: null,
    },
    {
      sku: "EQP-PIP-007",
      name: "Pipette",
      description: "10mL graduated glass pipette.",
      categoryId: labEquipment.id,
      dimensionType: DimensionType.COUNT,
      baseUnit: "item",
      pricePerBaseUnit: new Decimal("80.00"), // ₹80 per pipette
      quantity: new Decimal("200"),
      density: null,
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        sku: item.sku,
        name: item.name,
        description: item.description,
        categoryId: item.categoryId,
        dimensionType: item.dimensionType,
        baseUnit: item.baseUnit,
        pricePerBaseUnit: item.pricePerBaseUnit,
        availableQuantity: item.quantity,
        density: item.density,
      },
    });

    // Create corresponding Inventory entry
    await prisma.inventory.create({
      data: {
        productId: product.id,
        quantity: item.quantity,
        location: "Warehouse A",
      },
    });

    // Create Initial Transaction Ledger Entry
    await prisma.inventoryTransaction.create({
      data: {
        productId: product.id,
        quantity: item.quantity,
        type: "STOCK_ADDED",
        notes: "Initial inventory seed",
      },
    });

    // Log the action in Audit Logs
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "PRODUCT_CREATE",
        targetType: "PRODUCT",
        targetId: product.id,
        newValue: JSON.stringify({
          sku: product.sku,
          name: product.name,
          availableQuantity: product.availableQuantity.toString(),
          pricePerBaseUnit: product.pricePerBaseUnit.toString(),
        }),
      },
    });
  }

  console.log("Products and inventory seeded.");
  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
