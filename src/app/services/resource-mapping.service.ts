import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ResourceMappingService {

  // private baseUrl = 'http://localhost:12008';

  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  addAppDbInfraMap(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/application/api/add-app-db-infra-map`, payload);
  }

  updateAppDbInfraMap(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/application/api/update-app-db-infra-map`, payload);
  }

  deleteAppDbInfraMap(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/application/api/delete-app-db-infra-map`, payload);
  }

  getAppDbInfraMapById(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/application/api/get-app-db-infra-map-by-id`, payload);
  }

  getAllAppDbInfraMap(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/application/api/get-all-app-db-infra-map`, payload);
  }
}
