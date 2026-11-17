export interface SessionSummary {
  sessionId: string;
  latency: number;
  throughput: number;
  apdex: number;
  failure_rate: number;
  isCrash: boolean;
}
