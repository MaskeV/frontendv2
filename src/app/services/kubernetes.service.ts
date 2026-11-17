import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class KubernetesService {

  private readonly BASE_URL = environment.baseUrl+'/k8s/api/cluster';
  private readonly POD_METRICS_URL = environment.baseUrl+'/api/k8s/pod-metrics';
  private readonly LOGS_URL = environment.baseUrl+'/api/k8s/logs';
  private readonly VOLUMES_URL = environment.baseUrl+'/api/k8s/volumes';
  private readonly NODE_METRICS_URL = environment.baseUrl+'/api/k8s/node';
  private readonly SERVICE_METRICS_URL = environment.baseUrl+'/api/k8s/service';
  private readonly APISERVER_URL = environment.baseUrl+'/api/k8s/apiserver';
  private readonly STATEFULSET_URL = environment.baseUrl+'/api/k8s/statefulset';
  private readonly DEPLOYMENT_METRICS_URL = environment.baseUrl+'/api/k8s/deployment';
  private readonly DAEMONSET_METRICS_URL = environment.baseUrl+'/api/k8s/daemonset';
  private readonly PVPVC_METRICS_URL = environment.baseUrl+'/api/k8s/pvpvc';
  private readonly CLUSTER_URL = environment.baseUrl+'/api/k8s/cluster/overview';
  private readonly PROXY_URL = environment.baseUrl+'/api/k8s/proxy';
  private readonly CLUSTER_METADATA_URL = environment.baseUrl+'/api/k8s/metadata';


    // private readonly BASE_URL = 'http://localhost:12048/k8s/api/cluster';
    // private readonly POD_METRICS_URL = 'http://localhost:12048/api/k8s/pod-metrics';
    // private readonly LOGS_URL = 'http://localhost:12048/api/k8s/logs';
    // private readonly VOLUMES_URL = 'http://localhost:12048/api/k8s/volumes';
    // private readonly NODE_METRICS_URL = 'http://localhost:12048/api/k8s/node';
    // private readonly SERVICE_METRICS_URL = 'http://localhost:12048/api/k8s/service';
    // private readonly APISERVER_URL = 'http://localhost:12048/api/k8s/apiserver';
    // private readonly STATEFULSET_URL = 'http://localhost:12048/api/k8s/statefulset';
    // private readonly DEPLOYMENT_METRICS_URL = 'http://localhost:12048/api/k8s/deployment';
    // private readonly DAEMONSET_METRICS_URL = 'http://localhost:12048/api/k8s/daemonset';
    // private readonly PVPVC_METRICS_URL = 'http://localhost:12048/api/k8s/pvpvc';
    // private readonly CLUSTER_URL = 'http://localhost:12048/api/k8s/cluster/overview';
    // private readonly PROXY_URL = 'http://localhost:12048/api/k8s/proxy';
    // private readonly CLUSTER_METADATA_URL = 'http://localhost:12048/api/k8s/metadata';


  //  api server

  private entityId: string = 'azhzLWNsdXN0ZXI6Om1pbmlrdWJl.1';
  private st: string = '202512291100';
  private et: string = '202512291130';

  constructor(private http: HttpClient) { }

  /* ================= COMMON PARAMS ================= */
  private getParams(): HttpParams {
    return new HttpParams()
      .set('entityId', this.entityId)
      .set('st', this.st)
      .set('et', this.et);
  }

  getCombinedMetrics(): Observable<any> {

    const body = {
      entityIds: [this.entityId],
      st: this.st,
      et: this.et
    };

    return this.http.post(
      `${this.BASE_URL}/getCombinedMetrics`,
      body
    );
  }


  getLatestClusterStats(): Observable<any> {
    return this.http.get(`${this.BASE_URL}/latestClusterStats`, { params: this.getParams() });
  }

  getClusterCPUResourceTrend(entityId: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.BASE_URL}/clusterCPUResourceTrend`, { params });
  }

  getClusterMemoryResourceTrend(entityId: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.BASE_URL}/clusterMemoryResourceTrend`, { params });
  }

  getClusterStorageResourceTrend(entityId: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.BASE_URL}/clusterStorageResourceTrend`, { params });
  }

  getClusterNodeStatus(entityId: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.BASE_URL}/clusterNodeStatus`, { params });
  }

  getClusterDeploymentStatus(entityId: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.BASE_URL}/clusterDeploymentStatus`, { params });
  }

  getUniqueNamespaces(hostName: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.CLUSTER_URL}/namespaces/unique`, { params });
  }

  getClusterDeploymentSpecReplicas(entityId: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.BASE_URL}/clusterDeploymentSpecReplicas`, { params });
  }

  getClusterServiceStatus(entityId: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.BASE_URL}/clusterServiceStatus`, { params });
  }

  getClusterPodStatusNotRunning(entityId: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.BASE_URL}/clusterPodStatusNotRunning`, { params });
  }

  getClusterPodStatusWaiting(entityId: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.BASE_URL}/clusterPodStatusWaiting`, { params });
  }

  // node 
  getClusterNodePodTotalTrend(
    entityId: string,
    st: string,
    et: string
  ): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/clusterNodePodTotalTrend`,
      {
        params: new HttpParams()
          .set('entityId', entityId)
          .set('st', st)
          .set('et', et)
      }
    );
  }

  /* ================= NODE : CPU RESOURCES ================= */

  getNodeCPUResourceTrend(
    entityId: string,
    st: string,
    et: string
  ): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/nodeCPUResourceTrend`,
      {
        params: new HttpParams()
          .set('entityId', entityId)
          .set('st', st)
          .set('et', et)
      }
    );
  }

  /* ================= NODE : MEMORY RESOURCES ================= */

  getNodeMemoryResourceTrend(
    entityId: string,
    st: string,
    et: string
  ): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/nodeMemoryResourceTrend`,
      {
        params: new HttpParams()
          .set('entityId', entityId)
          .set('st', st)
          .set('et', et)
      }
    );
  }

  /* ================= NODE : STORAGE RESOURCES ================= */

  getNodeStorageResourceTrend(
    entityId: string,
    st: string,
    et: string
  ): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/nodeStorageResourceTrend`,
      {
        params: new HttpParams()
          .set('entityId', entityId)
          .set('st', st)
          .set('et', et)
      }
    );
  }

  /* ================= NODE : CPU USAGE ================= */

  getNodeCPUUsageTrend(
    entityId: string,
    st: string,
    et: string
  ): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/nodeCPUUsageTrend`,
      {
        params: new HttpParams()
          .set('entityId', entityId)
          .set('st', st)
          .set('et', et)
      }
    );
  }

  /* ================= NODE : MEMORY USAGE ================= */

  getNodeMemoryUsageTrend(
    entityId: string,
    st: string,
    et: string
  ): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/nodeMemoryUsageTrend`,
      {
        params: new HttpParams()
          .set('entityId', entityId)
          .set('st', st)
          .set('et', et)
      }
    );
  }

  /* ================= NODE : NETWORK ================= */

  getNodeNetworkUsageTrend(
    entityId: string,
    st: string,
    et: string
  ): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/nodeNetworkUsageTrend`,
      {
        params: new HttpParams()
          .set('entityId', entityId)
          .set('st', st)
          .set('et', et)
      }
    );
  }

  /* ================= NODE : STATUS ================= */

  getNodeStatus(
    entityId: string,
    st: string,
    et: string
  ): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/clusterNodeStatusofParticularNode`,
      {
        params: new HttpParams()
          .set('entityId', entityId)
          .set('st', st)
          .set('et', et)
      }
    );
  }
  getNodeCombinedMetrics(st: string, et: string): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/nodeCombinedMetrics`,
      {
        params: new HttpParams()
          .set('st', st)
          .set('et', et)
      }
    );
  }

  // service





  // Pod Metrics
  getPodCpuMetrics(st: string, et: string, hostName: string, namespace?: string, podName?: string): Observable<any> {
    let params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);
    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    return this.http.get(`${this.POD_METRICS_URL}/cpu`, { params });
  }

  getPodMemoryMetrics(st: string, et: string, hostName: string, namespace?: string, podName?: string): Observable<any> {
    let params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);
    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    return this.http.get(`${this.POD_METRICS_URL}/memory`, { params });
  }

  getPodCpuLimitMetrics(st: string, et: string, hostName: string, namespace?: string, podName?: string): Observable<any> {
    let params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);
    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    return this.http.get(`${this.POD_METRICS_URL}/cpu-limit`, { params });
  }

  getPodMemoryLimitMetrics(st: string, et: string, hostName: string, namespace?: string, podName?: string): Observable<any> {
    let params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);
    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    return this.http.get(`${this.POD_METRICS_URL}/memory-limit`, { params });
  }

  getPodMemoryWorkingSetLimitMetrics(st: string, et: string, hostName: string, namespace?: string, podName?: string): Observable<any> {
    let params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);
    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    return this.http.get(`${this.POD_METRICS_URL}/memory-working-set-limit`, { params });
  }

  getPodNetworkTxMetrics(st: string, et: string, hostName: string, namespace?: string, podName?: string): Observable<any> {
    let params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);
    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    return this.http.get(`${this.POD_METRICS_URL}/network-tx`, { params });
  }

  getPodNetworkRxMetrics(st: string, et: string, hostName: string, namespace?: string, podName?: string): Observable<any> {
    let params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);
    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    return this.http.get(`${this.POD_METRICS_URL}/network-rx`, { params });
  }

  getPodStatus(st: string, et: string, hostName: string, namespace?: string, podName?: string): Observable<any> {
    let params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);
    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    return this.http.get(`${this.POD_METRICS_URL}/status`, { params });
  }

  getLogsLevelsOverTime(hostName: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.LOGS_URL}/levels-over-time`, { params });
  }

  getLogsList(
    hostName: string,
    st: string,
    et: string,
    size: number,
    page: number,
    filters: { key: string; value: string }[]
  ): Observable<any> {
    let params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et)
      .set('size', size)
      .set('page', page);

    filters.forEach((filter) => {
      if (filter.key && filter.value) {
        params = params.set(filter.key, filter.value);
      }
    });

    return this.http.get(`${this.LOGS_URL}/list`, { params });
  }

  getVolumeUsagePerPod(
    hostName: string,
    st: string,
    et: string,
    namespace?: string,
    podName?: string,
    volumeName?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);

    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    if (volumeName) params = params.set('volumeName', volumeName);

    return this.http.get(`${this.VOLUMES_URL}/usage`, { params });
  }

  getVolumeFileInodes(
    hostName: string,
    st: string,
    et: string,
    namespace?: string,
    podName?: string,
    volumeName?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);

    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    if (volumeName) params = params.set('volumeName', volumeName);

    return this.http.get(`${this.VOLUMES_URL}/file-inodes`, { params });
  }

  getVolumeFsInfo(
    hostName: string,
    st: string,
    et: string,
    namespace?: string,
    podName?: string,
    volumeName?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);

    if (namespace) params = params.set('namespace', namespace);
    if (podName) params = params.set('podName', podName);
    if (volumeName) params = params.set('volumeName', volumeName);

    return this.http.get(`${this.VOLUMES_URL}/fs-info`, { params });
  }

  // Proxy Dashboard
  

  getProxyNetworkLatency(hostName:string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.PROXY_URL}/network-latency`, { params });
  }

  getProxySyncRulesLatency(hostName:string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.PROXY_URL}/sync-rules-latency`, { params });
  }

  getProxyAvgResidentMemory(hostName:string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.PROXY_URL}/avg-resident-memory`, { params });
  }

  getProxyCpuUsage(hostName:string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.PROXY_URL}/cpu-usage`, { params });
  }

  getProxyRequestLatency(hostName:string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.PROXY_URL}/request-latency`, { params });
  }

  getProxyRequestsRate(hostName:string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.PROXY_URL}/requests-rate`, { params });
  }

  getProxyClientErrorRate(hostName:string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.PROXY_URL}/client-error-rate`, { params });
  }

  getProxyProcessMetrics(hostName:string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.PROXY_URL}/process-metrics`, { params });
  }

  

  getClusterNodesStatus(host: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.CLUSTER_URL}/nodes/status`, { params });
  }

  getClusterNodeOverview(host: string, st: string, et: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    return this.http.get(`${this.CLUSTER_URL}/node-overview`, { params });
  }

  getClusterRunningPods(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/pods/namespace`, { params });
  }

  getClusterMetadataStructure(): Observable<any> {
    return this.http.get(`${this.CLUSTER_METADATA_URL}/structure`);
  }

  getNodesByAppId(payload: string[]): Observable<any> {
    return this.http.post(`${this.CLUSTER_METADATA_URL}/nodes-by-appid`, payload);
  }

  getClusterPodsStatus(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/pods/status`, { params });
  }

  getClusterDeploymentsStatus(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/deployments/status`, { params });
  }

  getClusterDaemonSetsStatus(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/daemonsets/status`, { params });
  }

  getClusterReplicaSetsStatus(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/replicasets/status`, { params });
  }

  getClusterMemoryUsage(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/memory`, { params });
  }

  getClusterCoreUsage(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/cores`, { params });
  }

  getTopCpuPods(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/pods/top-cpu`, { params });
  }

  getTopCpuLimitPods(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/pods/top-cpu-limit`, { params });
  }

  getTopMemoryPods(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/pods/top-memory`, { params });
  }

  getTopMemoryLimitPods(host: string, st: string, et: string, namespace?: string): Observable<any> {
    const params = new HttpParams()
      .set('hostName', host)
      .set('st', st)
      .set('et', et);
    
    if(namespace){
      params.set('namespace', namespace);
    }
    return this.http.get(`${this.CLUSTER_URL}/pods/top-memory-limit`, { params });
  }

  /* ================= NODE METRICS ================= */

  getNodeCpuMetrics(st: string, et: string, hostName: string): Observable<any> {
    const params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);

    return this.http.get(`${this.NODE_METRICS_URL}/cpu`, { params });
  }

  getNodeMemoryMetrics(st: string, et: string, hostName: string): Observable<any> {
    const params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);

    return this.http.get(`${this.NODE_METRICS_URL}/memory`, { params });
  }

  getNodeMemoryWorkingSetMetrics(st: string, et: string, hostName: string): Observable<any> {
    const params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);

    return this.http.get(`${this.NODE_METRICS_URL}/memory/workingset`, { params });
  }

  getNodeNetworkRxMetrics(st: string, et: string, hostName: string): Observable<any> {
    const params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);

    return this.http.get(`${this.NODE_METRICS_URL}/network/rx`, { params });
  }

  getNodeNetworkTxMetrics(st: string, et: string, hostName: string): Observable<any> {
    const params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);

    return this.http.get(`${this.NODE_METRICS_URL}/network/tx`, { params });
  }

  getNodeFilesystemMetrics(st: string, et: string, hostName: string): Observable<any> {
    const params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);

    return this.http.get(`${this.NODE_METRICS_URL}/filesystem`, { params });
  }

  getNodeInodeMetrics(st: string, et: string, hostName: string): Observable<any> {
    const params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);

    return this.http.get(`${this.NODE_METRICS_URL}/filesystem/inodes`, { params });
  }
  getNodeMetadata(st: string, et: string, hostName: string): Observable<any> {
    const params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);

    return this.http.get(`${this.NODE_METRICS_URL}/metadataNode`, { params });
  }

  getNodePodsAllocatedAllocatable(st: string, et: string, hostName: string): Observable<any> {
    const params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);

    return this.http.get(`${this.NODE_METRICS_URL}/podsAllocatedAllocatable`, { params });
  }

  // services

  getServiceNames(hostName: string, st: string, et: string) {
    let params: any = { hostName, st, et };

    return this.http.get<any>(
      `${this.SERVICE_METRICS_URL}/uniqueList`,
      { params }
    );
  }

  getServicesMetaData(st: string, et: string, hostName: string, namespace?: string, serviceName?: string): Observable<any> {
    let params = new HttpParams()
      .set('st', st)
      .set('et', et)
      .set('hostName', hostName);

    if (namespace) params = params.set('namespace', namespace);
    if (serviceName) params = params.set('serviceName', serviceName);

    return this.http.get(`${this.SERVICE_METRICS_URL}/servicesMetaData`, { params });
  }


  // api server


  getApiserverRequestRate(hostName: string, st: string, et: string) {
    return this.http.get<any>(
      `${this.APISERVER_URL}/request-rate`,
      {
        params: new HttpParams()
          .set('hostName', hostName)
          .set('st', st)
          .set('et', et)
      }
    );
  }

  getApiserverWatchEventSize(hostName: string, st: string, et: string) {
    return this.http.get<any>(
      `${this.APISERVER_URL}/watch-events-size`,
      {
        params: new HttpParams()
          .set('hostName', hostName)
          .set('st', st)
          .set('et', et)
      }
    );
  }

  getApiserverRawMetricsText(host: string, st: string, et: string) {
    return this.http.get(
      `${this.APISERVER_URL}/rawApiServerMetrics`,
      {
        params: { hostName: host, st, et },
        responseType: 'text'
      }
    );
  }

  getApiserverEtcdObjectCountText(host: string, st: string, et: string) {
    return this.http.get(
      `${this.APISERVER_URL}/etcd-object-count`,
      {
        params: { hostName: host, st, et },
        responseType: 'text'
      }
    );
  }

  // stateful sets

  /* ================= STATEFULSET METRICS ================= */

  getStatefulsetNames(hostName: string, st: string, et: string) {
    let params: any = { hostName, st, et };

    return this.http.get<any>(
      `${this.STATEFULSET_URL}/uniqueList`,
      { params }
    );
  }

  getStatefulsetReplicasObserved(hostName: string, st: string, et: string, namespace?: string, statefulSetName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (statefulSetName) params.statefulSetName = statefulSetName;

    return this.http.get<any>(
      `${this.STATEFULSET_URL}/replicasObserved`,
      { params }
    );
  }

  getStatefulsetReplicasDesired(hostName: string, st: string, et: string, namespace?: string, statefulSetName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (statefulSetName) params.statefulSetName = statefulSetName;

    return this.http.get<any>(
      `${this.STATEFULSET_URL}/replicasDesired`,
      { params }
    );
  }

  getStatefulsetReplicasReady(hostName: string, st: string, et: string, namespace?: string, statefulSetName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (statefulSetName) params.statefulSetName = statefulSetName;

    return this.http.get<any>(
      `${this.STATEFULSET_URL}/replicasReady`,
      { params }
    );
  }

  getStatefulsetGenerationObserved(hostName: string, st: string, et: string, namespace?: string, statefulSetName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (statefulSetName) params.statefulSetName = statefulSetName;

    return this.http.get<any>(
      `${this.STATEFULSET_URL}/generationObserved`,
      { params }
    );
  }

  getStatefulsetGenerationDesired(hostName: string, st: string, et: string, namespace?: string, statefulSetName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (statefulSetName) params.statefulSetName = statefulSetName;

    return this.http.get<any>(
      `${this.STATEFULSET_URL}/generationDesired`,
      { params }
    );
  }

  getStatefulsetReplicasSummary(hostName: string, st: string, et: string, namespace?: string, statefulSetName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (statefulSetName) params.statefulSetName = statefulSetName;

    return this.http.get<any>(
      `${this.STATEFULSET_URL}/replicasSummary`,
      { params }
    );
  }


  /* ================= DEPLOYMENT METRICS ================= */

  getDeploymentNames(hostName: string, st: string, et: string) {
    let params: any = { hostName, st, et };

    return this.http.get<any>(
      `${this.DEPLOYMENT_METRICS_URL}/uniqueList`,
      { params }
    );
  }

    getDeploymentReplicasSummary(
    hostName: string,
    st: string,
    et: string,
    namespace?: string,
    deploymentName?: string
  ) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (deploymentName) params.deploymentName = deploymentName;

    return this.http.get<any>(
      `${this.DEPLOYMENT_METRICS_URL}/replicasSummary`,
      { params }
    );
  }

  getDeploymentReplicasDesired(hostName: string, st: string, et: string, namespace?: string, deploymentName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (deploymentName) params.deploymentName = deploymentName;

    return this.http.get<any>(
      `${this.DEPLOYMENT_METRICS_URL}/replicasDesired`,
      { params }
    );
  }

  getDeploymentReplicasAvailable(hostName: string, st: string, et: string, namespace?: string, deploymentName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (deploymentName) params.deploymentName = deploymentName;

    return this.http.get<any>(
      `${this.DEPLOYMENT_METRICS_URL}/replicasAvailable`,
      { params }
    );
  }

  getDeploymentReplicasUnavailable(hostName: string, st: string, et: string, namespace?: string, deploymentName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (deploymentName) params.deploymentName = deploymentName;

    return this.http.get<any>(
      `${this.DEPLOYMENT_METRICS_URL}/replicasUnavailable`,
      { params }
    );
  }

  getDeploymentReplicasUpdated(hostName: string, st: string, et: string, namespace?: string, deploymentName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (deploymentName) params.deploymentName = deploymentName;

    return this.http.get<any>(
      `${this.DEPLOYMENT_METRICS_URL}/replicasUpdated`,
      { params }
    );
  }

  /* ================= DAEMONSET METRICS ================= */

  getDaemonSetsNames(hostName: string, st: string, et: string) {
    let params: any = { hostName, st, et };

    return this.http.get<any>(
      `${this.DAEMONSET_METRICS_URL}/uniqueList`,
      { params }
    );
  }


  getDaemonSetReplicasSummary(
    hostName: string,
    st: string,
    et: string,
    namespace?: string,
    daemonSetName?: string
  ) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (daemonSetName) params.daemonSetName = daemonSetName;

    return this.http.get<Record<string, {
      desired_replicas: number;
      available_replicas: number;
      unavailable_replicas: number;
    }>>(
      `${this.DAEMONSET_METRICS_URL}/replicasSummary`,
      { params }
    );
  }

  getDaemonSetReplicasDesired(hostName: string, st: string, et: string, namespace?: string, daemonSetName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (daemonSetName) params.daemonSetName = daemonSetName;

    return this.http.get<any>(
      `${this.DAEMONSET_METRICS_URL}/replicasDesired`,
      { params }
    );
  }

  getDaemonSetReplicasAvailable(hostName: string, st: string, et: string, namespace?: string, daemonSetName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (daemonSetName) params.daemonSetName = daemonSetName;

    return this.http.get<any>(
      `${this.DAEMONSET_METRICS_URL}/replicasAvailable`,
      { params }
    );
  }

  getDaemonSetReplicasUnavailable(hostName: string, st: string, et: string, namespace?: string, daemonSetName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (daemonSetName) params.daemonSetName = daemonSetName;

    return this.http.get<any>(
      `${this.DAEMONSET_METRICS_URL}/replicasUnavailable`,
      { params }
    );
  }

  getDaemonSetReplicasReady(hostName: string, st: string, et: string, namespace?: string, daemonSetName?: string) {
    let params: any = { hostName, st, et };
    if (namespace) params.namespace = namespace;
    if (daemonSetName) params.daemonSetName = daemonSetName;

    return this.http.get<any>(
      `${this.DAEMONSET_METRICS_URL}/replicasReady`,
      { params }
    );
  }


  /* ================= PV / PVC METRICS ================= */

  getPersistentVolumesInfo(
    hostName: string,
    st: string,
    et: string,
    persistentVolumeName?: string,
    persistentVolumeClaimName?: string
  ) {
    let params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);

    if (persistentVolumeName) params = params.set('persistentVolumeName', persistentVolumeName);
    if (persistentVolumeClaimName) params = params.set('persistentVolumeClaimName', persistentVolumeClaimName);

    return this.http.get<Record<string, {
      phase: string[];
      capacity_bytes: number[];
      storage_class: string[];
    }>>(
      `${this.PVPVC_METRICS_URL}/volumesInformation`,
      { params }
    );
  }

  getPersistentVolumeClaimsInfo(
    hostName: string,
    st: string,
    et: string,
    persistentVolumeClaimName?: string,
    persistentVolumeName?: string
  ) {
    let params = new HttpParams()
      .set('hostName', hostName)
      .set('st', st)
      .set('et', et);
      
    if (persistentVolumeClaimName) params = params.set('persistentVolumeClaimName', persistentVolumeClaimName);
    if (persistentVolumeName) params = params.set('persistentVolumeName', persistentVolumeName);

    return this.http.get<Record<string, {
      phase: string[];
      storage_class: string[];
      volume_name: string[];
      request_storage_bytes: number[];
      access_mode: string[];
    }>>(
      `${this.PVPVC_METRICS_URL}/volumesClaimsInformation`,
      { params }
    );
  }


}


