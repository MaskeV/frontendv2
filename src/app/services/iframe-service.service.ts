import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IframeServiceService {

  constructor() { }

  buildIFrameJSON(jsonObject:any){

    return "<div id='"+jsonObject.chartId+"-iframe-div' style='font-size: 18px; font-weight: 500;text-align: center; color: "+ jsonObject.fontColor+";'>" 
              // + "<span>"+jsonObject.chartTitle +"</span>"+
              +  "<iframe src=\""+jsonObject.chartData+"\"></iframe>"+
            "</div>";
    // return "<iframe id='"+jsonObject.chartId+"-iframe-div' src=\""+jsonObject.chartData+"\"></iframe>";
  }
}
