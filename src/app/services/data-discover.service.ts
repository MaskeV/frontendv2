import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataDiscoverService {

  //private baseUrl = '/ruambot/api';
  private baseUrl = environment.baseUrl+"/data-discover";
  // private baseUrl = "http://localhost:12015/data-discover"; 
  
  private messageSource = new BehaviorSubject('default message');
  private list = new BehaviorSubject([]);
  currentMessage = this.messageSource.asObservable();
  filteredList = this.list.asObservable();

  constructor(private httpClient: HttpClient) { }

  getAllIndicesByUserID(data:any): Observable<object> {
    let sessionDTO = data;
    return this.httpClient.get(`${this.baseUrl}` + '/api/getAllElasticIndices',{params:sessionDTO});
  }

  getElasticDataByIndexName(dataObj: any): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/api/getElasticDataByIndexName', dataObj);
  }

  getAllIndicesByAppNameAndUserID(dataObj: any): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/api/getAllIndicesByAppNameAndUserID', dataObj);
  }

  changeMessage(message: string) {
    this.messageSource.next(message)
  }

  setFilteredList(list: never[]) {
    this.list.next(list)
  }
  
  getLogDocumentsByQuery(dataObj: any): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/api/getLogDocumentsByQuery', dataObj);
  }

  exportAllLogs(dataObj: any): Observable<object> {
    return this.httpClient.post(`${this.baseUrl}` + '/api/exportAllLogs', dataObj);
  }

  streamExportLogs(dataObj: any): Observable<Blob> {
    return this.httpClient.post(`${this.baseUrl}` + '/api/streamExportLogs', dataObj, { responseType: 'blob' });
  }

}
