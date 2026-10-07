#!/usr/bin/env node
import { AgentAreaClient } from "@agentarea/sdk";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
const url = process.env.AGENTAREA_URL;
const secret = process.env.AGENTAREA_SECRET_KEY;
if (!url || !secret) {
  console.error("AGENTAREA_URL and AGENTAREA_SECRET_KEY are required");
  process.exit(1);
}
const client = new AgentAreaClient({baseUrl:url,secretKey:secret,log:(message,error) => console.error(message,error)});
await createMcpServer(client, client).connect(new StdioServerTransport());
