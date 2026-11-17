import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UpdateMeteringConfig } from '../models/updateMeteringConfig';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SmReportsApiService {

  private baseUrl=environment.baseUrl;
  // private baseUrl2 = 'http://localhost:12044';

  constructor(private http: HttpClient) { }

  public getAllHosts() {
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/host/getAllHosts");
  }

  public getAllHostDetails() {
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/host/getAllHostDetails");
  }

  public getAllHostDetails2(zoneId: number, groupId: number) {
    const params = new HttpParams()
    .set('zoneId', zoneId.toString())
    .set('groupId', groupId.toString());
    return this.http.get(`${this.baseUrl}` + "/metering/api/v2/host/getAllHostDetails",{params});
  }

  public getHostDetailsById(id: number) {
    let params = new HttpParams()
      .set('hostId', id.toString())
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/host/getHostDetailsById", { params: params });
  }

  public getAllSoftwares() {
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/sw/getAllSoftwares");
  }

  public getSoftwaresForHost(id: number) {
    let params = new HttpParams()
      .set('hostId', id.toString())
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/sw/getSoftwaresForHost", { params: params });
  }

  public getSoftwareDetailsById(id: number) {
    let params = new HttpParams()
      .set('softwareId', id.toString())
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/sw/getSoftwareDetailsById", { params: params });
  }

  public getUsersDetailsByHostId(id: number) {
    let params = new HttpParams()
      .set('hostId', id.toString())
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/host/getUsersDetailsByHostId", { params: params });
  }

  public updateMeteringConfig(config: UpdateMeteringConfig): Observable<any> {
    return this.http.post(`${this.baseUrl}` + "/metering/api/v1/sw/updateMeteringConfig", config);
  }

  public getHostUserEmails(id: number) {
    let params = new HttpParams()
      .set('hostId', id.toString())
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/host/getHostUserEmails", { params: params });
  }

  // Dashboard

  getHostCountByOS(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}` + "/metering/api/v1/host/getHostCountByOS");
  }
  getHostCountByOS2(zoneId: number, groupId: number): Observable<any> {
    const params = new HttpParams()
      .set('zoneId', zoneId.toString())
      .set('groupId', groupId.toString());
  
    return this.http.get<any>(`${this.baseUrl}/metering/api/v2/host/getHostCountByOS`, { params });
  }
  

  getHostsEnrolledData(startTime: string, endTime: string): Observable<any> {
    const params = new HttpParams()
      .set('st', startTime.toString())
      .set('et', endTime.toString());

    return this.http.get<any>(`${this.baseUrl}/metering/api/v1/dashboard/getHostsEnrolledData`, { params : params });
  } 
  
  getNewDeviceAddedDetails(startTime: number, endTime: number,zoneId: number, groupId: number): Observable<any> {
    const params = new HttpParams()
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('zoneId', zoneId.toString())
      .set('groupId', groupId.toString());

    return this.http.get<any>(`${this.baseUrl}/metering/api/v2/dashboard/getNewDeviceAddedDetails`, { params : params });
  }

  public getSoftwareUsage(st: number, et: number) {
    let params = new HttpParams()
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}` + "/metering/api/v2/dashboard/getSoftwareUsage", { params: params });
  }
  
  public getSoftwareUsage2(st: number, et: number,zoneId: number, groupId: number) {
    let params = new HttpParams()
      .set('st', st.toString())
      .set('et', et.toString())
      .set('zoneId', zoneId.toString())
      .set('groupId', groupId.toString());
  
    return this.http.get(`${this.baseUrl}` + "/metering/api/v2/dashboard/getSoftwareUsage", { params: params });
  }

  public getDormantHosts(st: number, et: number, limit: number) {
    let params = new HttpParams()
      .set('st', st.toString())
      .set('et', et.toString())
      .set('limit', limit.toString())
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/dashboard/getDormantHosts", { params: params });
  } 
  
  public getDormantHosts2(st: number, et: number,zoneId: number, groupId: number) {
    let params = new HttpParams()
      .set('st', st.toString())
      .set('et', et.toString())
      .set('zoneId', zoneId.toString())
      .set('groupId', groupId.toString());
    return this.http.get(`${this.baseUrl}` + "/metering/api/v2/dashboard/getDormantHosts", { params: params });
  }

  public getHostsLastSeen(): Observable<any> {
    return this.http.get(`${this.baseUrl}` + "/metering/api/v1/dashboard/getHostsLastSeen");
  } 

  public getNotMonitoredProcesses(): Observable<any> {
    return this.http.get(`${this.baseUrl}/metering/api/v1/dashboard/getNotMonitoredProcess`);
  }
  
  
  public getHostsLastSeen2(zoneId: number, groupId: number): Observable<any> {
    let params = new HttpParams()
    .set('zoneId', zoneId.toString())
    .set('groupId', groupId.toString());
    return this.http.get(`${this.baseUrl}` + "/metering/api/v2/dashboard/getHostsLastSeen",{params});
  }

  public getZoneData(): Observable<any>{    

    return this.http.get<any>(`${this.baseUrl}`+"/metering/api/v1/group/getZones");
  }

  public getGroupData(zoneId : number ): Observable<any>{
    const params = new HttpParams()
    .set('zoneId', zoneId.toString())

  return this.http.get<any>(`${this.baseUrl}`+"/metering/api/v1/group/getAllGroupsByZone",{params:params});
  }

  public getHostsActiveDetails(st: number, et: number,zoneId: number, groupId: number, limit: number) {
    let params = new HttpParams()
      .set('st', st.toString())
      .set('et', et.toString())
      .set('zoneId', zoneId.toString())
      .set('groupId', groupId.toString())
      .set('limit', limit.toString());
    return this.http.get(`${this.baseUrl}` + "/metering/api/v2/dashboard/getHostsActiveDetails", { params: params });
  }



  public getNetworkDetails(st: number, et: number,zoneId: number, groupId: number) {
    let params = new HttpParams()
      .set('st', st.toString())
      .set('et', et.toString())
      .set('zoneId', zoneId.toString())
      .set('groupId', groupId.toString());
    return this.http.get(`${this.baseUrl}` + "/metering/api/v2/dashboard/getNetworkDetails", { params: params });
  }

  public getNetworkDetailsAll(st: number, et: number,zoneId: number, groupId: number) {
    let params = new HttpParams()
      .set('st', st.toString())
      .set('et', et.toString())
      .set('zoneId', zoneId.toString())
      .set('groupId', groupId.toString());
    return this.http.get(`${this.baseUrl}` + "/metering/api/v2/dashboard/getNetworkDetailsAll", { params: params });
  }

  public getHostUsernames():Observable<any>{
    return this.http.get(`${this.baseUrl}` +"/metering/api/v1/host/getHostUsernames");
  }

  public getInfrastructureReport(ipConfigurations: any[]): Observable<any> {
    return this.http.post(`${this.baseUrl}` + `/report/api/infrastructure`, { ipConfigurations });
  }

  public isReportFileExists(appName: any, userType: any, type: string): Observable<any> {
    let params = new HttpParams()
      .set('appName', appName.toString())
      .set('userType', userType.toString())
      .set('type', type.toString())
    return this.http.get(`${this.baseUrl}` + `/netra/reports/isReportFileExists`, { params: params });
  }

  public readReportFile(appName: any, userType: any, type: string): Observable<any> {
    let params = new HttpParams()
      .set('appName', appName.toString())
      .set('userType', userType.toString())
      .set('type', type.toString())
    return this.http.get(`${this.baseUrl}` + `/netra/reports/readReportFile`, { params: params });
  }

  public getApplicationReport(userId: any, userType: any, appName: any, st: any, et: any, type: string): Observable<any> {
    let params = new HttpParams()
      .set('userId', userId.toString())
      .set('userType', userType.toString())
      .set('appName', appName.toString())
      .set('st', st.toString())
      .set('et', et.toString())
      .set('type', type.toString())
    return this.http.get(`${this.baseUrl}` + `/netra/reports/getApplicationReport`, { params: params });
  }

}
