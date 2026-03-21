/**
 * Programmatic post-processing to fix common AI-generated code issues
 * that prevent Next.js apps from rendering.
 */

const CLIENT_HOOKS = [
  "useState",
  "useEffect",
  "useRef",
  "useCallback",
  "useMemo",
  "useReducer",
  "useContext",
  "useLayoutEffect",
];

const CLIENT_EVENTS = [
  "onClick",
  "onChange",
  "onSubmit",
  "onInput",
  "onKeyDown",
  "onKeyUp",
  "onKeyPress",
  "onFocus",
  "onBlur",
  "onMouseEnter",
  "onMouseLeave",
  "onScroll",
  "onDrag",
  "onDrop",
];

const BROWSER_APIS = ["window.", "document.", "localStorage.", "sessionStorage.", "navigator."];

/**
 * Run all programmatic fixes on the generated files.
 */
export function fixGeneratedFiles(files: Record<string, string>): Record<string, string> {
  let fixed = { ...files };

  fixed = ensureUseClientDirectives(fixed);
  fixed = fixMissingImportedComponents(fixed);
  fixed = ensureLayoutStructure(fixed);
  fixed = ensureGlobalsCss(fixed);
  fixed = fixPackageJsonDeps(fixed);
  fixed = fixCommonSyntaxIssues(fixed);

  return fixed;
}

/**
 * Add "use client" to files that use hooks, event handlers, or browser APIs.
 */
function ensureUseClientDirectives(files: Record<string, string>): Record<string, string> {
  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith(".tsx") && !path.endsWith(".jsx") && !path.endsWith(".ts") && !path.endsWith(".js")) continue;
    if (path.includes("layout") && path.startsWith("app/")) continue; // layout should stay server
    if (content.trimStart().startsWith('"use client"') || content.trimStart().startsWith("'use client'")) continue;

    const needsClient =
      CLIENT_HOOKS.some((hook) => new RegExp(`\\b${hook}\\s*\\(`).test(content)) ||
      CLIENT_EVENTS.some((evt) => content.includes(evt)) ||
      BROWSER_APIS.some((api) => content.includes(api));

    if (needsClient) {
      files[path] = `"use client";\n\n${content}`;
    }
  }
  return files;
}

/**
 * Find imports that reference files not in the project and generate stubs.
 */
function fixMissingImportedComponents(files: Record<string, string>): Record<string, string> {
  const filePaths = new Set(Object.keys(files));

  // Collect all aliased imports like @/components/X or @/lib/X
  const aliasImportRegex = /import\s+(?:(?:\{[^}]*\})|(?:\w+))\s+from\s+["']@\/([^"']+)["']/g;

  for (const content of Object.values(files)) {
    let match;
    while ((match = aliasImportRegex.exec(content)) !== null) {
      const importPath = match[1]; // e.g. "components/Hero"

      // Try common extensions
      const candidates = [
        `${importPath}.tsx`,
        `${importPath}.ts`,
        `${importPath}.jsx`,
        `${importPath}.js`,
        `${importPath}/index.tsx`,
        `${importPath}/index.ts`,
      ];

      const exists = candidates.some((c) => filePaths.has(c));
      if (!exists) {
        // Extract component name from the path
        const segments = importPath.split("/");
        const fileName = segments[segments.length - 1];
        const componentName = fileName.charAt(0).toUpperCase() + fileName.slice(1);

        // Check what's being imported (default vs named)
        const fullImportRegex = new RegExp(
          `import\\s+(?:(?:\\{([^}]*)\\})|(\\w+))\\s+from\\s+["']@/${importPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`
        );
        const importMatch = content.match(fullImportRegex);

        let stubContent: string;
        if (importMatch?.[1]) {
          // Named exports: import { X, Y } from '...'
          const names = importMatch[1].split(",").map((n) => n.trim().split(" as ")[0].trim()).filter(Boolean);
          const exports = names
            .map((name) => `export function ${name}({ children, ...props }: any) {\n  return <div {...props}>{children}</div>;\n}`)
            .join("\n\n");
          stubContent = exports;
        } else {
          // Default export
          stubContent = `export default function ${componentName}({ children, ...props }: any) {\n  return <div {...props}>{children}</div>;\n}`;
        }

        const stubPath = `${importPath}.tsx`;
        files[stubPath] = stubContent;
        filePaths.add(stubPath);
      }
    }
  }

  return files;
}

/**
 * Ensure app/layout.tsx has valid structure with html, body, and children.
 */
