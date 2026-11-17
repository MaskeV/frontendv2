import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {Graph} from '../models/feature-graph-mapping';
import { ImageDetails } from '../models/ImageDetails';
import { environment } from '../../environments/environment';
import { Role } from '../models/Role';
import { FeatureMaster } from '../models/feature-master';

@Injectable({
  providedIn: 'root'
})
export class FeatureGraphMappingService {
//baseUrl="/ruambot/";
private baseUrl = environment.baseUrl;
  constructor(private http:HttpClient) { }

  createGraphFeatureMap(graphObj:Graph){
    return this.http.post<Graph>(`${this.baseUrl}`+`/graph/api/createGraph`,graphObj);
  }

  updateGraphTextIconImage(data:any,formData:FormData){
    let sessionDTO = data;
    return this.http.post(`${this.baseUrl}`+`/graph/api/updateGraphTextIconImage`,formData,{params:sessionDTO});
  }

  updateGraphFeatureMap(graphObj:Graph){
    return this.http.post<Graph>(`${this.baseUrl}`+`/graph/api/updateGraph`,graphObj);
  }
  deleteGraph(graphObj:Graph) 
  {
    return this.http.post<Graph>(`${this.baseUrl}`+`/graph/api/deleteGraph`,graphObj);
  }
  getAllFeatures(data:any){
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}`+`/graph/api/getAllFeatures`,{params:sessionDTO});
  }

  getAllFeatureByFeatureType(fm :FeatureMaster){
    return this.http.post(`${this.baseUrl}`+`/feature/api/getFeatureByFeatureType`,fm);
  }

  getSubFeaturesByFeatureId(fm :FeatureMaster){
    return this.http.post(`${this.baseUrl}`+`/graph/api/getSubFeaturesByFeatureId`,fm);
  }

  getSubFeaturesByFeatureName(featureName:any){
    return this.http.post(`${this.baseUrl}`+`/graph/api/getSubFeaturesByFeatureName`,{featureName:featureName});
  }
  getAllGraphs(sessionDTO: any){
    return this.http.get(`${this.baseUrl}`+`/graph/api/getAllGraph`, {params: sessionDTO});
  }
  allGraphExcelList(viewGraphObj: Graph) {
    return this.http.post(`${this.baseUrl}` + `/graph/api/allGraphExcelList`, viewGraphObj);
  }
  
  previewImage(data:any,formData:FormData){
    let sessionDTO = data;
    return this.http.post(`${this.baseUrl}`+`/graph/api/previewImage`,formData,{params:sessionDTO});
  }
  
  uploadImage(formData:FormData){
    return this.http.post<ImageDetails>(`${this.baseUrl}`+`/graph/api/uploadImage`,formData);
  }

  updateImage(formData:FormData){
    return this.http.post<ImageDetails>(`${this.baseUrl}`+`/graph/api/updateImage`,formData);
  }

  getGraphDetailByApp(viewGraphObj: Graph) {
    return this.http.post(`${this.baseUrl}` + `/graph/api/getGraphDetailByApp`, viewGraphObj);
  }
  
  getDataByUserIdandSubFandApp(viewGraphObj: Graph) {
    return this.http.post(`${this.baseUrl}` + `/graph/api/getDataByUserIdandSubFandApp`, viewGraphObj);
  }

  getsavePreference(prefGraphList: any) {
    return this.http.post(`${this.baseUrl}` + `/graph/api/getsavePreference`, prefGraphList);
  }

  getPointGraphsByApplicationID(graphObj:Graph) {
    return this.http.post(`${this.baseUrl}` + `/graph/api/getPointGraphsByApplicationID`, graphObj);
  }

  getAllSubFeaturesByApplicationAndRoleId(role: Role) {
    return this.http.post(`${this.baseUrl}` + '/feature/api/getAllSubFeaturesByApplicationAndRoleId', role);
  }

  testConnection(graphObj: Graph) {
    return this.http.post(`${this.baseUrl}` + `/report/api/testConnection`,  {dbType: graphObj.dbType, ipAddress: graphObj.ipAddress,port: graphObj.port,dbName: graphObj.dbName,userName: graphObj.dbUsername,password: graphObj.dbPassword,sessionDTO : graphObj.sessionDTO});
  }

  getGraphByChartId(graph : Graph){	
    return this.http.post(`${this.baseUrl}` + '/graph/api/getGraphByChartId', graph);	
  }    

  cloneGraph(graph : Graph){
    return this.http.post(`${this.baseUrl}` + '/graph/api/cloneGraph', graph);
  }
}
