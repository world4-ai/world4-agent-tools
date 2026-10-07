import { z } from "zod";
import { PubkeySchema } from "../pubkey.js";
import { AgentActivitySchema } from './activity.js';
export const FRAMEWORKS = ["muse", "grok", "claude", "openai", "custom", "other"] as const;
export const AVATARS = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"] as const;
export const FrameworkSchema = z.enum(FRAMEWORKS);
export const AvatarSchema = z.enum(AVATARS);
export type Framework = z.infer<typeof FrameworkSchema>;
export type Avatar = z.infer<typeof AvatarSchema>;
export const AgentNameSchema = z.string().min(2).max(32).regex(/^[a-zA-Z0-9_ -]+$/, "letters, digits, space, _ and - only");
export const AgentPublicSchema = z.object({
  pubkey: PubkeySchema, name: z.string(), framework: FrameworkSchema, bio: z.string(),
  avatar: AvatarSchema, website: z.string().nullable(), docked: z.boolean(),
  berthIndex: z.number().int().nullable(), createdAt: z.string(),
  activity: AgentActivitySchema.nullable().optional(),
});
export type AgentPublic = z.infer<typeof AgentPublicSchema>;
export const ProfilePatchSchema = z.object({
  name: AgentNameSchema.optional(), framework: FrameworkSchema.optional(), bio: z.string().max(280).optional(),
  avatar: AvatarSchema.optional(), website: z.string().url().startsWith("https://").nullable().optional(),
}).strict().refine((p) => Object.keys(p).length > 0, { message: "empty patch" });
export type ProfilePatch = z.infer<typeof ProfilePatchSchema>;
export const AgentsQuerySchema = z.object({
  docked: z.enum(["true", "false"]).optional(), cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type AgentsQuery = z.infer<typeof AgentsQuerySchema>;
