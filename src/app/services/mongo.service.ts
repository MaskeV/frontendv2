import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

interface MongoNode {
  nodeName: string;
  entityId: string;
  uptimeSeconds: number;
  qps: number;
  memoryUsagePercent: number;
  avgLatency: number;
}

interface MongoNodeResponse {
  nodes: MongoNode[];
}

@Injectable({
  providedIn: 'root'
})
export class MongoService {

  // private baseUrl = 'http://localhost:12040';
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  // CLUSTER DATA 

  public getNonRelationalDbData(applicationNames: string[], st: string, et: string): Observable<any> {
    const body = {
      applicationNames,
      st,
      et
    };
    return this.http.post(`${this.baseUrl}/database/mongo/cluster/nonRelationalDbData`, body);
  }


  // CLUSTER OVERVIEW

  public getClusterUptime(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/cluster/uptime`, { params: params });
  }

  public getClusterDataSize(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/cluster/dataSize`, { params: params });
  }

  public getClusterCollectionCount(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/cluster/collectionCount`, { params: params });
  }

  public getClusterObjectCount(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/cluster/objectCount`, { params: params });
  }

  public getClusterDocumentTotalQPS(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/cluster/documentTotalQps`, { params: params });
  }

  public getClusterOperationTotalQPS(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/cluster/operationTotalQps`, { params: params });
  }

  public getClusterConnections(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/cluster/connections`, { params: params });
  }

  public getClusterCursorTotal(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/cluster/cursorTotal`, { params: params });
  }


  // NODE DATA

  public getNodesWithData(
    serviceId: string,
    st: number,
    et: number
  ): Observable<MongoNodeResponse> {

    const params = new HttpParams()
      .set('serviceId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString());

    return this.http.get<MongoNodeResponse>(
      `${this.baseUrl}/database/mongo/node/nodesData`,
      { params }
    );
  }

  // NODE OVERVIEW

  public getNodeUptime(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/uptime`, { params: params });
  }

  public getNodeQps(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/qps`, { params: params });
  }

  public getNodeAvgLatency(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/avgLatency`, { params: params });
  }

  public getNodeMemoryUsage(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/memoryUsage`, { params: params });
  }

  public getNodeCpuTotalPercentage(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/cpuTotalPercentage`, { params: params });
  }

  public getNodeConnections(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/connections`, { params: params });
  }

  public getNodeDocumentQPS(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/documentQps`, { params: params });
  }

  public getNodeOperationQPS(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/operationQps`, { params: params });
  }

  public getNodeReplOperationQPS(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/replOperationQps`, { params: params });
  }

  public getNodeCursor(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/cursor`, { params: params });
  }

  public getNodeReplBufferCount(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/replBufferCount`, { params: params });
  }

  public getNodeWriteWaitTime(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/writeWaitTime`, { params: params });
  }

  public getNodeNetworkBytes(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/networkBytes`, { params: params });
  }

  public getNodeMemoryFreeKb(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/memoryFreeKb`, { params: params });
  }

  public getNodeDiskKb(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/diskKB`, { params: params });
  }

  public getNodeActiveClients(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/activeClients`, { params: params });
  }

  public getNodeTransactions(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/transactions`, { params: params });
  }

  public getNodeOperationLatency(
    entityId: string,
    st: string,
    et: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);

    return this.http.get(
      `${this.baseUrl}/database/mongo/node/latencyOpRate`,
      { params }
    );
  }

  public getNodeServerStatusMemory(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/serverStatusMemory`, { params: params });
  }

  public getNodeAsserts(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/asserts`, { params: params });
  }

  public getNodeReplBufferSize(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/replBufferSize`, { params: params });
  }

  public getNodeQueuedOperation(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/queuedOperation`, { params: params });
  }

  public getNodeWriteWaitNum(entityId: string, st: string, et: string): Observable<any> {
    let params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get(`${this.baseUrl}/database/mongo/node/writeWaitNum`, { params: params });
  }

}
