import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getQueryClient, trpc } from "@/server/trpc/server";

import { ProjectView } from "@/client/modules/projects/views/project-view";

interface Props {
  params: Promise<{
    projectId: string;
  }>
};

const Page = async ({ params }: Props) => {
  const { projectId } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.messages.getMany.queryOptions({
    projectId,
  }));
  void queryClient.prefetchQuery(trpc.projects.getOne.queryOptions({
    id: projectId,
  }));

  return ( 
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<p>Error!</p>}>
        <Suspense fallback={<p>Loading Project...</p>}>
          <ProjectView projectId={projectId} />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
};
 
export default Page;
