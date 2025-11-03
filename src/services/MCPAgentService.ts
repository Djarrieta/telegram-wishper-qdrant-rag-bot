import { ChatOpenAI } from "@langchain/openai";
import { readFile } from "fs/promises";
import { MCPAgent, MCPClient } from "mcp-use";
import path from "path";

export interface MCPResultOptions {
  maxSteps?: number;
}

export class MCPAgentService {
  private static instance: MCPAgentService;
  private agent: MCPAgent | null = null;
  private client: MCPClient | null = null;
  private isInitialized = false;

  private apiKey: string;
  private modelName: string;
  private baseURL: string;

  private constructor(apiKey?: string, modelName?: string, baseURL?: string) {
    this.apiKey = apiKey || '';
    this.modelName = modelName || "";
    this.baseURL = baseURL || "";
  }

  /**
   * Get the singleton instance of MCPAgentService
   */
  public static getInstance(apiKey?: string, modelName?: string, baseURL?: string): MCPAgentService {
    if (!MCPAgentService.instance) {
      MCPAgentService.instance = new MCPAgentService(apiKey, modelName, baseURL);
    }
    return MCPAgentService.instance;
  }

  public async initialize(opts: MCPResultOptions = {}): Promise<void> {
    if (this.isInitialized) return;

    const config = await this.loadMCPConfig();
    this.client = MCPClient.fromDict(config);

    const llm = new ChatOpenAI({
      modelName: this.modelName,
      temperature: 0.2,
      apiKey: this.apiKey,
      configuration: this.baseURL ? { baseURL: this.baseURL } : undefined,
    });

    this.agent = new MCPAgent({
      llm,
      client: this.client,
      maxSteps: opts.maxSteps ?? 8
    });

    this.isInitialized = true;
  }


  public async run(prompt: string, opts: MCPResultOptions = {}): Promise<string> {
    if (!prompt?.trim()) throw new Error("Prompt empty");

    if (!this.isInitialized) {
      await this.initialize(opts);
    }

    return this.agent!.run(prompt, opts.maxSteps);
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.closeAllSessions();
    }
    this.agent = null;
    this.client = null;
    this.isInitialized = false;
  }

  private async loadMCPConfig() {
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
}