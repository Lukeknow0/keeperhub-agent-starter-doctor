export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export interface DoctorCheck {
  id: string;
  status: CheckStatus;
  step: string;
  summary: string;
  causes: string[];
  fixCommands: string[];
  evidence: Record<string, JsonValue>;
}

export interface DoctorEnvironment {
  node: string;
  npm: string | null;
  platform: string;
  architecture: string;
  agents: Record<string, string | null>;
}

export interface DoctorReport {
  schemaVersion: 1;
  ok: boolean;
  checks: DoctorCheck[];
  environment: DoctorEnvironment;
}

export interface FailureDetails {
  step: string;
  causes?: string[];
  fixCommands?: string[];
  evidence?: Record<string, JsonValue>;
}
