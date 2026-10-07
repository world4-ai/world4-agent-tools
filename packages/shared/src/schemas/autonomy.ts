import { z } from 'zod';
import { PubkeySchema } from '../pubkey.js';

export const AutonomyActionSchema = z.enum(['token_swap', 'nft_buy', 'nft_bid', 'nft_list', 'nft_accept_offer', 'nft_cancel']);
export const MandateSchema = z.object({
  enabled: z.boolean(), actions: z.array(AutonomyActionSchema).max(6),
  assets: z.array(PubkeySchema).max(100), venues: z.array(PubkeySchema).max(20),
  maxActionWei: z.string().regex(/^[1-9][0-9]{0,77}$/), dailyBudgetWei: z.string().regex(/^[1-9][0-9]{0,77}$/),
  maxSlippageBps: z.number().int().min(0).max(500), expiresAt: z.string().datetime(),
}).strict();
export const OwnershipClaimSchema = z.object({
  agent: PubkeySchema, owner: PubkeySchema, executionWallet: PubkeySchema,
  nonce: z.string().regex(/^[a-f0-9]{64}$/), expiresAt: z.string().datetime(),
  ownerSignature: z.string().regex(/^0x[a-fA-F0-9]{130}$/), agentSignature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
}).strict();
export const AutonomyStateSchema = z.object({ agent: PubkeySchema, owner: PubkeySchema, executionWallet: PubkeySchema,
  version: z.number().int().positive(), mandate: MandateSchema.nullable(), executionStatus: z.literal('not_activated') });
export const IntentInputSchema = z.object({
  idempotencyKey: z.string().min(8).max(100), action: AutonomyActionSchema, asset: PubkeySchema, venue: PubkeySchema,
  spendWei: z.string().regex(/^(0|[1-9][0-9]{0,77})$/), slippageBps: z.number().int().min(0).max(500),
  tokenId: z.string().regex(/^(0|[1-9][0-9]{0,77})$/).optional(),
  outputAsset: PubkeySchema.optional(), minReceiveRaw: z.string().regex(/^[1-9][0-9]{0,77}$/),
  expiresAt: z.string().datetime(), reason: z.string().trim().min(10).max(2000), sources: z.array(z.string().url()).min(1).max(10),
}).strict().superRefine((value, ctx) => {
  if (value.action.startsWith('nft_') && value.tokenId === undefined) ctx.addIssue({ code: 'custom', message: 'NFT actions require tokenId' });
  if (value.action === 'token_swap' && value.outputAsset === undefined) ctx.addIssue({ code: 'custom', message: 'Swaps require outputAsset' });
});
export const IntentSchema = z.object({ id: z.string().uuid(), agent: PubkeySchema, mandateVersion: z.number().int(),
  input: IntentInputSchema, status: z.enum(['reserved', 'revoked', 'expired']), createdAt: z.string().datetime(),
  transactionHash: z.null(), executionStatus: z.literal('not_activated') });
export const ChatInputSchema = z.object({ body: z.string().trim().min(1).max(4000), kind: z.enum(['message', 'feedback', 'memory_proposal']).default('message') }).strict();
export const ChatMessageSchema = z.object({ id: z.string().uuid(), agent: PubkeySchema, sender: PubkeySchema,
  body: z.string(), kind: z.enum(['message', 'feedback', 'memory_proposal']), createdAt: z.string().datetime(), authority: z.literal('none') });
export const LifeTaskInputSchema = z.object({ title: z.string().trim().min(3).max(100), instruction: z.string().trim().min(10).max(2000),
  kind: z.enum(['research', 'monitor', 'collaborate', 'learn']), dueAt: z.string().datetime(), sources: z.array(z.string().url()).max(10) }).strict();
export const LifeTaskSchema = LifeTaskInputSchema.extend({ id: z.string().uuid(), agent: PubkeySchema,
  status: z.enum(['pending', 'completed', 'cancelled']), result: z.string().nullable(), createdAt: z.string().datetime(), authority: z.literal('none') });
export function ownershipMessage(claim: Pick<z.infer<typeof OwnershipClaimSchema>, 'agent' | 'owner' | 'executionWallet' | 'nonce' | 'expiresAt'>): string {
  return ['World4 owner binding', 'Chain ID: 1', `Agent: ${claim.agent}`, `Owner: ${claim.owner}`, `Execution wallet: ${claim.executionWallet}`, `Nonce: ${claim.nonce}`, `Expires at: ${claim.expiresAt}`].join('\n');
}
