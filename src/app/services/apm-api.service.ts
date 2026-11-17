import { Injectable } from '@angular/core';
import { User } from '../models/user';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceData } from '../models/serviceApm';

@Injectable({
  providedIn: 'root'
})
export class ApmApiService {

  private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://localhost:12022';

  constructor(private http: HttpClient) { }

  // getAllAppListAndIpListByUserID(user: User, type: string) {
  //   return this.http.post(`${this.baseUrl}/application/api/getAllAppListAndIpListByUserID`, user, {
  //     params: { type: type }
  //   });
  // }

  public getServiceTableData(
    entityIds: any[],
    startTime: number,
    endTime: number
  ): Observable<ServiceData[]> {
    const body = {
      entityIds: entityIds,
      st: startTime,
      et: endTime
    };

    return this.http.post<ServiceData[]>(`${this.baseUrl}/apm/api/service/combinedData`, body);
  }

  public getAlertCounts(applicationType: string, appId: string, startTime: string, endTime: string) {
    let params = new HttpParams()
      .set('applicationType', applicationType.toString())
      .set('appId', appId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());

    return this.http.get(`${this.baseUrl}` + "/apm/api/service/getAlertCounts", { params });
  }

  public getApplicationData(applicationId: string) {
    let params = new HttpParams()
      .set('applicationId', applicationId.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/getApplicationData", { params });
  }

  public getErrorCount(serviceId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('serviceId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/getErrorCount", { params });
  }

  public getServiceLoadTimeValue(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());

    return this.http.get(`${this.baseUrl}` + "/apm/api/service/serviceLoadTimeValue", { params });
  }

  public getSuccessRateTimeValue(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());

    return this.http.get(`${this.baseUrl}` + "/apm/api/service/successRateTimeValue", { params });
  }

  public getServiceAvgResponseTime(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/serviceAvgResponseTime", { params });
  }

  public getServiceApdexTimeValue(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/serviceApdexTimeValue", { params });
  }

  public getServiceResponseTimePercentile(entityId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/service/serviceResponseTimePercentile"
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/serviceResponseTimePercentile", { params });
  }

  public getServiceInstanceLoad(entityId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/service/serviceInstancesLoad"
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/serviceInstancesLoad", { params });
  }

  public getSlowServiceInstance(entityId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/service/slowServiceInstances"
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/slowServiceInstances", { params });
  }

  public getServiceInstanceSuccessRate(entityId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/service/serviceInstancesSuccessRate"
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/serviceInstancesSuccessRate", { params });
  }

