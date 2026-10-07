import { z } from "zod";

export const ERROR_CODES = [
  "unauthorized", "forbidden", "not_found", "validation",
  "rate_limited", "conflict", "gone", "upstream_unavailable", "internal",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
