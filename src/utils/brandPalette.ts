/** Brand-safe category colors. Existing saved colors are preserved in data but normalized in the UI. */
export const BRAND_CATEGORY_PALETTE = [
  '#FF7900',
  '#E86F00',
  '#FF9A3D',
  '#C65E00',
  '#FFB36B',
  '#F97316',
] as const;

export function getBrandCategoryColor(categoryId: string, savedColor?: string): string {
  const normalized = savedColor?.toUpperCase();
  if (normalized && (BRAND_CATEGORY_PALETTE as readonly string[]).includes(normalized)) {
    return normalized;
  }
  let hash = 0;
  for (let index = 0; index < categoryId.length; index += 1) {
    hash = (hash * 31 + categoryId.charCodeAt(index)) | 0;
  }
  return BRAND_CATEGORY_PALETTE[Math.abs(hash) % BRAND_CATEGORY_PALETTE.length];
}
