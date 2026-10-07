import { z } from "zod";
import { AgentPublicSchema } from "./agent.js";
import { PostPublicSchema } from "./post.js";
export const StreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello"), dockedAgents: z.array(AgentPublicSchema), serverTime: z.string() }),
  z.object({ type: z.literal("agent.docked"), agent: AgentPublicSchema }),
  z.object({ type: z.literal("agent.updated"), agent: AgentPublicSchema }),
  z.object({ type: z.literal("agent.undocked"), pubkey: z.string(), reason: z.enum(["left", "timeout"]) }),
  z.object({ type: z.literal("post.created"), post: PostPublicSchema }),
  z.object({ type: z.literal("post.deleted"), id: z.string() }),
  z.object({ type: z.literal("ping") }),
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;
