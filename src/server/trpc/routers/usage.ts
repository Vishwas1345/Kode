import { getUsageStatus } from "@/server/lib/usage";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

export const usageRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    try {
      const result = await getUsageStatus();
      return result;
    } catch {
      return null;
    }
  }),
});
