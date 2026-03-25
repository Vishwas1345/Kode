import { Sandbox } from "@e2b/code-interpreter";
import { prisma } from "@/server/db";
import { ensureDefaultConfigs, writeFilesToSandbox } from "./file-writer";
import { fixGeneratedFiles } from "./code-fixer";

const MAX_ATTEMPTS = 3;
const SANDBOX_TIMEOUT_MS = 3600000; // 1 hour
const INSTALL_TIMEOUT_MS = 300000; // 5 min
const BUILD_TIMEOUT_MS = 300000; // 5 min
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 40; // ~60 seconds

interface SandboxResult {
  url: string;
  sandboxId: string;
}

function detectIsNextJs(files: Record<string, string>): boolean {
  return !!(
    files["next.config.mjs"] ||
    files["next.config.js"] ||
    files["next.config.ts"] ||
    (files["package.json"] && files["package.json"].includes('"next":'))
  );
}

async function installDependencies(
  sandbox: Sandbox,
  attempt: number
): Promise<void> {
  console.log(`[Attempt ${attempt}] Installing dependencies...`);
  const installResult = await sandbox.commands.run(
    "npm install --legacy-peer-deps --no-audit --no-fund",
    { timeoutMs: INSTALL_TIMEOUT_MS }
  );
  console.log(`[Attempt ${attempt}] Install stdout:`, installResult.stdout);
  if (installResult.stderr) {
    console.warn(
      `[Attempt ${attempt}] Install stderr (warnings):`,
      installResult.stderr
    );
  }
}

async function startServer(
  sandbox: Sandbox,
  isNextJs: boolean,
  attempt: number
): Promise<void> {
  if (isNextJs) {
    console.log(`[Attempt ${attempt}] Starting Next.js Dev server...`);
    await sandbox.commands.run("npx next dev -p 3000 -H 0.0.0.0", {
      background: true,
    });
  } else {
    console.log(`[Attempt ${attempt}] Starting React/Vite dev server...`);
    await sandbox.commands.run("npm run dev", { background: true });
  }
}

async function waitForServer(
  sandboxUrl: string,
  attempt: number
): Promise<boolean> {
  console.log(
    `[Attempt ${attempt}] Waiting for server to be ready on port 3000...`
  );
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    try {
      const res = await fetch(sandboxUrl, {
        method: "HEAD",
        mode: "no-cors",
      });
      if (res.status !== 502) {
        return true;
      }
    } catch {
      // Ignore, keep polling
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return false;
}

export async function createSandbox(
  fragmentId: string,
  e2bApiKey: string
): Promise<SandboxResult> {
  const fragment = await prisma.fragment.findUnique({
    where: { id: fragmentId },
  });

  if (!fragment || !fragment.files) {
    throw new Error("Fragment not found");
  }

  let files = fragment.files as Record<string, string>;
  // Apply programmatic fixes before sandbox creation
  files = fixGeneratedFiles(files);
  const isNextJs = detectIsNextJs(files);
  files = ensureDefaultConfigs(files);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let sandbox: Sandbox | null = null;
    try {
      console.log(
        `[Attempt ${attempt}/${MAX_ATTEMPTS}] Creating E2B sandbox...`
      );
      sandbox = await Sandbox.create({
        apiKey: e2bApiKey,
        timeoutMs: SANDBOX_TIMEOUT_MS,
      });

      console.log(`[Attempt ${attempt}] Writing files to sandbox...`);
      await writeFilesToSandbox(sandbox, files);
      await installDependencies(sandbox, attempt);
      await startServer(sandbox, isNextJs, attempt);

      const sandboxUrl = `https://${sandbox.getHost(3000)}`;
      console.log(`[Attempt ${attempt}] Sandbox URL:`, sandboxUrl);

      const isReady = await waitForServer(sandboxUrl, attempt);

      if (!isReady) {
        throw new Error(
          "Sandbox server failed to start within the timeout period."
        );
      }

      // Extra second for proxy stabilization
      await new Promise((r) => setTimeout(r, 1000));

      await prisma.fragment.update({
        where: { id: fragmentId },
        data: { sandboxUrl },
      });

      return { url: sandboxUrl, sandboxId: sandbox.sandboxId };
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (sandbox) {
        try {
          await sandbox.kill();
        } catch {
          /* ignore */
        }
      }
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error("All sandbox creation attempts failed");
}

export async function killSandbox(sandboxId: string): Promise<void> {
  console.log(`Killing sandbox: ${sandboxId}...`);
  await Sandbox.kill(sandboxId);
}
