import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { User } from '../models/user';
import { Observable } from 'rxjs/internal/Observable';

@Injectable({
  providedIn: 'root'
})
export class InfraService {

  private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://localhost:12021';
  constructor(private http: HttpClient) { }

  public getSystemProperties(serviceId: string, startTime: number, endTime: number, type: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', type.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/systemProperties", { params: params });
  }

  public getCpuUsage(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/cpuUsage", { params: params });
  }

  public getMemoryRamUsage(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/memoryRamUsage", { params: params });
  }

  public getMemorySwapUsage(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/memorySwapUsage", { params: params });
  }

  public getCpuAvgUsedPercentage(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/cpuAvgUsedPercentage", { params: params });
  }

  public getCpuLoad(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/cpuLoad", { params: params });
  }
  public getMemoryRam(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/memoryRam", { params: params });
  }
  public getMemorySwap(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/memorySwap", { params: params });
  }
  public getFileSystemMountpointUsage(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/fileSystemMountpointUsage", { params: params });
  }
  public getDiskReadWrite(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/diskReadWrite", { params: params });
  }
  public getNetworkBandwidthUsage(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/networkBandwidthUsage", { params: params });
  }
  public getAvgNetworkSpeed(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/avgNetworkSpeed", { params: params });
  }
  public getNetworkStatus(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/networkStatus", { params: params });
  }
  public getFilefdAllocated(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/filefdAllocated", { params: params });
  }
  public getProcess(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/process", { params: params });
  }
  public getServices(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/service", { params: params });
  }
  public getServiceName() {
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/getServiceName");
  }

  public getDiscSpace(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/getDiskSpace", { params: params });
  }

  public getCombinedData(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/getCombinedData", { params: params });
  }



  // Container  infra/api/containerDetails

  // public getOverallContainerDetails(serviceId: string, startTime: number, endTime: number) {
  //   let params = new HttpParams().set("serviceId", serviceId)
  //     .set('st', startTime.toString())
  //     .set('et', endTime.toString())
  //   return this.http.get(`${this.baseUrl}` + "/infra/api/container/containerDetails", { params: params });
  // }

  // public getContainerCPUUsage(serviceId: string, startTime: number, endTime: number) {
  //   let params = new HttpParams().set("serviceId", serviceId)
  //     .set('st', startTime.toString())
  //     .set('et', endTime.toString())
  //   return this.http.get(`${this.baseUrl}` + "/infra/api/container/containerCPUUsage", { params: params });
  // }

  // public getContainersMemoryUsage(serviceId: string, startTime: number, endTime: number) {
  //   let params = new HttpParams().set("serviceId", serviceId)
  //     .set('st', startTime.toString())
  //     .set('et', endTime.toString())
  //   return this.http.get(`${this.baseUrl}` + "/infra/api/container/containersMemoryUsage", { params: params });
  // }

  // public getContainerNetworkReceivedRate(serviceId: string, startTime: number, endTime: number) {
  //   let params = new HttpParams().set("serviceId", serviceId)
  //     .set('st', startTime.toString())
  //     .set('et', endTime.toString())
  //   return this.http.get(`${this.baseUrl}` + "/infra/api/container/containerNetworkReceivedRate", { params: params });
  // }

  // public getContainerNetworkTransmitRate(serviceId: string, startTime: number, endTime: number) {
  //   let params = new HttpParams().set("serviceId", serviceId)
  //     .set('st', startTime.toString())
  //     .set('et', endTime.toString())
  //   return this.http.get(`${this.baseUrl}` + "/infra/api/container/containerNetworkTransmitRate", { params: params });
  // }

  // CONTAINER1 with ConatinerName

  public getContainerStatus(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/containerStatus", { params: params });
  }

  public getContainerServiceName() {
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/getContainerServiceName");
  }

