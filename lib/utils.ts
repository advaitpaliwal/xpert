import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Attempts to fix common malformed JSON issues returned by models (extra text, missing braces).
// Returns the parsed object when successful, or null when it cannot be fixed.
export function tryFixAndParseJsonFromError<T>(error: unknown): T | null {
  const rawText: unknown =
    typeof error === "object" && error !== null
      ? (error as { cause?: { text?: unknown }; text?: unknown }).cause?.text ??
        (error as { text?: unknown }).text
      : undefined;
  if (typeof rawText !== "string") return null;

  let text = rawText.trim();

  // Remove code fences if present.
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }

  // Keep only the portion starting at the first brace/bracket.
  const firstBrace = text.search(/[\{\[]/);
  if (firstBrace > 0) {
    text = text.slice(firstBrace);
  }

  // Trim anything after the last closing brace/bracket.
  const lastClosing = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (lastClosing > -1) {
    text = text.slice(0, lastClosing + 1);
  }

  // Balance braces/brackets by appending missing closing symbols.
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const balance = (open: string, close: string, value: string) => {
    const opens = (value.match(new RegExp(escape(open), "g")) || []).length;
    const closes = (value.match(new RegExp(escape(close), "g")) || []).length;
    return opens > closes ? value + close.repeat(opens - closes) : value;
  };

  text = balance("{", "}", text);
  text = balance("[", "]", text);

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
