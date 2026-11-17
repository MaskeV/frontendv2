export interface MrumTableData {
  serviceName: string;
  // crashRate: number | null;
  // averageAppLoadTimeMs: number | null;
  // totalSessions: number | null;
  // httpRequestCount: number | null;
  // apdexScore?: number | null;

  throughput?: number | null;        
  failure_rate?: number | null;   
  latency?: number | null;
  apdex?: number | null;
  osType?: string | null;
  technologyType?: string | null;
}
