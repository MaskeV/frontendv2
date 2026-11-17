import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DashboardApiService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://localhost:12016';
  private baseApi = '/dashboard/api';

  // GET APIs

  public getMetrics(chartType?: string) {
    let params = new HttpParams()
    if (chartType !== undefined) {
      params = params.set('chartType', chartType.toString())
    }
    return this.http.get(`${this.baseUrl}${this.baseApi}/getMetrics`, { params });
  }

  public getMetricTimeSeriesData(entityId: string, metricName: string[], startTime: string, endTime: string) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('metricNames', metricName.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());
    return this.http.get(`${this.baseUrl}${this.baseApi}/getMetricTimeSeriesData`, { params });
  }

  public getMetricNumericData(entityId: string, metricName: string[], operation: string, startTime: string, endTime: string) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('metricNames', metricName.toString())
      .set('operation', operation.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());
    return this.http.get(`${this.baseUrl}${this.baseApi}/getMetricNumericData`, { params });
  }

  public getMetricTableData(entityId: string, metricName: string[], startTime: string, endTime: string) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('metricNames', metricName.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());
    return this.http.get(`${this.baseUrl}${this.baseApi}/getMetricTableData`, { params });
  }

  public getAllCustomDashboards() {
    return this.http.get(`${this.baseUrl}${this.baseApi}/getAllCustomDashboards`);
  }

  public customDashboardDetails(dashboardId: string, startTime: string, endTime: string) {
    let params = new HttpParams()
      .set('dashboardId', dashboardId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());
    return this.http.get(`${this.baseUrl}${this.baseApi}/customDashboardDetails`, { params });
  }

  public getAllDashboardsDetails(userId: string, roleName: string, isPublicDashboard?: string) {
    let params = new HttpParams()
      .set('userId', userId.toString())
      .set('roleName', roleName.toString())
    if (isPublicDashboard !== undefined) {
      params = params.set('isPublicDashboard', isPublicDashboard.toString())
    }
    return this.http.get(`${this.baseUrl}${this.baseApi}/getAllDashboardsDetails`, { params });
  }

  // POST APIs

  public getImageFromUrl(url: string) {
    return this.http.post(`${this.baseUrl}${this.baseApi}/getImageFromUrl`, url, { responseType: 'blob' });
  }

  public createCustomDashboard(payload: any) {
    return this.http.post(`${this.baseUrl}${this.baseApi}/createCustomDashboard`, payload);
  }

  public pinCustomDashboard(payload: any, updatedBy: string, updatedOn: string) {
    const params = new HttpParams()
      .set('updatedBy', updatedBy)
      .set('updatedOn', updatedOn);

    return this.http.post(`${this.baseUrl}${this.baseApi}/pinCustomDashboard`, payload, { params });
  }

  public saveDashboardLayout(layouts: any[], updatedBy: string, updatedOn: string) {
    let params = new HttpParams()
      .set('updatedBy', updatedBy.toString())
      .set('updatedOn', updatedOn.toString());
    return this.http.post(`${this.baseUrl}${this.baseApi}/saveDashboardLayout`, layouts, { params });
  }

  // PUT APIs

  public updateCustomDashboard(dashboardId: number, name: string, isPublicDashboard: boolean, updatedBy: string, updatedOn: string) {
    let params = new HttpParams()
      .set('dashboardId', dashboardId.toString())
      .set('name', name.toString())
      .set('isPublicDashboard', isPublicDashboard.toString())
      .set('updatedBy', updatedBy.toString())
      .set('updatedOn', updatedOn.toString());
    return this.http.put(`${this.baseUrl}${this.baseApi}/updateCustomDashboard`, null, { params });
  }

  public updateCustomDashboardDetails(payload: any, updatedBy: string, updatedOn: string) {

    const params = new HttpParams()
      .set('updatedBy', updatedBy)
      .set('updatedOn', updatedOn);

    return this.http.put(`${this.baseUrl}${this.baseApi}/updateCustomDashboardDetails`, payload, { params });
  }

  // DELETE APIs

  public deleteCharts(payload: any) {
    return this.http.delete(`${this.baseUrl}${this.baseApi}/deleteCharts`, { body: payload });
  }

  public deleteDashboard(dashboardId: number) {
    let params = new HttpParams()
      .set('dashboardId', dashboardId.toString())
    return this.http.delete(`${this.baseUrl}${this.baseApi}/deleteDashboard`, { params });
  }

}
