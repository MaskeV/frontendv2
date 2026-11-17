import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularLog } from '../models/AngularLog';
import { User } from '../models/user';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LogServiceService {
  //private baseUrl = '/ruambot/api';
  private baseUrl = environment.baseUrl+"/api";
  private static userId : String="";
  private pageName! : String;
  
  constructor(private http: HttpClient) { }
  setuserId(userId: String){
  LogServiceService.userId=userId;
}
setPageName(pageName : String){
  this.pageName=pageName;
}
info(msg : String) {
  let logger : AngularLog = new AngularLog(LogServiceService.userId,this.pageName,"INFO",msg);
  console.log(logger);
  return this.http.post(`${this.baseUrl}` + '/angularLog', logger);
}
debug(msg : String) {
  let logger : AngularLog = new AngularLog(LogServiceService.userId,this.pageName,"DEBUG",msg);
  console.log(logger);
  return this.http.post(`${this.baseUrl}` + `/angularLog`, logger);
}
error(msg : String) {
  let logger : AngularLog = new AngularLog(LogServiceService.userId,this.pageName,"ERROR",msg);
  console.log(logger);
  return this.http.post(`${this.baseUrl}` + `/angularLog`, logger);
}
}