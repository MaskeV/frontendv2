import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReportApiResponse, ReportSchedulePayload } from '../models/report';
import { GenerateReport } from '../models/GenerateReport';

@Injectable({
  providedIn: 'root'
})
export class StandardReportService {

  private baseUrl = environment.baseUrl;


  private baseApi = "/metering/api/v1";

  constructor(private http: HttpClient) { }

  getAllReports(): Observable<ReportApiResponse> {
    return this.http.get<ReportApiResponse>(`${this.baseUrl}` + `/metering/report/api/v1/getAllReportConfig`);
  }

  getAllReportMeteringSchedule(): Observable<ReportApiResponse> {
    return this.http.get<ReportApiResponse>(`${this.baseUrl}` + `/metering/report/api/v1/getAllReportMeteringSchedule`);
  }

  createReportSchedule(payload: ReportSchedulePayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/metering/report/api/v1/createReportMeteringSchedule`, payload);
  }
  // getReportsColumnsList(reportId: any): Observable<any> {
  //   return this.http.get(`${this.baseUrl}/metering/report/api/v1/getReportColumnByReportId?reportId=${reportId}`);
  // }

  public getZones(page: number, size: number) {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}` + "/group/getZones", { params: params });
  }

  public getAllGroupsByZone(zone: number, page: number, size: number) {
    let params = new HttpParams()
      .set('zoneId', zone.toString())
      .set('page', page.toString())
      .set('size', size.toString())
    return this.http.get(`${this.baseUrl}${this.baseApi}` + "/group/getAllGroupsByZone", { params: params });
  }

  public getGenerateReportHistory(st: string, et: string) {
    let params = new HttpParams()
      .set('startDateTime', st.toString())
      .set('endDateTime', et.toString())
    return this.http.get(`${this.baseUrl}/metering/report/api/v1/getGenerateReportHistory`, { params: params });
  }

  public getReportMeteringSchedule(id: any) {
    let params = new HttpParams()
    .set('id', id.toString())
    return this.http.get(`${this.baseUrl}` + `/metering/report/api/v1/getReportMeteringSchedule`, { params: params });
  }

  public generateReport(data: GenerateReport): Observable<any> {
    return this.http.post(`${this.baseUrl}/backendJob/api/v1/generateReport`, data, { responseType: 'blob' });
  }

  public deleteReportMeteringSchedule(reportID: number): Observable<any> {
    let params = new HttpParams()
    .set('id', reportID.toString())
    return this.http.delete(`${this.baseUrl}/metering/report/api/v1/deleteReportMeteringSchedule/`, { params: params });
  }
  
}
