import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AlertConfig } from '../models/AlertConfig';
import { ApplicationMaster } from '../models/application-master';
import { User } from '../models/user';
import { Alert } from '../models/alert';
import { AlertDetails } from '../models/alertDetails';

export interface HealthRule {
  id: number;
  healthRuleName: string;
  isActive: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  [x: string]: any;


   private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://localhost:12011';


  constructor(private http: HttpClient) { } 

  // For Jira Integration by Chandan
  getJiraTools() {
    return this.http.get<any>(`${this.baseUrl}` + `/interfaceConfig/api/getJiraTools`);
  }
  getAssigneeList(toolId: any) {
    const param = new HttpParams().set("toolId", toolId);
    return this.http.get<any>(`${this.baseUrl}` + `/interfaceConfig/api/getAssigneeDetails`, { params: param });
  }
  getIssueTypes(toolId: any) {
    const param = new HttpParams().set("toolId", toolId);
    return this.http.get<any>(`${this.baseUrl}` + `/interfaceConfig/api/getIssueTypes`, { params: param });
  }

  // FOR CUSTOM ALERT BY Chandan
  getCustomMetrics(data: any, applicationType: string, applicationId: any, healthRuleTypeId: any, technology?: any) {
    let sessionDTO = data;
    let param = new HttpParams().set("applicationType", applicationType).set("applicationId", applicationId).set("healthRuleTypeId", healthRuleTypeId);
    if (technology) {
      param = param.set("technologytype", technology);
    }
    return this.http.post(`${this.baseUrl}` + `/alert/api/getCustomMetric`, sessionDTO, { params: param });
  }
  getAdditionalConfig(metricName: string, entityId: string) {
    const param = new HttpParams().set('metricName', metricName).set('entityId', entityId);
    return this.http.post(`${this.baseUrl}` + `/alert/api/getAllParamsDataByMetricName`, {}, { params: param });
  }

