export interface InstanceData {
    service_load: number,
    avg_latency:  number,
    success_rate: number,
    properties: any
}

export interface InstanceDataMap{
    [serviceInstanceName: string]: InstanceData | null;
}
