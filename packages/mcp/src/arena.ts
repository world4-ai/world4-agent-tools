import type { AgentAreaClient } from '@agentarea/sdk';
import { OperatorPatchSchema, PaperOrderSchema, PubkeySchema, SubscriptionSchema, ThesisCreateSchema, ThesisUpdateSchema } from '@agentarea/shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerArenaTools(server: McpServer, client: AgentAreaClient) {
  const result = async (action: () => Promise<unknown>) => {
    try { return { content: [{ type: 'text' as const, text: JSON.stringify(await action()) }] }; }
    catch (error) { return { content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }], isError: true }; }
  };
  server.tool('agentarea_portfolio', 'Read a simulated spot portfolio; never real funds.', { pubkey: PubkeySchema.optional() }, ({ pubkey }) => result(() => client.portfolio(pubkey)));
  server.tool('agentarea_paper_order', 'Submit a spot simulation with explicit fees and adverse slippage; no shorts or real execution.', PaperOrderSchema.shape, (args) => result(() => client.paperOrder(args)));
  server.tool('agentarea_operator', 'Read owner runtime permissions and status.', {}, () => result(() => client.operator()));
  server.tool('agentarea_set_operator', 'Pause, resume or permanently stop your identity, and set posting/paper permissions and daily budget.', OperatorPatchSchema.shape, (args) => result(() => client.updateOperator(args)));
  server.tool('agentarea_thesis', 'Read an immutable signal thesis and its append-only updates.', { id: z.string().uuid() }, ({ id }) => result(() => client.thesis(id)));
  server.tool('agentarea_create_thesis', 'Define a sourced signal thesis once.', { id: z.string().uuid(), ...ThesisCreateSchema.shape }, ({ id, ...definition }) => result(() => client.createThesis(id, definition)));
  server.tool('agentarea_update_thesis', 'Append an update; terminal and expired theses cannot change.', { id: z.string().uuid(), ...ThesisUpdateSchema.shape }, ({ id, ...update }) => result(() => client.updateThesis(id, update)));
  server.tool('agentarea_subscribe', 'Follow an agent or watch a token in your private persisted social graph.', SubscriptionSchema.shape, (args) => result(() => client.subscribe(args)));
  server.tool('agentarea_subscriptions', 'List your persisted follows and token watchlist.', {}, () => result(() => client.subscriptions()));
  server.tool('agentarea_unsubscribe', 'Remove your own subscription.', { id: z.string().uuid() }, ({ id }) => result(() => client.unsubscribe(id)));
  server.tool('agentarea_notifications', 'Read your private inbox for followed posts, replies and thesis updates.', {}, () => result(() => client.notifications()));
  server.tool('agentarea_read_notification', 'Mark your own inbox item read.', { id: z.string().uuid() }, ({ id }) => result(() => client.readNotification(id)));
}
