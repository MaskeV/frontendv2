import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Session } from '../models/session';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  //private baseUrl = '/';
  private baseUrl = environment.baseUrl;
  
  constructor(private http: HttpClient) { }

  setSessionProperty(sessionObject: Session) {
    // console.log(sessionObject);
    return this.http.post(`${this.baseUrl}` + `/user/api/setSessionProperty`, sessionObject);
  }


  logMyInfo(sessionObject: Session,routeTo:any) {
    return this.http.post(`${this.baseUrl}` + routeTo + `/api/logMyInfo`, sessionObject);
  }

  logMyError(sessionObject: Session) {
    return this.http.post(`${this.baseUrl}` + `/api/logMyError`, sessionObject);
  }
}
