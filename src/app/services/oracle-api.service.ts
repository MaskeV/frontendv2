import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OracleApiService {

  private baseUrl = environment.baseUrl;
  // private baseUrl2 = 'http://localhost:12040';

  private baseApi = '/database/oracle/inspections';
  private baseApi2 = '/database/oracle/instance';

  constructor(private http: HttpClient) { }

  // COMBINED DATA

  public getCombinedData(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getCombinedData`, { params: params });
  }

  // SESSION

  public getActiveSession(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getActiveSession`, { params: params });
  }

  public getTotalSession(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getTotalSession`, { params: params });
  }

  public getMaxSession(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getMaxSession`, { params: params });
  }

  public getSessionDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getSessionDetails`, { params: params });
  }

  public getSessionUtilization(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getSessionUtilization`, { params: params });
  }

  // PROCESSS

  public getMaxProcess(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getMaxProcess`, { params: params });
  }

  public getUsedProcess(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getUsedProcess`, { params: params });
  }

  public getAvailableProcess(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getAvailableProcess`, { params: params });
  }

  public getProcessDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getProcessDetails`, { params: params });
  }

  // PERF & CACHING

  public getBufferCacheHitRatio(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getBufferCacheHitRatio`, { params: params });
  }

  public getOpenCursor(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getOpenCursor`, { params: params });
  }

  // ERROR / LOCK METRICS

  public getDeadlock(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getDeadlock`, { params: params });
  }

  public getUserError(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getUserError`, { params: params });
  }

  public getConnectionError(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getConnectionError`, { params: params });
  }

  // QUERY METRICS

  public getCurrentQps(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getCurrentQps`, { params: params });
  }

  public getSlowQueryRate(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getSlowQueryRate`, { params: params });
  }

  public getCommandTrend(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getCommandTrend`, { params: params });
  }

  // CONNECTS

  public getTotalConnect(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getTotalConnect`, { params: params });
  }

  public getActiveConnect(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getActiveConnect`, { params: params });
  }

  public getConnectsDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getConnectsDetails`, { params: params });
  }

  // STALE AND LOCK

  public getStaleQueryCount(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getStaleQueryCount`, { params: params });
  }

  public getLockDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getLockDetails`, { params: params });
  }

  // SLOW STATEMENTS

  public getSlowQueries(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getSlowQueries`, { params: params });
  }

  public getSlowQueryDurationBuckets(entityId: string, startTime: number, endTime: number, responseType: string, ranges: { min: number; max: number }[]) {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('responseType', responseType);
    return this.http.post(`${this.baseUrl}${this.baseApi}/getSlowQueryDurationBuckets`, ranges, { params });
  }

  public getLockQueryDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getLockQueryDetails`, { params: params });
  }



  // INSTANCE

  public getInstancesData(entityId: string, startTime: number, endTime: number, currentPage: number, pagsSize: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('currentPage', currentPage.toString())
      .set('pageSize', pagsSize.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getInstancesData`, { params: params });
  }

  public getInstanceCombinedData(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getCombinedData`, { params: params });
  }

  public getInstanceActiveSession(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getActiveSession`, { params: params });
  }

  public getInstanceTotalSession(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getTotalSession`, { params: params });
  }

  public getInstanceMaxSession(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getMaxSession`, { params: params });
  }

  public getInstanceSessionDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getSessionDetails`, { params: params });
  }

  public getInstanceSessionUtilization(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getSessionUtilization`, { params: params });
  }

  // PROCESSS

  public getInstanceMaxProcess(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getMaxProcess`, { params: params });
  }

  public getInstanceUsedProcess(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getUsedProcess`, { params: params });
  }

  public getInstanceAvailableProcess(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getAvailableProcess`, { params: params });
  }

  public getInstanceProcessDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getProcessDetails`, { params: params });
  }

  // PERF & CACHING

  public getInstanceBufferCacheHitRatio(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getBufferCacheHitRatio`, { params: params });
  }

  public getInstanceOpenCursor(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getOpenCursor`, { params: params });
  }

  // ERROR / LOCK METRICS

  public getInstanceDeadlock(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getDeadlock`, { params: params });
  }

  public getInstanceUserError(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getUserError`, { params: params });
  }

  public getInstanceConnectionError(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getConnectionError`, { params: params });
  }

  // QUERY METRICS

  public getInstanceCurrentQps(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getCurrentQps`, { params: params });
  }

  public getInstanceSlowQueryRate(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getSlowQueryRate`, { params: params });
  }

  public getInstanceCommandTrend(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getCommandTrend`, { params: params });
  }

  // CONNECTS

  public getInstanceTotalConnect(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getTotalConnect`, { params: params });
  }

  public getInstanceActiveConnect(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getActiveConnect`, { params: params });
  }

  public getInstanceConnectsDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getConnectsDetails`, { params: params });
  }

  // STALE AND LOCK

  public getInstanceStaleQueryCount(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getStaleQueryCount`, { params: params });
  }

  public getInstanceLockDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi2}/getLockDetails`, { params: params });
  }

  // DATABASE OBJECTS METRICS

  public getProceduresDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getProcedureDetails`, { params: params });
  }

  public getFunctionsDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getFunctionDetails`, { params: params });
  }

  public getPackagesDetails(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getPackagesDetails`, { params: params });
  }

  public getLocksByType(entityId: string, st: string, et: string): Observable<any> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get<any>(`${this.baseUrl}${this.baseApi}/getLocksByType`, { params: param });
  }

  public getProcedureExecution(entityId: string, st: string, et: string): Observable<any> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get<any>(`${this.baseUrl}${this.baseApi}/getProcedureExecution`, { params: param });
  }

  public getProcedureError(entityId: string, st: string, et: string): Observable<any> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get<any>(`${this.baseUrl}${this.baseApi}/getProcedureError`, { params: param });
  }

  public getOracleLocks(entityId: string, st: string, et: string): Observable<any> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get<any>(`${this.baseUrl}${this.baseApi}/getOracleLocks`, { params: param });
  }

  public getOracleSlowQueries(entityId: string, st: string, et: string): Observable<any> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get<any>(`${this.baseUrl}${this.baseApi}/getOracleSlowQueries`, { params: param });
  }

  public getOracleInvalidSp(entityId: string, st: string, et: string): Observable<any> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get<any>(`${this.baseUrl}${this.baseApi}/getOracleInvalidSp`, { params: param });
  }
}
