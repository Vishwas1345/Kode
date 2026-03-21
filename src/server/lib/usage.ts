import { auth, currentUser } from "@clerk/nextjs/server";
import { RateLimiterPrisma } from "rate-limiter-flexible";

import { prisma } from "@/server/db";
import {
  PLAN_CREDITS,
  ADMIN_CREDITS,
  USAGE_DURATION,
  GENERATION_COST,
  PLANS,
} from "@/shared/constants";

export async function getUsageTracker() {
  const { userId } = await auth();
  const user = await currentUser();

  let pointsAllowed = PLAN_CREDITS[PLANS.FREE];

  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) ?? [];
  const isAdmin = adminEmails.length > 0 && user?.emailAddresses?.some(
    (email) => adminEmails.includes(email.emailAddress)
  );

  if (isAdmin) {
    pointsAllowed = ADMIN_CREDITS;
  } else if (userId) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (subscription?.plan && PLAN_CREDITS[subscription.plan]) {
      pointsAllowed = PLAN_CREDITS[subscription.plan];
    }
  }

  const usageTracker = new RateLimiterPrisma({
    storeClient: prisma,
    tableName: "Usage",
    points: pointsAllowed,
    duration: USAGE_DURATION,
  });

  return usageTracker;
};

export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.consume(userId, GENERATION_COST);
  return result;
};

export async function getUsageStatus() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.get(userId);
  return result;
};
