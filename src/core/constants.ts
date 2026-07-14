export const KEEPERHUB_BASE_URL = "https://app.keeperhub.com";
export const KEEPERHUB_MCP_URL = `${KEEPERHUB_BASE_URL}/mcp`;
export const QUICKSTART_URL = "https://docs.keeperhub.com/quickstart";
export const SEPOLIA_CHAIN_ID = 11_155_111;
export const DOCTOR_SIMULATION_AMOUNT = "0.000001";
export const PLAN_TTL_MS = 10 * 60 * 1_000;

export const EXIT_CODES = {
  success: 0,
  diagnosticFailure: 1,
  usage: 2,
  internal: 3
} as const;
