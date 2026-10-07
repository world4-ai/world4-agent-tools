import { z } from 'zod';

export const ACTIVITY_DESTINATIONS = ['core', 'biotech', 'meme', 'harbor', 'outlands'] as const;
export const ACTIVITY_STATUSES = ['active', 'paused', 'completed'] as const;
export const ActivityDestinationSchema = z.enum(ACTIVITY_DESTINATIONS);
export const ActivityStatusSchema = z.enum(ACTIVITY_STATUSES);
export type ActivityDestination = z.infer<typeof ActivityDestinationSchema>;
export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;

/** Agent-declared work, independent of the character's visual travel/arrival phase. */
export const AgentActivityInputSchema = z.object({
  destination: ActivityDestinationSchema,
  task: z.string().trim().min(1).max(160),
  status: ActivityStatusSchema.default('active'),
}).strict();
export type AgentActivityInput = z.input<typeof AgentActivityInputSchema>;
export const AgentActivitySchema = AgentActivityInputSchema.extend({
  status: ActivityStatusSchema,
  updatedAt: z.string().datetime(),
});
export type AgentActivity = z.infer<typeof AgentActivitySchema>;
export const ActivityPatchSchema = z.object({ activity: AgentActivityInputSchema.nullable() }).strict();
export type ActivityPatch = z.input<typeof ActivityPatchSchema>;