  public getContainerDetails(serviceId: string, startTime: number, endTime: number, containerName: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('containerName', containerName.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/containerDetails", { params: params });
  }

  public getContainerCPUUsage(serviceId: string, startTime: number, endTime: number, containerName: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('containerName', containerName.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/containerCPUUsage", { params: params });
  }

  public getContainersMemoryUsage(serviceId: string, startTime: number, endTime: number, containerName: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('containerName', containerName.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/containersMemoryUsage", { params: params });
  }

  public getContainerNetworkReceivedRate(serviceId: string, startTime: number, endTime: number, containerName: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('containerName', containerName.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/containerNetworkReceivedRate", { params: params });
  }

  public getContainerNetworkTransmitRate(serviceId: string, startTime: number, endTime: number, containerName: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('containerName', containerName.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/containerNetworkTransmitRate", { params: params });
  }


  public getContainerProperties(serviceId: string, startTime: number, endTime: number, containerName: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('containerName', containerName.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/getContainerProperties", { params: params });
  }

  public getContainerProperties1(serviceId: string, startTime: number, endTime: number, containerName: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('containerName', containerName.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/getContainerMemoryLimit", { params: params });
  }

  public getContainerProperties2(serviceId: string, startTime: number, endTime: number, containerName: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('containerName', containerName.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/getContainerCpuLimit", { params: params });
  }

  public getContainerProperties3(serviceId: string, startTime: number, endTime: number, containerName: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('containerName', containerName.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/container/getContainerImageDetails", { params: params });
  }

  // WINDOWS

  public getCombinedDataWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/getCombinedData", { params: params });
  }

  public getCpuUsageWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/cpuUsage", { params: params });
  }

  public getMemoryRamUsageWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/memoryRamUsage", { params: params });
  }

  public getMemorySwapUsageWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/memorySwapUsage", { params: params });
  }

  public getCpuAvgUsedPercentageWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/cpuAvgUsedPercentage", { params: params });
  }

  public getCpuLoadWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/cpuLoad", { params: params });
  }
  public getMemoryRamWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/memoryRam", { params: params });
  }
  public getMemorySwapWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/memorySwap", { params: params });
  }
  public getFileSystemMountpointUsageWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/fileSystemMountpointUsage", { params: params });
  }
  public getDiskReadWriteWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/diskReadWrite", { params: params });
  }
  public getNetworkBandwidthUsageWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/networkBandwidthUsage", { params: params });
  }
  public getNetworkStatusWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/networkStatus", { params: params });
  }
  public getFilefdAllocatedWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/filefdAllocated", { params: params });
  }
  public getProcessWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/process", { params: params });
  }
  public getServicesWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/service", { params: params });
  }
  public getServiceNameWindows() {
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/getServiceName");
  }

  public getDiscSpaceWindows(serviceId: string, startTime: number, endTime: number, host: string) {
    let params = new HttpParams().set("serviceId", serviceId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}` + "/infra/api/host/getDiskSpace", { params: params });
  }

  getProcessTimeSeries(
    serviceId: string,
    st: string,
    et: string,
    processName: string,
    pid?: string,
    ppid?: string,
    host?: string
  ) {
    let params = new HttpParams()
      .set('serviceId', serviceId)
      .set('st', st)
      .set('et', et)
      .set('processName', processName);
    if (pid) {
      params = params.set('pid', pid);
    }
    if (ppid) {
      params = params.set('ppid', ppid);
    }
    if (host) {
      params = params.set('host', host);
    }
    return this.http.get(`${this.baseUrl}` + `/infra/api/host/processtimeseries`, { params });
  }

  getProcessDetailsTimeSeries(
    serviceId: string,
    st: string,
    et: string,
    processName: string,
    pid?: string,
    ppid?: string,
    host?: string
  ) {
    let params = new HttpParams()
      .set('serviceId', serviceId)
      .set('st', st)
      .set('et', et)
      .set('processName', processName);
    if (pid) {
      params = params.set('pid', pid);
    }
    if (ppid) {
      params = params.set('ppid', ppid);
    }
    if (host) {
      params = params.set('host', host);
    }
    return this.http.get(`${this.baseUrl}` + `/infra/api/host/getProcessDetailsTimeSeries`, { params });
  }

  getProcessList( serviceId: string, st: string, et: string, host?: string) {
    let params = new HttpParams()
      .set('serviceId', serviceId)
      .set('st', st)
      .set('et', et);

    if (host) {
      params = params.set('host', host);
    }
    return this.http.get<string[]>( `${this.baseUrl}/infra/api/host/processList`, { params });
  }

  getInfraMetricsForAllHosts(hostList: { ip: string, type: string }[], startTime: number, endTime: number): Observable<any[]> {
    return this.http.post<any[]>(`${this.baseUrl}/infra/api/host/getInfraMetricsForAllHosts`, {
      hosts: hostList,
      st: startTime,
      et: endTime
    });
  }

}