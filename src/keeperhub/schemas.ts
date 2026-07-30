import { z } from "zod";

const chainIdSchema = z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]);

export const chainSchema = z.object({
  chainId: chainIdSchema,
  name: z.string(),
  symbol: z.string().optional(),
  chainType: z.string().optional(),
  explorerUrl: z.string().url().nullish().transform((value) => value ?? undefined),
  isTestnet: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  status: z.string().optional()
}).passthrough();

export const chainsSchema = z.array(chainSchema);

// Verified against the protected /api/keys response. Requiring the items
// collection prevents an HTTP 200 with null, {}, or an unrelated public body
// from being mistaken for successful API-key authentication.
export const apiKeysSchema = z.object({
  items: z.array(z.unknown())
}).passthrough();

export const tokenBalanceSchema = z.object({
  tokenAddress: z.string().optional(),
  symbol: z.string().optional(),
  balance: z.string().optional(),
  balanceRaw: z.string().optional()
}).passthrough();

export const chainBalanceSchema = z.object({
  chainId: chainIdSchema,
  chainName: z.string().optional(),
  symbol: z.string().optional(),
  isTestnet: z.boolean().optional(),
  nativeBalance: z.string().optional(),
  nativeBalanceRaw: z.string().optional(),
  tokens: z.array(tokenBalanceSchema).optional(),
  supportedTokens: z.array(tokenBalanceSchema).optional()
}).passthrough();

export const walletBalancesSchema = z.object({
  walletAddress: z.string().min(1),
  balances: z.array(chainBalanceSchema)
}).passthrough();

export const billingSchema = z.object({
  subscription: z.object({
    plan: z.string().optional(),
    status: z.string().optional()
  }).passthrough().optional(),
  limits: z.record(z.string(), z.unknown()).optional(),
  usage: z.record(z.string(), z.unknown()).optional(),
  gasCredits: z.record(z.string(), z.unknown()).optional(),
  spendCap: z.union([z.number(), z.string(), z.null()]).optional()
}).passthrough();

export const transferAcceptedSchema = z.object({
  executionId: z.string().min(1),
  status: z.string().min(1)
}).passthrough();

export const simulationSchema = z.object({
  success: z.boolean(),
  status: z.string().refine((value) => value === "simulated", {
    message: 'status must be "simulated"'
  }),
  from: z.string().optional(),
  to: z.string().optional(),
  value: z.string().optional(),
  gasEstimate: z.string().optional(),
  simulatedReturnValue: z.unknown().optional(),
  wouldRevert: z.boolean(),
  revertReason: z.string().optional(),
  executionId: z.string().nullish(),
  transactionHash: z.string().nullish(),
  transactionLink: z.string().url().nullish(),
  explorerUrl: z.string().url().nullish(),
  error: z.string().optional()
}).passthrough();

export const executionStatusSchema = z.object({
  executionId: z.string().min(1),
  status: z.string().min(1),
  type: z.string().optional(),
  transactionHash: z.string().nullish(),
  transactionLink: z.string().url().nullish(),
  gasUsedWei: z.string().nullish(),
  result: z.unknown().optional(),
  error: z.unknown().nullish(),
  createdAt: z.string().optional(),
  completedAt: z.string().nullish()
}).passthrough();

export type KeeperHubChain = z.infer<typeof chainSchema>;
export type ApiKeysResponse = z.infer<typeof apiKeysSchema>;
export type WalletBalances = z.infer<typeof walletBalancesSchema>;
export type BillingSubscription = z.infer<typeof billingSchema>;
export type TransferAccepted = z.infer<typeof transferAcceptedSchema>;
export type TransferSimulation = z.infer<typeof simulationSchema>;
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;

export function numericChainId(value: string | number): number {
  return typeof value === "number" ? value : Number.parseInt(value, 10);
}
