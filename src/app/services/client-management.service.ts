import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUserService } from './api-user.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientManagementService {
  private http = inject(HttpClient);
  private apiUserService = inject(ApiUserService);

  private baseUrl = environment.baseUrl + '/user/api/clients';
 // private baseUrl = 'http://localhost:12002' + '/user/api/clients';

  private prepareSessionObject(sessionDTO?: any): any {
    if (sessionDTO) return sessionDTO;

    const user = this.apiUserService.getCurrentUser();
    const userId = user?.userId || user?.userid || user?.username || user?.userName || sessionStorage.getItem('username') || '';

    return {
      sessionId: sessionStorage.getItem('sessionId'),
      userId: userId,
      loginTime: sessionStorage.getItem('loginTime'),
      browserName: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
      requestURI: window.location.pathname
    };
  }

  getDomainsList(userId: string, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/domains-list`, {
      createdBy: userId,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  getAllClientDetails(userId: string, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/details`, {
      createdBy: userId,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  createClient(userId: string, clientData: any, sessionDTO?: any): Observable<any> {
    let dataRetention = null;

    if (clientData.dataRetentionValue && clientData.dataRetentionUnit) {
      dataRetention = `${clientData.dataRetentionValue} ${clientData.dataRetentionUnit}`;
    }

    const payload: any = {
      createdBy: userId,
      clientName: clientData.clientName,
      domainTypeId: clientData.domainTypeId,
      isActive: clientData.isActive,
      dataRetention: dataRetention,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    };

    const optionalFields = [
      'clientContactName1',
      'clientContactNumber1',
      'clientContactMailId1',
      'clientContactName2',
      'clientContactNumber2',
      'clientContactMailId2',
      'clientContactName3',
      'clientContactNumber3',
      'clientContactMailId3'
    ];

    optionalFields.forEach(field => {
      const value = clientData[field];
      if (value !== null && value !== undefined && value !== '') {
        payload[field] = value;
      }
    });

    return this.http.post(`${this.baseUrl}/create`, payload);
  }

  updateClient(clientId: number, userId: string, clientData: any, sessionDTO?: any): Observable<any> {
    let dataRetention = null;

    if (clientData.dataRetentionValue && clientData.dataRetentionUnit) {
      dataRetention = `${clientData.dataRetentionValue} ${clientData.dataRetentionUnit}`;
    }

    const payload: any = {
      clientId: clientId,
      editedBy: userId,
      clientName: clientData.clientName,
      domainTypeId: clientData.domainTypeId,
      isActive: clientData.isActive,
      mailId: clientData.mailId,
      dataRetention: dataRetention,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    }

    const optionalFields = [
      'clientContactName1',
      'clientContactNumber1',
      'clientContactMailId1',
      'clientContactName2',
      'clientContactNumber2',
      'clientContactMailId2',
      'clientContactName3',
      'clientContactNumber3',
      'clientContactMailId3'
    ];

    optionalFields.forEach(field => {
      const value = clientData[field];
      if (value !== null && value !== undefined && value !== '') {
        payload[field] = value;
      }
    });

    return this.http.post(`${this.baseUrl}/update`, payload);
  }

  deleteClient(clientId: number, userId: string, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/delete`, {
      clientId: clientId,
      editedBy: userId,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  getAllClients(userId: string, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/all`, {
      createdBy: userId,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  getAllLicenseTypes(userId: string, clientId?: number, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/license-types`, {
      createdBy: userId,
      clientId: clientId,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  saveClientAppLicenseMapping(userId: string, mappings: any[], sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/app-license-mapping`, {
      createdBy: userId,
      updates: {
        clientMappings: mappings
      },
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  deleteClientAppLicenseByClientId(clientId: number, userId: string, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/delete-app-license-mapping`, {
      clientId: clientId,
      editedBy: userId,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  getClientMappedData(userId: string, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/clientMappedData`, {
      createdBy: userId,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  getClientMappedDataByClientId(clientId: number | null, userId: string, userType: string | null, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/clientMappedDataByClientId`, {
      clientId: clientId,
      userId: userId,
      userType: userType,
      createdBy: userId,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  updateClientMapping(clientId: number, userId: string, updates: any, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/updateClientMapping`, {
      clientId: clientId,
      editedBy: userId,
      updates: updates,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  getClientLicenseDetails(clientId: number, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/license-details`, {
      clientId: clientId,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }

  getClientLicenseTypeDetails(clientId: number, licenseType: string, sessionDTO?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/license-type-details`, {
      clientId: clientId,
      licenseType: licenseType,
      sessionDTO: this.prepareSessionObject(sessionDTO)
    });
  }
}
