import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { Session } from '../models/session';
import { SessionService } from './session.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})


export class LoggerService {

  sessionObject: Session = new Session();

  constructor(  private sessionService:SessionService,private router: Router) { }

  logMyInfo(sessionObject:any,routeTo:any){
    this.sessionObject.browserName = this.getBrowserNameAndVersion().name;
     this.sessionObject.browserVersion = this.getBrowserNameAndVersion().version;
     this.sessionObject.featureName = sessionObject.featureName;
     this.sessionObject.subFeature = sessionObject.subFeature;
     this.sessionObject.applicationName = sessionObject.applicationName;
     this.sessionObject.userId = sessionObject.userId;
     this.sessionObject.action = sessionObject.action;
     this.sessionObject.menu = sessionObject.menu;
     this.sessionObject.requestURI = this.router.url.split('?')[0];
     this.sessionObject.indexName = sessionObject.indexName;
     this.sessionObject.configTab = sessionObject.configTab;
     this.sessionObject.apiCalled = sessionObject.apiCalled;
     this.sessionObject.apiStatus = sessionObject.apiStatus;
     this.sessionObject.applicationIpAddress = sessionObject.applicationIpAddress;
     this.sessionObject.datasource = sessionObject.datasource;
     this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
     this.sessionObject.logoutTime = sessionStorage.getItem('logoutTime');
     this.sessionObject.onPageNavigateTime = sessionStorage.getItem('onPageNavigateTime');
     this.sessionObject.onPageExitTime = sessionStorage.getItem('onPageExitTime');
     this.sessionObject.viewStartTime = sessionStorage.getItem('viewStartTime');
     this.sessionObject.viewEndTime = sessionStorage.getItem('viewEndTime');
     this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
     console.log("---- inside logMyINFO")
    console.log(this.sessionObject);
    this.sessionService.logMyInfo(this.sessionObject,routeTo).pipe(first()).subscribe((response: any) => {
    });
  }
  
  getBrowserNameAndVersion() {
    var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || []; 
    if(/trident/i.test(M[1])){
        tem=/\brv[ :]+(\d+)/g.exec(ua) || []; 
        return {name:'IE',version:(tem[1]||'')};
        }   
    if(M[1]==='Chrome'){
        tem=ua.match(/\bEdg\/(\d+)/)
        if(tem!=null)   {return {name:'Edge(Chromium)', version:tem[1]};}
        tem=ua.match(/\bOPR\/(\d+)/)
        if(tem!=null)   {return {name:'Opera', version:tem[1]};}
        }   
    M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
    if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
    return {
      name: M[0],
      version: M[1]
    };
  }

}
