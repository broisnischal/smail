import { PrismaClient, SubscriptionStatus } from "#generated/prisma/client.js";

const prisma = new PrismaClient();

export async function getUserPlanLimits(userId: string) {
  const userWithSubscription = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: {
          plan: true,
        },
      },
    },
  });

  if (!userWithSubscription?.subscription?.plan) {
    // Return default free plan limits or throw error
    return {
      maxAliases: 3,
      maxForwardsPerMonth: 50,
    };
  }

  return {
    maxAliases: userWithSubscription.subscription.plan.maxAliases,
    maxForwardsPerMonth:
      userWithSubscription.subscription.plan.maxForwardsPerMonth,
  };
}

export async function canUserCreateAlias(userId: string): Promise<boolean> {
  const limits = await getUserPlanLimits(userId);

  const currentAliasCount = await prisma.emailAlias.count({
    where: {
      userId: userId,
      isActive: true,
    },
  });

  return limits.maxAliases === -1 || currentAliasCount < limits.maxAliases;
}

export async function getUserUsageStats(userId: string) {
  const currentMonth = new Date();
  const startOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  );
  const endOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  );

  const [aliasCount, emailsThisMonth] = await Promise.all([
    prisma.emailAlias.count({
      where: {
        userId: userId,
        isActive: true,
      },
    }),
    prisma.emailLog.count({
      where: {
        alias: {
          userId: userId,
        },
        receivedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        status: "forwarded",
      },
    }),
  ]);

  return {
    aliases: aliasCount,
    emailsThisMonth,
  };
}
