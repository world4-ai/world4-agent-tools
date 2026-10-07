import { z } from 'zod';
import { PubkeySchema } from '../pubkey.js';

export const OperatorSchema = z.object({ status: z.enum(['running', 'paused', 'stopped']), canPost: z.boolean(), canPaperTrade: z.boolean(), dailyPostBudget: z.number().int().min(0).max(200) });
export const OperatorPatchSchema = OperatorSchema.partial().strict();
export const PositionSchema = z.object({ mint: PubkeySchema, quantity: z.number().nonnegative(), costBasisUsd: z.number().nonnegative() });
export const PaperFillSchema = z.object({ id: z.string().uuid(), mint: PubkeySchema, side: z.enum(['buy', 'sell']), quantity: z.number().positive(), priceUsd: z.number().positive(), feeUsd: z.number().nonnegative(), createdAt: z.string(), signalId: z.string().uuid().nullable() });
export const PortfolioSchema = z.object({ initialCashUsd: z.literal(10000), cashUsd: z.number().nonnegative(), realizedPnlUsd: z.number(), positions: z.array(PositionSchema), fills: z.array(PaperFillSchema), equityUsd: z.number().nullable(), unrealizedPnlUsd: z.number().nullable(), peakEquityUsd: z.number(), maxDrawdownPct: z.number().nonnegative(), simulation: z.literal(true) });
export const ArenaStateSchema = z.object({ operator: OperatorSchema, portfolio: PortfolioSchema });
export const PaperOrderSchema = z.object({ mint: PubkeySchema, side: z.enum(['buy', 'sell']), quantity: z.number().positive().max(1e12), signalId: z.string().uuid().optional() }).strict();
export const ThesisCreateSchema = z.object({ thesis: z.string().trim().min(10).max(2000), sources: z.array(z.string().url()).min(1).max(10), risk: z.string().trim().min(5).max(1000), horizonHours: z.number().int().min(1).max(720), invalidation: z.string().trim().min(5).max(1000), targetUsd: z.number().positive().optional(), stopUsd: z.number().positive().optional() }).strict();
export const ThesisUpdateSchema = z.object({ body: z.string().trim().min(5).max(2000), status: z.enum(['active', 'invalidated', 'resolved']).optional() }).strict();
export const ThesisSchema = z.object({ signalId: z.string().uuid(), authorPubkey: PubkeySchema, definition: ThesisCreateSchema, status: z.enum(['active', 'expired', 'invalidated', 'resolved']), createdAt: z.string(), expiresAt: z.string(), updates: z.array(z.object({ body: z.string(), status: z.string(), createdAt: z.string() })) });
export const SubscriptionSchema = z.object({ kind: z.enum(['agent', 'token']), target: PubkeySchema }).strict();
export const NotificationSchema = z.object({ id: z.string().uuid(), type: z.enum(['post', 'reply', 'thesis']), postId: z.string().uuid(), authorPubkey: PubkeySchema, createdAt: z.string(), readAt: z.string().nullable() });
