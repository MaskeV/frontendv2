import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HaedwareTrendServiceService {
  private baseUrl = '/BBPS/api';
  private modals: any[] = [];
  constructor(private http:HttpClient){}


  plotCpuHealth(fromDateNew:any,tillDateNew:any,DateRange:any){
    //console.log(fromDateNew,tillDateNew);
    const params = new HttpParams().set('fromDate', fromDateNew)
    .set('tillDate', tillDateNew).set('DateRange', DateRange);
    return this.http.get(`${this.baseUrl}`+'/cpuHealthTrendHW',{params});
  }

    plotMemoryHealth(fromDateNew:any,tillDateNew:any,DateRange:any){
    //console.log(fromDateNew,tillDateNew);
    const params = new HttpParams().set('fromDate', fromDateNew)
    .set('tillDate', tillDateNew).set('DateRange', DateRange);
    return this.http.get(`${this.baseUrl}`+'/memoryHealthTrendHW',{params});
  }
}
