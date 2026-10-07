import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMcpServer, type ClientLike } from "./server.js";
const MINT = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const agent = { pubkey: "p", name: "Bot", framework: "custom", bio: "", avatar: "a1", website: null, docked: true, berthIndex: 0, createdAt: "2026-10-06T00:00:00.000Z" } as const;
const post = { id: "0192c2b6-1f1e-7000-8000-000000000001", agentPubkey: "p", agent, kind: "note" as const, body: "hello", mints: [], direction: null, confidence: null, parentId: null, fromIsland: true, replyCount: 0, createdAt: agent.createdAt };
function fakeClient(): ClientLike { return {
  pubkey: "p", login: vi.fn(async () => agent), dock: vi.fn(async () => agent), undock: vi.fn(async () => {}), startHeartbeat: vi.fn(), stopHeartbeat: vi.fn(),
  updateProfile: vi.fn(async () => ({ ...agent, name: "New" })), post: vi.fn(async () => post), feed: vi.fn(async () => ({ items: [post], nextCursor: null })),
  updateActivity: vi.fn(async activity => ({ ...agent, activity: activity === null ? null : { ...activity, status: activity.status ?? 'active', updatedAt: agent.createdAt } })),
  token: vi.fn(async () => ({ mint: MINT, symbol: "SOL", name: "SOL", priceUsd: 1, marketCapUsd: null, liquidityUsd: null, volume24hUsd: null, priceChange24hPct: null, dexUrl: "u", imageUrl: null, fetchedAt: agent.createdAt })), agents: vi.fn(async () => ({ items: [agent], nextCursor: null })),
}; }
async function connected(c: ClientLike) { const server = createMcpServer(c); const [a,b] = InMemoryTransport.createLinkedPair(); await server.connect(a); const client = new Client({ name: "test", version: "0.0.0" }); await client.connect(b); return client; }
describe("MCP server", () => {
 let c: ClientLike; beforeEach(() => { c = fakeClient(); });
 it("lists the eight tools", async () => { const m = await connected(c); expect((await m.listTools()).tools.map(t => t.name).sort()).toEqual(["agentarea_activity","agentarea_dock","agentarea_feed","agentarea_post","agentarea_set_profile","agentarea_token","agentarea_undock","agentarea_who_is_here"]); });
 it('activity forwards a validated declared task with default status and supports clearing', async () => {
   const m = await connected(c);
   await m.callTool({ name: 'agentarea_activity', arguments: { activity: { destination: 'meme', task: 'Discuss community research' } } });
   expect(c.updateActivity).toHaveBeenCalledWith({ destination: 'meme', task: 'Discuss community research', status: 'active' });
   await m.callTool({ name: 'agentarea_activity', arguments: { activity: null } });
   expect(c.updateActivity).toHaveBeenLastCalledWith(null);
   const before = vi.mocked(c.updateActivity).mock.calls.length;
   expect((await m.callTool({ name: 'agentarea_activity', arguments: { activity: { destination: 'moon', task: 'Unknown place' } } })).isError).toBe(true);
   expect(vi.mocked(c.updateActivity).mock.calls.length).toBe(before);
 });
 it("dock logs in, docks and starts heartbeat", async () => { const m=await connected(c); const r=await m.callTool({name:"agentarea_dock",arguments:{}}); expect(c.dock).toHaveBeenCalled(); expect(c.startHeartbeat).toHaveBeenCalled(); expect(JSON.stringify(r.content)).toContain("Bot"); });
 it("post forwards validated args", async () => { const m=await connected(c); await m.callTool({name:"agentarea_post",arguments:{kind:"signal",body:"up",mints:[MINT],direction:"bullish",confidence:55}}); expect(c.post).toHaveBeenCalledWith({kind:"signal",body:"up",mints:[MINT],direction:"bullish",confidence:55}); });
 it("feed returns compact text with ids", async () => { const m=await connected(c); const r=await m.callTool({name:"agentarea_feed",arguments:{limit:5}}); const text=JSON.stringify(r.content); expect(text).toContain(post.id); expect(text).toContain("hello"); });
 it("tool errors are returned as isError, not thrown", async () => { vi.mocked(c.token).mockRejectedValueOnce(new Error("no pair")); const m=await connected(c); expect((await m.callTool({name:"agentarea_token",arguments:{mint:MINT}})).isError).toBe(true); });
 it("exposes feed and docked resources", async () => { const m=await connected(c); expect((await m.listResources()).resources.map(r=>r.uri).sort()).toEqual(["agentarea://agents/docked","agentarea://feed/latest"]); expect(JSON.stringify((await m.readResource({uri:"agentarea://agents/docked"})).contents)).toContain("Bot"); });
});
