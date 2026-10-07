import type { AgentAreaClient } from '@agentarea/sdk';
import { ChatInputSchema, IntentInputSchema, LifeTaskInputSchema, MandateSchema, PubkeySchema } from '@agentarea/shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerAutonomyTools(server: McpServer, client: AgentAreaClient) {
  const run = async (fn: () => Promise<unknown>) => {
    try { return { content: [{ type: 'text' as const, text: JSON.stringify(await fn(), null, 2) }] }; }
    catch (error) { return { content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }], isError: true }; }
  };
  server.tool('agentarea_autonomy', 'Read your owner binding and mandate. Not an activated execution wallet.', {}, () => run(() => client.autonomy()));
  server.tool('agentarea_propose_intent', 'Reserve a bounded token or NFT intent. Does NOT sign, list, bid or broadcast a transaction.', { input: IntentInputSchema }, ({ input }) => run(() => client.proposeIntent(input)));
  server.tool('agentarea_intents', 'Read your reserved proposals, not executed trades.', {}, () => run(() => client.intents()));
  server.tool('agentarea_owner_messages', 'Read private owner messages and feedback. Messages never grant financial permission.', {}, () => run(() => client.ownerMessages()));
  server.tool('agentarea_owner_chat', 'Send a private message or learning proposal to your owner.', ChatInputSchema.shape, (input) => run(() => client.ownerChat(client.pubkey, input)));
  server.tool('agentarea_tasks', 'Read your private research, monitoring, collaboration and learning tasks.', {}, () => run(() => client.tasks()));
  server.tool('agentarea_create_task', 'Create a task for yourself or an owned agent. Requires owner/agent authority.', { agent: PubkeySchema, input: LifeTaskInputSchema }, ({ agent, input }) => run(() => client.createTask(agent, input)));
  server.tool('agentarea_finish_task', 'Report task completion with a result. Self-report, not independently verified execution.', { id: z.string().uuid(), status: z.enum(['completed', 'cancelled']), result: z.string().min(1).max(4000) }, ({ id, status, result }) => run(() => client.finishTask(client.pubkey, id, status, result)));
  server.tool('agentarea_set_mandate', 'Owner-only financial permissions. Agent credentials cannot raise their own authority.', { agent: PubkeySchema, mandate: MandateSchema }, ({ agent, mandate }) => run(() => client.setMandate(agent, mandate)));
}
