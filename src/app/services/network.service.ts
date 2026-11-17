import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models/user';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  // private baseUrl = 'http://localhost:12023';
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  // GET

  public getGraphItemsByHost(host: string) {
    let params = new HttpParams()
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}/network/api/getGraphItemsByHost`, { params: params });
  }

     public getGraphItemsByHostAndDT(host: string, starTime: number, endTime: number) {
    let params = new HttpParams()
      .set('host', host.toString())
      .set('st', starTime.toString())
      .set('et', endTime.toString());
    return this.http.get(`${this.baseUrl}/network/api/getGraphItemsByHost`, { params: params });
  }

  public getGraphAdditionalItemsByHost(host: string) {
    let params = new HttpParams()
      .set('host', host.toString())
    return this.http.get(`${this.baseUrl}/network/api/getGraphAdditionalItemsByHost`, { params: params });
  }

  // POST

  public postTemplate(requestData: any = []): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.baseUrl}/network/api/getTemplates`, requestData, { observe: 'response' });
  }

  public postHostGroup(requestData: any = []): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.baseUrl}/network/api/getHostGroups`, requestData, { observe: 'response' });
  }

  public createHostGroup(hostGroupName: string): Observable<HttpResponse<any>> {
    let params = new HttpParams().set("hostGroupName", hostGroupName);
    return this.http.post<any>(`${this.baseUrl}/network/api/createHostGroup`, {}, { observe: 'response', params });
  }

  public createHost(requestData: any): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.baseUrl}/network/api/createHost`, requestData, { observe: 'response' });
  }

  public getHost(): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.baseUrl}/network/api/getHosts`, {}, { observe: 'response' });
  }

  public deleteHost(requestData: any): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.baseUrl}/network/api/deleteHost`, requestData, { observe: 'response' });
  }

  public updateHost(requestData: any = []): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.baseUrl}/network/api/updateHost`, requestData, { observe: 'response' });
  }

  public getGraphData(requestData: any = []): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.baseUrl}/network/api/getGraphData`, requestData, { observe: 'response' });
  }

  public getAdditionalGraphData(requestData: any = []): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.baseUrl}/network/api/getAdditionalGraphData`, requestData, { observe: 'response' });
  }

  public getHostByHostId(hostId: string | number): Observable<HttpResponse<any>> {
    let params = new HttpParams().set("hostId", hostId);
    return this.http.post<any>(`${this.baseUrl}/network/api/getHostByHostId`, {}, { observe: 'response', params });
  }

  public getAllAppListByUserID(user: User, featureType: string): Observable<object> {
    return this.http.post(`${this.baseUrl}/application/api/getAllAppListByUserID?featureType=${featureType}`,  user );
  }

  public getTopSrcAndDestIpCounts(host: string, startTime: number, endTime: number, pageSize: number) {
    let params = new HttpParams()
      .set('host', host)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get(`${this.baseUrl}/network/api/getTopSrcAndDestIpCounts`, { params: params });
  }

  public getTopSrcDestIpCounts(host: string, startTime: number, endTime: number, pageSize: number) {
    let params = new HttpParams()
      .set('host', host)
      .set('st', startTime.toString())
      .set('et', endTime.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get(`${this.baseUrl}/network/api/getTopSrcDestIpCounts`, { params: params });
  }



  public getPaginatedLogs(requestData: any = []) {
    return this.http.post<any>(`${this.baseUrl}/network/api/getPaginatedLogs`, requestData, { observe: 'response' });
  }
 

  public importTemplate(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/network/api/addTemplateFile`, formData);
  }


}