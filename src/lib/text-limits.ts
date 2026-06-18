export const TEXT_LIMITS = {
  longText: 2000,
  mediumText: 1200,
};

export const LONG_TEXT_LIMIT_HINT = "Max 2,000 characters.";

export function limitText(value: string, maxLength = TEXT_LIMITS.longText) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
