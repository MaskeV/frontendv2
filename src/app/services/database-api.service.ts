import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ServiceResponse } from '../models/common/ServiceResponse';
import { User } from '../models/user';
import { environment } from '../../environments/environment';
import { ResponseData, InstanceData } from '../models/database';
import { MySQLSlowStatement } from '../models/MySqlSlowStatements';
import { MsSqlSlowStatements } from '../models/MsSqlSlowStatements';
import { MySQLDDLStatement } from '../models/MySqlDDLStatements';
// import { ResponseData, InstanceData } from 'src/app/models/database';
// import { MsSqlSlowStatements } from 'src/app/models/MsSqlSlowStatements';
// import { MySQLSlowStatement } from 'src/app/models/MySQLSlowStatement';
// import { ServiceResponse } from 'src/app/models/ServivceResponse';
// import { User } from 'src/app/models/user';
// import { environment } from 'src/environments/environment';
// import { MySQLDDLStatement } from 'src/app/models/MySQLDDLStatement';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  // private baseURL: string = 'http://localhost:12040';
  private baseURL: string = environment.baseUrl;
  //  private baseURL = 'http://localhost:12010';

  constructor(
    private http: HttpClient
  ) { }

  INSPECTIONS_URL: string = 'database/v1/inspections'
  INSTANCE_URL: string = 'database/v1/instance'
  INSPECTIONS_URL_MSSQL: string = 'database/mssql/inspections'
  INSTANCE_URL_MSSQL: string = 'database/mssql/instance'

  ORCHESTRATOR_URL: string = 'database/orchestrator/v1';

  // public getAllAppListAndIpListByUserID(user: User, type: string) {
  //   return this.http.post(`${this.baseURL}/application/api/getAllAppListAndIpListByUserID`, user, {
  //     params: { type: type }
  //   });
  // }

  public getInstanceData(serviceId: string, st: number, et: number, currentPage: number, pageSize: number): Observable<ServiceResponse<InstanceData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
      .set('currentPage', currentPage.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<ServiceResponse<InstanceData[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getInstancesData`, { params: param });
  }

  public getServiceCurrentQPS(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL}/getCurrentQPS`, { params: param });
  }

  public getServiceCurrentTPS(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL}/getCurrentTPS`, { params: param });
  }

  public getServiceCommandTrends(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL}/getCommandTrends`, { params: param });
  }

  public getServiceSlowQueriesRate(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL}/getSlowQueriesRate`, { params: param });
  }
  public getServiceConnects(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL}/getConnects`, { params: param });
  }
  public getServiceThreads(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL}/getThreads`, { params: param });
  }
  public getServiceConnectionErrors(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL}/getConnectionErrors`, { params: param });
  }


  // For Instance APIs.

  public getInstanceNames(serviceId: string, st: number, et: number, currentPage: number, pageSize: number) {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
      .set('currentPage', currentPage.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<ServiceResponse<string[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getInstances`, { params: param });
  }

  public getUpTime(serviceId: string, st: number, et: number) {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData>>(`${this.baseURL}/${this.INSTANCE_URL}/getUptime`, { params: param });
  }

  public getMaxConnections(serviceId: string, st: number, et: number) {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData>>(`${this.baseURL}/${this.INSTANCE_URL}/getMaxConnections`, { params: param });
  }

  public getInnoDbBufferSize(serviceId: string, st: number, et: number) {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData>>(`${this.baseURL}/${this.INSTANCE_URL}/getInnoDbBufferPoolSize`, { params: param });
  }

  public getThreadCacheSize(serviceId: string, st: number, et: number) {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData>>(`${this.baseURL}/${this.INSTANCE_URL}/getThreadCacheSize`, { params: param });
  }

  public getInstanceCurrentQPS(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getCurrentQPS`, { params: param });
  }

  public getInstanceCurrentTPS(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getCurrentTPS`, { params: param });
  }

  public getInstanceCommandTrends(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getCommandTrends`, { params: param });
  }

  public getInstanceSlowQueriesRate(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getSlowQueriesRate`, { params: param });
  }
  public getInstanceConnects(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getConnects`, { params: param });
  }
  public getInstanceThreads(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getThreads`, { params: param });
  }
  public getInstanceConnectionErrors(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getConnectionErrors`, { params: param });
  }

  public getServiceSlowStatements(entityId: string, st: number, et: number): Observable<ServiceResponse<MySQLSlowStatement[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<MySQLSlowStatement[]>>(`${this.baseURL}/${this.INSPECTIONS_URL}/getSlowStatements`, { params: param });
  }

  public getInnoDbBufferPoolUsage(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getInnodbBufferPoolUsage`, { params: param });
  }
  public getInnoDbBufferPoolMetrics(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL}/getInnodbBufferPoolMetrics`, { params: param });
  }

  public getInstanceDataForMssql(serviceId: string, st: number, et: number, currentPage: number, pageSize: number): Observable<ServiceResponse<InstanceData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
      .set('currentPage', currentPage.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<ServiceResponse<InstanceData[]>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getInstancesData`, { params: param });
  }

  public getServiceCurrentQPSForMssql(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL_MSSQL}/getCurrentQPS`, { params: param });
  }


  public getServiceCommandTrendsForMssql(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL_MSSQL}/getCommandTrends`, { params: param });
  }

  public getServiceSlowQueriesRateForMssql(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL_MSSQL}/getSlowQueriesRate`, { params: param });
  }
  public getServiceConnectsForMssql(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL_MSSQL}/getConnects`, { params: param });
  }
  public getServiceThreadsForMssql(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL_MSSQL}/getThreads`, { params: param });
  }
  public getServiceConnectionErrorsForMssql(serviceId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSPECTIONS_URL_MSSQL}/getConnectionErrors`, { params: param });
  }


  // For Instance APIs.

  public getInstanceNamesForMssql(serviceId: string, st: number, et: number, currentPage: number, pageSize: number) {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
      .set('currentPage', currentPage.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<ServiceResponse<string[]>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getInstances`, { params: param });
  }

  public getUpTimeForMssql(serviceId: string, st: number, et: number) {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getUptime`, { params: param });
  }

  public getMaxConnectionsForMssql(serviceId: string, st: number, et: number) {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getMaxConnections`, { params: param });
  }

  public getBufferSizeForMssql(serviceId: string, st: number, et: number) {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getBufferPoolSize`, { params: param });
  }

  public getWorkerThreadSizeForMssql(serviceId: string, st: number, et: number) {
    let param = new HttpParams()
      .set('entityId', serviceId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getWorkerThreadSize`, { params: param });
  }

  public getInstanceCurrentQPSForMssql(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getCurrentQPS`, { params: param });
  }



  public getInstanceCommandTrendsForMssql(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getCommandTrends`, { params: param });
  }

  public getInstanceSlowQueriesRateForMssql(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getSlowQueriesRate`, { params: param });
  }
  public getInstanceConnectsForMssql(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getConnects`, { params: param });
  }
  public getInstanceThreadsForMssql(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getThreads`, { params: param });
  }
  public getInstanceConnectionErrorsForMssql(entityId: string, st: number, et: number): Observable<ServiceResponse<ResponseData[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<ResponseData[]>>(`${this.baseURL}/${this.INSTANCE_URL_MSSQL}/getConnectionErrors`, { params: param });
  }

  public getServiceSlowStatementsForMssql(entityId: string, st: number, et: number): Observable<ServiceResponse<MsSqlSlowStatements[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    return this.http.get<ServiceResponse<MsSqlSlowStatements[]>>(`${this.baseURL}/${this.INSPECTIONS_URL_MSSQL}/getSlowStatements`, { params: param });
  }

  public getSpErrorsForMssql(entityId: string, st: number, et: number): Observable<ServiceResponse<any[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get<ServiceResponse<any[]>>(`${this.baseURL}/${this.INSPECTIONS_URL_MSSQL}/getSpErrors`, { params: param });
  }

  public getDeadlockDetailsForMssql(entityId: string, st: number, et: number): Observable<ServiceResponse<any[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get<ServiceResponse<any[]>>(`${this.baseURL}/${this.INSPECTIONS_URL_MSSQL}/getDeadlockDetails`, { params: param });
  }

  public getServiceDdlStatements(entityId: string, st: number, et: number): Observable<ServiceResponse<MySQLDDLStatement[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString())
    console.log("getServiceDdlStatements", `${this.baseURL}/${this.INSPECTIONS_URL}/getDDLStatements`, { params: param });
    return this.http.get<ServiceResponse<MySQLDDLStatement[]>>(`${this.baseURL}/${this.INSPECTIONS_URL}/getDDLStatements`, { params: param });
  }

  public getServiceLockQueries(entityId: string, st: number, et: number): Observable<ServiceResponse<any[]>> {
    let param = new HttpParams()
      .set('entityId', entityId)
      .set('st', st.toString())
      .set('et', et.toString());
    return this.http.get<ServiceResponse<any[]>>(`${this.baseURL}/${this.INSPECTIONS_URL}/getLockQueries`, { params: param });
  }
  
  // database-api.service.ts
  public getUptimeMetrics(
    serviceList: string[],
    st: number,
    et: number,
    dbType: string
  ): Observable<any> {
    const url = `${this.baseURL}/database/v1/inspections/getUptimeMetrics`;

    const params = new HttpParams()
      .set('st', st.toString())
      .set('et', et.toString())
      .set('dbType', dbType); // 👈 send db type

    return this.http.post<any>(url, serviceList, { params });
  }

  // Orchestrator URLs
  public getClustersInfo(id: number): Observable<ServiceResponse<any>> {
    let param = new HttpParams()
      .set('orchestratorId', id);
    return this.http.get<ServiceResponse<any>>(`${this.baseURL}/${this.ORCHESTRATOR_URL}/clusters-info`, { params: param });
  }

  public getClusterInfo(id: number, clusterName: string): Observable<ServiceResponse<any>> {
    let param = new HttpParams()
      .set('orchestratorId', id)
      .set('clusterName', clusterName);
    return this.http.get<ServiceResponse<any>>(`${this.baseURL}/${this.ORCHESTRATOR_URL}/cluster-info`, { params: param });
  }

  public getClusterDetails(id: number, clusterName: string): Observable<ServiceResponse<any>> {
    let param = new HttpParams()
      .set('orchestratorId', id)
      .set('clusterName', clusterName);
    return this.http.get<ServiceResponse<any>>(`${this.baseURL}/${this.ORCHESTRATOR_URL}/cluster-details`, { params: param });
  }

  public promoteMaster(
    orchestratorId: number,
    metadata: any
  ): Observable<ServiceResponse<any>> {

    const params = new HttpParams()
      .set('orchestratorId', orchestratorId);

    return this.http.post<ServiceResponse<any>>(
      `${this.baseURL}/${this.ORCHESTRATOR_URL}/promoteMaster`,
      metadata,
      { params }
    );

  }

  public startReplication(
    orchestratorId: number,
    metadata: any
  ): Observable<ServiceResponse<any>> {

      const params = new HttpParams()
        .set('orchestratorId', orchestratorId);

    return this.http.post<ServiceResponse<any>>(
      `${this.baseURL}/${this.ORCHESTRATOR_URL}/startReplication`,
      metadata,
      { params }
    );
  }

  public beginDowntime(orchestratorId: number, metadata: any): Observable<ServiceResponse<any>> {

    const params = new HttpParams()
      .set('orchestratorId', orchestratorId);

    return this.http.post<ServiceResponse<any>>(
      `${this.baseURL}/${this.ORCHESTRATOR_URL}/startDowntime`,
      metadata,
      { params }
    );
  }

  public endDowntime(orchestratorId: number, metadata: any): Observable<ServiceResponse<any>> {

    const params = new HttpParams()
      .set('orchestratorId', orchestratorId);

    return this.http.post<ServiceResponse<any>>(
      `${this.baseURL}/${this.ORCHESTRATOR_URL}/endDowntime`,
      metadata,
      { params }
    );
  }

  public getOrchestratorServices(): Observable<ServiceResponse<any>> {
    return this.http.get<ServiceResponse<any>>(`${this.baseURL}/${this.ORCHESTRATOR_URL}/getAllOrchestrators`);
  }

  public getOrchestratorClusters(orchestratorId: number): Observable<ServiceResponse<any>> {
    const params = new HttpParams()
      .set('orchestratorId', orchestratorId);
    return this.http.get<ServiceResponse<any>>(`${this.baseURL}/${this.ORCHESTRATOR_URL}/clusters-info`, { params });
  }

}
