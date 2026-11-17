import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface HaProxyAuditDTO {
  action: string;
  ipAddresses?: string[];
  sessionDTO: {
    userId: number;
    featureName: string;
    applicationName: string;
  };
}

export interface ServiceResponse {
  serviceResponse: string;
  serviceStatus: string;
  serviceError: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProxyConfigurationService {

  private baseUrl = `${environment.baseUrl}/api/haproxy`;
  private auditUrl = `${environment.baseUrl}/application/api/auditHaProxyAction`;

  readonly FEATURE_NAME = 'Proxy Configuration';
  readonly APPLICATION_NAME = 'HAProxy';

  constructor(private http: HttpClient) { }

  // ── Core API calls ────────────────────────────────────────────────────────

  getAllowedIps(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/getAllowedIps`);
  }

  addAllowedIpsApi(ips: string[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/addAllowedIp`, { ips });
  }

  deleteAllowedIpsApi(ips: string[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/deleteAllowedIps`, { ips });
  }

  restartHaproxyApi(): Observable<any> {
    return this.http.post(`${this.baseUrl}/restartHaproxy`, {});
  }

  // ── Audit API ─────────────────────────────────────────────────────────────

  auditHaProxyAction(action: string, userId: number, ipAddresses?: string[]): Observable<ServiceResponse> {
    const body: HaProxyAuditDTO = {
      action,
      sessionDTO: {
        userId,
        featureName: this.FEATURE_NAME,
        applicationName: this.APPLICATION_NAME
      }
    };
    if (ipAddresses?.length) body.ipAddresses = ipAddresses;
    return this.http.post<ServiceResponse>(this.auditUrl, body);
  }

  // ── Public methods: audit first, then act ────────────────────────────────

  addAllowedIps(ips: string[], userId: number): Observable<any> {
    return this.auditHaProxyAction('ADD IP', userId, ips).pipe(
      switchMap((res: ServiceResponse) => {
        if (res.serviceStatus === 'Success') return this.addAllowedIpsApi(ips);
        return throwError(() => new Error(res.serviceError || 'Audit failed for ADD IP'));
      })
    );
  }

  deleteAllowedIps(ips: string[], userId: number): Observable<any> {
    return this.auditHaProxyAction('DELETE IP', userId, ips).pipe(
      switchMap((res: ServiceResponse) => {
        if (res.serviceStatus === 'Success') return this.deleteAllowedIpsApi(ips);
        return throwError(() => new Error(res.serviceError || 'Audit failed for DELETE IP'));
      })
    );
  }

  restartHaproxy(userId: number): Observable<any> {
    return this.auditHaProxyAction('RESTART HAPROXY', userId).pipe(
      switchMap((res: ServiceResponse) => {
        if (res.serviceStatus === 'Success') return this.restartHaproxyApi();
        return throwError(() => new Error(res.serviceError || 'Audit failed for RESTART HAPROXY'));
      })
    );
  }
}