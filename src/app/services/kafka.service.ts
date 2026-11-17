import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KafkaService {

  private baseUrl = environment.baseUrl + '/kafka/v1';

  constructor(private http: HttpClient) { }

  public getClusterKPIs(entityId: any, st: number, et: number):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}` + "/overview/getClusterKPIs", { params: params });
  }

  public getMaxLag(entityId: any, st: number, et: number):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}` + "/overview/getMaxLag", { params: params });
  }

  public getPartitionCount(entityId: any, st: number, et: number):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}` + "/overview/getPartitionCount", { params: params });
  }

  public getLeaderCount(entityId: any, st: number, et: number):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}` + "/overview/getLeaderCount", { params: params });
  }

  public getUncleanLeaderElectionsPerSecond(entityId: any, st: number, et: number):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}` + "/overview/getUncleanLeaderElectionsPerSecond", { params: params });
  }

  public getLeaderElectionRate(entityId: any, st: number, et: number):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}` + "/overview/getLeaderElectionRate", { params: params });
  }

  public getUnderReplicatedPartitions(entityId: any, st: number, et: number):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}` + "/overview/getUnderReplicatedPartitions", { params: params });
  }

  public getOfflinePartitionsCount(entityId: any, st: number, et: number):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}` + "/overview/getOfflinePartitionsCount", { params: params });
  }

  public getActiveControllerCount(entityId: any, st: number, et: number):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}` + "/overview/getActiveControllerCount", { params: params });
  }

  public getInstancesData(entityId: any, st: number, et: number):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}` + "/overview/getInstancesData", { params: params });
  }

  // Broker APIs
  public getBrokerData(entityId: any, st: number, et: number,api: string):Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set('st', st)
      .set('et', et)
    return this.http.get(`${this.baseUrl}/broker/${api}`, { params: params });
  }



}
