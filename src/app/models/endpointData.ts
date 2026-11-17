// File: src/app/models/endpointData.ts

export interface EndpointData {
  success_rate: number;
  endpoint_load: number;
  latency: number;
  total_hits: any;
}

export interface EndpointDataMap {
  [endpointName: string]: EndpointData | null;
}
