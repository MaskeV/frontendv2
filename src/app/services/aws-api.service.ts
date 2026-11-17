import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AwsApiService {

  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  public getServiceCount(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/cloudGateway/serviceCount" ,{params:params});
  }

  public getServiceCount4xx(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/cloudGateway/count4xx" ,{params:params});
  }

  public getServiceCount5xx(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/cloudGateway/count5xx" ,{params:params});
  }

  public getReqAvgLatency(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/cloudGateway/getReqAvgLatency" ,{params:params});
  }

  public getReqAvgIntLatency(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/cloudGateway/getReqAvgIntLatency" ,{params:params});
  }

  public getDataProcessCount(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/cloudGateway/getDataProcessCount" ,{params:params});
  }

  // ENDPOINT

  public getEndpointNames(entityId: string, startTime: number, endTime: number, size?: number, page?: number, searchWord?: string) {
    let params = new HttpParams()
      .set('entityId', entityId.toString())
      .set('st', startTime.toString())
      .set('et', endTime.toString());
    if (size !== undefined) {
      params = params.set('size', size.toString());
    }
    if (page !== undefined) {
      params = params.set('page', page.toString());
    }
    if (searchWord !== undefined) {
      params = params.set('endpoint', searchWord); // searchWord is mapped to 'endpoint'
    }
    return this.http.get(`${this.baseUrl}/cloudGateway/getEndpointsName`, { params: params });
  }

  public getCombinedData(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/cloudGateway/combinedData" ,{params:params});
  }

  public getEndpointCount(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}` + "/cloudGateway/endpointCount" ,{params:params});
  }

  public getEndpointCount4xx(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/cloudGateway/EndpointCount4xx" ,{params:params});
  }

  public getEndpointCount5xx(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/cloudGateway/endpointCount5xx" ,{params:params});
  }

  public getEndpointReqAvgLatency(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/cloudGateway/getEndpointReqAvgLatency" ,{params:params});
  }

  public getEndpointReqAvgIntLatency(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/cloudGateway/getEndpointReqAvgIntLatency" ,{params:params});
  }

  public getEndpointDataProcessCount(entityId: string, startTime:number,endTime:number){
    let params=new HttpParams().set('entityId',entityId.toString())
    .set('st',startTime.toString())
    .set('et',endTime.toString())
    return this.http.get(`${this.baseUrl}`  + "/cloudGateway/getEndpointDataProcessCount" ,{params:params});
  }
}
