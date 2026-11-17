import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApplicationMaster } from '../models/application-master';
import { IpAddressConfigurationMaster } from '../models/ip-address-configuration-master';
import { User } from '../models/user';
import { Role } from '../models/Role';
import { Session } from '../models/session';
import { AuthenticationService } from './authentication.service';
import { switchMap } from 'rxjs';
import { ControlZoneManagmentService } from './control-zone-managment-service';

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {

  private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://localhost:12008';
  // private baseUrl2 = 'http://localhost:12003';

  private authService = inject(AuthenticationService);

  constructor(
    private httpClient: HttpClient,
    private controlZoneManagmentService: ControlZoneManagmentService
  ) { }

  getAllIpAddressByAppId(response: any) {
    return this.httpClient.post(`${this.baseUrl}/application/api/getAllIpAddressByAppId`, response);
  }

  getAllApplicationIPConfigurations(data: any, tool: any): Observable<any> {
    const params = {
      ...data,
      tool: tool ?? ''
    };

    return this.httpClient.get(
      `${this.baseUrl}/application/api/getAllApplicationIPConfigurations`,
      { params }
    );
  }

  createApplicationIPConfiguration(appIpObj: ApplicationMaster): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/application/api/createApplicationIPConfiguration', appIpObj);
  }

  updateApplicationIPConfiguration(appIpObj: ApplicationMaster): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/application/api/updateApplicationIPConfiguration', appIpObj);
  }

  deleteApplicationIPConfiguration(IpObj: IpAddressConfigurationMaster): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/application/api/deleteApplicationIPConfiguration', IpObj);
  }

  deleteApplication(aObj: ApplicationMaster): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/application/api/deleteApplication', aObj);
  }

  getAllApplications(data: any): Observable<any> {
    let params = new HttpParams();
    for (const key in data) {
      if (data.hasOwnProperty(key) && data[key] !== null && data[key] !== undefined) {
        params = params.set(key, data[key].toString());
      }
    }
    return this.httpClient.get(`${this.baseUrl}/application/api/getAllApplications`, { params });
  }

  getAllApplicationsByRole(roleId: any): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/application/api/getAllApplicationsByRole', { id: roleId });
  }

  getAllApplicationsByUserID(user: User): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/application/api/getAllApplicationsByUserID', user);
  }

  getAllAppListByUserID(user: User, featureType: string): Observable<object> {
    return this.httpClient.post(
      `${this.baseUrl}/application/api/getAllAppListByUserID?featureType=${featureType}`,
      user
    );
  }



  getAllApplicationsByUserIDFeatureType(user: User, featureType: string, techType?: string): Observable<object> {
    let url = `${this.baseUrl}/application/api/getAllAppListByUserID?featureType=${featureType}`;
    if (techType) {
      url += `&technology=${techType}`;
    }
    return this.httpClient.post(url, user);
  }

  getAllIpAddressListByApllicationIDAndIpType(user: User, ipType: string, appId: number): Observable<object> {
    return this.httpClient.post(
      `${this.baseUrl}/application/api/getAllIpAddressListByApllicationIDAndIpType?ipType=${ipType}&appId=${appId}`,
      user
    );
  }

  getAllNetworkHostByApllicationID(user: User, appId: any): Observable<object> {
    let param = new HttpParams().set('appId', appId);
    return this.httpClient.post(`${this.baseUrl}/application/api/getAllNetworkHostByApllicationID`, user, { params: param });
  }

  getAllApplicationList(role: Role): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/application/api/getAllApplicationList', role);
  }

  getAllNetworkHost(user: User): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/application/api/getAllNetworkHost', user);
  }


  getAllAppListAndIpListByUserID(user: User, type: string) {
    return this.httpClient.post(`${this.baseUrl}/application/api/getAllAppListAndIpListByUserID`, user, {
      params: { type: type }
    });
  }

  getSoftwareMeteringZoneAndTeamList(user: User): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}/application/api/getSoftwareMeteringZoneAndTeamList`, user);
  }

  getAppDbInfraMapping(user: User): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/application/api/getAppDbInfraMapping', user);
  }


  analyzeApplication(data: any): Observable<any> {
    const url = 'http://192.168.7.57:5010/analyze';
    return this.httpClient.post(url, data);
  }

  relevantTraceData(data: any): Observable<any> {
    const url = 'http://192.168.7.57:5010/relevance';
    return this.httpClient.post(url, data);
  }

  getAllProblemAlertsByUserID(userDTO: any, start: number, end: number, tool: string): Observable<any> {
    // Convert numbers like 202511061052 → "2025-11-06T10:52:00"
    const formatToIso = (num: number): string => {
      const str = num.toString(); // "202511061052"
      const year = str.substring(0, 4);
      const month = str.substring(4, 6);
      const day = str.substring(6, 8);
      const hour = str.substring(8, 10);
      const minute = str.substring(10, 12);
      return `${year}-${month}-${day}T${hour}:${minute}:00`;
    };

    const startIso = formatToIso(start);
    const endIso = formatToIso(end);

    const params = new HttpParams()
      .set('start', startIso)
      .set('end', endIso)
      .set('tool', tool);

    return this.httpClient.post(
      `${this.baseUrl}/application/api/problem/getAllProblemAlertsByUserID`,
      userDTO,
      { params }
    );
  }

  getIISDetails(user: User): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}/application/api/getIISDetails`, user);
  }

  getProblemDetailsByPID(pid: any): Observable<any> {
    let params = new HttpParams().set('problemId', pid);
    return this.httpClient.get(
      `${this.baseUrl}/application/api/problem/getProblemDetailsByProblemId`,
      { params }
    );
  }

  getKafkaClustersByUserID(currentUser: User, featureType: string, st: number, et: number): Observable<any> {
    const params = new HttpParams().set('featureType', featureType).set('st', st).set('et', et);
    return this.httpClient.post(
      `${this.baseUrl}/application/api/getKafkaClustersByUserID`,
      currentUser, { params: params }
    );
  }


  createCustomRole(roleData: any): Observable<any> {
    const tool = sessionStorage.getItem("tool");
    const payload = {
      ...roleData,
      tool: tool
    };
    return this.httpClient.post(`${this.baseUrl}/role/api/createCustomRole`, payload);
  }

  getAllCustomRoles(data: any): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/role/api/getAllCustomRoles`, data);
  }

  getCustomRoleById(roleId: number, tool?: string, sessionDTO?: any): Observable<any> {
    const body: any = { roleId, tool: tool || '' };
    if (sessionDTO) {
      body.sessionDTO = sessionDTO;
    }
    return this.httpClient.post(`${this.baseUrl}/role/api/getCustomRoleById`, body);
  }

  updateCustomRole(roleData: any): Observable<any> {
    const tool = sessionStorage.getItem("tool");
    const payload = {
      ...roleData,
      tool: tool
    };
    return this.httpClient.put(`${this.baseUrl}/role/api/updateCustomRole`, payload);
  }

  deleteCustomRole(roleData: any): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/role/api/deleteCustomRole`, roleData);
  }



  // createCustomRole(roleData: any): Observable<any> {
  //   const tool = sessionStorage.getItem("tool");
  //   const payload = {
  //     ...roleData,
  //     tool: tool
  //   };
  //   return this.httpClient.post(`${this.baseUrl2}/role/api/createCustomRole`, payload);
  // }

  // getAllCustomRoles(data: any): Observable<any> {
  //   return this.httpClient.post(`${this.baseUrl2}/role/api/getAllCustomRoles`, data);
  // }

  // getCustomRoleById(roleId: number, tool?: string, sessionDTO?: any): Observable<any> {
  //   const body: any = { roleId, tool: tool || '' };
  //   if (sessionDTO) {
  //     body.sessionDTO = sessionDTO;
  //   }
  //   return this.httpClient.post(` ${this.baseUrl2}/role/api/getCustomRoleById`, body);
  // }

  // updateCustomRole(roleData: any): Observable<any> {
  //   const tool = sessionStorage.getItem("tool");
  //   const payload = {
  //     ...roleData,
  //     tool: tool
  //   };
  //   return this.httpClient.put(`${this.baseUrl2}/role/api/updateCustomRole`, payload);
  // }

  // deleteCustomRole(roleData: any): Observable<any> {
  //   return this.httpClient.post(`${this.baseUrl2}/role/api/deleteCustomRole`, roleData);
  // }

  getFullApplicationDataByAppIds(payload: any): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/application/api/getFullApplicationDataByAppIds`, payload);
  }

  getFullApplicationData(
    userId: string,
    featureType: string,
    sessionDTO?: any,
    technologyType?: string,
    appId?: number,
    controlZoneId?: number
  ): Observable<any> {

    return this.controlZoneManagmentService.selectedZone$.pipe(
      switchMap(() => {

        let params = new HttpParams()
          .set('userId', userId || '')
          .set('feature_type', featureType);

        if (technologyType) {
          params = params.set('technology_type', technologyType);
        }

        if (appId) {
          params = params.set('application_id', appId.toString());
        }

        const zoneEnabled = this.controlZoneManagmentService.isControlZoneEnabled();

        const zoneId = zoneEnabled
          ? (controlZoneId ??
            (sessionStorage.getItem('controlZoneId')
              ? Number(sessionStorage.getItem('controlZoneId'))
              : null))
          : null;

        if (zoneId !== null && !isNaN(zoneId)) {
          params = params.set('control_zone_id', zoneId.toString());
        }

        if (sessionDTO && typeof sessionDTO === 'object') {
          for (const key of Object.keys(sessionDTO)) {
            const val = sessionDTO[key];
            if (val !== null && val !== undefined && typeof val !== 'object') {
              params = params.set(key, val.toString());
            }
          }
        }

        return this.httpClient.get(
          `${this.baseUrl}/application/api/getFullApplicationData`,
          { params }
        );
      })
    );
  }

  getTechnologyBySubFeature(subFeatureName: string): Observable<any> {
    const params = new HttpParams().set('subFeatureName', subFeatureName);
    return this.httpClient.get(`${this.baseUrl}/application/api/getTechnologyBySubFeature`, { params });
  }

  saveLogArchiveConfiguration(config: any): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/application/api/logArchive/saveConfiguration`, config);
  }

  getAllLogArchiveConfigurations(): Observable<any> {
    return this.httpClient.get(`${this.baseUrl}/application/api/logArchive/getAll`);
  }

  updateLogArchiveConfiguration(config: any): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/application/api/logArchive/updateConfiguration`, config);
  }

  deleteLogArchiveConfiguration(id: number): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/application/api/logArchive/deleteConfiguration`, { id });
  }

  getProblemTriggerDetails(pid: number, userId: string, userType: string): Observable<any> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('userType', userType);

    return this.httpClient.get(
      `${this.baseUrl}/application/api/problem/getTriggerDetails/${pid}`,
      { params }
    );
  }

}