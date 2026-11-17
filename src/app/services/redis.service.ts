import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class RedisService {
  constructor(private http: HttpClient) { }

  private baseUrl = environment.baseUrl;
  // private baseUrl = "http://localhost:12021";

  getRedisListsAPI(st: any, et: any, serviceResponseList: any): Observable<any> {
    let params = new HttpParams().set("st", st).set("et", et);

    if (Array.isArray(serviceResponseList) && serviceResponseList.length > 0) {
      params = params.set("redisListByUser", serviceResponseList.join(','));
    } else if (typeof serviceResponseList === 'string' && serviceResponseList.trim() !== '') {
      params = params.set("redisListByUser", serviceResponseList);
    }

    return this.http.get(`${this.baseUrl}/infra/api/redis/redisLists`, {
      params,
    });
  }

  getLatestRedisStats(entityId: string, st: any, et: any): Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/latestRedisStats`,
      { params }
    );
  }

  getMemoryUsage(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/redisMemoryUsage`,
      { params }
    );
  }

  getHitRate(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(`${this.baseUrl}/infra/api/redis/hitRate`, {
      params,
    });
  }

  getNetworkMetrics(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(`${this.baseUrl}/infra/api/redis/networkMetrices`, {
      params,
    });
  }

  getDBKeysMetrics(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(`${this.baseUrl}/infra/api/redis/dbKeysMetrices`, {
      params,
    });
  }

  getRedisUptime(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(`${this.baseUrl}/infra/api/redis/redisUptime`, {
      params,
    });
  }

  getTotalCommandRate(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/getTotalCommandRate`,
      {
        params,
      }
    );
  }

  getClientMetrics(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/connectedblockedClients`,
      {
        params,
      }
    );
  }

  getAverageTimeSpent(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/getAverageTimeSpentByCommand`,
      {
        params,
      }
    );
  }

  getCommandDurationSeconds(
    entityId: string,
    st: any,
    et: any
  ): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/getCommandDurationSecondsTotalRate`,
      {
        params,
      }
    );
  }

  getInstanceLatestRedisStats(
    entityId: string,
    st: any,
    et: any
  ): Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/latestInstanceRedisStats`,
      { params }
    );
  }

  getInstanceMemoryUsage(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/redisInstanceMemoryUsage`,
      { params }
    );
  }

  getInstanceHitRate(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(`${this.baseUrl}/infra/api/redis/instancehitRate`, {
      params,
    });
  }

  getInstanceNetworkMetrics(
    entityId: string,
    st: any,
    et: any
  ): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/networkInstanceMetrices`,
      {
        params,
      }
    );
  }

  getInstanceDBKeysMetrics(
    entityId: string,
    st: any,
    et: any
  ): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/dbInstanceKeysMetrices`,
      {
        params,
      }
    );
  }

  getInstanceTotalCommandRate(
    entityId: string,
    st: any,
    et: any
  ): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/getInstanceTotalCommandRate`,
      {
        params,
      }
    );
  }

  getInstanceClientMetrics(
    entityId: string,
    st: any,
    et: any
  ): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/instanceconnectedblockedClients`,
      {
        params,
      }
    );
  }

  getInstanceRedisUptime(entityId: string, st: any, et: any): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/redisInstanceUptime`,
      {
        params,
      }
    );
  }

  getInstanceAverageTimeSpent(
    entityId: string,
    st: any,
    et: any
  ): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/getInstanceAverageTimeSpentByCommand`,
      {
        params,
      }
    );
  }

  getInstanceCommandDurationSeconds(
    entityId: string,
    st: any,
    et: any
  ): Observable<any> {
    const params = new HttpParams()
      .set("entityId", entityId)
      .set("st", st)
      .set("et", et);

    return this.http.get<any>(
      `${this.baseUrl}/infra/api/redis/getInstanceCommandDurationSecondsTotalRate`,
      {
        params,
      }
    );
  }

  getRedisInstances(
    serviceId: string,
    st: any,
    et: any,
    instance?: string,
    page: number = 0,
    size: number = 10,
    type: string = "all"
  ): Observable<any> {
    let params = new HttpParams()
      .set("serviceId", serviceId)
      .set("st", st)
      .set("et", et)
      .set("page", page.toString())
      .set("size", size.toString())
      .set("type", type);

    if (instance && instance.trim() !== "") {
      params = params.set("instance", instance);
    }

    return this.http.get(`${this.baseUrl}/infra/api/redis/getInstances`, {
      params,
    });
  }
}
