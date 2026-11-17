// For chart Data
export interface ResponseData {
    time_bucket: string,
    [key: string]: any
}
// For Instance Data
export interface InstanceData {
    instanceName: string,
    upTime: string
}