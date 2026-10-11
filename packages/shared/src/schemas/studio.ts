import { z } from 'zod';
import { PubkeySchema } from '../pubkey.js';

const text = z.string().trim().min(10).max(4000);
const title = z.string().trim().min(3).max(100);
const id = z.string().uuid();
export const StudioPolicySchema = z.object({
  paused: z.boolean().default(false), acceptProjects: z.boolean().default(false),
  openJobs: z.boolean().default(false), applyJobs: z.boolean().default(false),
  acceptApplicants: z.boolean().default(false), assignTasks: z.boolean().default(false),
  reviewWork: z.boolean().default(false), maxActiveProjects: z.number().int().min(1).max(20).default(3),
  maxContributors: z.number().int().min(1).max(20).default(5),
}).strict();
export const StudioActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('profile'), name: title, description: text }).strict(),
  z.object({ type: z.literal('offer_project'), title, brief: text, acceptanceCriteria: text, deadline: z.string().datetime() }).strict(),
  z.object({ type: z.literal('accept_project'), projectId: id }).strict(),
  z.object({ type: z.literal('open_job'), projectId: id, title, brief: text }).strict(),
  z.object({ type: z.literal('apply_job'), jobId: id, proposal: text, sources: z.array(z.string().url().startsWith('https://')).min(1).max(10) }).strict(),
  z.object({ type: z.literal('review_application'), applicationId: id, decision: z.enum(['accepted', 'declined']) }).strict(),
  z.object({ type: z.literal('assign_task'), projectId: id, assignee: PubkeySchema, title, brief: text }).strict(),
  z.object({ type: z.literal('submit_task'), taskId: id, body: text, sources: z.array(z.string().url().startsWith('https://')).min(1).max(10) }).strict(),
  z.object({ type: z.literal('review_task'), taskId: id, decision: z.enum(['accepted', 'revision_requested']), feedback: text }).strict(),
  z.object({ type: z.literal('client_review'), projectId: id, decision: z.enum(['accepted', 'revision_requested']), feedback: text }).strict(),
  z.object({ type: z.literal('close_project'), projectId: id }).strict(),
]);
export const StudioProjectSchema = z.object({ id, client: PubkeySchema, title, brief: text, acceptanceCriteria: text,
  deadline: z.string().datetime(), status: z.enum(['offered', 'active', 'client_accepted', 'completed']),
  clientReviews: z.array(z.object({ actor: PubkeySchema, decision: z.string(), feedback: text, at: z.string().datetime() })),
});
export const StudioJobSchema = z.object({ id, projectId: id, title, brief: text, status: z.enum(['open', 'closed']) });
export const StudioApplicationSchema = z.object({ id, jobId: id, agent: PubkeySchema, proposal: text,
  sources: z.array(z.string().url()), status: z.enum(['pending', 'accepted', 'declined']) });
export const StudioTaskSchema = z.object({ id, projectId: id, assignee: PubkeySchema, title, brief: text,
  status: z.enum(['assigned', 'submitted', 'revision_requested', 'accepted']),
  submissions: z.array(z.object({ body: text, sources: z.array(z.string().url()), at: z.string().datetime() })),
  reviews: z.array(z.object({ actor: PubkeySchema, decision: z.string(), feedback: text, at: z.string().datetime() })),
});
export const StudioStateSchema = z.object({ agent: PubkeySchema, name: title, description: z.string().max(4000), free: z.literal(true),
  policyVersion: z.number().int(), policy: StudioPolicySchema, projects: z.array(StudioProjectSchema),
  jobs: z.array(StudioJobSchema), applications: z.array(StudioApplicationSchema), tasks: z.array(StudioTaskSchema),
  audit: z.array(z.object({ id, actor: PubkeySchema, action: z.string(), at: z.string().datetime() })),
});
export const StudioRoomSchema = z.object({ agent: PubkeySchema, name: title, description: z.string(), free: z.literal(true),
  jobs: z.array(StudioJobSchema), activeProjectCount: z.number().int(), runtime: z.literal('owner_server'),
  roomStatus: z.literal('3d_handoff_pending'), payments: z.literal('not_implemented'),
});
export type StudioState = z.infer<typeof StudioStateSchema>;
export type StudioAction = z.infer<typeof StudioActionSchema>;
