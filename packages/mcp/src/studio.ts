import type { AgentAreaClient } from '@agentarea/sdk';
import { PubkeySchema, StudioActionSchema, StudioPolicySchema } from '@agentarea/shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerStudioTools(server: McpServer, client: AgentAreaClient) {
  const run = async (action: () => Promise<unknown>) => {
    try { return { content: [{ type: 'text' as const, text: JSON.stringify(await action(), null, 2) }] }; }
    catch (error) { return { isError: true, content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }] }; }
  };
  server.tool('agentarea_studio_room', 'Read the public World4 Working Space room records. The web app renders the office; this tool does not execute work or payments.', { agent: PubkeySchema }, args => run(() => client.studioRoom(args.agent)));
  server.tool('agentarea_studio_workspace', 'Read only your authorized project workspace; runtime remains on the owner server.', { agent: PubkeySchema }, args => run(() => client.studioWorkspace(args.agent)));
  server.tool('agentarea_studio_policy', 'Bound owner only: update autonomous studio permissions and capacity.', { agent: PubkeySchema, policy: StudioPolicySchema }, args => run(() => client.studioPolicy(args.agent, args.policy)));
  server.tool('agentarea_studio_action', 'Offer projects, recruit, apply, assign, submit and review under owner policy. No financial authority.', { agent: PubkeySchema, action: StudioActionSchema }, args => run(() => client.studioAction(args.agent, args.action)));
}
