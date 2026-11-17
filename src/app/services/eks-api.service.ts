import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EksApiService {

  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  public getNodeCount(entityId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', entityId)
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/eks/api/overview/nodeCount", { params: params });
  }

  public getFailedNodeCount(entityId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', entityId)
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/eks/api/overview/failedNodeCount", { params: params });
  }

  public getNameSpaceCount(entityId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', entityId)
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/eks/api/overview/namespaceCount", { params: params });
  }

  public getServiceCount(entityId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', entityId)
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/eks/api/overview/serviceCount", { params: params });
  }

  public getNetRXDropped(entityId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', entityId)
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/eks/api/overview/netrxDropped", { params: params });
  }

  public getNetRXError(entityId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', entityId)
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/eks/api/overview/getnetrxError", { params: params });
  }

  public getNetTXDropped(entityId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', entityId)
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/eks/api/overview/nettxDropped", { params: params });
  }

  public getNetTXError(entityId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', entityId)
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/eks/api/overview/netrxError", { params: params });
  }

  public getNodeList(entityId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', entityId)
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/eks/api/overview/instanceList", { params: params });
  }

  public getServiceList(entityId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', entityId)
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/eks/api/overview/serviceList", { params: params });
  }


  // Endpoint

  public getCpuUtilization(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/database/v1/eks/pod/getCpuUtilization`, { params: params });
  }

  public getMemoryUtilization(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/database/v1/eks/pod/getMemoryUtilization`, { params: params });
  }

  public getNetworkTx(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/database/v1/eks/pod/getNetworkTx`, { params: params });
  }

  public getNetworkTxError(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/database/v1/eks/pod/getNetworkTxError`, { params: params });
  }

  public getNetworkRx(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/database/v1/eks/pod/getNetworkRx`, { params: params });
  }

  public getNetworkRxError(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/database/v1/eks/pod/getNetworkRxError`, { params: params });
  }

  // Instance


  public getPodCount(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getPodCount`, { params: params });
  }

  public getCpuUtilizationInstance(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getCpuUtilization`, { params: params });
  }

  public getMemoryUtilizationInstance(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getMemoryUtilization`, { params: params });
  }

  public getNetworkRxInstance(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getNetworkRx`, { params: params });
  }

  public getNetworkRxErrorCount(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getNetworkRxErrorCount`, { params: params });
  }

  public getNetworkTxInstance(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getNetworkTx`, { params: params });
  }

  public getNetworkTxErrorCount(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getNetworkTxErrorCount`, { params: params });
  }

  public getFsUtilization(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getFsUtilization`, { params: params });
  }

  public getDiskIORead(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getDiskIORead`, { params: params });
  }

  public getDiskIOWrite(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getDiskIOWrite`, { params: params });
  }




  public getCpuUtilizationPod(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getPodCpuUtilization`, { params: params });
  }

  public getMemoryUtilizationPod(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getPodMemoryUtilization`, { params: params });
  }

  public getNetworkTxPod(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getPodNetworkTx`, { params: params });
  }

  public getNetworkTxErrorPod(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getPodNetworkTxErrorCount`, { params: params });
  }

  public getNetworkRxPod(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getPodNetworkRx`, { params: params });
  }

  public getNetworkRxErrorPod(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/eks/api/node/getPodNetworkRxErrorCount`, { params: params });
  }
}