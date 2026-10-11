/** Converts a "YYYY-MM-DD" string (already validated by Zod) into a Date at UTC midnight. */
export const toDate = (isoDate: string): Date => 
    new Date(`${isoDate}T00:00:00.000Z`);

/**
 * Escapes characters that have a special meaning in regular expressions so that user input
 * can be used safely inside a MongoDB $regex filter (prevents regex injection).
 */
export const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds the pagination values used by every list endpoint. */
export const paginate = (page: number, limit: number) => ({
  skip: (page - 1) * limit,
  limit,
});

/** Turns "-amount" into { amount: -1 } and "date" into { date: 1 } for Mongoose .sort(). */
export const buildSort = (sort: string): Record<string, 1 | -1> =>
  sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 };

/** Turns ["name", "email"] into "name email" for Mongoose .select(). No fields means "everything". */
export const buildSelect = (fields?: string[]): string => (fields ? fields.join(' ') : '');

/** Shape of every list response: the items plus paging information. */
export const listResponse = <T>(data: T[], page: number, limit: number, total: number) => ({
  data,
  meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
});