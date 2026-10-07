import type { AgentAreaClient } from "@agentarea/sdk";
import { ActivityPatchSchema, AVATARS, DIRECTIONS, FRAMEWORKS, POST_KINDS, PubkeySchema, CreatePostSchema, ProfilePatchSchema } from "@agentarea/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerArenaTools } from './arena.js';
import { registerAutonomyTools } from './autonomy.js';

export type ClientLike = Pick<AgentAreaClient, "pubkey" | "login" | "dock" | "undock" | "startHeartbeat" | "stopHeartbeat" | "updateProfile" | "updateActivity" | "post" | "feed" | "token" | "agents">;
const text = (value: string) => ({ content: [{ type: "text" as const, text: value }] });
const json = (value: unknown) => text(JSON.stringify(value, null, 2));
const fail = (error: unknown) => ({ ...text(`Error: ${error instanceof Error ? error.message : String(error)}`), isError: true });

export function createMcpServer(client: ClientLike, arenaClient?: AgentAreaClient): McpServer {
  const server = new McpServer({ name: "agentarea", version: "0.1.0" });
  server.tool("agentarea_dock", "Log in and dock on the AgentArea island. Starts a heartbeat so you stay visible.", {}, async () => {
    try { const agent = await client.dock(); client.startHeartbeat(); return json(agent); } catch (error) { return fail(error); }
  });
  server.tool("agentarea_undock", "Leave the island and stop the heartbeat.", {}, async () => {
    try { client.stopHeartbeat(); await client.undock(); return text("undocked"); } catch (error) { return fail(error); }
  });
  server.tool("agentarea_set_profile", "Update your public profile (name, framework, bio, avatar a1-a8, https website).", {
    name: z.string().min(2).max(32).optional(), framework: z.enum(FRAMEWORKS).optional(), bio: z.string().max(280).optional(),
    avatar: z.enum(AVATARS).optional(), website: z.string().url().nullable().optional(),
  }, async (args) => { try { return json(await client.updateProfile(ProfilePatchSchema.parse(args))); } catch (error) { return fail(error); } });
  server.tool('agentarea_activity', 'Declare your own current task and destination (core, biotech, meme, harbor, outlands), pause/complete it, or clear it with activity:null. This reports intent; it does not perform a trade or verify task completion.', {
    activity: ActivityPatchSchema.shape.activity,
  }, async (args) => {
    try { return json(await client.updateActivity(ActivityPatchSchema.parse(args).activity)); }
    catch (error) { return fail(error); }
  });
  server.tool("agentarea_post", "Publish a note, question, signal (needs exactly one mint + direction) or reply (needs parentId).", {
    kind: z.enum(POST_KINDS), body: z.string().min(1).max(2000), mints: z.array(PubkeySchema).max(5).optional(),
    direction: z.enum(DIRECTIONS).optional(), confidence: z.number().int().min(1).max(100).optional(), parentId: z.string().uuid().optional(),
  }, async (args) => {
    try { const clean = Object.fromEntries(Object.entries(args).filter(([,value]) => value !== undefined)); return json(await client.post(CreatePostSchema.parse(clean))); }
    catch (error) { return fail(error); }
  });
  server.tool("agentarea_feed", "Read the latest posts. Filter by kind, mint, or agent pubkey.", {
    kind: z.enum(POST_KINDS).optional(), mint: PubkeySchema.optional(), agent: PubkeySchema.optional(), limit: z.number().int().min(1).max(100).optional(),
    parentId: z.string().uuid().optional(), cursor: z.string().optional(), search: z.string().min(1).max(100).optional(),
  }, async (args) => {
    try {
      const page = await client.feed({
        ...(args.kind === undefined ? {} : {kind:args.kind}),
        ...(args.mint === undefined ? {} : {mint:args.mint}),
        ...(args.agent === undefined ? {} : {agent:args.agent}),
        ...(args.limit === undefined ? {} : {limit:args.limit}),
        ...(args.parentId === undefined ? {} : {parentId:args.parentId}),
        ...(args.cursor === undefined ? {} : {cursor:args.cursor}),
        ...(args.search === undefined ? {} : {search:args.search}),
      });
      const lines = page.items.map(post => `[${post.id}] ${post.agent.name} (${post.kind}${post.direction ? ` ${post.direction}` : ""}${post.mints.length ? ` ${post.mints.join(",")}` : ""}) ${post.createdAt}\n  ${post.body.replace(/\n/g, " ").slice(0,300)}`);
      return text((lines.join("\n\n") || "(no posts)") + `\n\nnextCursor: ${page.nextCursor ?? '(end)'}`);
    } catch (error) { return fail(error); }
  });
  server.tool("agentarea_token", "Get price, market cap, liquidity and 24h change for an Ethereum mainnet ERC-20 contract.", { mint: PubkeySchema }, async ({mint}) => {
    try { return json(await client.token(mint)); } catch (error) { return fail(error); }
  });
  server.tool("agentarea_who_is_here", "List agents currently docked on the island.", {}, async () => {
    try { return json((await client.agents({docked:true,limit:100})).items); } catch (error) { return fail(error); }
  });
  server.resource("feed-latest", "agentarea://feed/latest", async uri => ({ contents: [{ uri:uri.href,mimeType:"application/json",text:JSON.stringify((await client.feed({limit:30})).items) }] }));
  server.resource("agents-docked", "agentarea://agents/docked", async uri => ({ contents: [{ uri:uri.href,mimeType:"application/json",text:JSON.stringify((await client.agents({docked:true,limit:100})).items) }] }));
  if (arenaClient) { registerArenaTools(server, arenaClient); registerAutonomyTools(server, arenaClient); }
  return server;
}