function ensureLayoutStructure(files: Record<string, string>): Record<string, string> {
  const layoutPath = Object.keys(files).find(
    (p) => p === "app/layout.tsx" || p === "app/layout.jsx" || p === "app/layout.js"
  );

  if (!layoutPath) {
    // No layout at all — create one
    files["app/layout.tsx"] = `import "./globals.css";

export const metadata = {
  title: "App",
  description: "Generated App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;
    return files;
  }

  const content = files[layoutPath];

  // Check if it has the minimum required elements
  const hasHtml = content.includes("<html");
  const hasBody = content.includes("<body");
  const hasChildren = content.includes("{children}") || content.includes("{ children }");

  if (!hasHtml || !hasBody || !hasChildren) {
    // Replace with a safe layout that imports globals.css
    files[layoutPath] = `import "./globals.css";

export const metadata = {
  title: "App",
  description: "Generated App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;
  } else if (!content.includes("globals.css") && !content.includes("global.css")) {
    // Has structure but missing CSS import — prepend it
    const importLine = `import "./globals.css";\n`;
    if (content.trimStart().startsWith('"use client"') || content.trimStart().startsWith("'use client'")) {
      const firstNewline = content.indexOf("\n");
      files[layoutPath] = content.slice(0, firstNewline + 1) + importLine + content.slice(firstNewline + 1);
    } else {
      files[layoutPath] = importLine + content;
    }
  }

  return files;
}

/**
 * Ensure globals.css exists with Tailwind v3 directives.
 */
function ensureGlobalsCss(files: Record<string, string>): Record<string, string> {
  const cssPath = Object.keys(files).find(
    (p) => p.endsWith("globals.css") || p.endsWith("global.css")
  );

  if (!cssPath) {
    files["app/globals.css"] = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
  } else {
    const content = files[cssPath];
    const hasTailwind = content.includes("@tailwind") || content.includes("@import");
    if (!hasTailwind) {
      files[cssPath] = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n${content}`;
    }
  }

  return files;
}

/**
 * Ensure package.json has required dependencies.
 */
function fixPackageJsonDeps(files: Record<string, string>): Record<string, string> {
  if (!files["package.json"]) return files;

  try {
    const pkg = JSON.parse(files["package.json"]);
    if (!pkg.dependencies) pkg.dependencies = {};

    const required: Record<string, string> = {
      next: "latest",
      react: "^18.2.0",
      "react-dom": "^18.2.0",
    };

    for (const [dep, version] of Object.entries(required)) {
      if (!pkg.dependencies[dep]) {
        pkg.dependencies[dep] = version;
      }
    }

    if (!pkg.scripts) pkg.scripts = {};
    if (!pkg.scripts.dev) pkg.scripts.dev = "next dev";

    files["package.json"] = JSON.stringify(pkg, null, 2);
  } catch {
    // If package.json is malformed, replace it entirely
    files["package.json"] = JSON.stringify(
      {
        name: "generated-app",
        dependencies: {
          next: "latest",
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "lucide-react": "latest",
          tailwindcss: "^3.4.1",
          postcss: "^8.4.31",
          autoprefixer: "^10.4.19",
        },
        scripts: { dev: "next dev" },
      },
      null,
      2
    );
  }

  return files;
}

/**
 * Fix common syntax issues that break rendering.
 */
function fixCommonSyntaxIssues(files: Record<string, string>): Record<string, string> {
  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith(".tsx") && !path.endsWith(".jsx")) continue;

    let fixed = content;

    // Fix: className={`...`} with unescaped backticks inside strings (common Gemini mistake)
    // Fix: Unmatched JSX self-closing tags missing the slash
    // Fix: <img> tags without self-closing in JSX
    fixed = fixed.replace(/<img(\s[^>]*?)(?<!\/)>/g, "<img$1 />");
    fixed = fixed.replace(/<br(\s[^>]*?)(?<!\/)>/g, "<br$1 />");
    fixed = fixed.replace(/<hr(\s[^>]*?)(?<!\/)>/g, "<hr$1 />");
    fixed = fixed.replace(/<input(\s[^>]*?)(?<!\/)>/g, "<input$1 />");

    // Fix: export default with missing function body — check for empty export default
    // Fix: Double "use client" directives
    const useClientCount = (fixed.match(/["']use client["'];?/g) || []).length;
    if (useClientCount > 1) {
      let firstFound = false;
      fixed = fixed.replace(/["']use client["'];?\n?/g, (match) => {
        if (!firstFound) {
          firstFound = true;
          return match;
        }
        return "";
      });
    }

    if (fixed !== content) {
      files[path] = fixed;
    }
  }

  return files;
}

/**
 * Collect structural issues for logging/debugging.
 */
export function detectIssues(files: Record<string, string>): string[] {
  const issues: string[] = [];
  const filePaths = new Set(Object.keys(files));

  if (!files["package.json"]) issues.push("Missing package.json");
  if (!Object.keys(files).some((p) => p.endsWith("page.tsx") || p.endsWith("page.jsx") || p.endsWith("page.js")))
    issues.push("Missing app/page.tsx");
  if (!Object.keys(files).some((p) => p.endsWith("layout.tsx") || p.endsWith("layout.jsx") || p.endsWith("layout.js")))
    issues.push("Missing app/layout.tsx");

  // Check for imports referencing non-existent files
  const aliasImportRegex = /import\s+(?:(?:\{[^}]*\})|(?:\w+))\s+from\s+["']@\/([^"']+)["']/g;
  for (const [filePath, content] of Object.entries(files)) {
    let match;
    while ((match = aliasImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      const candidates = [
        `${importPath}.tsx`, `${importPath}.ts`, `${importPath}.jsx`, `${importPath}.js`,
        `${importPath}/index.tsx`, `${importPath}/index.ts`,
      ];
      if (!candidates.some((c) => filePaths.has(c))) {
        issues.push(`${filePath}: imports @/${importPath} but file not found`);
      }
    }
  }

  return issues;
}
