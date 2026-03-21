import JSZip from "jszip";
import { useState, useEffect } from "react";
import { DownloadIcon, Loader2, CodeIcon, MonitorPlayIcon, RefreshCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/server/lib/utils";

import { Hint } from "@/client/components/hint";
import { Fragment } from "@/server/generated/prisma";
import { Button } from "@/client/components/ui/button";

interface Props {
  data: Fragment;
  projectId: string;
}

export function FragmentWeb({ data, projectId }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [sandboxUrl, setSandboxUrl] = useState("");
  const [sandboxId, setSandboxId] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isError, setIsError] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  const files = (data.files as Record<string, string>) || {};
  const filePaths = Object.keys(files);
  const [selectedFile, setSelectedFile] = useState<string>(filePaths[0] || "");

  const provisionSandbox = async () => {
    if (filePaths.length === 0) return;
    setIsProvisioning(true);
    setIsError(false);
    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragmentId: data.id }),
      });

      if (!res.ok) {
        let errMsg = "Failed to provision E2B sandbox";
        try {
          const errData = await res.json();
          if (errData.error) errMsg = errData.error;
        } catch (e) {
          /* ignore */
        }
        throw new Error(errMsg);
      }

      const json = await res.json();

      setSandboxUrl(json.url);
      setSandboxId(json.sandboxId);
      setActiveTab("preview");
      toast.success("Cloud environment deployed!");
      setIsProvisioning(false);
    } catch {
      setIsError(true);
      setSandboxUrl("");
      toast.error("Preview failed. Please regenerate.");
      setIsProvisioning(false);
    }
  };

  useEffect(() => {
    if (filePaths.length > 0 && !sandboxUrl && !isProvisioning && !isError) {
      provisionSandbox();
    }
  }, [data.id, files, filePaths.length, sandboxUrl, isProvisioning, isError]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sandboxUrl && !isProvisioning && !isError) {
      interval = setInterval(async () => {
        try {
          await fetch(sandboxUrl, { method: "HEAD", mode: 'no-cors' });
        } catch {
          setSandboxUrl("");
        }
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [sandboxUrl, isProvisioning, isError]);

  useEffect(() => {
    return () => {
      if (sandboxId) {
        fetch("/api/sandbox", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sandboxId }),
          keepalive: true,
        }).catch(() => { });
      }
    };
  }, [sandboxId]);

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      const zip = new JSZip();

      Object.entries(files).forEach(([path, content]) => {
        const filePath = path.replace(/^\//, "");
        zip.file(filePath, content);
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nextjs-app.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download project");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#0A0A0A] text-white p-4 overflow-hidden">
      <div className="flex-1 w-full bg-[#111111] border border-[#1F1F1F] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
        <div className="p-3 border-b border-[#1F1F1F] bg-[#0A0A0A]/50 backdrop-blur-sm flex items-center justify-between gap-x-2">
          <div className="flex bg-[#1A1A1A] p-1 rounded-xl border border-[#1F1F1F]">
            <Button
              size="sm"
              variant={activeTab === "preview" ? "default" : "ghost"}
              className={cn(
                "rounded-lg transition-all",
                activeTab === "preview" ? "bg-[#00FF88] text-black hover:bg-[#00cc6a] shadow-[0_0_15px_rgba(0,255,136,0.3)] font-semibold" : "text-[#A0A0A0] hover:text-white"
              )}
              onClick={() => setActiveTab("preview")}
            >
              <MonitorPlayIcon className="w-4 h-4 mr-2" />
              Live Preview
            </Button>
            <Button
              size="sm"
              variant={activeTab === "code" ? "default" : "ghost"}
              className={cn(
                "rounded-lg transition-all",
                activeTab === "code" ? "bg-[#333333] text-white shadow-md font-semibold" : "text-[#A0A0A0] hover:text-white"
              )}
              onClick={() => setActiveTab("code")}
            >
              <CodeIcon className="w-4 h-4 mr-2" />
              Code
            </Button>
          </div>

          <div className="flex items-center gap-x-2">
            {activeTab === "preview" && (
              <Hint text="Reboot the E2B Cloud Server" side="bottom" align="end">
                <Button
                  size="sm"
                  className="border border-[#1F1F1F] bg-[#1A1A1A] hover:bg-[#222222] text-[#A0A0A0] hover:text-white transition-all rounded-lg"
                  onClick={provisionSandbox}
                  disabled={isProvisioning || filePaths.length === 0}
                >
                  <RefreshCcwIcon className={`w-4 h-4 mr-2 ${isProvisioning ? "animate-spin text-[#00FF88]" : ""}`} />
                  Restart Server
                </Button>
              </Hint>
            )}

            <Hint text="Open Live Site in Full Screen" side="bottom" align="end">
              <Button
                size="sm"
                className="border border-[#00FF88]/50 bg-[#00FF88]/10 hover:bg-[#00FF88]/20 text-[#00FF88] transition-all rounded-lg ml-2"
                onClick={() => sandboxUrl ? window.open(sandboxUrl, "_blank") : window.open(`/preview/${projectId}`, "_blank")}
                disabled={(!sandboxUrl && !projectId) || isProvisioning || isError}
              >
                <MonitorPlayIcon className="w-4 h-4 mr-2" />
                Full Preview
              </Button>
            </Hint>

            <Hint text="Download Next.js Project (ZIP)" side="bottom" align="end">
              <Button
                size="sm"
                className="border border-[#1F1F1F] bg-[#1A1A1A] hover:bg-[#222222] text-[#A0A0A0] hover:text-white transition-all rounded-lg"
                onClick={handleDownloadZip}
                disabled={downloading || filePaths.length === 0}
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                {downloading ? "Zipping..." : "Export"}
              </Button>
            </Hint>
          </div>
        </div>

        <div className="flex-1 w-full relative flex overflow-hidden bg-[#0a0a0a]">
          {activeTab === "preview" ? (
            <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
              {isProvisioning ? (
                <div className="flex flex-col items-center gap-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#00FF88] blur-xl opacity-20 rounded-full animate-pulse" />
                    <Loader2 className="w-12 h-12 animate-spin text-[#00FF88] relative z-10" />
                  </div>
                  <p className="text-[#A0A0A0] font-mono text-sm tracking-widest uppercase animate-pulse">Booting Cloud Instance...</p>
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center gap-y-4 max-w-md text-center p-8 border border-red-500/20 bg-red-500/5 rounded-2xl">
                  <p className="text-red-400 font-mono text-sm">Failed to connect to the cloud engine.</p>
                  <Button className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50 transition-all rounded-xl" onClick={provisionSandbox}>
                    Retry Connection
                  </Button>
                </div>
              ) : sandboxUrl ? (
                <iframe
                  src={sandboxUrl}
                  className="w-full h-full border-none bg-white rounded-b-xl"
                  title="Live Application Preview"
                  allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#A0A0A0] gap-4">
                  <MonitorPlayIcon className="w-16 h-16 opacity-20 mb-2" />
                  <p className="font-mono text-sm uppercase tracking-widest">No preview available</p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex bg-[#0A0A0A] text-[#D4D4D4] font-mono text-sm">
              <div className="w-64 border-r border-[#1F1F1F] overflow-y-auto bg-[#111111] shrink-0 custom-scrollbar">
                <div className="p-4 text-xs font-bold text-[#666666] tracking-widest uppercase border-b border-[#1F1F1F]">Project Files</div>
                <div className="py-2">
                  {filePaths.map((path) => (
                    <div
                      key={path}
                      className={cn(
                        "px-4 py-2.5 cursor-pointer border-l-2 truncate transition-all",
                        selectedFile === path
                          ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]"
                          : "border-transparent hover:bg-[#1A1A1A] text-[#A0A0A0] hover:text-white"
                      )}
                      onClick={() => setSelectedFile(path)}
                      title={path}
                    >
                      {path}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 p-6 overflow-auto bg-[#0a0a0a] custom-scrollbar">
                <pre className="text-[13px] leading-relaxed">
                  <code>{files[selectedFile] || "// No code available"}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
