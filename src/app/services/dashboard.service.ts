import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DashboardLayout } from '../models/dashboardLayout';
import { GraphInputJSON } from '../models/graphInputJSON';
import { SubFeatureMaster } from '../models/subFeatureMaster';
import { User } from '../models/user';
import { environment } from '../../environments/environment';
import { MyDashboard } from '../models/my-dashboard';
import { Graph } from '../models/feature-graph-mapping';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  //private baseUrl = '/';
  private baseUrl = environment.baseUrl;
  constructor(private http: HttpClient) { }

  // getGraph(graphInputObj:GraphInputJSON){
  //   let promise = new Promise((resolve, reject) => {
  //     this.http
  //       .post(`${this.baseUrl}`+`/dashboard/api/getGraph`,graphInputObj)
  //       .toPromise()
  //       .then(
  //         res => {
  //           // Success
  //           resolve(res);
  //         },
  //         msg => {
  //           // Error
  //           reject(msg);
  //         }
  //       );
  //   });
  //   return promise;
  //   //return this.http.post(`${this.baseUrl}`+`/dashboard/api/getGraph`,graphInputObj);
  // }

  getGraph(graphInputObj: GraphInputJSON) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/getGraph`, graphInputObj);
  }

  getRefreshGraph(graphInputObj: GraphInputJSON) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/getRefreshGraph`, graphInputObj);
  }

  getFeatureByUserId(user: User) {
    return this.http.post(`${this.baseUrl}` + '/dashboard/api/getFeatureByUserId', user);
  }

  createDashboardLayout(dashboardLayout: DashboardLayout) {
    return this.http.post(`${this.baseUrl}` + '/dashboard/api/createDashboardLayout', dashboardLayout);
  }

  getDashboardLayoutBySubFeatureName(subFeatureName: any) {
    return this.http.post(`${this.baseUrl}` + '/dashboard/api/getDashboardLayoutBySubFeatureName', subFeatureName);
  }

  saveDashboardLayout(dashboardLayout: any) {
    return this.http.post(`${this.baseUrl}` + '/graph/api/saveDashboardLayout', dashboardLayout);
  }

  // getAllGraphList(graphInputObj: GraphInputJSON) {
  //   let promise = new Promise((resolve, reject) => {
  //     this.http
  //       .post(`${this.baseUrl}` + `/dashboard/api/getAllGraphList`, graphInputObj)
  //       .toPromise()
  //       .then(
  //         res => {
  //           // Success
  //           resolve(res);
  //         },
  //         msg => {
  //           // Error
  //           reject(msg);
  //         }
  //       );
  //   });
  //   return promise;
  // }

  getAllGraphs(graphInputObj: GraphInputJSON) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/getAllGraphList`, graphInputObj);
  }

  deleteGraph(graphInputObj: GraphInputJSON) {
    return this.http.post(`${this.baseUrl}` + `/graph/api/deleteGraph`, graphInputObj);
  }

  visualizeGraph(graphInputObj: GraphInputJSON) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/visualizeGraph`, graphInputObj);
  }

  // getAllSubGraphList(applicationID:any, subFeatureName:any, chartTitle:any, preferenceType:any, savedBy:any, featureName:any, chartID:any, chartName:any){
  //   return this.http.post(`${this.baseUrl}`+`/dashboard/api/getAllSubGraphList`,{applicationId:applicationID, subFeatureName:subFeatureName, chartTitle:chartTitle, preferenceType:preferenceType, savedBy:savedBy, featureName:featureName, chartId:chartID, chartName:chartName}); 
  // }

  getAllSubGraphList(data:any) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/getAllSubGraphList`, data);
  }

  updateGraphColors(graphInputObj: GraphInputJSON) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/updateGraphColors`, graphInputObj);
  }

  /* My Preference */
  savePreferedGraph(preferedGraph: any) {
    return this.http.post(`${this.baseUrl}` + '/graph/api/savePreferedGraph', preferedGraph);
  }

  deletePreferedGraph(preferedGraph: any) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/deletePreferedGraph`, preferedGraph);
  }

  savePreferedChildGraph(preferedGraph: any) {
    return this.http.post(`${this.baseUrl}` + '/dashboard/api/savePreferedChildGraph', preferedGraph);
  }

  saveChildDashboardLayout(dashboardLayout: any) {
    return this.http.post(`${this.baseUrl}` + '/graph/api/saveChildDashboardLayout', dashboardLayout);
  }

  deletePreferedChildGraph(preferedGraph: any) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/deletePreferedChildGraph`, preferedGraph);
  }

  saveMyPreferredDashboard(preferredDashboardObject: GraphInputJSON) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/saveMyPreferredDashboard`, preferredDashboardObject);
  }

  toggleMyDashboardPreference(user:User) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/toggleMyDashboardPreference`,user);

  }

  /* point Graphs */
  getPointGraphsByHostIdAndPointName(data:any) {
    return this.http.post(`${this.baseUrl}` + `/graph/api/getPointGraphsByHostIdAndPointName`, data);
  }

  deletePointGraph(pointGraph: any) {
    return this.http.post(`${this.baseUrl}` + `/graph/api/deletePointGraph`, pointGraph);
  }

  savePointGraphLayout(pointGrapList: any,data:any) {
    let sessionDTO = data;
    return this.http.post(`${this.baseUrl}` + '/graph/api/savePointGraphLayout', pointGrapList,{params:sessionDTO});
  }

  getAllSubChildGraphList(data:any) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/getAllSubChildGraphList`,data);
  }

  getSubFeatureByNameAndAppicationId(subFeatureMaster: SubFeatureMaster) {
    console.log(subFeatureMaster);
    return this.http.post(`${this.baseUrl}` + '/dashboard/api/getSubFeatureByNameAndAppicationId', subFeatureMaster);
  }

  getMyDashboardPreference(user :any){
    return this.http.post(`${this.baseUrl}` + '/dashboard/api/getMyDashboardPreference', user);
  }

  moveToMyDashboard(myDashboard: MyDashboard) {
    console.log(`${this.baseUrl}`);
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/moveToMyDashboard`, myDashboard);
  }

  checkGraphInMydashBoard(myDashboard: MyDashboard) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/checkGraphInMydashBoard`, myDashboard);
  }

  removeFromMyDashBoard(myDashboard: MyDashboard) {
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/removeFromMyDashBoard`, myDashboard);
  }


  getTrendStatus(graphObj:GraphInputJSON){
    return this.http.post(`${this.baseUrl}` + `/api/getTrendStatus`, graphObj);
  }
  getSlideDashBoardDetailsByUserId(userId:any){
    return this.http.post(`${this.baseUrl}` + `/dashboard/api/getSlideDashboardByUserID/${userId}`,{});
  }

}
