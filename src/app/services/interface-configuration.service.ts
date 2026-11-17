import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { InterfaceConfigurationMaster } from '../models/interface-configuration-master';

@Injectable({
  providedIn: 'root'
})
export class InterfaceConfigurationService {

  private baseUrl = environment.baseUrl + "/interfaceConfig";

  constructor(private httpClient: HttpClient) { }

  getAllInterfaceConfigurations(data: any) {
    let sessionDTO = data;
    return this.httpClient.get(`${this.baseUrl}` + '/api/getAllInterfaceConfigurations', { params: sessionDTO });
  }

  createInterfaceConfiguration(icObj: InterfaceConfigurationMaster) {
    return this.httpClient.post(`${this.baseUrl}` + '/api/createInterfaceConfiguration', icObj);
  }

  updateInterfaceConfiguration(icObj: InterfaceConfigurationMaster) {
    return this.httpClient.post(`${this.baseUrl}` + '/api/updateInterfaceConfiguration', icObj);
  }

  deleteInterfaceConfiguration(icObj: InterfaceConfigurationMaster) {
    return this.httpClient.post(`${this.baseUrl}` + '/api/deleteInterfaceConfiguration', icObj);
  }

  testConnectionToElastic(icObj: InterfaceConfigurationMaster) {
    return this.httpClient.post(`${this.baseUrl}` + '/api/testConnectionToElastic', icObj);
  }

  testMessage(icObj: InterfaceConfigurationMaster) {
    return this.httpClient.post(`${this.baseUrl}` + '/api/testMessage', icObj);
  }

  testConnectionToJira(icObj: InterfaceConfigurationMaster) {
    return this.httpClient.post(`${this.baseUrl}` + '/api/testConnectionToJira', icObj);
  }
}
