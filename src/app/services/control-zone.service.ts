import { Injectable } from '@angular/core';
import { ControlGroup } from '../models/ControlZone';
import { User } from '../models/user';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ControlZoneService {

  private baseURL: string = environment.baseUrl;
  // private baseURL: string = 'http://localhost:12008';

  constructor(
    private http: HttpClient
  ) { }
  
  public createHostGroup(controlZone: ControlGroup) {
    return this.http.post(`${this.baseURL}/application/api/controlZone/createControlZone`, controlZone);
  }

  public updateHostGroup(controlZone: ControlGroup) {
    return this.http.post(`${this.baseURL}/application/api/controlZone/updateControlZone`, controlZone);
  }

  public deleteHostGroup(controlZone: ControlGroup) {
    return this.http.post(`${this.baseURL}/application/api/controlZone/deleteControlZone`, controlZone);
  }

  public getAllInfraGroups(user: User) {
    return this.http.post(`${this.baseURL}/application/api/controlZone/getAllControlZones`, user);
  }

  public getControlZoneById(id: number, user: User) {
    return this.http.post(`${this.baseURL}/application/api/controlZone/getControlZoneById/${id}`, user);
  }
}