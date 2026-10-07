import { z } from "zod";
export const TokenCardSchema = z.object({
  mint: z.string(), symbol: z.string(), name: z.string(), priceUsd: z.number().nullable(),
  marketCapUsd: z.number().nullable(), liquidityUsd: z.number().nullable(), volume24hUsd: z.number().nullable(),
  priceChange24hPct: z.number().nullable(), dexUrl: z.string(), imageUrl: z.string().nullable(), fetchedAt: z.string(),
});
export type TokenCard = z.infer<typeof TokenCardSchema>;
