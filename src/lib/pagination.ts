export type PaginationQuery = {
  page: number;
  limit: number;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: totalPages > 0 && page < totalPages,
    hasPrev: page > 1 && totalPages > 0,
  };
}

/** Helper generic untuk pagination query apa pun agar Dev A/B/C pakai pola meta yang sama. */
export async function paginate<T>(
  query: PaginationQuery,
  fetchRows: (skip: number, take: number) => Promise<T[]>,
  countRows: () => Promise<number>,
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([fetchRows(skip, query.limit), countRows()]);
  return {
    data,
    meta: buildPaginationMeta(total, query.page, query.limit),
  };
}
