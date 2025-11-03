import { MCPAgent, MCPClient } from "mcp-use";
import { ChatOpenAI } from "@langchain/openai";
import path from "path";
import { readFile } from "fs/promises";

let agent: MCPAgent | null = null;
let client: MCPClient | null = null;

const apiKey = process.env.DEEPSEEK_API_KEY || '';
const modelName = process.env.DEEPSEEK_MODEL || ""
const baseURL = process.env.DEEPSEEK_BASE_URL || ""


export interface MCPResultOptions {
  maxSteps?: number;
}

export async function runMCPAgent(
  prompt: string,
  opts: MCPResultOptions = {}
): Promise<string> {
  if (!prompt?.trim()) throw new Error("Prompt empty");
  if (!agent) {
    const config = await loadMCPConfig();
    client = MCPClient.fromDict(config);

    const llm = new ChatOpenAI({
      modelName,
      temperature: 0.2,
      apiKey,
      configuration: baseURL ? { baseURL } : undefined,
    });

    agent = new MCPAgent({ llm, client: client, maxSteps: opts.maxSteps ?? 8 });
  }

  return agent.run(prompt, opts.maxSteps);
}

export async function closeMCP(): Promise<void> {
  if (client) {
    await client.closeAllSessions();
  }
  agent = null;
  client = null;
}

export async function loadMCPConfig() {
  const cwd = process.cwd();
  const file = path.join(cwd, "mcp.config.json");
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (err) {
    throw new Error(
      "Required mcp.config.json not found in project root. Please create it to define mcpServers."
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      "Invalid JSON in mcp.config.json: " + (err as Error).message
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      "mcp.config.json must contain a JSON object at the top level"
    );
  }
  if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
    throw new Error(
      "mcp.config.json must include a 'mcpServers' object mapping server names to their definitions"
    );
  }
  return parsed;
}