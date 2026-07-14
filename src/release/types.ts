import type { JsonValue } from "../core/types.js";

export type SupportedWalletType = "eoa";

export interface FileSha256Condition {
  type: "file-sha256";
  path: string;
  sha256: string;
}

export interface ReleaseIntent {
  schemaVersion: 1;
  chainId: number;
  walletType: SupportedWalletType;
  walletAddress: string;
  recipientAddress: string;
  amount: string;
  condition: FileSha256Condition;
}

export interface SimulationEvidence {
  from: string;
  to: string;
  value: string | null;
  gasEstimate: string | null;
  wouldRevert: false;
}

export interface ReleasePlanUnsigned {
  schemaVersion: 1;
  createdAt: string;
  expiresAt: string;
  intent: ReleaseIntent;
  intentDigest: string;
  simulation: SimulationEvidence;
}

export interface ReleasePlan extends ReleasePlanUnsigned {
  planDigest: string;
}

export interface ChainContext {
  chainId: number;
  enabled: boolean;
  isTestnet: boolean;
  name?: string;
  explorerUrl?: string;
}

export interface WalletContext {
  walletAddress: string;
}

export interface TransferRequest {
  chainId: number;
  recipientAddress: string;
  amount: string;
}

export interface TransferSimulationRequest extends TransferRequest {
  simulate: true;
}

export interface TransferSimulationResult {
  success: boolean;
  from: string;
  to: string;
  value?: string | null;
  gasEstimate?: string | null;
  wouldRevert: boolean;
  revertReason?: string | null;
}

export interface TransferSubmission {
  executionId: string;
  status: string;
}

export interface ExecutionStatusResult {
  executionId: string;
  status: string;
  transactionHash?: string | null;
  explorerUrl?: string | null;
  pollIntervalHintMs?: number | null;
  result?: Record<string, JsonValue> | null;
}

/**
 * The release core deliberately depends on this narrow interface instead of a
 * concrete HTTP client. The production adapter owns response-shape parsing and
 * conversion of X-Poll-Interval-Hint to milliseconds.
 */
export interface ReleaseKeeperHubClient {
  getChain(chainId: number): Promise<ChainContext | null>;
  getWallet(chainId: number): Promise<WalletContext>;
  simulateTransfer(request: TransferSimulationRequest): Promise<TransferSimulationResult>;
  executeTransfer(request: TransferRequest, options: { idempotencyKey: string }): Promise<TransferSubmission>;
  getExecutionStatus(executionId: string): Promise<ExecutionStatusResult>;
}

export type ExecutionPhase = "submitting" | "submitted" | "completed" | "ambiguous" | "failed" | "blocked";

export interface ReleaseExecutionStateUnsigned {
  schemaVersion: 1;
  planDigest: string;
  intentDigest: string;
  intent: ReleaseIntent;
  idempotencyKey: string;
  idempotencyDigest: string;
  attemptCount: number;
  maxAttempts: number;
  phase: ExecutionPhase;
  executionId: string | null;
  keeperHubStatus: string | null;
  transactionHash: string | null;
  explorerUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
}

export interface ReleaseExecutionState extends ReleaseExecutionStateUnsigned {
  stateDigest: string;
}

export interface ConfirmIO {
  isInputTTY: boolean;
  isOutputTTY: boolean;
  question(prompt: string): Promise<string>;
}

export interface AuditRecordUnsigned {
  schemaVersion: 1;
  index: number;
  timestamp: string;
  event: string;
  data: JsonValue;
  previousHash: string | null;
}

export interface AuditRecord extends AuditRecordUnsigned {
  hash: string;
}

export interface AuditVerification {
  ok: boolean;
  records: number;
  headHash: string | null;
  errors: string[];
}

export interface ReleaseRuntime {
  client: ReleaseKeeperHubClient;
  workspace: string;
  now?: () => Date;
  randomUUID?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
  confirmIO?: ConfirmIO;
}
