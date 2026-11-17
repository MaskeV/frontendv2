import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApplicationMaster } from '../models/application-master';
import { environment } from '../../environments/environment';
import { CapacityPlanner } from '../models/capacity-planner';

@Injectable({providedIn: 'root'})
export class CapacityPlannerService {

    //private baseUrl = '/ruambot/api';
    // private baseUrl = 'http://localhost:8089/ruambot/api';
    private baseUrl = environment.baseUrl+"/capacity-planner/api";

    constructor(private http:HttpClient) { }
    
    getAllApplications(data:any): Observable<object> {
        let sessionDTO = data;  
        return this.http.get(`${this.baseUrl}`+'/getAllApplications',{params:sessionDTO});  
    }

    getIPAddressByApplicationID(appObj:ApplicationMaster): Observable<object> {  
        return this.http.post(`${this.baseUrl}`+'/getIPAddressByApplicationID', appObj);  
    }

    getCapacityPlannerData(capacityPlanner:CapacityPlanner){
        return this.http.post<any>(`${this.baseUrl}`+`/getCapacityPlannerData`,capacityPlanner);
    }

    retrivePeakMinCPUByIp(capacityPlanner:CapacityPlanner){
        return this.http.post<any>(`${this.baseUrl}`+`/retrivePeakMinCPUByIp`,capacityPlanner);
    }
    
    retrivePeakMinMemoryByIp(capacityPlanner:CapacityPlanner){
        return this.http.post<any>(`${this.baseUrl}`+`/retrivePeakMinMemoryByIp`,capacityPlanner);
    }
    
    retrivePeakMinDiskOSByIp(capacityPlanner:CapacityPlanner){
        return this.http.post<any>(`${this.baseUrl}`+`/retrivePeakMinDiskOSByIp`,capacityPlanner);
    }

    retriveAllCPUByIp(capacityPlanner:CapacityPlanner){
        return this.http.post<any>(`${this.baseUrl}`+`/retriveAllCPUByIp`,capacityPlanner);
    }

    getCpuGraphData(capacityPlanner:CapacityPlanner){
        return this.http.post<any>(`${this.baseUrl}`+`/getCpuGraphDataForCapacityPlanner`,capacityPlanner);
    }

}