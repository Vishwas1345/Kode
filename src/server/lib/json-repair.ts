import { jsonrepair } from "jsonrepair";

/**
 * Extracts and parses JSON from raw AI output text.
 * Applies multiple repair strategies if standard parsing fails.
 * Returns { data, wasRepaired } or throws if all strategies fail.
 */
export function parseAIJsonOutput(text: string): {
  data: unknown;
  wasRepaired: boolean;
} {
  // Strip markdown fences and find outermost brackets
  let cleanText = "";
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    cleanText = arrayMatch[0];
  } else {
    const objMatch = text.match(/\{[\s\S]*\}/);
    cleanText = objMatch ? objMatch[0] : text;
  }

  cleanText = cleanText.replace(/^\`\`\`[a-zA-Z]*\n?/, "");
  cleanText = cleanText.replace(/\n?\`\`\`$/, "");
  cleanText = cleanText.trim();

  // Strategy 1: Direct parse
  try {
    return { data: JSON.parse(cleanText), wasRepaired: false };
  } catch {
    // continue
  }

  // Strategy 2: jsonrepair
  try {
    const repaired = jsonrepair(cleanText);
    return { data: JSON.parse(repaired), wasRepaired: true };
  } catch {
    // continue
  }

  // Strategy 3: Strip control characters then jsonrepair
  let superClean = cleanText.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  superClean = superClean
    .replace(/\\"/g, '"')
    .replace(/"/g, '\\"')
    .replace(/\\\\"/g, '\\"');

  try {
    const repaired = jsonrepair(superClean);
    return { data: JSON.parse(repaired), wasRepaired: true };
  } catch {
    throw new Error("All JSON repair strategies failed.");
  }
}
