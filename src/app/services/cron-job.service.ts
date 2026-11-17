import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CronJob } from '../models/cron-job';
import { environment } from '../../environments/environment';
import { DTApi } from '../models/DTApi';

@Injectable({
  providedIn: 'root'
})
export class CronJobService {

  /* code by Prasad More */
  //private baseUrl = '/';
  private baseUrl:any = environment.baseUrl+"/cronjob";
  constructor(private http:HttpClient) 
  {

  }

  /* code by RG */
  updateCronjob(appObj:CronJob){
    return this.http.post(`${this.baseUrl}`+`/api/updateCronjob`,appObj);///api/updateCronjob
  }
   
  checkDBconnection(appObj:CronJob){
    return this.http.post(`${this.baseUrl}`+`/api/checkDBconnection`,appObj);///api/checkDBconnection
  }

  checkAPIconnection(appObj:CronJob){
    return this.http.post(`${this.baseUrl}`+`/api/checkAPIconnection`,appObj);///api/checkAPIconnection
  }

  deleteCronjob(appObj:CronJob){
    return this.http.post(`${this.baseUrl}`+`/api/deleteCronjob`,appObj);///api/deleteCronjob
  }

  getAllCronJob(cronJob: CronJob){
    return this.http.post(`${this.baseUrl}`+`/api/getAllCronJob`, cronJob);///api/getAllCronJob
  }

  createCronJob(appObj:CronJob)
  {
    return this.http.post(`${this.baseUrl}`+`/api/createCronJob`,appObj);///api/createCronJob
  }

  getAllApplicationlist(data:any)
  {
    let sessionDTO = data;
    return this.http.get(`${this.baseUrl}`+`/api/getAllApplicationlist`,{params:sessionDTO});///api/createCronJob
  }

  checkDynatraceAPIConnection(dtApiObj:DTApi){
    return this.http.post(`${this.baseUrl}`+`/api/checkDynatraceAPIConnection`,dtApiObj)
  }
}
