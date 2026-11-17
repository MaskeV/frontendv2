import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DevService {

  constructor() { }
  // private baseUrl = "http://localhost:";
  private baseUrl = "http://192.168.0.66:";

  public alterURL(url: any) {
    let alteredURL: any;
    if (url.includes("/user/")) {
      url = url.slice(url.indexOf("user"));
      console.log(url);
      alteredURL = this.baseUrl + "13001/" + url;
    }
    else if (url.includes("/application/")) {
      url = url.slice(url.indexOf("application"));
      console.log(url);
      alteredURL = this.baseUrl + "12008/" + url;
    }
    // else if (url.includes("/dashboard/")) {
    //   url = url.slice(url.indexOf("dashboard"));
    //   console.log(url);
    //   alteredURL = this.baseUrl + "12016/" + url;
    // }
    else if (url.includes("/data-discover/")) {
      url = url.slice(url.indexOf("data-discover"));
      console.log(url);
      alteredURL = this.baseUrl + "12015/" + url;
    }
    else if (url.includes("/feature/")) {
      url = url.slice(url.indexOf("feature"));
      console.log(url);
      alteredURL = this.baseUrl + "12006/" + url;
    }
    else if (url.includes("/document/")) {
      url = url.slice(url.indexOf("document"));
      console.log(url);
      alteredURL = this.baseUrl + "12017/" + url;
    }
    else if (url.includes("/graph/")) {
      url = url.slice(url.indexOf("graph"));
      console.log(url);
      alteredURL = this.baseUrl + "12009/" + url;
    }
    else if (url.includes("/interfaceConfig/")) {
      url = url.slice(url.indexOf("interfaceConfig"));
      console.log(url);
      alteredURL = this.baseUrl + "12005/" + url;
    }
    else if (url.includes("/metric/")) {
      url = url.slice(url.indexOf("metric"));
      console.log(url);
      alteredURL = this.baseUrl + "12010/" + url;
    }
    else if (url.includes("/report/")) {
      url = url.slice(url.indexOf("report"));
      console.log(url);
      alteredURL = this.baseUrl + "12007/" + url;
    }
    else if (url.includes("/role/")) {
      url = url.slice(url.indexOf("role"));
      console.log(url);
      alteredURL = this.baseUrl + "13001/" + url;
    }
    else if (url.includes("/user/")) {
      url = url.slice(url.indexOf("user"));
      console.log(url);
      alteredURL = this.baseUrl + "13001/" + url;
    }
    else if (url.includes("/alert/")) {
      url = url.slice(url.indexOf("alert"));
      console.log(url);
      alteredURL = this.baseUrl + "12011/" + url;
    }
    else if (url.includes("/cronjob/")) {
      url = url.slice(url.indexOf("cronjob"));
      console.log(url);
      alteredURL = this.baseUrl + "12012/" + url;
    }
    else if (url.includes("/firewall/")) {
      url = url.slice(url.indexOf("firewall"));
      console.log(url);
      alteredURL = this.baseUrl + "12019/" + url;
    }
    else if (url.includes("/capacity-planner/")) {
      url = url.slice(url.indexOf("capacity-planner"));
      console.log(url);
      alteredURL = this.baseUrl + "12014/" + url;
    }
    else if (url.includes("/selfmonitoring/")) {
      url = url.slice(url.indexOf("selfmonitoring"));
      console.log(url);
      alteredURL = this.baseUrl + "12013/" + url;
    }
    else if (url.includes("/infra/api/")) {
      url = url.slice(url.indexOf("infra/api"));
      console.log(url);
      alteredURL = this.baseUrl + "12021/" + url;
    }
    else if (url.includes("/apm/api/")) {
      url = url.slice(url.indexOf("apm/api"));
      console.log(url);
      alteredURL = this.baseUrl + "12022/" + url;
    }
    else if (url.includes("/infraAlert/")) {
      url = url.slice(url.indexOf("infraAlert"));
      console.log(url);
      alteredURL = this.baseUrl + "12023/" + url;
    }
    else if (url.includes("/network/")) {
      url = url.slice(url.indexOf("network"));
      console.log(url);
      alteredURL = this.baseUrl + "12030/" + url;
    }
    else if (url.includes("/cloudGateway/")) {
      url = url.slice(url.indexOf("cloudGateway"));
      console.log(url);
      alteredURL = this.baseUrl + "12026/" + url;
    }
    else if (url.includes("/monitoring/")) {
      url = url.slice(url.indexOf("monitoring"));
      console.log(url);
      alteredURL = this.baseUrl + "12024/" + url;
    }
    else if (url.includes("/activemq/api/")) {
      url = url.slice(url.indexOf("activemq/api"));
      console.log(url);
      alteredURL = this.baseUrl + "12033/" + url;
    }
    else if (url.includes("/browser/api/")) {
      url = url.slice(url.indexOf("browser/api"));
      console.log(url);
      alteredURL = this.baseUrl + "12034/" + url;
    }
    else if (url.includes("/edata/api/")) {
      url = url.slice(url.indexOf("edata/api"));
      console.log(url);
      alteredURL = this.baseUrl + "12035/" + url;
    }
    else if (url.includes("/eks/api/")) {
      url = url.slice(url.indexOf("eks/api"));
      console.log(url);
      alteredURL = this.baseUrl + "12036/" + url;
    }
    else if (url.includes("/database/v1/")) {
      url = url.slice(url.indexOf("database/v1"));
      console.log(url);
      alteredURL = this.baseUrl + "12040/" + url;
    }
    else if (url.includes("/database/oracle/")) {
      url = url.slice(url.indexOf("database/oracle"));
      console.log(url);
      alteredURL = this.baseUrl + "12040/" + url;
    }
    else if (url.includes("/rds/api/")) {
      url = url.slice(url.indexOf("rds/api"));
      console.log(url);
      alteredURL = this.baseUrl + "12037/" + url;
    }
    else if (url.includes("/metering/api/v1/")) {
      url = url.slice(url.indexOf("metering/api/v1"));
      console.log(url);
      alteredURL = this.baseUrl + "12045/" + url;
    }
    else if (url.includes("/customAlert/api/")) {
      url = url.slice(url.indexOf("customAlert/api"));
      console.log(url);
      alteredURL = this.baseUrl + "12055/" + url;
    }
    else {
      alteredURL = url;
    }
    return alteredURL;
  }
}
