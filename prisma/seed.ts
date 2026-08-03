import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { ensureSystemRolesSeeded } from "../src/lib/permissions/seed";
import { ensurePlansSeeded } from "../src/lib/plans";
import { SYSTEM_ROLES } from "../src/lib/permissions/constants";

async function main() {
  await ensurePlansSeeded();

  const owner = await prisma.user.upsert({
    where: { email: "owner@stockora-demo.com" },
    create: {
      email: "owner@stockora-demo.com",
      name: "Alex Karam",
      passwordHash: await hashPassword("Stockora123!"),
      emailVerified: new Date(),
    },
    update: {},
  });

  const business = await prisma.business.upsert({
    where: { slug: "stockora-fashion-demo" },
    create: {
      name: "Stockora Fashion Demo",
      slug: "stockora-fashion-demo",
      industry: "Fashion chain",
      baseCurrency: "USD",
      secondaryCurrency: "LBP",
      status: "ACTIVE",
    },
    update: {},
  });

  await prisma.businessSetting.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id },
    update: {},
  });

  const roles = await ensureSystemRolesSeeded(business.id);
  const ownerRole = roles.find((role) => role.key === SYSTEM_ROLES.OWNER)!;

  await prisma.businessMembership.upsert({
    where: { businessId_userId: { businessId: business.id, userId: owner.id } },
    create: {
      businessId: business.id,
      userId: owner.id,
      roleId: ownerRole.id,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    update: {},
  });

  const branchMain = await prisma.branch.upsert({
    where: { businessId_code: { businessId: business.id, code: "MAIN" } },
    create: {
      businessId: business.id,
      name: "Beirut Main Branch",
      code: "MAIN",
      isMainBranch: true,
      address: "Hamra Street, Beirut",
    },
    update: {},
  });

  const branchMall = await prisma.branch.upsert({
    where: { businessId_code: { businessId: business.id, code: "MALL" } },
    create: {
      businessId: business.id,
      name: "Beirut Mall Branch",
      code: "MALL",
      address: "Beirut City Mall, Dora",
    },
    update: {},
  });

  await prisma.inventoryLocation.upsert({
    where: { branchId: branchMall.id },
    create: {
      businessId: business.id,
      type: "BRANCH",
      branchId: branchMall.id,
      name: branchMall.name,
    },
    update: {},
  });

  const starterPlan = await prisma.plan.findUnique({ where: { key: "BUSINESS" } });
  if (starterPlan) {
    await prisma.subscription.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        planId: starterPlan.id,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
      },
      update: {},
    });
  }

  const categoryNames = ["T-Shirts", "Dresses", "Jeans", "Shoes", "Baby Clothing", "Accessories"];
  const categories = await Promise.all(
    categoryNames.map(async (name) => {
      const existing = await prisma.category.findFirst({
        where: { businessId: business.id, name, parentId: null },
      });
      return existing ?? prisma.category.create({ data: { businessId: business.id, name } });
    }),
  );

  const colorAttribute = await prisma.attribute.upsert({
    where: { businessId_name: { businessId: business.id, name: "Color" } },
    create: { businessId: business.id, name: "Color" },
    update: {},
  });
  const sizeAttribute = await prisma.attribute.upsert({
    where: { businessId_name: { businessId: business.id, name: "Size" } },
    create: { businessId: business.id, name: "Size" },
    update: {},
  });

  const colors = await Promise.all(
    [
      { value: "Black", hex: "#0A0A0A" },
      { value: "White", hex: "#FFFFFF" },
      { value: "Purple", hex: "#7C3AED" },
    ].map((c) =>
      prisma.attributeValue.upsert({
        where: { attributeId_value: { attributeId: colorAttribute.id, value: c.value } },
        create: { attributeId: colorAttribute.id, value: c.value, colorHex: c.hex },
        update: {},
      }),
    ),
  );

  const sizes = await Promise.all(
    ["S", "M", "L", "XL"].map((value) =>
      prisma.attributeValue.upsert({
        where: { attributeId_value: { attributeId: sizeAttribute.id, value } },
        create: { attributeId: sizeAttribute.id, value },
        update: {},
      }),
    ),
  );

  const products = [
    { name: "Classic Cotton T-Shirt", category: "T-Shirts", cost: 6, price: 15 },
    { name: "Slim Fit Denim Jeans", category: "Jeans", cost: 14, price: 38 },
    { name: "Everyday Sneakers", category: "Shoes", cost: 20, price: 55 },
  ];

  for (const productSeed of products) {
    const existingProduct = await prisma.product.findFirst({
      where: { businessId: business.id, name: productSeed.name },
    });
    if (existingProduct) continue;

    const category = categories.find((c) => c.name === productSeed.category);
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        name: productSeed.name,
        categoryId: category?.id,
        status: "ACTIVE",
        costPrice: productSeed.cost,
        sellingPrice: productSeed.price,
      },
    });

    let variantIndex = 0;
    for (const color of colors) {
      for (const size of sizes) {
        variantIndex += 1;
        const variant = await prisma.productVariant.create({
          data: {
            businessId: business.id,
            productId: product.id,
            sku: `${product.id.slice(-5)}-${variantIndex}`,
            costPrice: productSeed.cost,
            sellingPrice: productSeed.price,
            attributeValues: {
              create: [{ attributeValueId: color.id }, { attributeValueId: size.id }],
            },
          },
        });

        const location = await prisma.inventoryLocation.upsert({
          where: { branchId: branchMain.id },
          create: {
            businessId: business.id,
            type: "BRANCH",
            branchId: branchMain.id,
            name: branchMain.name,
          },
          update: {},
        });

        const quantity = 10 + Math.floor(Math.random() * 20);
        await prisma.inventoryBalance.upsert({
          where: { locationId_variantId: { locationId: location.id, variantId: variant.id } },
          create: { businessId: business.id, locationId: location.id, variantId: variant.id, quantityOnHand: quantity },
          update: {},
        });
        await prisma.inventoryMovement.create({
          data: {
            businessId: business.id,
            locationId: location.id,
            variantId: variant.id,
            type: "OPENING",
            quantity,
            previousQuantity: 0,
            newQuantity: quantity,
            notes: "Initial demo stock",
          },
        });
      }
    }
  }

  await prisma.customer.upsert({
    where: { id: "demo-customer-jane" },
    create: {
      id: "demo-customer-jane",
      businessId: business.id,
      name: "Jane Farah",
      phone: "+961 3 123 456",
      email: "jane.farah@example.com",
    },
    update: {},
  });

  console.log(`Seeded demo business "${business.name}" (${business.slug})`);
  console.log("Demo login: owner@stockora-demo.com / Stockora123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
