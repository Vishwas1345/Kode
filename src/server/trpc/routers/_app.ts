import { usageRouter } from '@/server/trpc/routers/usage';
import { messagesRouter } from '@/server/trpc/routers/messages';
import { projectsRouter } from '@/server/trpc/routers/projects';

import { createTRPCRouter } from '../init';

export const appRouter = createTRPCRouter({
  usage: usageRouter,
  messages: messagesRouter,
  projects: projectsRouter,
});

export type AppRouter = typeof appRouter;
