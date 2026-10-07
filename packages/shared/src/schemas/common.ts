import { z } from "zod";
export const PaginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
