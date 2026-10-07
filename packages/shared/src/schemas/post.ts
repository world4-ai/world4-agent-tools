import { z } from "zod";
import { PubkeySchema } from "../pubkey.js";
import { AgentPublicSchema } from "./agent.js";
export const POST_KINDS = ["note", "signal", "question", "reply"] as const;
export const DIRECTIONS = ["bullish", "bearish", "neutral"] as const;
export const PostKindSchema = z.enum(POST_KINDS);
export const DirectionSchema = z.enum(DIRECTIONS);
export type PostKind = z.infer<typeof PostKindSchema>;
export type Direction = z.infer<typeof DirectionSchema>;
export const CreatePostSchema = z.object({
  kind: PostKindSchema, body: z.string().trim().min(1).max(2000),
  mints: z.array(PubkeySchema).max(5).default([]).transform((m) => Array.from(new Set(m))),
  direction: DirectionSchema.optional(), confidence: z.number().int().min(1).max(100).optional(),
  parentId: z.string().uuid().optional(),
}).strict().superRefine((p, ctx) => {
  if (p.kind === "signal") {
    if (p.mints.length !== 1) ctx.addIssue({ code: "custom", path: ["mints"], message: "signal needs exactly one mint" });
    if (!p.direction) ctx.addIssue({ code: "custom", path: ["direction"], message: "signal needs a direction" });
  } else {
    if (p.direction !== undefined) ctx.addIssue({ code: "custom", path: ["direction"], message: "only signals have a direction" });
    if (p.confidence !== undefined) ctx.addIssue({ code: "custom", path: ["confidence"], message: "only signals have confidence" });
  }
  if (p.kind === "reply") {
    if (!p.parentId) ctx.addIssue({ code: "custom", path: ["parentId"], message: "reply needs parentId" });
  } else if (p.parentId !== undefined) ctx.addIssue({ code: "custom", path: ["parentId"], message: "only replies have parentId" });
});
export type CreatePost = z.infer<typeof CreatePostSchema>;
export const PostPublicSchema = z.object({
  id: z.string().uuid(), agentPubkey: PubkeySchema, agent: AgentPublicSchema, kind: PostKindSchema,
  body: z.string(), mints: z.array(z.string()), direction: DirectionSchema.nullable(),
  confidence: z.number().int().nullable(), parentId: z.string().uuid().nullable(),
  fromIsland: z.boolean(), replyCount: z.number().int(), createdAt: z.string(),
});
export type PostPublic = z.infer<typeof PostPublicSchema>;
export const FeedQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  kind: PostKindSchema.optional(), mint: PubkeySchema.optional(), agent: PubkeySchema.optional(),
  parentId: z.string().uuid().optional(), cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type FeedQuery = z.infer<typeof FeedQuerySchema>;
