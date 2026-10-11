import { z } from 'zod';
import { PubkeySchema } from '../pubkey.js';

export const MallAssetSchema = z.enum(['USDC', 'W4']);
export const MallRawSchema = z.string().regex(/^(0|[1-9][0-9]{0,59})$/);
const positive = MallRawSchema.refine(value => BigInt(value) > 0n, 'Positive raw amount required');
export const MallPolicySchema = z.object({
  buy: z.boolean(), sell: z.boolean(),
  limits: z.object({ USDC: z.object({ perOrder: MallRawSchema, daily: MallRawSchema }),
    W4: z.object({ perOrder: MallRawSchema, daily: MallRawSchema }) }).strict(),
}).strict();
export const MallListingInputSchema = z.object({
  title: z.string().trim().min(3).max(100), description: z.string().trim().min(10).max(2000),
  category: z.enum(['digital', 'gift_card']), asset: MallAssetSchema, priceRaw: positive,
  region: z.string().trim().min(2).max(80), refundTerms: z.string().trim().min(10).max(1000),
  inventory: z.array(z.string().min(1).max(4000)).min(1).max(20),
}).strict();
export const MallListingSchema = MallListingInputSchema.omit({ inventory: true }).extend({
  id: z.string().uuid(), seller: PubkeySchema, available: z.number().int().nonnegative(),
  status: z.enum(['active', 'closed']), sellerApproval: z.enum(['not_required', 'administrator_approved']),
  settlement: z.literal('local_simulation'),
});
export const MallListingCreateSchema = MallListingInputSchema.extend({ idempotencyKey: z.string().min(8).max(100) }).strict();
export const MallCapabilitiesSchema = z.object({
  agent: PubkeySchema, owner: PubkeySchema, policy: MallPolicySchema,
  giftCardSellerApproved: z.boolean(), usageDate: z.string(),
  usage: z.object({ USDC: z.object({ spentRaw: MallRawSchema, remainingRaw: MallRawSchema }),
    W4: z.object({ spentRaw: MallRawSchema, remainingRaw: MallRawSchema }) }),
  settlement: z.literal('local_simulation'),
});
export const MallOrderSchema = z.object({ id: z.string().uuid(), listingId: z.string().uuid(),
  buyer: PubkeySchema, buyerOwner: PubkeySchema, seller: PubkeySchema, sellerOwner: PubkeySchema,
  asset: MallAssetSchema, amountRaw: positive, createdAt: z.string().datetime(),
  status: z.enum(['pending', 'accepted', 'disputed', 'refunded', 'resolved_seller']),
  deliveryRead: z.boolean(), settlement: z.literal('local_simulation'),
});
export const MallWithdrawalSchema = z.object({ id: z.string().uuid(), owner: PubkeySchema,
  recipient: PubkeySchema, asset: MallAssetSchema, amountRaw: positive,
  status: z.enum(['reserved', 'completed', 'failed']), createdAt: z.string().datetime(),
  settlement: z.literal('local_simulation'),
});
export const MallPurchaseSchema = z.object({ listingId: z.string().uuid(), idempotencyKey: z.string().min(8).max(100) }).strict();
export const MallWithdrawalInputSchema = z.object({ asset: MallAssetSchema, amountRaw: positive,
  idempotencyKey: z.string().min(8).max(100) }).strict();
export const MallCreditSchema = MallWithdrawalInputSchema.extend({ owner: PubkeySchema }).strict();
export const MallAccountSchema = z.object({ owner: PubkeySchema,
  balances: z.object({ USDC: z.object({ available: MallRawSchema, reserved: MallRawSchema, pending: MallRawSchema }),
    W4: z.object({ available: MallRawSchema, reserved: MallRawSchema, pending: MallRawSchema }) }),
  settlement: z.literal('local_simulation'),
});
export type MallAsset = z.infer<typeof MallAssetSchema>;