  public getEndpointsLoadInCurrentService(entityId: string, startTime: number, endTime: number): Observable<any[]> {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());
    return this.http.get<any[]>(`${this.baseUrl}` + "/apm/api/service/endpointsLoadInCurrentService", { params });
  }

  public getSlowEndpointsInCurrentService(entityId: string, startTime: number, endTime: number): Observable<any[]> {
    // let url=this.baseUrl+"/apm/api/service/slowEndpointsInCurrentService"
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get<any[]>(`${this.baseUrl}` + "/apm/api/service/slowEndpointsInCurrentService", { params });
  }

  public getEndpointSuccessRateInCurrentService(entityId: string, startTime: number, endTime: number): Observable<any[]> {
    // let url=this.baseUrl+"/apm/api/service/endpointSuccessRateInCurrentService"
    let params = new HttpParams().set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get<any[]>(`${this.baseUrl}` + "/apm/api/service/endpointSuccessRateInCurrentService", { params });
  }

  public getHealthScoreValue(appId: any, entityId: string, componentId: string, startTime: number, startTimeCurrent: number, endTime: number, type: string, infraID?: string, infraType?: any): Observable<any[]> {
    let params = new HttpParams()
      .set('appId', appId.toString())
      .set('entityId', entityId.toString())
      .set('componentId', componentId.toString())
      .set('st', startTime.toString())
      .set('stCurrent', startTimeCurrent.toString())
      .set('et', endTime.toString())
      .set('type', type.toString())
    if (infraID !== undefined) {
      params = params.set('infraID', infraID.toString())
    }
    if (infraType !== undefined) {
      params = params.set('infraType', infraType.toString())
    }
    return this.http.get<any[]>(`${this.baseUrl}` + "/apm/api/service/getHealthScoreValue", { params });
  }

  public getAppWeight(appId: number): Observable<any> {
    let params = new HttpParams()
      .set('appId', appId);

    return this.http.get<any>(`${this.baseUrl}` + "/apm/api/service/getAppWeight", { params });
  }

  public saveAppWeight(appId: any, appWeight: number, infraWeight: number, dbWeight: number, user: any): Observable<string> {
    let params = new HttpParams()
      .set('appId', appId.toString())
      .set('appWeight', appWeight.toString())
      .set('infraWeight', infraWeight.toString())
      .set('dbWeight', dbWeight.toString());

    return this.http.post(`${this.baseUrl}` + "/apm/api/service/saveAppWeight", user, { params, responseType: 'text' });
  }

  public deleteAppWeight(appId: number, user: any): Observable<string> {
    let params = new HttpParams()
      .set('appId', appId.toString())

    return this.http.delete(`${this.baseUrl}` + "/apm/api/service/deleteAppWeight", { params, body: user, responseType: 'text' });
  }

  public getUptimeService(entityId: string, date: string): Observable<any[]> {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('date', date.toString())

    return this.http.get<any[]>(`${this.baseUrl}` + "/apm/api/service/getUptime", { params });
  }

  // HERE 

  public getServiceInstanceLoadTimevalues(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/overview/serviceInstanceLoadTimevalues"
    let params = new HttpParams()
      .set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/overview/serviceInstanceLoadTimevalues", { params });
  }

  public getServiceInstanceSuccessRateTimevalues(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/overview/serviceInstanceSuccessRateTimevalues"
    let params = new HttpParams()
      .set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/overview/serviceInstanceSuccessRateTimevalues", { params });
  }

  public getServiceInstanceLatencyTimevalues(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/overview/serviceInstanceLatencyTimevalues"
    let params = new HttpParams()
      .set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/overview/serviceInstanceLatencyTimevalues", { params });
  }

  public getServiceInstanceNames(entityId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/overview/serviceInstanceNames"
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/overview/serviceInstanceNames", { params });
  }

  public getCombinedData(entityIds: string[], startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/overview/combinedData"
    const body = {
      entityIds: entityIds,
      st: startTime.toString(),
      et: endTime.toString()
    };
    return this.http.post(`${this.baseUrl}` + "/apm/api/instances/overview/combinedData", body);
  }

  public getEndpointNames2(entityId: string, startTime: number, endTime: number, size?: number, page?: number, searchWord?: string) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());
    if (size !== undefined) {
      params = params.set('size', size.toString());
    }
    if (page !== undefined) {
      params = params.set('page', page.toString());
    }
    if (searchWord !== undefined) {
      params = params.set('endpoint', searchWord); // searchWord is mapped to 'endpoint'
    }
    return this.http.get(`${this.baseUrl}/apm/api/endpoint/overview/endpointNames`, { params });
  }

  public endpointNamesUpdated(entityId: string, startTime: number, endTime: number, size?: number, page?: number, searchWord?: string, sortBy?: string, order?: string, filter?: string) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());
    if (size !== undefined) {
      params = params.set('size', size.toString());
    }
    if (page !== undefined) {
      params = params.set('page', page.toString());
    }
    if (searchWord !== undefined) {
      params = params.set('endpoint', searchWord);
    }
    if (sortBy !== undefined) {
      params = params.set('sortBy', sortBy);
    }
    if (order !== undefined) {
      params = params.set('order', order);
    }
    if (filter !== undefined) {
      params = params.set('filter', filter);
    }
    return this.http.get(`${this.baseUrl}/apm/api/endpoint/overview/endpointNamesUpdated`, { params });
  }

  public getEndpointApiType(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', startTime.toLocaleString('fullwide', { useGrouping: false }))
      .set('et', endTime.toLocaleString('fullwide', { useGrouping: false }))
    return this.http.get(`${this.baseUrl}` + "/apm/api/endpoint/overview/getEndpointApiType", { params });
  }

  public getEndpointCombinedData(entityEndpointId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityEndpointId.toString())
      .set('st', startTime.toLocaleString('fullwide', { useGrouping: false }))
      .set('et', endTime.toLocaleString('fullwide', { useGrouping: false }))
    return this.http.get(`${this.baseUrl}` + "/apm/api/endpoint/overview/combinedData", { params });
  }

  public getTotalHits(entityEndpointId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityEndpointId.toString())
      .set('st', startTime.toLocaleString('fullwide', { useGrouping: false }))
      .set('et', endTime.toLocaleString('fullwide', { useGrouping: false }))
    return this.http.get(`${this.baseUrl}` + "/apm/api/endpoint/overview/getTotalHits", { params });
  }

  public getEndpointLoad(entityEndpointId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityEndpointId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/endpoint/overview/endpointLoad", { params });
  }

  public getEndpointSuccessRate(entityEndpointId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityEndpointId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/endpoint/overview/endpointSuccessRate", { params });
  }

  public getEndpointAvgResponseTime(entityEndpointId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityEndpointId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/endpoint/overview/endpointAvgResponseTime", { params });
  }

  public getTraceMetaData(traceId: string) {
    let params = new HttpParams().set('traceId', traceId.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/trace/traceData", { params });
  }

  public getLogsData(entityId: string, startTime: number, endTime: number, page?: number, size?: number, instanceId?: string, endpointId?: string,
    traceId?: string, tags?: string, excludingKeywordsOfContent?: string, keywordsOfContent?: string, sort?: boolean
  ) {
    // let url=this.baseUrl+"/apm/api/logs/logsContent"
    let params = new HttpParams().set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    if (page !== undefined) {
      params = params.set('page', page.toString());
    }
    if (size !== undefined) {
      params = params.set('size', size.toString());
    }
    if (instanceId !== undefined) {
      params = params.set('instanceId', instanceId.toString())
    }
    if (endpointId !== undefined) {
      params = params.set('endpointId', endpointId.toString())
    }
    if (traceId !== undefined) {
      params = params.set('traceId', traceId.toString())
    }
    if (tags !== undefined) {
      params = params.set('tags', tags.toString())
    }
    if (excludingKeywordsOfContent !== undefined) {
      params = params.set('excludingKeywordsOfContent', excludingKeywordsOfContent.toString())
    }
    if (keywordsOfContent !== undefined) {
      params = params.set('keywordsOfContent', keywordsOfContent.toString())
    }
    if (sort !== undefined) {
      params = params.set('sort', sort.toString())
    }
    return this.http.get(`${this.baseUrl}` + "/apm/api/logs/logsContent", { params });
  }

  public getLogsCountTimeSeries(entityId: string, startTime: number, endTime: number,
    instanceId?: string, endpointId?: string, traceId?: string, tags?: string, excludingKeywordsOfContent?: string, keywordsOfContent?: string
  ) {
    // let url=this.baseUrl+"/apm/api/logs/logsContent"
    let params = new HttpParams().set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    if (instanceId !== undefined) {
      params = params.set('instanceId', instanceId.toString())
    }
    if (endpointId !== undefined) {
      params = params.set('endpointId', endpointId.toString())
    }
    if (traceId !== undefined) {
      params = params.set('traceId', traceId.toString())
    }
    if (tags !== undefined) {
      params = params.set('tags', tags.toString())
    }
    if (excludingKeywordsOfContent !== undefined) {
      params = params.set('excludingKeywordsOfContent', excludingKeywordsOfContent.toString())
    }
    if (keywordsOfContent !== undefined) {
      params = params.set('keywordsOfContent', keywordsOfContent.toString())
    }
    return this.http.get<{ content: string, tags: string, traceId: string | null, instance: string, timeBucket: number | null, endpointId: string | null }[]>(`${this.baseUrl}` + "/apm/api/logs/getLogsCountTimeSeries", { params });
  }

  public getLogsAggregatedData(entityId: string, startTime: number, endTime: number,
    instanceId?: string, endpointId?: string, traceId?: string, tags?: string, excludingKeywordsOfContent?: string, keywordsOfContent?: string
  ) {
    // let url=this.baseUrl+"/apm/api/logs/logsContent"
    let params = new HttpParams().set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    if (instanceId !== undefined) {
      params = params.set('instanceId', instanceId.toString())
    }
    if (endpointId !== undefined) {
      params = params.set('endpointId', endpointId.toString())
    }
    if (traceId !== undefined) {
      params = params.set('traceId', traceId.toString())
    }
    if (tags !== undefined) {
      params = params.set('tags', tags.toString())
    }
    if (excludingKeywordsOfContent !== undefined) {
      params = params.set('excludingKeywordsOfContent', excludingKeywordsOfContent.toString())
    }
    if (keywordsOfContent !== undefined) {
      params = params.set('keywordsOfContent', keywordsOfContent.toString())
    }
    return this.http.get(`${this.baseUrl}` + "/apm/api/logs/logsAggregatedData", { params });
  }

  public getEndpoint(entityId: string, startTime: number, endTime: number, size: number, page: number) {
    // let url=this.baseUrl+"/apm/api/endpoint/overview/endpointNames"
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('size', size.toString())
      .set('page', page.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/endpoint/overview/endpointNames", { params });
  }

  public getDatabaseAvgResponseTime(entityId: string, serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('serviceId', serviceId.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/database/visualDatabaseAvgResponseTime", { params });
  }

  public getDatabaseAccessSuccessRate(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams()
      .set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/database/visualDatabaseAccessSuccessRate", { params });
  }

  public getDatabaseTraffic(entityId: string, serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams()
      .set('serviceId', serviceId.toString())
      .set('entityId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/database/visualDatabaseTraffic", { params });
  }

  public getDatabaseAccessLatencyPercentile(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams()
      .set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/database/databaseAccessLatencyPercentile", { params });
  }

  public getDatabaseSlowStatements(entityId: string, serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('serviceId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/database/visualDatabaseSlowStatements", { params });
  }

  public getDatabaseNamesForServices(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams()
      .set('serviceId', serviceId.toString())
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/database/visualDatabaseNames", { params });
  }

  public getServiceTopology(serviceId: string, startTime: number, endTime: number, level?: number): Observable<any> {
    let params = new HttpParams()
      .set('serviceId', serviceId.toString())
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString());
    if (level !== undefined) {
      params = params.set('level', level.toString());
    }
    return this.http.get(`${this.baseUrl}` + "/apm/api/topology/serviceTopology", { params });
  }

  public getCombinedDataTopology(serviceId: string, startTime: number, endTime: number, componentId: string): Observable<any> {
    let params = new HttpParams()
      .set('serviceName', serviceId.toString())
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
      .set('componentId', componentId.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/topology/combinedData", { params });
  }

  public getSuccessRate(entityId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/service/successRate"
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/successRate", { params });
  }

  public getServiceLoad(entityId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/service/serviceLoad"
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/serviceLoad", { params });
  }

  public getServiceLatency(entityInstanceId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/service/serviceLatency", { params });
  }

  public getTracesData(entityId: string, startTime: number, endTime: number, page?: number, sortBy?: string, order?: string, instanceId?: string, traceState?: number, 
    endpointId?: string, traceId?: string, minDuration?: number, maxDuration?: number, rowsPerPageTrace?: number, statusCode?: string, tags?: string) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    if (page !== undefined) {
      params = params.set('page', page.toString());
    }
    if (sortBy) {
      params = params.set('sortBy', sortBy.toString());
    }
    if (order) {
      params = params.set('order', order.toString());
    }
    if (instanceId !== undefined) {
      params = params.set('instanceId', instanceId.toString())
    }
    if (traceState !== undefined) {
      params = params.set('traceState', traceState.toString());
    }
    if (endpointId !== undefined) {
      params = params.set('endpointId', endpointId.toString())
    }
    if (traceId !== undefined) {
      params = params.set('traceId', traceId.toString())
    }
    if (minDuration !== undefined) {
      params = params.set('minTraceDuration', minDuration.toString())
    }
    if (maxDuration !== undefined) {
      params = params.set('maxTraceDuration', maxDuration.toString())
    }
    if (statusCode !== undefined) {
      params = params.set('statusCode', statusCode.toString())
    }
    if (tags !== undefined) {
      params = params.set('tags', tags.toString())
    }
    return this.http.get(`${this.baseUrl}` + "/apm/api/trace/traceSegments", { params });
  }

  public getTraceSegmentsCount(entityId: string, startTime: number, endTime: number, instanceId?: string, traceState?: number, 
    endpointId?: string, traceId?: string, minDuration?: number, maxDuration?: number, statusCode?: string, tags?: string) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    if (instanceId !== undefined) {
      params = params.set('instanceId', instanceId.toString())
    }
    if (traceState !== undefined) {
      params = params.set('traceState', traceState.toString());
    }
    if (endpointId !== undefined) {
      params = params.set('endpointId', endpointId.toString())
    }
    if (traceId !== undefined) {
      params = params.set('traceId', traceId.toString())
    }
    if (minDuration !== undefined) {
      params = params.set('minTraceDuration', minDuration.toString())
    }
    if (maxDuration !== undefined) {
      params = params.set('maxTraceDuration', maxDuration.toString())
    }
    if (statusCode !== undefined) {
      params = params.set('statusCode', statusCode.toString())
    }
    if (tags !== undefined) {
      params = params.set('tags', tags.toString())
    }
    return this.http.get(`${this.baseUrl}` + "/apm/api/trace/traceSegmentsCount", { params });
  }

  // general-instance

  public getServiceInstanceDatabaseConnectionPool(entityInstanceId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/overview/serviceInstanceDatabaseConnectionPool", { params });
  }

  public getServiceInstanceThreadPool(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/overview/serviceInstanceThreadPool"
    let params = new HttpParams().set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/overview/serviceInstanceThreadPool", { params });
  }

  // JVM Part

  public getJvmCpu(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/jvm/jvmCpu"
    let params = new HttpParams().set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/jvm/jvmCpu", { params });
  }

  public getJvmMemory(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/jvm/jvmMemory"
    let params = new HttpParams().set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/jvm/jvmMemory", { params });
  }

  public getJvmMemoryDetail(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/jvm/jvmMemoryDetail"
    let params = new HttpParams().set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/jvm/jvmMemoryDetail", { params });
  }

  public getJvmGCTime(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/jvm/jvmGCTime"
    let params = new HttpParams().set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/jvm/jvmGCTime", { params });
  }

  public getJvmGCCount(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/jvm/jvmGCCount"
    let params = new HttpParams().set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/jvm/jvmGCCount", { params });
  }
  public getJvmThreadCount(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/jvm/jvmThreadCount"
    let params = new HttpParams().set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/jvm/jvmThreadCount", { params });
  }

  public getJvmThreadStateCount(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/jvm/jvmThreadStateCount"
    let params = new HttpParams().set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/jvm/jvmThreadStateCount", { params });
  }

  public getJvmClassCount(entityInstanceId: string, startTime: number, endTime: number) {
    // let url=this.baseUrl+"/apm/api/instances/jvm/jvmClassCount"
    let params = new HttpParams().set('entityId', entityInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/jvm/jvmClassCount", { params });
  }

  // PVM Part

  public getPvmCpuUtilization(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/pvm/pvmCpuUtilization", { params });
  }

  public getPvmThreadCount(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/pvm/pvmThreadCount", { params });
  }

  public getPvmGCCount(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/pvm/pvmGCCount", { params });
  }

  public getPvmMemUtilization(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/pvm/pvmMemUtilization", { params });
  }

  public getPvmGCTime(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/pvm/pvmGCTime", { params });
  }

  // Golang

  public getMemoryHeapSize(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/memoryHeapSize", { params });
  }

  public getLiveThreadsNum(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/liveThreadsNum", { params });
  }

  public getGoRoutineScheduleTime(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/goRoutineScheduleTime", { params });
  }

  public getGcCountPerMinute(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/gcCountPerMinute", { params });
  }

  public getGcPauseTimePerMinute(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/gcPauseTimePerMinute", { params });
  }

  public getGcGoalSize(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/gcGoalSize", { params });
  }

  public getGcFreeSize(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/gcFreeSize", { params });
  }

  public getHeapAllocSize(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/heapAllocSize", { params });
  }

  public getHeapObjectCount(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/heapObjectCount", { params });
  }

  public getFreeSizePerMinute(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/freeSizePerMinute", { params });
  }

  public getAllocSizePerMinute(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/allocSizePerMinute", { params });
  }

  public getMetaDataMspan(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/metaDataMspan", { params });
  }

  public getMetaDataMcache(serviceId: string, startTime: number, endTime: number): Observable<any> {
    let params = new HttpParams().set('entityId', serviceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/golang/metaDataMcache", { params });
  }

  // .Net

  public getClrCpu(entityEndpointId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set('entityId', entityEndpointId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/dotnet/getClrCpu", { params });
  }

  public getClrGc(entityEndpointId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set('entityId', entityEndpointId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/dotnet/getClrGc", { params });
  }

  public getClrHeapMemory(entityEndpointId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set('entityId', entityEndpointId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/dotnet/getClrHeapMemory", { params });
  }

  public getClrThread(entityEndpointId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set('entityId', entityEndpointId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/dotnet/getClrThread", { params });
  }

  // General Endpoint

  public getEndpointResponseTimePercentile(entityEndpointId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set('entityId', entityEndpointId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/endpoint/overview/endpointResponseTimePercentile", { params });
  }

  public getInstanceOverviewKpi(serviceId: string, serviceInstanceId: string, startTime: number, endTime: number) {
    let params = new HttpParams()
      .set('serviceId', serviceId.toString())
      .set('serviceInstanceId', serviceInstanceId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/apm/api/instances/overview/serviceInstanceKpi", { params });
  }

  getUptimeAvailability(entityId: string, date: string): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('date', Number(date));

    return this.http.get<any>(`${this.baseUrl}/apm/api/instances/overview/getUptime`, { params });
  }



  // HEALTH SCORE METRIC

  public getHealthScoreMetrics(userType: string, serviceType: string, appId: number, infraId?: any) {
    let params = new HttpParams()
      .set('userType', userType.toString())
      .set('serviceType', serviceType.toString())
      .set('appId', appId.toString())
    if (infraId !== null) {
      params = params.set('infraId', infraId.toString());
    }
    return this.http.get(`${this.baseUrl}/apm/api/healthScoreMetric/getHealthScoreMetrics`, { params });
  }

  public getMetricName(userType: string, serviceType: string, appId: number, infraId?: any) {
    let params = new HttpParams()
      .set('userType', userType.toString())
      .set('serviceType', serviceType.toString())
      .set('appId', appId.toString())
    if (infraId !== null) {
      params = params.set('infraId', infraId.toString());
    }
    return this.http.get(`${this.baseUrl}/apm/api/healthScoreMetric/getMetricName`, { params });
  }

  public createHealthScoreMetricConfig(userType: string, response: any) {
    let params = new HttpParams()
      .set('userType', userType.toString())
    return this.http.post(`${this.baseUrl}/apm/api/healthScoreMetric/createHealthScoreMetricConfig`, response, { params });
  }

  public updateHealthScoreMetricConfig(userType: string, response: any) {
    let params = new HttpParams()
      .set('userType', userType.toString())
    return this.http.post(`${this.baseUrl}/apm/api/healthScoreMetric/updateHealthScoreMetricConfig`, response, { params });
  }

  public deleteHealthScoreMetricConfig(userType: string, response: any) {
    let params = new HttpParams()
      .set('userType', userType.toString())
    return this.http.delete(`${this.baseUrl}/apm/api/healthScoreMetric/deleteHealthScoreMetricConfig`, { params, body: response });
  }

}