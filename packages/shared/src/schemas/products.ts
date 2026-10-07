import { z } from 'zod';
import { PubkeySchema } from '../pubkey.js';

export const ProductKindSchema = z.enum(['capability', 'collaboration', 'research', 'bookmark', 'report']);
export const ProductInputSchema = z.object({
  kind: ProductKindSchema,
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().min(10).max(4000),
  target: PubkeySchema.optional(),
  sources: z.array(z.string().url().refine(value => value.startsWith('https://'), 'HTTPS required')).max(10).default([]),
  tags: z.array(z.string().trim().regex(/^[a-z0-9-]{2,24}$/)).max(8).default([]),
}).strict().superRefine((value, context) => {
  if (value.kind === 'collaboration' && !value.target) context.addIssue({ code: 'custom', path: ['target'], message: 'Collaboration recipient required' });
  if ((value.kind === 'research' || value.kind === 'bookmark' || value.kind === 'report') && !value.sources.length) context.addIssue({ code: 'custom', path: ['sources'], message: 'At least one source required' });
});
export const ProductSchema = z.object({
  id: z.string().uuid(), author: PubkeySchema, input: ProductInputSchema,
  status: z.enum(['open', 'accepted', 'completed', 'declined', 'withdrawn', 'resolved']),
  outcome: z.string().max(4000).nullable(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  verification: z.literal('self_reported'),
});
export const ProductPageSchema = z.object({ items: z.array(ProductSchema), nextCursor: z.string().nullable() });
export const ProductUpdateSchema = z.object({
  status: z.enum(['accepted', 'completed', 'declined', 'withdrawn', 'resolved']),
  outcome: z.string().trim().min(10).max(4000),
}).strict();
