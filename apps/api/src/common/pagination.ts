/** HTTP query'den gelen page/limit değerlerini güvenli sayıya çevirir. */
export function parsePagination(
  query: { page?: number | string; limit?: number | string } | undefined,
  defaults: { page?: number; limit?: number } = {},
): { page: number; limit: number; skip: number } {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 50;

  const page = Math.max(1, Number(query?.page) || defaultPage);
  const limit = Math.min(500, Math.max(1, Number(query?.limit) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
