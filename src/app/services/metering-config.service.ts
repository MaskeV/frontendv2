import { Injectable } from '@angular/core';
import { User } from '../models/user';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
interface Host {
  id: number;
  hostname: string;
  platform: string | null;
  hardwareVendor: string;
  hardwareModel: string;
  hardwareVersion: string;
  hardwareSerial: string;
  computerName: string;
  primaryIp: string;
  primaryMac: string;
  lastEnrolledAt: string;
  publicIp: string;
  osVersion: string;
  status?: 'Online' | 'Offline';
}

interface HostGroupPayload {
  id?: number;
  name: string;
  description: string | null;
  config?: any;
  filename?: string | null;
  createdAt?: string;
  updatedAt?: string;
  hosts?: Host[];
  hostCount?: number | null;
  isNew?: boolean;
}

interface ZonesDTOPayload {
  id?: number;
  name: string;
  description: string;
  updatedAt?: string;
  createdAt?: string;
  groups: HostGroupPayload[];
  isNew?: boolean;
}

interface HostGroupDetailsResponse {
  id: number;
  name: string;
  description: string | null;
  config: any | null;
  filename: string | null;
  createdAt: string;
  updatedAt: string;
  hosts: Host[];
  hostCount: number | null;
}

interface ZoneDetailsResponse {
  id: number;
  description: string | null;
  name: string;
  groups: GroupSummary[];
}

interface GroupSummary {
  id: number;
  name: string;
  hostCount: number;
}

export interface ComponentMetricThresholdDTO {
  id?: number | null;
  componentId: number;
  componentType: string;
  globalMetricId?: number;
  metric: string;
  warning: number;
  critical: number;
}

export interface GlobalMetricThreshold {
  id: number;
  metric: string;
  warning: number;
  critical: number;
  metricUnit: string;
  createdOn: string;
  createdBy: number;
  thresholdSource: string;
  calculationType: string;
  metricAdjustment: string;
  applicationType: string;
  technologyTypeId: number;
  technologyTypeName: string;
  goodDirection: string;
}


@Injectable({
  providedIn: 'root'
})
export class MeteringConfigService {

  private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://localhost:12010';

  constructor(private http: HttpClient) { }

  public createHostMetadataList(hostMetaDataList: any[]): Observable<any> {
    return this.http.post(`${this.baseUrl}` + "/application/api/createHostMetadataList", hostMetaDataList);
  }

  public getHostNameList(OS: any): Observable<any> {
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/host/getAllHostsByOS", {
      params: { OS }
    });
  }

  public getClientHostConfig(): Observable<any> {
    return this.http.get(`${this.baseUrl}` + "/application/api/getClientHostConfig");
  }

  public createClientHostConfig(clientHostSetting: any): Observable<any> {
    return this.http.post(`${this.baseUrl}` + "/application/api/createClientHostConfig", clientHostSetting);
  }

  public updateClientHostConfig(clientHostSetting: any): Observable<any> {
    return this.http.post(`${this.baseUrl}` + "/application/api/updateClientHostConfig", clientHostSetting);
  }


  public getUniqueZones(): Observable<any> {
    return this.http.get(`${this.baseUrl}` + "/application/api/getUniqueZones");
  }

  getAllUnassignedHosts(): Observable<Host[]> {
    const params = new HttpParams().set('page', '-1').set('size', '1000');
    return this.http.get<any>(`${this.baseUrl}/metering/api/v1/group/getAllHostForGroup`, { params }).pipe(
      map(response => {
        if (response && response.serviceResponse && Array.isArray(response.serviceResponse)) {
          return response.serviceResponse.map((host: any) => ({
            ...host,
            status: 'Online'
          }));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching unassigned hosts:', error);
        return of([]);
      })
    );
  }

  createZone(payload: ZonesDTOPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/metering/api/v1/group/createZone`, payload);
  }

  updateZone(payload: ZonesDTOPayload): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/metering/api/v1/group/updateZone`, payload);
  }

  deleteZone(payload: { id: number }): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/metering/api/v1/group/deleteZone`, { body: payload });
  }

  getGroupDetails(groupId: number): Observable<HostGroupDetailsResponse | null> {
    return this.http.get<any>(`${this.baseUrl}/metering/api/v1/group/getGroupDetails/${groupId}`).pipe(
      map(response => {
        if (response && response.serviceStatus === 'Success' && response.serviceResponse) {
          const detailedHosts = response.serviceResponse.hosts.map((host: any) => ({
            ...host,
            status: (host.primaryIp && host.primaryIp !== '') ? 'Online' : 'Offline'
          }));
          return {
            ...response.serviceResponse,
            hosts: detailedHosts
          };
        }
        return null;
      })
    );
  }

  updateZoneGroupMapping(payload: ZonesDTOPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/metering/api/v1/group/updateZoneGroupMapping`, payload);
  }

  getAllZones(): Observable<ZoneDetailsResponse[]> {
    return this.http.get<any>(`${this.baseUrl}/metering/api/v1/group/getAllZoneDetails`).pipe(
      map(response => {
        if (response && response.serviceStatus === 'Success' && Array.isArray(response.serviceResponse)) {
          return response.serviceResponse as ZoneDetailsResponse[];
        }
        return [];
      })
    );
  }

  getThreshold(payload: any) {
    return this.http.post<any>(`${this.baseUrl}/metric/api/getThreshold`,payload);
  }

  getThresholdsByComponent(component: any, componentType: string): Observable<any[]> {
    const params = new HttpParams()
      .set('component', component)
      .set('componentType', componentType);
    return this.http.get<any[]>(`${this.baseUrl}/metric/api/getThresholdsByCompType`, { params });
  }

  updateThreshold(dto: ComponentMetricThresholdDTO): Observable<any> {
    return this.http.put(`${this.baseUrl}/metric/api/updateThreshold`, dto);
  }

  getSystemMetricsByIpAddrId(component: any, type: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/metric/api/getSystemMetric/${component}/${type}`);
  }

  getGlobalMetricData(): Observable<GlobalMetricThreshold[]> {
    return this.http.get<GlobalMetricThreshold[]>(`${this.baseUrl}/metric/api/getGlobalMetricData`);
  }

  addGlobalMetric(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/metric/api/addGlobalMetric`, payload);
  }

  updateGlobalMetric(id: any, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/metric/api/updateGlobalMetric/${id}`, payload);
  }

  deleteGlobalMetric(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/metric/api/removeGlobalMetric/${id}`);
  }

  getAllMetrics(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/metric/api/MetricList`);
  }

  getComponentTypes() {
    return this.http.get<any[]>(`${this.baseUrl}/metric/api/componentType/list`);
  }


}


