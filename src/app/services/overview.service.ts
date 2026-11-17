import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceResponse } from '../models/common/ServiceResponse';
import { User } from '../models/user';

export interface HostHealthData {
  x: number;
  y: number;
  value: number;
  name: string;
  custom: { latency: number };
}

export interface ServiceHealthData {
  x: number;
  y: number;
  value: number;
  name: string;
  custom: { latency: number };
}

export interface DatabaseHealthData {
  x: number;
  y: number;
  value: number;
  name: string;
  custom: { latency: number };
}

export interface NetworkMetrics {
  hostName: string;
  latency: number;
  throughput: number;
  packetLoss: number;
}

export interface WebAppMetrics {
  appName: string;
  requestsPerMinute: number;
  errorRate: number;
  avgResponseTime: number;
}

export interface NetworkTrafficData {
  name: string;
  data: number[];
}

export interface WebAppTrafficData {
  name: string;
  data: number[];
}

@Injectable({
  providedIn: 'root'
})
export class OverviewService {
  constructor(private http:HttpClient) { }


  // private baseUrl="http://localhost:12021";
  private baseUrl = environment.baseUrl;

  private skewedRandom(min: number, max: number, skew: number): number {
    const rnd = Math.pow(Math.random(), skew);
    return Math.floor(rnd * (max - min + 1)) + min;
  }

  //  generate mock data for the host health 
  generateHostHealthData(count: number): HostHealthData[] {
    const data: HostHealthData[] = [];
    let hostNum = 1;
    const cols = Math.ceil(Math.sqrt(count * 1.5));
    const rows = Math.ceil(count / cols);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (data.length >= count) break;
        data.push({
          x: col,
          y: row,
          value: this.skewedRandom(0, 100, 1.5),
          name: `Host-${hostNum.toString().padStart(3, '0')}`,
          custom: { latency: Math.floor(Math.random() * 60) + 80 }
        });
        hostNum++;
      }
    }
    return data;
  }

  // generate mock data for database health 
  generateDatabaseHealthData(count: number): DatabaseHealthData[] {
    const data: DatabaseHealthData[] = [];
    let hostNum = 1;
    const cols = Math.ceil(Math.sqrt(count * 1.5));
    const rows = Math.ceil(count / cols);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (data.length >= count) break;
        data.push({
          x: col,
          y: row,
          value: this.skewedRandom(0, 100, 1.5),
          name: `DB-${hostNum.toString().padStart(3, '0')}`,
          custom: { latency: Math.floor(Math.random() * 60) + 80 }
        });
        hostNum++;
      }
    }
    return data;
  }

  generateNetworkMetrics(): number[] {
    const data: number[] = [];
    for (let i = 0; i < 7; i++) {
      data.push(this.randomNumber(20, 70));
    }
    return data;
  }

  generateWebAppMetrics(): number[]{
    const data: number[] = [];
    for (let i = 0; i < 7; i++) {
      data.push(this.randomNumber(80, 180)); // ms
    }
    return data;
  }

  //  main function to get the data of network traffic from backend using api calls 
  generateNetworkTrafficData(serviceId: string, startTime: number, endTime: number, host:string):Observable<any>{
    let params=new HttpParams().set('serviceId',serviceId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    .set('host',host)
    return this.http.get(`${this.baseUrl}`+"/infra/api/host/business/getNetworkTrafficByServiceId",{params:params});
  }
  private randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }  
  
    //  main function to get the data of service error from backend using api calls 
  generateServiceError(userId: string, startTime: number, endTime: number):Observable<any>{
    let params=new HttpParams()
    .set('userId',userId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`+"/apm/api/business/getServiceTotalError",{params:params});
  }

  //  main function to get the data of total network usage from backend using api calls 
  getTotalNetworkTraffic(userId: string, startTime: number, endTime: number, host:string):Observable<any>{

    let params=new HttpParams().set('userId',userId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    .set('host',host)
    return this.http.get(`${this.baseUrl}`+"/infra/api/host/business/getNetworkTraffic",{params:params});
  }

  public getMemoryUsage(userId: string, startTime: number, endTime: number):Observable<any>{
    let params=new HttpParams().set('userId',userId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`+"/infra/api/host/business/getMemoryUsage",{params:params});
  }

  public getServiceDashboardCpuUsage(userId: string, startTime: number, endTime: number):Observable<any>{
    let params=new HttpParams().set('userId',userId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`+"/infra/api/host/business/getCpuUsage",{params:params});
  }

  public getDiskUsage(userId: string, startTime: number, endTime: number):Observable<any>{
    let params=new HttpParams().set('userId',userId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`+"/infra/api/host/business/getDiskUsage",{params:params});
  }
  
  public getServiceEndpointError(userId: string, startTime: number, endTime: number):Observable<any>{
    let params=new HttpParams().set('userId',userId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`+"/apm/api/business/getServiceError",{params:params});
  }

  public getServiceLogError(userId: string, startTime: number, endTime: number):Observable<any>{
    let params=new HttpParams().set('userId',userId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`+"/apm/api/business/getServiceLogError",{params:params});
  }

  public getSlowStatementByDBLatency (userId: string, startTime: number, endTime: number): Observable<any> {
    let params=new HttpParams().set('userId',userId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`+"/apm/api/business/getSlowStatementByDBLatency",{params:params});
  }

  public getFeatureFlow (userId: string, startTime: number, endTime: number): Observable<any> {
    let params=new HttpParams().set('userId',userId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`+"/apm/api/business/getFeatureFlow",{params:params});
  }

  public getApplicationLatency (userId: string, startTime: number, endTime: number): Observable<any>{
    let params=new HttpParams().set('userId',userId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`+"/apm/api/business/getServiceLatency",{params:params});
  }


  generateWebAppTrafficData(count: number, appCount: number = 5): WebAppTrafficData[] {
    const apps = ['WebApp1', 'WebApp2', 'WebApp3', 'WebApp4', 'WebApp5'].slice(0, appCount);
    return apps.map(app => ({
      name: app,
      data: Array(count).fill(0).map((_, i) => 
        Math.floor(Math.random() * 1000) + 100 + (i * 10) + Math.floor(Math.random() * 50)
      )
    }
  ));
  }

  // Infra Group Service

  public getInfraGroupNetworkDetails(groupName: string, startTime: number, endTime: number): Observable<ServiceResponse<any>> {
    let param = new HttpParams()
      .set('groupName', groupName)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/infra/api/host/business/getNetworkTrafficByServiceIds`, { params: param });
  }

  public getInfraGroupDetails(groupName: string, startTime: number, endTime: number): Observable<ServiceResponse<any>> {
    let param = new HttpParams()
      .set('groupName', groupName)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}/infra/api/host/business/getHostCMDByGroupName`, { params: param });
  }

  public getInfraGroupNames(user: User): Observable<ServiceResponse<any>> {
    return this.http.post<ServiceResponse<any>>(`${this.baseUrl}/application/api/getAllInfraGroupByUser`, user);
  }


}