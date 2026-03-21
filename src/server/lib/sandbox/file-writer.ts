import type { Sandbox } from "@e2b/code-interpreter";
import {
  patchPackageJsonForTailwindV3,
  patchCssForTailwindV3,
} from "./tailwind-patch";

/**
 * Ensures default configs exist for Tailwind v3 if not provided by the AI.
 */
export function ensureDefaultConfigs(
  files: Record<string, string>
): Record<string, string> {
  if (
    !files["postcss.config.js"] &&
    !files["postcss.config.mjs"] &&
    !files["postcss.config.cjs"]
  ) {
    files["postcss.config.mjs"] =
      `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};`;
  }

  if (
    !files["tailwind.config.js"] &&
    !files["tailwind.config.ts"] &&
    !files["tailwind.config.mjs"] &&
    !files["tailwind.config.cjs"]
  ) {
    files["tailwind.config.ts"] =
      `import type { Config } from "tailwindcss";\n\nconst config: Config = {\n  content: [\n    "./pages/**/*.{js,ts,jsx,tsx,mdx}",\n    "./components/**/*.{js,ts,jsx,tsx,mdx}",\n    "./app/**/*.{js,ts,jsx,tsx,mdx}",\n  ],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n};\nexport default config;`;
  }

  if (!files["tsconfig.json"]) {
    files["tsconfig.json"] = JSON.stringify(
      {
        compilerOptions: {
          target: "es5",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: [
          "next-env.d.ts",
          "**/*.ts",
          "**/*.tsx",
          ".next/types/**/*.ts",
        ],
        exclude: ["node_modules"],
      },
      null,
      2
    );
  }

  return files;
}

/**
 * Writes all files to the sandbox, applying Tailwind v3 patches as needed.
 */
export async function writeFilesToSandbox(
  sandbox: Sandbox,
  files: Record<string, string>
): Promise<void> {
  for (let [filePath, content] of Object.entries(files)) {
    if (filePath === "package.json") {
      content = patchPackageJsonForTailwindV3(content);
    }

    if (filePath.endsWith("globals.css") || filePath.endsWith("global.css")) {
      content = patchCssForTailwindV3(content);
    }

    const cleanPath = filePath.replace(/^\//, "");
    const parts = cleanPath.split("/");
    const dir = parts.slice(0, -1).join("/");
    if (dir) {
      await sandbox.commands.run(`mkdir -p ${dir}`);
    }
    await sandbox.files.write(cleanPath, content);
  }
}
