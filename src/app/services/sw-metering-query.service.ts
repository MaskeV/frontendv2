import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { HttpClient, HttpParams } from "@angular/common/http";
import { ServiceResponse } from "../models/common/ServiceResponse";
import { RunQuery } from "../models/software-metering/RunQuery";

@Injectable({
  providedIn: "root",
})
export class SwMeteringQueryService {
  baseURL: string = environment.baseUrl;
  // baseURL: string = "http://localhost:12045";
  constructor(private http: HttpClient) {}

  public getQueriesByPlatform(platform: string) {
    let http_param = new HttpParams().set("platform", platform);
    return this.http.get<ServiceResponse<any>>(
      `${this.baseURL}/metering/api/v1/query/getQueriesByPlatform`,
      { params: http_param }
    );
  }

  public getAllHosts(zoneId:number,groupId:number) {
    let http_param=new HttpParams().set('zoneId',zoneId).set('groupId',groupId);
    return this.http.get<ServiceResponse<any>>(
      `${this.baseURL}/metering/api/v2/host/getAllHostForQuery`,
      {params:http_param}
    );
  }

  public runQueryOnHost(runQuery: RunQuery) {
    return this.http.post<ServiceResponse<any>>(
      `${this.baseURL}/metering/api/v1/query/runQueryOnHost`,
      runQuery
    );
  }
}
