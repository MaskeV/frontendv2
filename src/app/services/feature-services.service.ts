import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApplicationMaster } from '../models/application-master';
import { Feature } from '../models/feature';
import { FeatureMaster } from '../models/feature-master';
import { environment } from '../../environments/environment';
import { Role } from '../models/Role';
import { ImageDetails } from '../models/ImageDetails';

@Injectable({
  providedIn: 'root'
})
export class FeatureService {


  //private baseUrl = '/';
  private baseUrl= environment.baseUrl;
  constructor(private http: HttpClient) { }
/*  */

  getAllFeatures(data:any) {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `/feature/api/getAllFeatures`,{params:sessionDTO});
  }
/*  */
  getSubFeatureByAppId(featureObj: any) {
    return this.http.post(`${this.baseUrl}` + `/feature/api/getSubFeatureByAppId`, featureObj);
  }

  getSubfeatureNameFromAppId(fm : FeatureMaster) {
    return this.http.post(`${this.baseUrl}` + '/feature/api/getSubfeatureNameFromAppId', fm);
  }


  getgraphNameFromAppIdandsubfeatureid(featureObj: Feature) {
    return this.http.post(`${this.baseUrl}` + '/feature/api/getgraphNameFromAppIdandsubfeatureid', featureObj);
  }
  getAllFeatureByFeatureType(fm : Feature) {
    return this.http.post(`${this.baseUrl}` + `/feature/api/getFeatureByFeatureType`,fm);
  }

  getSubFeature(featureObj: Feature) {
    return this.http.post(`${this.baseUrl}` + `/feature/api/getSubFeaturesByFeatureName`, featureObj);
  }

  createClone(featureObj: Feature) {

    return this.http.post<Feature>(`${this.baseUrl}` + `/feature/api/createClone`, featureObj);
  }
  createFeature(featureObj: Feature) {

    return this.http.post(`${this.baseUrl}` + `/feature/api/createFeature`, featureObj);
  }

  updateFeature(featureObj: any) {
    return this.http.post(`${this.baseUrl}` + `/feature/api/updateFeature`, featureObj);
  }

  getAllSubFeature(data:any) {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `/feature/api/getAllSubFeatures`,{params:sessionDTO});
  }

  deleteSubFeature(featureObj: any) {
    return this.http.post(`${this.baseUrl}` + `/feature/api/deleteSubFeature`, featureObj);
  }

  allFeatureList(data:any) {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}` + `/feature/api/admin/allFeatureList`,{params:sessionDTO});
  }

  uploadImage(data:any,formData: FormData) {
    let sessionDTO = data;
    return this.http.post<ImageDetails>(`${this.baseUrl}` + `/feature/api/uploadFeatureImage`, formData,{params:sessionDTO});
  }

  getAllFeaturesByRole(features: FeatureMaster[]) {
    return this.http.post(`${this.baseUrl}` + `/feature/api/getAllFeaturesByRole`, features);
  }

  getAllFeatureListByRole(role: Role) {
    return this.http.post(`${this.baseUrl}` + `/feature/api/getAllFeatureListByRole`, role);
  }

  getSubFeaturesByRoleIdAndFeatureId(role: Role) {
    return this.http.post(`${this.baseUrl}` + `/feature/api/getSubFeaturesByRoleIdAndFeatureId`, role);
  }

  getSubFeaturesByAppIdAndType(applicationId: any, applicationType: any) {
    return this.http.get(`${this.baseUrl}`+`/feature/api/getSubFeaturesByAppIdAndType`, {
      params: { applicationId: applicationId, applicationType: applicationType }
    });
  }

}
