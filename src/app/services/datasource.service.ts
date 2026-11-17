import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { datasourceDetails } from '../models/datasource';


@Injectable({
  providedIn: 'root'
})

export class DatasourceService {

  private baseUrl = environment.baseUrl+"/graph/";
  constructor(private http:HttpClient) { }

  createDatasource(datasourceObj: datasourceDetails){
    return this.http.post<datasourceDetails>(`${this.baseUrl}`+`api/createDatasource`,datasourceObj);
  }
  
  updateDatasource(datasourceObj: datasourceDetails){
    return this.http.post<datasourceDetails>(`${this.baseUrl}`+`api/updateDatasource`,datasourceObj);
  }
  
  deleteDatasource(datasourceObj: datasourceDetails){
    return this.http.post<datasourceDetails>(`${this.baseUrl}`+`api/deleteDatasource`,datasourceObj);
  }

  getAllDatasourceList(data:any){
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}`+`api/getAllDatasourceList`,{params: sessionDTO});
  }

  dataSourceTestConnection(datasourceObj: datasourceDetails){
    return this.http.post<datasourceDetails>(`${this.baseUrl}`+`api/dataSourceTestConnection`,datasourceObj);
  }

  getfieldByDatasource(datasourceObj: datasourceDetails){
    return this.http.post<datasourceDetails>(`${this.baseUrl}`+`api/getfieldByDatasource`,datasourceObj);
  }



}
