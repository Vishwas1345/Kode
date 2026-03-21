import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  E2B_API_KEY: z.string().min(1, "E2B_API_KEY is required"),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1, "NEXT_PUBLIC_RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email").min(1, "ADMIN_EMAIL is required"),
});

export const env = envSchema.parse(process.env);
