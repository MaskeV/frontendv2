import { Injectable } from '@angular/core';
import { User } from '../models/user';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BrowserApiService {

  private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://192.168.8.222:12034';

  constructor(private http: HttpClient) { }

  // getAllAppListAndIpListByUserID(user: User, type: string) {
  //   return this.http.post(`${ this.baseUrl }/application/api/getAllAppListAndIpListByUserID`, user, {
  //     params: { type: 'BROWSER' }
  //   });
  // }

  //THIS API IS BEING USED TO FETCH THE ERROR_RATE AND PV FOR THE SERVICES
  public getCombinedDataService(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getCombinedData`, { params: params });
  }

  //THIS API IS BEING USED TO FETCH THE TOTAL_HITS AND ERROR_COUNT FOR THE OVERVIEW PAGE
  public getOverViewPageCombinedData(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())

    return this.http.get<any>(`${this.baseUrl}` + `/browser/api/getCombinedData`, { params: params });


  }

  public getOverviewErrorRate(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<any>(`${this.baseUrl}/browser/api/getCombinedDataAvg`, { params: params });
  }



  public getAppLoad(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getAppLoad`, { params: params });
  }

  public getAppErrorRatePer(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getAppErrorRatePer`, { params: params });
  }

  public getAppErrorCount(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getAppErrorCount`, { params: params });
  }

  public getLoadVersion(entityId: string, st: number, et: number, order: string, size: number) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
      .set('order', order.toString())
      .set('size', size.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getLoadVersion`, { params: params });
  }

  public getErrorRateVersion(entityId: string, st: number, et: number, order: string, size: number) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
      .set('order', order.toString())
      .set('size', size.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getErrorRateVersion`, { params: params });
  }

  public getErrorCountVersion(entityId: string, st: number, et: number, order: string, size: number) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
      .set('order', order.toString())
      .set('size', size.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getErrorCountVersion`, { params: params });
  }

  public getVersionLoadVersionTab(serviceId: string, st: number, et: number, instanceId: string) {
    console.log('Instance id in browser is ', instanceId.toString());
    let params = new HttpParams()
      .set('entityId', serviceId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
      .set('type', 'version')
      .set('instanceId', instanceId.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getCombinedData`, { params: params });
  }

  public getLoadPages(entityId: string, st: number, et: number, order: string, size: number) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
      .set('order', order.toString())
      .set('size', size.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getLoadPages`, { params: params });
  }

  public getErrorCountPages(entityId: string, st: number, et: number, order: string, size: number) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
      .set('order', order.toString())
      .set('size', size.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getErrorCountPages`, { params: params });
  }

  public getPagesErrorPer(entityId: string, st: number, et: number, order: string, size: number) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
      .set('order', order.toString())
      .set('size', size.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getPagesErrorPer`, { params: params });
  }

  public getVersionNames(entityId: string, st: number, et: number, page: number, size: number, searchPattern?: string) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
      .set('size', size.toString())
      .set('page', page.toString());
    if (searchPattern) {
      params = params.set('searchPattern', searchPattern);
    }
    return this.http.get(`${this.baseUrl}/browser/api/version/getVersionNames`, { params: params });
  }

  public getCombinedDataVersion(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/version/getCombinedData`, { params: params });
  }

  public getCombinedData(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/getCombinedData`, { params: params });
  }

  public getLogsErrorTimeSeries(entityId: string, st: number, et: number, version?: string, page?: string, category?: string) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString());

    if (version && version !== 'All') {
      const encodedVersion = btoa(version);
      const compositeVersion = `${entityId}_${encodedVersion}`;
      params = params.set('version', compositeVersion);
    }

    if (page && page !== 'All') {
      const encodedPage = btoa(page);
      const compositePage = `${entityId}_${encodedPage}`;
      params = params.set('page', compositePage);
    }

    if (category && category !== 'All') {
      params = params.set('category', category);
    }

    return this.http.get<any>(`${this.baseUrl}/browser/api/log/getLogTimeSeries`, { params: params });
  }

  public getServicePages(entityId: string, st: number, et: number, page: number, size: number, searchPattern?: string) {
    let params = new HttpParams()
      .set('serviceId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
      .set('size', size.toString())
      .set('page', page.toString());

    if (searchPattern) {
      params = params.set('searchPattern', searchPattern);
    }

    return this.http.get(`${this.baseUrl}/browser/api/page/getServicePages`, { params: params });
  }

  public getCombinedDataPages(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/page/getCombinedData`, { params: params });
  }

  public getAllEndpointsCombinedData(entityId: string, st: number, et: number, type: string) {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st.toString())
      .set("et", et.toString())
      .set("type", type); // "page"

    return this.http.get(`${this.baseUrl}/browser/api/getAllEndpointsCombinedData`, { params });
  }

  public getTracesData(entityId: string, startTime: number, endTime: number, page?: number, sortBy?: string, order?: string,
    instanceId?: string, traceState?: number, endpointId?: string, traceId?: string, minDuration?: number, maxDuration?: number) {
    let params = new HttpParams().set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    if (page !== undefined) {
      params = params.set('page', page.toString());
    }
    if (sortBy) {
      params = params.set('sortBy', sortBy.toString());
    }
    if (order) {
      params = params.set('order', order.toString());
    }
    if (instanceId !== undefined) {
      const encodedVersion = btoa(instanceId);
      const compositeVersion = `${entityId}_${encodedVersion}`;
      params = params.set('instanceId', compositeVersion);
    }
    if (traceState !== undefined) {
      params = params.set('traceState', traceState.toString());
    }
    if (endpointId !== undefined) {
      params = params.set('endpointId', btoa(endpointId.toString()));
    }

    if (traceId !== undefined) {
      params = params.set('traceId', traceId.toString());

    }
    if (minDuration !== undefined) {
      params = params.set('minTraceDuration', minDuration.toString())
    }
    if (maxDuration !== undefined) {
      params = params.set('maxTraceDuration', maxDuration.toString())
    }
    return this.http.get(`${this.baseUrl}` + "/browser/api/trace/traceSegments", { params: params });
  }

  public getTraceCount(entityId: string, startTime: number, endTime: number,
    instanceId?: string, traceState?: number, endpointId?: string, traceId?: string, minDuration?: number, maxDuration?: number) {
    let params = new HttpParams().set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    if (instanceId !== undefined) {
      const encodedVersion = btoa(instanceId);
      const compositeVersion = `${entityId}_${encodedVersion}`;
      params = params.set('instanceId', compositeVersion);
    }
    if (traceState !== undefined) {
      params = params.set('traceState', traceState.toString());
    }
    if (endpointId !== undefined) {
      params = params.set('endpointId', btoa(endpointId.toString()));
    }

    if (traceId !== undefined) {
      params = params.set('traceId', traceId.toString());

    }
    if (minDuration !== undefined) {
      params = params.set('minTraceDuration', minDuration.toString())
    }
    if (maxDuration !== undefined) {
      params = params.set('maxTraceDuration', maxDuration.toString())
    }
    return this.http.get(`${this.baseUrl}` + "/browser/api/trace/getTraceCount", { params: params });
  }

  public getTraceMetaData(traceId: string) {
    let params = new HttpParams().set('traceId', traceId.toString())
    console.log('Fetching the Data');
    return this.http.get(`${this.baseUrl}` + "/browser/api/trace/traceData", { params: params });
  }

  public getVersionLoad(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/version/getVersionLoad`, { params: params });
  }

  public getVersionErrorRate(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/version/getVersionErrorRate`, { params: params });
  }

  public getVersionErrorCount(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/version/getVersionErrorCount`, { params: params });
  }

  public getPageErrorCount(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/page/getPageErrorCount`, { params: params });
  }

  public getPagePerformance(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/page/getPagePerformance`, { params: params });
  }

  public getPageFPTLatency(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/page/getPageFPTLatency`, { params: params });
  }

  public getPageTTLLatency(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/page/getPageTTLLatency`, { params: params });
  }

  public getPageDOMLatency(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/page/getPageDOMLatency`, { params: params });
  }

  public getPageLoadLatency(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/page/getPageLoadLatency`, { params: params });
  }

  public getPageFirstPeakLatency(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/page/getPageFirstPeakLatency`, { params: params });
  }

  public getPageFMPLatency(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get(`${this.baseUrl}/browser/api/page/getPageFMPLatency`, { params: params });
  }

  public getLogsData(entityId: string, startTime: number, endTime: number, page?: string, pageNo?: number, size?: number, version?: string, category?: string,
  ) {
    console.log('Version is ', version);
    let params = new HttpParams().set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    if (pageNo !== undefined) {
      params = params.set('pageNo', pageNo.toString());
    }
    if (size !== undefined) {
      params = params.set('size', size.toString());
    }
    if (version !== undefined && version !== 'All') {
      const encodedVersion = btoa(version);
      const compositeVersion = `${entityId}_${encodedVersion}`;
      params = params.set('version', compositeVersion);
    }
    if (page !== undefined) {
      const encodedPage = btoa(page);
      const compositePage = `${entityId}_${encodedPage}`;
      params = params.set('page', compositePage)
    }
    if (category !== undefined) {
      params = params.set('category', category.toString())
    }
    return this.http.get(`${this.baseUrl}` + "/browser/api/log/logData", { params: params });
  }

  public getLogsCount(entityId: string, startTime: number, endTime: number, page?: string, version?: string, category?: string,
  ) {
    let params = new HttpParams().set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    if (version !== undefined && version !== 'All') {
      const encodedVersion = btoa(version);
      const compositeVersion = `${entityId}_${encodedVersion}`;
      params = params.set('version', compositeVersion);
    }
    if (page !== undefined) {
      const encodedPage = btoa(page);
      const compositePage = `${entityId}_${encodedPage}`;
      params = params.set('page', compositePage)
    }
    if (category !== undefined) {
      params = params.set('category', category.toString())
    }
    return this.http.get(`${this.baseUrl}` + "/browser/api/log/getLogsCount", { params: params });
  }

  public getLogsAggregatedData(entityId: string, startTime: number, endTime: number, page?: string, size?: number, version?: string, category?: string) {
    let params = new HttpParams().set('serviceId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString())
    if (size !== undefined) {
      params = params.set('size', size.toString());
    }
    if (version !== undefined && version !== 'All') {
      const encodedVersion = btoa(version);
      const compositeVersion = `${entityId}_${encodedVersion}`;
      params = params.set('version', compositeVersion);
    }
    if (page !== undefined) {
      const encodedPage = btoa(page);
      const compositePage = `${entityId}_${encodedPage}`;
      params = params.set('page', compositePage)
    }
    if (category !== undefined) {
      params = params.set('category', category.toString())
    }
    return this.http.get(`${this.baseUrl}` + "/browser/api/log/logAggregatedData", { params: params });
  }

  // public getBrowserCombinedData(entityId: string, st: number, et: number, type: string) {
  //   let params = new HttpParams()
  //     .set('entityId', entityId.toString())
  //     .set('st', st.toString())
  //     .set('et', et.toString())
  //     .set('type', type.toString())
  //     return this.http.get<any>(`${this.baseUrl}`+/browser/api/getCombinedData, { params: params });
  // }

  public getAllVersionsCombinedData(entityId: string, st: number, et: number) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get<any>(`${this.baseUrl}/browser/api/getAllVersionsCombinedData`, { params: params });
  }

}