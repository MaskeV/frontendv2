export interface ServiceData {
    service_apdex: number;
    service_load: number;
    success_rate: number;
    latency: number;
  }
  
  export interface ServiceDataMap {
    [serviceName: string]: ServiceData | null;
  }