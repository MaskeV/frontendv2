import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ElasticsearchService {
  private baseURL: string = environment.baseUrl;
  // private baseURL: string = 'http://localhost:12040';

  private CLUSTER_URL: string = 'database/elastic/cluster';
  private NODE_URL: string = 'database/elastic/node';
  private INDEX_URL: string = 'database/elastic/index';

  constructor(private http: HttpClient) { }

  // CLUSTER APIs
  public getClusterTotalKpis(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.CLUSTER_URL}/totalKpis`, { params: param });
  }

  public getClusterNodes(entityId: string, st: number, et: number): Observable<any[]> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any[]>(`${this.baseURL}/${this.CLUSTER_URL}/nodes`, { params: param });
  }

  public getClusterIndices(entityId: string, st: number, et: number): Observable<string[]> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<string[]>(`${this.baseURL}/${this.CLUSTER_URL}/indices`, { params: param });
  }

  // NODE APIs
  public getNodeTotalKpis(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.NODE_URL}/totalKpis`, { params: param });
  }

  public getNodeCpuAndLoadGraphs(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.NODE_URL}/cpuAndLoadGraphs`, { params: param });
  }

  public getNodeJvmAndGcGraphs(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.NODE_URL}/jvmAndGcGraphs`, { params: param });
  }

  public getNodeReqRateIndexingSearchingGraphs(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.NODE_URL}/reqRateIndexingSearchingGraphs`, { params: param });
  }

  public getNodeTranslogAndBreakerGraphs(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.NODE_URL}/translogAndBreakerGraphs`, { params: param });
  }

  public getNodeDocumentGraphs(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.NODE_URL}/documentGraphs`, { params: param });
  }

  public getNodeSegmentAndNetworkGraphs(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.NODE_URL}/segmentAndNetworkGraphs`, { params: param });
  }

  public getNodeDiskGraphs(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.NODE_URL}/diskGraphs`, { params: param });
  }

  // INDEX APIs
  public getIndexTotalKpis(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.INDEX_URL}/totalKpis`, { params: param });
  }

  public getIndexReqRateIndexingSearching(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.INDEX_URL}/reqRateIndexingSearching`, { params: param });
  }

  public getIndexAllOperationsGraphs(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.INDEX_URL}/allOperationsReqRateAndRuntime`, { params: param });
  }

  public getIndexSearchAvgRateAndShardsGraphs(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.INDEX_URL}/searchAvgRateAndShards`, { params: param });
  }

  public getIndexDocumentAndSizeGraphs(entityId: string, st: number, et: number): Observable<any> {
    let param = new HttpParams().set('entityId', entityId).set('st', st.toString()).set('et', et.toString());
    return this.http.get<any>(`${this.baseURL}/${this.INDEX_URL}/documentsAndSize`, { params: param });
  }
}
