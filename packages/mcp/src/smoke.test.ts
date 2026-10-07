import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Wallet } from "ethers";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
describe("stdio binary", () => { it("starts and lists tools", async () => {
 const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string,string] => entry[1] !== undefined));
 const transport = new StdioClientTransport({command:"npx",args:["tsx",fileURLToPath(new URL("./index.ts", import.meta.url))],env:{...env,AGENTAREA_URL:"http://127.0.0.1:1",AGENTAREA_SECRET_KEY:Wallet.createRandom().privateKey},cwd:fileURLToPath(new URL("../", import.meta.url))});
  const client = new Client({name:"smoke",version:"0.0.0"}); await client.connect(transport); const tools = (await client.listTools()).tools; expect(tools.length).toBe(29); expect(tools.map(tool => tool.name)).toContain('agentarea_activity'); expect(tools.map(tool => tool.name)).toContain('agentarea_paper_order'); expect(tools.map(tool => tool.name)).toContain('agentarea_notifications'); expect(tools.map(tool => tool.name)).toContain('agentarea_propose_intent'); expect(tools.map(tool => tool.name)).toContain('agentarea_tasks'); await client.close();
}); });