  getAllApplications(data: any): Observable<object> {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `/application/api/getAllApplications`, { params: sessionDTO });
  }

  getAllHealthRuleTypes(data: any) {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `/alert/api/getAllHealthRuleTypes`, { params: sessionDTO });
  }

  getAllHealthRuleTypesForMetric(data: any) {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `/alert/api/getAllHealthRuleTypesForMetric`, { params: sessionDTO });
  }
  getHealthRuleByAppId(application: ApplicationMaster) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/getHealthRuleByAppId`, application);
  }

  getHealthByAppId(application: ApplicationMaster) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/getHealthByAppId`, application);
  }

  getServiceType(healthRuleTypeName: String): Observable<object> {
    return this.http.post(`${this.baseUrl}` + `/alert/api/getServiceType`, { healthRuleTypeName: healthRuleTypeName });
  }

  getAllIpAddressByAppId(application: ApplicationMaster) {
    return this.http.post(`${this.baseUrl}` + `/application/api/getAllIpAddressByAppId`, application);
  }

  getAllAlertDurations(data: any) {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `/alert/api/getAllAlertDurations`, { params: sessionDTO });
  }

  getHealthRuleById(alert: Alert) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/getHealthRuleById`, alert);
  }

  getAllAlerts(sessionDTO: any, applicationId: any) {
    let params = new HttpParams();

    Object.keys(sessionDTO).forEach(key => {
      params = params.set(key, sessionDTO[key]);
    });

    if (applicationId !== null && applicationId !== "Select") {
      params = params.set('applicationId', applicationId);
    }

    return this.http.get(`${this.baseUrl}/alert/api/getAllAlerts`, { params });
  }

  getAllSetAlerts(data: any) {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `/alert/api/getAllSetAlerts`, { params: sessionDTO });
  }

  createAlert(alertObj: AlertDetails, techType?: string) {
    let params = new HttpParams()
    if (techType) {
      params = params.set('technology_type', techType);
    }
    return this.http.post<AlertDetails>(`${this.baseUrl}` + `/alert/api/createAlert`, alertObj, { params });
  }

  updateConfiguredAlerts(alertObj: AlertConfig) {
    return this.http.post<AlertDetails>(`${this.baseUrl}` + `/alert/api/updateConfigureAlert`, alertObj);
  }

  setConfiguredAlerts(alertObj: AlertConfig) {
    return this.http.post<AlertDetails>(`${this.baseUrl}` + `/alert/api/setConfigureAlert`, alertObj);
  }





  getAllSentAlerts(data: any) {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `Ruambot_Alert/alert/api/admin/getAllSentAlerts`, { params: sessionDTO });
  }


  configureAlert(alertObj: AlertDetails) {
    return this.http.post<AlertDetails>(`${this.baseUrl}` + `Ruambot_Alert/alert/api/admin/configureAlert`, alertObj);
  }

  updateAlert(alertObj: AlertDetails, techType?: string) {
    let params = new HttpParams()
    if (techType) {
      params = params.set('technology_type', techType);
    }
    return this.http.post(`${this.baseUrl}` + `/alert/api/updateAlert`, alertObj, { params });
  }

  deleteAlert(alertObj: AlertDetails) {

    return this.http.post(`${this.baseUrl}` + `/alert/api/deleteAlert`, alertObj);
  }

  deleteSetAlert(alertConfig: AlertConfig) {

    return this.http.post(`${this.baseUrl}` + `/alert/api/deleteSetAlert`, alertConfig);
  }

  getAlertHistory(application: ApplicationMaster) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/getAlertHistory`, application);
  }

  toggleAlertFlash(user: User) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/toggleAlertFlash`, user);
  }

  checkAlertSent(user: User) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/checkAlertSent`, user);
  }



  getAlertNotificationTimeInterval(data: any) {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `/alert/api/getAlertNotificationTimeInterval`, { params: sessionDTO });
  }

  getAlertHistoryByDateRange(data: any) {
    console.log(data);
    return this.http.post(`${this.baseUrl}` + `/alert/api/getAlertHistoryByDateRange`, data);
  }

  // Home Page 
  getApplicationAlertDetails(application: ApplicationMaster) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/getApplicationAlertDetails`, application);
  }

  getCriticalAlertsDetails(application: ApplicationMaster) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/getCriticalAlertsDetails`, application);
  }

  getWarningAlertsDetails(application: ApplicationMaster) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/getWarningAlertsDetails`, application);
  }

  getNormalAlertsDetails(application: ApplicationMaster) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/getNormalAlertsDetails`, application);
  }

  getViewAlertByAppId(alertConfigObj: AlertConfig) {
    return this.http.post<AlertDetails>(`${this.baseUrl}` + `/alert/api/getViewAlertByAppId`, alertConfigObj);
  }

  getAlertMailBody(alertConfigObj: AlertConfig) {
    return this.http.post(`${this.baseUrl}` + `/alert/api/getAlertMailBody`, alertConfigObj);
  }

  testConnection(alertDetailsObj: AlertDetails) {
    return this.http.post(`${this.baseUrl}` + `/report/api/testConnection`, { dbType: alertDetailsObj.dbType, ipAddress: alertDetailsObj.ipAddress, port: alertDetailsObj.port, dbName: alertDetailsObj.dbName, userName: alertDetailsObj.dbUsername, password: alertDetailsObj.dbPassword, sessionDTO: alertDetailsObj.sessionDTO });
  }

  getTechnologyList(applicationType: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}` + `/alert/api/technology?applicationType=${applicationType}`);
  }

  getAllHealthRules(): Observable<HealthRule[]> {
    return this.http.get<HealthRule[]>(`${this.baseUrl}` + `/alert/api/getAllHealthRules`);
  }

  getMetricsGroupedByType(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}` + `/alert/api/getMetricsGroupedByType`);
  }

  getMetricIdfromAlertId(alert: AlertConfig): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/alert/api/getMetricIdfromAlertId', alert);
  }

  getRuambotAgentListByapplication(application: ApplicationMaster): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/alert/api/getRuambotAgentListByapplication', application);
  }

  getRuambotJobListByapplication(application: ApplicationMaster): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/alert/api/getRuambotJobListByapplication', application);
  }




}
