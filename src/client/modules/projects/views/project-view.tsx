"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Suspense, useState } from "react";
import { EyeIcon, CodeIcon, CrownIcon } from "lucide-react";

import { Fragment } from "@/server/generated/prisma";
import { Button } from "@/client/components/ui/button";
import { UserControl } from "@/client/components/user-control";
import { FileExplorer } from "@/client/components/file-explorer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/client/components/ui/resizable";

import { FragmentWeb } from "../components/fragment-web";
import { ProjectHeader } from "../components/project-header";
import { MessagesContainer } from "../components/messages-container";
import { ErrorBoundary } from "react-error-boundary";

interface Props {
  projectId: string;
};

export const ProjectView = ({ projectId }: Props) => {
  const { isLoaded, has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" });

  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  const [tabState, setTabState] = useState<"preview" | "code">("preview");

  return (
    <div className="h-screen">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={35}
          minSize={20}
          className="flex flex-col min-h-0"
        >
          <ErrorBoundary fallback={<p>Project header error</p>}>
            <Suspense fallback={<p>Loading project...</p>}>
              <ProjectHeader projectId={projectId} />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary fallback={<p>Messages container error</p>}>
            <Suspense fallback={<p>Loading messages...</p>}>
              <MessagesContainer
                projectId={projectId}
                activeFragment={activeFragment}
                setActiveFragment={setActiveFragment}
              />
            </Suspense>
          </ErrorBoundary>
        </ResizablePanel>
        <ResizableHandle className="hover:bg-primary transition-colors" />
        <ResizablePanel
          defaultSize={65}
          minSize={50}
        >
          <Tabs
            className="h-full gap-y-0"
            defaultValue="preview"
            value={tabState}
            onValueChange={(value) => setTabState(value as "preview" | "code")}
          >
            <div className="w-full flex items-center p-2 border-b border-[#1F1F1F] bg-[#0A0A0A] gap-x-2">
              <TabsList className="h-8 p-0 border border-[#1F1F1F] rounded-md bg-[#111111]">
                <TabsTrigger value="preview" className="rounded-md data-[state=active]:bg-[#222] data-[state=active]:text-white text-[#A0A0A0]">
                  <EyeIcon className="w-4 h-4 mr-1.5" /> <span>Demo</span>
                </TabsTrigger>
                <TabsTrigger value="code" className="rounded-md data-[state=active]:bg-[#222] data-[state=active]:text-white text-[#A0A0A0]">
                  <CodeIcon className="w-4 h-4 mr-1.5" /> <span>Code</span>
                </TabsTrigger>
              </TabsList>
              <div className="ml-auto flex items-center gap-x-2">
                {isLoaded && !hasProAccess && (
                  <Button asChild size="sm" className="bg-[#111] hover:bg-[#222] text-[#00FF88] border border-[#1F1F1F] neon-glow-hover transition-all">
                    <Link href="/pricing">
                      <CrownIcon className="w-4 h-4 mr-1.5" /> Upgrade
                    </Link>
                  </Button>
                )}
                <UserControl />
              </div>
            </div>
            <TabsContent value="preview" className="min-h-0 overflow-hidden">
              {!!activeFragment && <FragmentWeb data={activeFragment} projectId={projectId} />}
            </TabsContent>
            <TabsContent value="code" className="min-h-0">
              {!!activeFragment?.files && (
                <FileExplorer
                  files={activeFragment.files as { [path: string]: string }}
                />
              )}
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
