import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user';
import { Params } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class FaqBotService {
  private baseUrl = environment.baseUrl;
  private baseUrl2 = environment.baseUrl;
  // private baseUrl = 'http://localhost:12008';
  // private baseUrl2 = 'http://localhost:12022';

  constructor(private http: HttpClient) { }

  // Get problem details by userID, type, and date range
  getAllProblemDetailsByUserID(user: User, type: string, days: number): Observable<any> {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const params = new HttpParams()
      .set('type', type)
      .set('start', start.toISOString())
      .set('end', end.toISOString());

    const url = `${this.baseUrl}` + "/application/api/problem/getAllProblemDetailsByUserID";

    return this.http.post(url, user, { params });
  }

  // 🔹 2. Get problem details by userID + application name + date range
  getAllProblemDetailsByUserIDAppName(user: User, type: string, days: number, applicationName: string): Observable<any> {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const params = new HttpParams()
      .set('type', type)
      .set('start', start.toISOString())
      .set('end', end.toISOString())
      .set('applicationName', applicationName);

    const url = `${this.baseUrl}` + "/application/api/problem/getAllProblemDetailsByUserIDAppName";

    return this.http.post(url, user, { params });
  }


  getAppConfiguration(user: User, applicationName: string): Observable<any> {
    const params = new HttpParams()
      .set('applicationName', applicationName);

    const url = `${this.baseUrl}` + "/application/api/problem/getApplicationConfig";

    return this.http.post(url, user, { params });
  }

  getInfrastructureSummary(traceID: string): Observable<any> {
    const url = `${this.baseUrl2}/apm/api/getInfrastructureSummary?traceId=${traceID}`;
    // const params =new HttpParams().set("traceId",traceID)
    // Send traceID as query parameter
    return this.http.post(url, {});
  }

  getConsolidatedMetrics(url: string, tabName: string, entityId: string, startTime: string, endTime: string): Observable<any> {
    const params = {
      url,
      tabName,
      entityId,
      startTime,
      endTime
    };

    const url2 = `http://192.168.7.57:5010/dashboard`;
    // const params =new HttpParams().set("traceId",traceID)
    // Send traceID as query parameter
    return this.http.post(url2, params);
  }

}
