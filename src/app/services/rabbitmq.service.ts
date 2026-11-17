import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ServiceResponse } from '../models/common/ServiceResponse';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class RabbitmqService {
   private baseUrl = environment.baseUrl + '/rabbitmq/v1';
// private baseUrl = "http://localhost:12043" + '/rabbitmq/v1';

  constructor(private http: HttpClient) { }

  // Cluster Overview APIs
  getAllClusterDetails(clusterList: string[], st: string, et: string, currentPage: number = -1, pageSize: number = -1): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('st', st).set('et', et).set('currentPage', currentPage).set('pageSize', pageSize);
    return this.http.post<ServiceResponse<any>>(`${this.baseUrl}/overview/getAllClusterDetails`, clusterList, { params });
  }

  getClusterKPIs(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/overview/getClusterKPIs`, { params });
  }

  getInstancesData(entityId: string, st: number, et: number, currentPage: number = -1, pageSize: number = -1): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et).set('currentPage', currentPage).set('pageSize', pageSize);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/overview/getInstancesData`, { params });
  }

  getMessageRates(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/overview/getMessageRates`, { params });
  }

  getQueuedMessages(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/overview/getQueuedMessages`, { params });
  }

  getClusterMemoryUsage(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/overview/getClusterMemoryUsage`, { params });
  }

  getResourceUsage(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/overview/getResourceUsage`, { params });
  }

  getChurnRates(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/overview/getChurnRates`, { params });
  }

  getErlangMemoryData(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/overview/getErlangMemoryData`, { params });
  }

  getMessageFunnel(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/overview/getMessageFunnel`, { params });
  }

  // Node APIs
  getNodeMemoryUtilization(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/node/getMemoryUtilization`, { params });
  }

  getNodeMemoryUsage(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/node/getMemoryUsage`, { params });
  }

  getNodeMessageStats(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/node/getMessageStats`, { params });
  }

  getNodeQueueStats(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/node/getQueueStats`, { params });
  }



  getNodeKPIs(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/node/getNodeKPIs`, { params });
  }

  getNodeConnectionsAndChannels(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/node/getConnectionsAndChannels`, { params });
  }

  getNodeConsumersAndPublishers(entityId: string, st: number, et: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams().set('entityId', entityId).set('st', st).set('et', et);
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/node/getConsumersAndPublishers`, { params });
  }
}
