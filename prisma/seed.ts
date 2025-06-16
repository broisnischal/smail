import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // Create plans
  const freePlan = await prisma.plan.upsert({
    where: { name: "Free" },
    update: {},
    create: {
      name: "Free",
      maxAliases: 3,
      maxForwardsPerMonth: 50,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { name: "Pro" },
    update: {},
    create: {
      name: "Pro",
      maxAliases: -1,
      maxForwardsPerMonth: -1,
      stripePriceIdMonthly: "price_1234567890", // Replace with actual Stripe price ID
      stripePriceIdYearly: "price_0987654321", // Replace with actual Stripe price ID
    },
  });

  console.log({ freePlan, proPlan });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
