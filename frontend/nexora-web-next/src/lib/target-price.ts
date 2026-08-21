const NUMERIC_TARGET_PRICE = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;

export function normalizeTargetPriceInput(input: string): string | null {
  let normalized = input.trim();

  if (!normalized) return null;
  if (normalized.toUpperCase() === "FREE") return "FREE";

  const hasLeadingDollar = normalized.startsWith("$");
  const hasTrailingDollar = normalized.endsWith("$");
  if (hasLeadingDollar && hasTrailingDollar) return null;

  if (hasLeadingDollar) {
    normalized = normalized.slice(1);
  } else if (hasTrailingDollar) {
    normalized = normalized.slice(0, -1);
  }

  if (!NUMERIC_TARGET_PRICE.test(normalized)) return null;

  const [wholePart, fractionPart = ""] = normalized.replace(/,/g, "").split(".");
  const wholeWithoutLeadingZeros = wholePart.replace(/^0+(?=\d)/, "");
  const groupedWhole = wholeWithoutLeadingZeros.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `$${groupedWhole}.${fractionPart.padEnd(2, "0")}`;
}
