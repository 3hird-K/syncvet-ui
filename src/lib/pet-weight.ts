/**
 * Robust weight extractor from database weight_category column.
 * Accurately parses explicit weights like "12.4 kg", "4.5", "5 kg" as well as
 * standard municipal weight category brackets.
 */
export function parsePetWeightKg(raw: any, species?: string): number {
  if (typeof raw === "number" && !isNaN(raw) && raw > 0) return raw;
  if (!raw) return species?.toLowerCase() === "cat" ? 4.5 : 12.4;
  const str = String(raw).trim();

  // Direct number or number with kg (e.g. "12.4", "12.4 kg", "4.5kg")
  const directMatch = str.match(/^([\d.]+)\s*(kg)?$/i);
  if (directMatch) {
    const val = parseFloat(directMatch[1]);
    if (!isNaN(val) && val > 0) return val;
  }

  // Standard municipal category brackets
  const lower = str.toLowerCase();
  if (lower.includes("toy") || lower.includes("small") || lower.includes("< 10")) return 4.5;
  if (lower.includes("giant") || lower.includes("> 45")) return 48;
  if (lower.includes("large") || lower.includes("> 25")) return 28;
  if (lower.includes("medium") || lower.includes("10 – 25") || lower.includes("10-25")) return 14;

  // Search for first number in string
  const match = str.match(/([\d.]+)/);
  if (match) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0) return val;
  }

  return species?.toLowerCase() === "cat" ? 4.5 : 12.4;
}
