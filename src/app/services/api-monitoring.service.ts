import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiMonitoringService {

  private baseUrl=environment.baseUrl;
  // private baseUrl='http://localhost:12024';

  constructor(private http:HttpClient) { }

  // GET

  getAllApplications(data:any): Observable<object> {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + '/application/api/getAllApplications',{params:sessionDTO});
  }
 
  public getAllApis(){
    return this.http.get(`${this.baseUrl}`  + "/api/monitoring/getAllApis");
  }

  public getApisDropdownData(startTime:number,endTime:number){
    let params=new HttpParams()
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/api/monitoring/fetch" ,{params:params});
  }

  public getUrlDropdownData(appName:string){
    let params=new HttpParams()
    .set('appName',appName.toString())
    return this.http.get(`${this.baseUrl}`  + "/api/monitoring/getUrlDropdown" ,{params:params});
  }

  public getApisTableData(startTime:number,endTime:number, projectName: string, url: string){
    let params=new HttpParams()
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    .set('applicationName',projectName.toString())
    .set('url',url.toString())
    return this.http.get(`${this.baseUrl}`  + "/api/monitoring/fetchTableData" ,{params:params});
  }

  public getApisGraphData(startTime:number,endTime:number, projectName: string, url: string){
    let params=new HttpParams()
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    .set('applicationName',projectName.toString())
    .set('url',url.toString())
    return this.http.get(`${this.baseUrl}`  + "/api/monitoring/fetchGraphData" ,{params:params});
  }

  // POST

  // public postCreateApi(requestData: any): Observable<HttpResponse<any>> {
  //   return this.http.post<any>(`${this.baseUrl}/api/monitoring/createApi`, requestData, { observe: 'response' });
  // }

  postCreateApi(requestData: any): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.baseUrl}/api/monitoring/createApi`, requestData, {
      observe: 'response',
    }).pipe(
      tap(response => {
        console.log('API Call Success:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('API Service Error:', error);
        return throwError(() => new Error(error?.message || 'Unexpected API error'));
      })
    );
  }
  

  // DELETE

  public deleteApiById(id: number) {
    return this.http.delete(`${this.baseUrl}/api/monitoring/deleteApiById/${id}`);
  }  

  // PUT

  public updateApiById(id: number, updatedApi: any) {
    return this.http.put(`${this.baseUrl}/api/monitoring/updateApiById/${id}`, updatedApi);
  }  
  
}
 