import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AlertConfig } from '../models/AlertConfig';
import { ApplicationMaster } from '../models/application-master';
import { environment } from '../../environments/environment';
import { Threshold } from '../models/Threshold';

@Injectable({
  providedIn: 'root'
})
export class ThresholdService {

     private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://localhost:12010';

  constructor(private http: HttpClient) { }

  getAllThresholds(data: any) {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `/metric/api/getAllThreshold`, { params: sessionDTO });
  }

  getAllModuleName() {
    return this.http.get(`${this.baseUrl}` + `/metric/api/admin/getAllModuleName`);
  }

  createThreshold(threshold: Threshold): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/metric/api/createThreshold', threshold);
  }

  updateThreshold(threshold: Threshold): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/metric/api/updateThreshold', threshold);
  }

  deleteThreshold(threshold: Threshold): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/metric/api/deleteThreshold', threshold);
  }

  getAllModules(data: any): Observable<object> {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + '/metric/api/getAllModules', { params: sessionDTO });

  }
  getThresholdByApplicationID(threshold: Threshold): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/metric/api/getThresholdByApplicationID', threshold);
  }

  getThresholdByHealthRuleTypeAndApplication(threshold: Threshold): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/metric/api/getThresholdByHealthRuleTypeAndApplication', threshold);
  }

  getThresholdByHealthRuleNameAndApplicationID(threshold: Threshold): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/metric/api/getThresholdByHealthRuleNameAndApplicationID', threshold);
  }

  getAllthresholdByApplication(threshold: Threshold): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/metric/api/getAllthresholdByApplication', threshold);
  }

  getMetricBaseline(appName: string, metricName: string, appType?: string,): Observable<any> {
    let params = new HttpParams()
      .set('appName', appName)
      .set('metricName', metricName);
    if (appType) params = params.set('appType', appType);
    return this.http.get(`${this.baseUrl}/metric/api/getMetricBaseline`, { params });
  }

  getThresholdByMetric(component: string, componentType: string, metricName: string, st: number, et: number): Observable<any> {
    let params = new HttpParams()
      .set('component', component)
      .set('componentType', componentType)
      .set('metricName', metricName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.baseUrl}/metric/api/getThresholdByMetric`, { params });
  }
}
