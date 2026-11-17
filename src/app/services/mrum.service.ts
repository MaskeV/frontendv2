
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models/user';
import { environment } from '../../environments/environment';
import { MrumParams } from '../models/mrum/mrum-params';

@Injectable({
  providedIn: 'root'
})
export class MrumService {

  // private baseUrl = 'http://localhost:12050';
    private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  private buildParams(params: MrumParams): HttpParams {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((key) => {
      const value = (params as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return httpParams;
  }

  getHttpRequestCount(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getHttpRequestCount`, { params: this.buildParams(params) });
  }

  getUserCount(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getUserCount`, { params: this.buildParams(params) });
  }

  getActionCount(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getActionCount`, { params: this.buildParams(params) });
  }

  getTopActions(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getTopActions`, { params: this.buildParams(params) });
  }

  getTopPages(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getTopPages`, { params: this.buildParams(params) });
  }

  getSessionCount(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getSessionCount`, { params: this.buildParams(params) });
  }

  getLatencyStats(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/transaction/api/getLatencyStats`, { params: this.buildParams(params) });
  }

  getThroughput(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/transaction/api/getThroughput`, { params: this.buildParams(params) });
  }

  getApdexScore(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/transaction/api/getApdexScore`, { params: this.buildParams(params) });
  }

  getFailedTransactionRate(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/transaction/api/getFailedTransactionRate`, { params: this.buildParams(params) });
  }

  getSuccessfulTransactionRate(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/transaction/api/getSuccessfulTransactionRate`, { params: this.buildParams(params) });
  }

  getHttpErrorRate(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/transaction/api/getHttpErrorRate`, { params: this.buildParams(params) });
  }

  getErrorRate(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/transaction/api/getErrorRate`, { params: this.buildParams(params) });
  }

  getCrashRate(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/transaction/api/getCrashRate`, { params: this.buildParams(params) });
  }

  getCommonUsedPercentage(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getCommonUsedPercentage`, { params: this.buildParams(params) });
  }

  getAppVersions(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/version/api/getAppVersions`, { params: this.buildParams(params) });
  }

  getDevices(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/version/api/getDevices`, { params: this.buildParams(params) });
  }

  getOsVersions(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/version/api/getOsVersions`, { params: this.buildParams(params) });
  }

  getNetworkTypes(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/version/api/getNetworkTypes`, { params: this.buildParams(params) });
  }

  getSessions(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/session/api/getSessions`, { params: this.buildParams(params) });
  }

  getAppUsageByCountry(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/serviceMap/api/getAppUsageByCountry`, { params: this.buildParams(params) });
  }

  getOverviewMetrics(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getOverviewMetrics`, { params: this.buildParams(params) });
  }

  getTransactions(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/session/api/getTransactions`, { params: this.buildParams(params) });
  }

  getTransactionDetails(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/session/api/getTransactionDetails`, { params: this.buildParams(params) });
  }

  getTraceDetails(traceId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/session/api/getTraceDetails`, { params: new HttpParams().set('traceId', traceId) });
  }

  getLogDetails(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/session/api/getLogDetails`, { params: this.buildParams(params) });
  }

  getErrorLogs(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getErrorLogs`, { params: this.buildParams(params) });
  }

  getErrorDetails(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getErrorDetails`, { params: this.buildParams(params) });
  }

  getErrorsCrashesOverview(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getErrorsCrashesOverview`, { params: this.buildParams(params) });
  }

  getErrorsCrashesOverTime(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getErrorsCrashesOverTime`, { params: this.buildParams(params) });
  }

  getTopErrorTypes(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getTopErrorTypes`, { params: this.buildParams(params) });
  }

  getTopCrashes(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getTopCrashes`, { params: this.buildParams(params) });
  }

  getErrorsByAppVersion(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getErrorsByAppVersion`, { params: this.buildParams(params) });
  }

  getCrashesByAppVersion(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getCrashesByAppVersion`, { params: this.buildParams(params) });
  }

  getTopErrorMessages(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getTopErrorMessages`, { params: this.buildParams(params) });
  }

  getTopAffectedUsers(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getTopAffectedUsers`, { params: this.buildParams(params) });
  }

  getPlatformBreakdown(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getPlatformBreakdown`, { params: this.buildParams(params) });
  }

  getLatencyDistribution(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getLatencyDistribution`, { params: this.buildParams(params) });
  }

  getMostAffected(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/errorCrashes/api/getMostAffected`, { params: this.buildParams(params) });
  }

  getTransactionPerfSummary(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/transaction/api/getTransactionPerfSummary`, { params: this.buildParams(params) });
  }


  getSessionsSummary(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/session/api/getSessionsSummary`, { params: this.buildParams(params) });
  }

  getSessionLifeCycle(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/session/api/getSessionLifeCycle`, { params: this.buildParams(params) });
  }

  getDependencies(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getDependencies`, { params: this.buildParams(params) });
  }

  getDependencyLatency(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getDependencyLatency`, { params: this.buildParams(params) });
  }

  getDependencyFailedTxRate(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getDependencyFailedTxRate`, { params: this.buildParams(params) });
  }

  getDependencyThroughPut(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getDependencyThroughPut`, { params: this.buildParams(params) });
  }

  getDependencyApdex(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getDependencyApdex`, { params: this.buildParams(params) });
  }

  getDependencyOverview(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/api/getDependencyOverview`, { params: this.buildParams(params) });
  }

  getOverview(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/overview/api/getOverview`, { params: this.buildParams(params) });
  }

  getSessionDetails(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/session/api/getSessionDetails`, { params: this.buildParams(params) });
  }

  getUsers(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/session/api/getUsers`, { params: this.buildParams(params) });
  }

  getSessionsDashboardKPIs(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/session/api/getSessionsDashboardKPIs`, { params: this.buildParams(params) });
  }

  getScreens(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/screens/api/getScreens`, { params: this.buildParams(params) });
  }

  getScreenDetails(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/screens/api/getScreenDetails`, { params: this.buildParams(params) });
  }

  getActions(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/actions/api/getActions`, { params: this.buildParams(params) });
  }

  getActionDetails(params: MrumParams): Observable<any> {
    return this.http.get(`${this.baseUrl}/mrum/actions/api/getActionDetails`, { params: this.buildParams(params) });
  }

  formatDurationInMinutes(durationMillis: any): string {
    if (durationMillis === null || durationMillis === undefined || durationMillis === '') return '0m 0s';
    const num = Number(durationMillis);
    if (isNaN(num)) return '0m 0s';
    const totalSeconds = Math.floor(num / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  getApdexLabel(apdex: any): string {
    if (apdex === null || apdex === undefined || apdex === '' || apdex == 0) return 'N/A';
    const num = Number(apdex);
    if (isNaN(num)) return 'N/A';
    if (num >= 0.90) return 'Excellent';
    if (num >= 0.75) return 'Good';
    if (num >= 0.60) return 'Fair';
    if (num >= 0.40) return 'Poor';
    return 'Critical';
  }

  getApdexColor(apdex: any): string {
    if (apdex === null || apdex === undefined || apdex === '' || apdex == 0) return '#e0e0e0';
    const num = Number(apdex);
    if (isNaN(num)) return '#e0e0e0';
    if (num >= 0.90) return '#059669'; // Dark Green
    if (num >= 0.75) return '#10b981'; // Light Green
    if (num >= 0.60) return '#eab308'; // Yellow
    if (num >= 0.40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }

  calculatePaginationWindow(currentPage: number, totalPages: number): { start: number, end: number, pages: (number | string)[] } {
    const windowSize = 3;
    const half = Math.floor(windowSize / 2);

    let start = Math.max(2, currentPage - half);
    let end = Math.min(totalPages - 1, currentPage + half);

    if (currentPage <= 2) {
      end = Math.min(1 + windowSize, totalPages - 1);
    } else if (currentPage >= totalPages - 1) {
      start = Math.max(totalPages - windowSize, 2);
    }

    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (totalPages <= visiblePages + 2) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      if (currentPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', totalPages];
      } else if (currentPage >= totalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => totalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }

    return {
      start: start,
      end: end,
      pages: pages
    };
  }

}