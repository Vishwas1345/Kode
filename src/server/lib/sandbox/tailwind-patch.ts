/**
 * Patches Tailwind v4 syntax back to v3 for sandbox compatibility.
 * The AI sometimes generates Tailwind v4 which breaks PostCSS in sandboxes.
 */

export function patchPackageJsonForTailwindV3(content: string): string {
  try {
    const pkg = JSON.parse(content);
    if (pkg.dependencies) {
      pkg.dependencies["tailwindcss"] = "^3.4.1";
      pkg.dependencies["postcss"] = "^8.4.31";
      pkg.dependencies["autoprefixer"] = "^10.4.19";
      delete pkg.dependencies["@tailwindcss/postcss"];
    }
    return JSON.stringify(pkg, null, 2);
  } catch {
    console.warn("Could not patch package.json for Tailwind v3");
    return content;
  }
}

export function patchCssForTailwindV3(content: string): string {
  const hasV4Import =
    content.includes('@import "tailwindcss"') ||
    content.includes("@import 'tailwindcss'");
  const hasV4Syntax =
    content.includes("@utility") ||
    content.includes("@theme") ||
    content.includes("@variant") ||
    content.includes("@source");

  if (!hasV4Import && !hasV4Syntax) {
    return content;
  }

  const safeBlocks = content
    .replace(/@import\s+["'][^"']+["'];?/g, "")
    .replace(/@utility\s+[\w-]+\s*\{[^}]*\}/gs, "")
    .replace(/@theme\s*(?:inline\s*)?\{[\s\S]*?\}\s*\}/gs, "")
    .replace(/@theme\s*(?:inline\s*)?\{[^}]*\}/gs, "")
    .replace(/@variant\s+[^;]+;/g, "")
    .replace(/@source\s+[^;]+;/g, "")
    .trim();

  return `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n${safeBlocks}`;
}
