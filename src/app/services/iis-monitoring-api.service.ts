import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class IisMonitoringApiService {

  private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://localhost:12021';
  
  private baseApi = '/infra/api/iis';

  constructor(private http: HttpClient) { }

  public getIisVersionInfo(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getIisVersionInfo`, { params: params });
  }

  public getAppPoolState(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getAppPoolState`, { params: params });
  }

  public getAppPoolStartTime(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getAppPoolStartTime`, { params: params });
  }

  public getWorkerProcessState(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getWorkerProcessState`, { params: params });
  }

   public getHttpRequestMetrics(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getHttpRequestMetrics`, { params: params });
  }

  public getServerCacheOps(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getServerCacheOps`, { params: params });
  }

  public getFileCacheItems(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getFileCacheItems`, { params: params });
  }

  public getFileCacheHits(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getFileCacheHits`, { params: params });
  }

  public getFileCacheMem(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getFileCacheMem`, { params: params });
  }

  public getMetadataCacheItems(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getMetadataCacheItems`, { params: params });
  }

  public getMetadataCacheHits(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getMetadataCacheHits`, { params: params });
  }

  public getOutputCacheMetrics(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getOutputCacheMetrics`, { params: params });
  }

  public getUriCacheEfficiency(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getUriCacheEfficiency`, { params: params });
  }

  public getUriCacheUsage(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getUriCacheUsage`, { params: params });
  }

  public getUriCacheMaintenance(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getUriCacheMaintenance`, { params: params });
  }

  public getAppPoolMetrics(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getAppPoolMetrics`, { params: params });
  }

  public getWorkerProcessStability(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getWorkerProcessStability`, { params: params });
  }

  public getWorkerProcessFailure(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getWorkerProcessFailure`, { params: params });
  }

  public getWorkerProcessCreation(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getWorkerProcessCreation`, { params: params });
  }

  public getCombinedData(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/getCombinedData`, { params: params });
  }

}
