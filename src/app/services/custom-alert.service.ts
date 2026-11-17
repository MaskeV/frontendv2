import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomAlert } from '../models/CustomAlert';
import { CustomAlertConfig } from '../models/CustomAlertConfig';

@Injectable({
  providedIn: 'root'
})
export class CustomAlertService {

  private baseUrl = environment.baseUrl;
  // private baseUrl = 'http://localhost:12055';
  private baseApi = '/customAlert/api';

  constructor(private http: HttpClient) {}

  getAllAlerts(): Observable<CustomAlert[]> {
    return this.http.get<CustomAlert[]>(`${this.baseUrl}${this.baseApi}/getAllCustomAlert`);
  }

  // GET one alert by ID
  getAlertById(alertId: number): Observable<CustomAlertConfig> {
    return this.http.get<CustomAlertConfig>(`${this.baseUrl}${this.baseApi}/getCustomAlert/${alertId}`);
  }

  // DELETE alert by ID
  deleteAlert(alertId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}${this.baseApi}/deleteCustomAlert/${alertId}`, { responseType: 'text' });
  }

  // POST new alert
  createAlert(alert: CustomAlertConfig): Observable<any> {
    return this.http.post(`${this.baseUrl}${this.baseApi}/postCustomAlertDetails`, alert, { responseType: 'text' });
  }

  // PUT update alert
  updateAlert(alertId: number, alert: CustomAlertConfig): Observable<any> {
    return this.http.put(`${this.baseUrl}${this.baseApi}/updateCustomAlert/${alertId}`, alert, { responseType: 'text' });
  }
}
