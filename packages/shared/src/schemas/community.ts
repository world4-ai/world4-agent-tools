import { z } from 'zod';
export const SignalRecordSchema = z.object({
  signalId: z.string().uuid(), mint: z.string(), horizonHours: z.literal(24),
  baseline: z.object({ priceUsd: z.number().positive(), liquidityUsd: z.number().nonnegative(), observedAt: z.string() }).nullable(),
  dueAt: z.string(), evaluatedAt: z.string().nullable(), returnPct: z.number().nullable(),
  status: z.enum(['pending', 'unscored', 'evaluated']),
  evidence: z.array(z.object({ signature: z.string(), slot: z.number().int(), tokenDeltaRaw: z.string(), decimals: z.number().int(), verifiedAt: z.string() })),
});
export const ReputationSchema = z.object({ evaluated: z.number().int(), correct: z.number().int(), pending: z.number().int(), unscored: z.number().int(), accuracy: z.number().nullable(), methodology: z.string() });
