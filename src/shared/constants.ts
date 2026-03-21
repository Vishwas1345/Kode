// Subscription plans
export const PLANS = {
  FREE: "free",
  STANDARD: "standard",
  PREMIUM: "premium",
} as const;

export type PlanType = (typeof PLANS)[keyof typeof PLANS];

// Credit limits per plan
export const PLAN_CREDITS: Record<string, number> = {
  [PLANS.FREE]: 10,
  [PLANS.STANDARD]: 110,
  [PLANS.PREMIUM]: 400,
};

// Credits added on purchase (different from rate limiter total)
export const PLAN_PURCHASE_CREDITS: Record<string, number> = {
  [PLANS.STANDARD]: 100,
  [PLANS.PREMIUM]: 300,
};

// Admin override
export const ADMIN_CREDITS = 999999999;

// Rate limiter duration (30 days in seconds)
export const USAGE_DURATION = 30 * 24 * 60 * 60;

// Cost per generation
export const GENERATION_COST = 1;

// Base free credits for new users
export const BASE_FREE_CREDITS = 10;
