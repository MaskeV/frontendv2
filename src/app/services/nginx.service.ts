import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})

export class NginxService {
  constructor(private http: HttpClient) { }

  private baseUrl = environment.baseUrl;
  //private baseUrl = "http://localhost:12021";

  getNginxListsAPI(st: any, et: any, serviceResponseList: any): Observable<any> {
    let params = new HttpParams().set("st", st).set("et", et);

    if (Array.isArray(serviceResponseList) && serviceResponseList.length > 0) {
      params = params.set("nginxListByUser", serviceResponseList.join(','));
    } else if (typeof serviceResponseList === 'string' && serviceResponseList.trim() !== '') {
      params = params.set("nginxListByUser", serviceResponseList);
    }

    return this.http.get(`${this.baseUrl}/infra/api/nginx/nginxLists`, {
      params,
    });
  }

  getLatestNginxStats(entityId: string, st: any, et: any, type?: string): Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et)
    if (type) {
      params = params.set("type", type);
    }

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/nginx/latestNginxStats`,
      { params }
    );
  }

  getNginxServiceLoad(entityId: string, st: any, et: any, type?: any): Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et)
    if (type) {
      params = params.set("type", type);
    }
    return this.http.get(`${this.baseUrl}/infra/api/nginx/getNginxServiceLoad`, { params });
  }

  getNginxLatency(entityId: string, st: any, et: any, type?: any): Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et)
    if (type) {
      params = params.set("type", type);
    }
    return this.http.get(`${this.baseUrl}/infra/api/nginx/getNginxServicelatency`, { params });
  }

  getNginxHttpConnections(entityId: string, st: any, et: any, type?: any): Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et)
    if (type) {
      params = params.set("type", type);
    }
    return this.http.get(`${this.baseUrl}/infra/api/nginx/getNginxHttpConnections`, { params });
  }

  getNginxHttpStatus(entityId: string, st: any, et: any, type?: any): Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et)
    if (type) {
      params = params.set("type", type);
    }
    return this.http.get(`${this.baseUrl}/infra/api/nginx/getNginxHttpStatus`, { params });
  }

  getNginxHttp4xxPercent(entityId: string, st: any, et: any, type?: any): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et)
    if (type) {
      params = params.set("type", type);
    }

    return this.http.get<any>(`${this.baseUrl}/infra/api/nginx/getNginxHttp4xxPercent`, { params });
  }

  getNginxHttp5xxPercent(entityId: string, st: any, et: any, type?: any): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    if (type) {
      params = params.set("type", type);
    }
    return this.http.get<any>(`${this.baseUrl}/infra/api/nginx/getNginxHttp5xxPercent`, { params });
  }

  getNginxHttpBandwidth(entityId: string, st: any, et: any, type?: any): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et)
    if (type) {
      params = params.set("type", type);
    }

    return this.http.get<any>(`${this.baseUrl}/infra/api/nginx/getNginxHttpBandwidth`, { params });
  }

  getTotalHttpRequests(entityId: string, startTime: any, endTime: any, type?: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', startTime)
      .set('et', endTime);
    if (type) params = params.set('type', type);

    return this.http.get<any>(`${this.baseUrl}/infra/api/nginx/getTotalHttpRequests`, { params });
  }

  getTotalBandwidth(entityId: string, st: any, et: any, type?: string): Observable<{ totalBandwidthKB: number }> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    if (type) params = params.set('type', type);

    return this.http.get<{ totalBandwidthKB: number }>(`${this.baseUrl}/infra/api/nginx/totalBandwidth`, { params });
  }

  getAverageConnections(entityId: string, st: any, et: any, type?: string): Observable<{ avgConnections: number }> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    if (type) params = params.set('type', type);

    return this.http.get<{ avgConnections: number }>(`${this.baseUrl}/infra/api/nginx/avgConnections`, { params });
  }

  getNginxUniqueEntities(
    serviceId: string,
    st: any,
    et: any,
    type?: any,
    instanceFilter?: string,
    page: number = 0,
    size: number = 10
  ): Observable<any[]> {
    let params = new HttpParams()
      .set('serviceId', serviceId)
      .set('st', st)
      .set('et', et)
      .set('page', page)
      .set('size', size)
    if (type) {
      params = params.set("type", type);
    }

    if (instanceFilter) {
      params = params.set('instanceFilter', instanceFilter);
    }

    return this.http.get<any[]>(`${this.baseUrl}/infra/api/nginx/getUniqueEntities`, { params });
  }
}
