import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { KEEPERHUB_MCP_URL } from "../core/constants.js";
import { redactString } from "../core/redact.js";

export interface McpProbeResult {
  reachable: boolean;
  authenticated: boolean;
  toolCount: number;
  toolVerified: "tools_documentation";
  serverName: string | null;
  serverVersion: string | null;
}

export type McpProbeStage = "connect" | "list-tools" | "call-tool";

export class McpProbeError extends Error {
  readonly stage: McpProbeStage;
  readonly reachable: boolean | null;
  readonly authenticated: boolean | null;

  constructor(
    message: string,
    stage: McpProbeStage,
    reachable: boolean | null,
    authenticated: boolean | null
  ) {
    super(message);
    this.name = "McpProbeError";
    this.stage = stage;
    this.reachable = reachable;
    this.authenticated = authenticated;
  }
}

export async function probeKeeperHubMcp(
  apiKey: string,
  options: { url?: string; timeoutMs?: number } = {}
): Promise<McpProbeResult> {
  const signal = AbortSignal.timeout(options.timeoutMs ?? 15_000);
  const transport = new StreamableHTTPClientTransport(new URL(options.url ?? KEEPERHUB_MCP_URL), {
    requestInit: {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal
    }
  });
  const client = new Client({ name: "keeperhub-agent-starter-doctor", version: "0.1.0" });
  let stage: McpProbeStage = "connect";
  let reachable: boolean | null = null;
  let authenticated: boolean | null = null;

  try {
    await client.connect(transport);
    reachable = true;
    stage = "list-tools";
    const tools = await client.listTools({}, { signal });
    authenticated = true;
    stage = "call-tool";
    const documentation = tools.tools.find((tool) => tool.name === "tools_documentation");
    if (!documentation) {
      throw new Error("Authenticated MCP tool list did not contain tools_documentation.");
    }
    const result = await client.callTool({ name: "tools_documentation", arguments: {} }, undefined, { signal });
    if (result.isError === true) {
      throw new Error("tools_documentation returned an MCP tool error.");
    }
    const server = client.getServerVersion();
    return {
      reachable: true,
      authenticated: true,
      toolCount: tools.tools.length,
      toolVerified: "tools_documentation",
      serverName: server?.name ?? null,
      serverVersion: server?.version ?? null
    };
  } catch (error) {
    const message = redactString(error instanceof Error ? error.message : String(error));
    throw new McpProbeError(
      `KeeperHub MCP probe failed during ${stage}: ${message}`,
      stage,
      reachable,
      authenticated
    );
  } finally {
    await client.close().catch(() => undefined);
  }
}
