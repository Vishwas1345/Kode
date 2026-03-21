import { inngest } from "./client";
import { prisma } from "@/server/db";
import { RateLimiterPrisma } from "rate-limiter-flexible";
import { clerkClient } from "@clerk/nextjs/server";
import { ADMIN_CREDITS, PLAN_CREDITS, PLANS, USAGE_DURATION } from "@/shared/constants";
import { GEMINI_SYSTEM_PROMPT, GEMINI_REPAIR_PROMPT, GEMINI_RESPONSE_SCHEMA, GEMINI_MODEL, GEMINI_BASE_URL } from "./prompt";
import { parseAIJsonOutput } from "@/server/lib/json-repair";
import { fixGeneratedFiles, detectIssues } from "@/server/lib/sandbox/code-fixer";

function getGeminiUrl(): string {
  return `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
}

function buildFallbackFile(filePath: string): string {
  const fileName = filePath.split("/").pop() || "";

  if (fileName.includes("layout")) {
    return `import "./globals.css";\nexport default function RootLayout({ children }: { children: React.ReactNode }) { return ( <html lang="en"> <body>{children}</body> </html> ); }`;
  }
  if (fileName.includes("page")) {
    return `export default function Page() { return <div className="p-8 text-red-500 font-mono text-sm">Page Truncated (AI limit reached)</div>; }`;
  }
  if (/\.(tsx|jsx|js|ts)$/.test(filePath)) {
    const componentName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "");
    const safeName = componentName ? componentName.charAt(0).toUpperCase() + componentName.slice(1) : "Component";
    return `export default function ${safeName}() { return <div className="p-4 border-2 border-dashed border-red-500 text-red-500 bg-red-50">${fileName} truncated by AI limits</div>; }`;
  }
  if (filePath.endsWith(".json")) {
    return "{}";
  }
  return "";
}

const ERROR_APP_FILES: Record<string, string> = {
  "package.json": JSON.stringify(
    { name: "error-app", dependencies: { next: "latest", react: "latest", "react-dom": "latest" }, scripts: { dev: "next dev" } },
    null,
    2
  ),
  "app/layout.tsx": `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html>\n      <body>{children}</body>\n    </html>\n  );\n}`,
};

/**
 * Call Gemini to repair broken code using build errors as context.
 */
async function repairWithGemini(
  files: Record<string, string>,
  issues: string[],
  logger: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void }
): Promise<Record<string, string>> {
  const filesSummary = Object.entries(files)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join("\n\n");

  const repairPrompt = GEMINI_REPAIR_PROMPT.replace("{BUILD_ERRORS}", issues.join("\n"));

  try {
    const response = await fetch(getGeminiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: repairPrompt }],
        },
        contents: [
          { parts: [{ text: `Here are the project files to fix:\n\n${filesSummary}` }] },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 65536,
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      }),
    });

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      logger.warn("Gemini repair returned empty response, using original files");
      return files;
    }

    const { data: fileArray } = parseAIJsonOutput(text);
    const repairedFiles: Record<string, string> = {};

    if (Array.isArray(fileArray)) {
      fileArray.forEach((f: { path?: string; content?: string }) => {
        if (f.path && f.content) {
          repairedFiles[f.path] = f.content;
        }
      });
    }

    // Only use repaired files if they have the basics
    const hasPackageJson = !!repairedFiles["package.json"];
    const hasPage = Object.keys(repairedFiles).some(
      (k) => k.endsWith("page.tsx") || k.endsWith("page.js")
    );

    if (Object.keys(repairedFiles).length > 0 && hasPackageJson && hasPage) {
      logger.info("Gemini repair succeeded", { fileCount: Object.keys(repairedFiles).length });
      return repairedFiles;
    }

    logger.warn("Gemini repair output missing required files, using original");
    return files;
  } catch (err) {
    logger.error("Gemini repair call failed", { error: err });
    return files;
  }
}

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, logger }) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: event.data.projectId },
      });

      if (!project) {
        return { error: "Project not found" };
      }

      // Determine credit allowance based on user plan
      let pointsAllowed = PLAN_CREDITS[PLANS.FREE];
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(project.userId);
        const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) ?? [];
        const isAdmin = adminEmails.length > 0 && clerkUser?.emailAddresses?.some(
          (email) => adminEmails.includes(email.emailAddress)
        );
        if (isAdmin) {
          pointsAllowed = ADMIN_CREDITS;
        } else {
          const subscription = await prisma.userSubscription.findUnique({
            where: { userId: project.userId },
          });
          if (subscription?.plan && PLAN_CREDITS[subscription.plan]) {
            pointsAllowed = PLAN_CREDITS[subscription.plan];
          }
        }
      } catch (err) {
        logger.warn("Failed to fetch clerk user, using default credits", { error: err });
      }

      const rateLimiter = new RateLimiterPrisma({
        storeClient: prisma,
        tableName: "Usage",
        points: pointsAllowed,
        duration: USAGE_DURATION,
      });

      const usageRes = await rateLimiter.get(project.userId);
      if (usageRes !== null && usageRes.remainingPoints <= 0) {
        return { error: "No credits" };
      }

      let text = "";
      let parsedFiles: Record<string, string> = {};
      let attempt = 0;
      let isValid = false;

      while (attempt < 2 && !isValid) {
        attempt++;
        const response = await fetch(getGeminiUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: GEMINI_SYSTEM_PROMPT }],
            },
            contents: [
              { parts: [{ text: String(event.data.value) }] },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 65536,
              responseMimeType: "application/json",
              responseSchema: GEMINI_RESPONSE_SCHEMA,
            },
          }),
        });

        const data = await response.json();
        text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (text) {
          try {
            const { data: fileArray, wasRepaired } = parseAIJsonOutput(text);

            if (Array.isArray(fileArray)) {
              fileArray.forEach((f: { path?: string; content?: string }) => {
                if (f.path && f.content) {
                  parsedFiles[f.path] = f.content;
                }
              });
            } else if (typeof fileArray === "object" && fileArray !== null) {
              parsedFiles = fileArray as Record<string, string>;
            }

            // Fix truncated last file if output was cut short
            const finishReason = data?.candidates?.[0]?.finishReason;
            if (finishReason === "MAX_TOKENS" || wasRepaired) {
              const paths = Object.keys(parsedFiles);
              if (paths.length > 0) {
                const lastPath = paths[paths.length - 1];
                logger.warn(`Truncation detected, fixing last file: ${lastPath}`);
                parsedFiles[lastPath] = buildFallbackFile(lastPath);
              }
            }

            const hasPackageJson = !!parsedFiles["package.json"];
            const hasPage = Object.keys(parsedFiles).some(
              (k) => k.endsWith("page.tsx") || k.endsWith("page.js")
            );

            if (Object.keys(parsedFiles).length > 0 && hasPackageJson && hasPage) {
              isValid = true;
            } else {
              logger.error("Missing required Next.js files", { keys: Object.keys(parsedFiles) });
            }
          } catch (e) {
            logger.error("Failed to parse Gemini output as JSON", { error: e });
          }
        } else if (data?.error) {
          logger.error("Gemini API error", { error: data.error });
          text = `API_ERROR: ${data.error.message || "Unknown Gemini API Error"}`;
        }
      }

      if (!isValid) {
        let errorMessage = "Code generation failed: Invalid Next.js output. Please try again.";
        if (text.startsWith("API_ERROR:")) {
          errorMessage = `Gemini API Error: ${text.replace("API_ERROR:", "").trim()} (You may have hit the Free Tier Rate Limit from testing too much!)`;
        }

        parsedFiles = {
          ...ERROR_APP_FILES,
          "app/page.tsx": `export default function App() {\n  return (\n    <div className="p-8 text-red-500 font-mono text-sm">\n      ${errorMessage}\n    </div>\n  );\n}`,
        };
      } else {
        // === STEP 1: Apply programmatic fixes ===
        logger.info("Applying programmatic code fixes...");
        parsedFiles = fixGeneratedFiles(parsedFiles);

        // === STEP 2: Detect remaining structural issues ===
        const issues = detectIssues(parsedFiles);
        if (issues.length > 0) {
          logger.warn("Structural issues detected after programmatic fix", { issues });

          // === STEP 3: Gemini repair pass for unresolved issues ===
          logger.info("Running Gemini repair pass...");
          parsedFiles = await repairWithGemini(parsedFiles, issues, logger);

          // Re-apply programmatic fixes on repaired output
          parsedFiles = fixGeneratedFiles(parsedFiles);
        }

        // Deduct 1 credit ONLY after successful generation
        try {
          await rateLimiter.consume(project.userId, 1);
          await prisma.project.update({
            where: { id: project.id },
            data: { generatedCode: text },
          });
        } catch {
          return { error: "No credits" };
        }
      }

      const message = await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: "Code generated successfully.",
          role: "ASSISTANT",
          type: "RESULT",
        },
      });

      await prisma.fragment.create({
        data: {
          messageId: message.id,
          sandboxUrl: "",
          title: "Next.js App",
          files: parsedFiles,
        },
      });

      return { success: true };
    } catch (error) {
      logger.error("Code agent failed", { error });
      return { error: "An unexpected error occurred during generation." };
    }
  }
);
