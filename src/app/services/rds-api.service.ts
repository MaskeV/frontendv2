import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class RdsApiService {

  private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://localhost:12037';

  private baseApi = '/rds/api/overview';

  constructor(private http: HttpClient) { }

  // PERFORMANCE

  public getCpuUtilization(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/cpuUtilization`, { params: params });
  }

  public getFreeableMemory(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/freeableMemory`, { params: params });
  }

  public getRdsSwapUsage(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/rdsSwapUsage`, { params: params });
  }

  public getDatabaseConnections(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/databaseConnections`, { params: params });
  }

  // STORAGE

  public getFreeStorageSpace(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/freeStorageSpace`, { params: params });
  }

  public getDiskQueueDepth(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/diskQueueDepth`, { params: params });
  }

  public getReadLatency(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/readLatency`, { params: params });
  }

  // IO

  public getReadIops(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/readIops`, { params: params });
  }

  public getWriteIops(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/writeIops`, { params: params });
  }

  public getReadThroughput(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/readThroughput`, { params: params });
  }

  public getWriteThroughput(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/writeThroughput`, { params: params });
  }

  // NETWORK

  public getNetworkReceiveThroughput(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/networkReceiveThroughput`, { params: params });
  }

  public getNetworkTransmitThroughput(entityId: string, startTime: number, endTime: number) {
    let params = new HttpParams().set("entityId", entityId)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}/networkTransmitThroughput`, { params: params });
  }

  
}
