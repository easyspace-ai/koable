import { z } from "zod";

/** Shared pagination metadata returned by list endpoints. */
export const paginationSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export type PaginationMeta = z.infer<typeof paginationSchema>;

export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: paginationSchema,
  });
}
