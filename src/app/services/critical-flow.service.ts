import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CriticalFlowService {

  private baseURL = environment.baseUrl;
  private controller = "/application/api/criticalflow/";
  // private baseURL = "http://localhost:12008";

  constructor(
    private http: HttpClient
  ) { }

  public createCriticalFlow(payload: any): Observable<any> {
    return this.http.post(`${this.baseURL}${this.controller}createCriticalFlow`, payload);
  }

  public updateCriticalFlow(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseURL}${this.controller}updateCriticalFlow/${id}`, payload);
  }

  public deleteCriticalFlow(id: number, sessionDTO: any): Observable<any> {
    return this.http.delete(`${this.baseURL}${this.controller}deleteCriticalFlow/${id}`, { body: sessionDTO });
  }

  public getAllCriticalFlows(sessionDTO: any): Observable<any> {
    return this.http.post(`${this.baseURL}${this.controller}getAllCriticalFlows`, sessionDTO);
  }

  public getCriticalFlowById(id: number, sessionDTO: any): Observable<any> {
    return this.http.post(`${this.baseURL}${this.controller}getCriticalFlowById/${id}`, sessionDTO);
  }

}
