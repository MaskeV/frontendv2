// @ts-nocheck
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SingleValueService {

  charts:any=[];
  defaultOptions;
  counter = 0;
  modifiedHeader:any;

  constructor() { }

  buildChartObject(jsonObject:any)
  {
    let valueLayout:any;
    this.modifiedHeader = JSON.parse(jsonObject.modifiedHeaders);
    if(jsonObject.status=="Something Went Wrong")
    {
      valueLayout =
      // "<div id='"+jsonObject.chartId+"-image_container'></div>" +
      "<div id='"+jsonObject.chartId+"-content_container' class='text-center' >"+
        "<span title='"+jsonObject.errorTitle+"' style='color: "+jsonObject.fontColor+";font-size: 14px;'>" + jsonObject.errorMsg + "<span>" +
    "</div>"
    }
    else if((jsonObject.status=="SUCCESS" || jsonObject.status=="DATA NOT FOUND") && !jsonObject.chartData.length)
    {
      valueLayout = 
      // "<div id='"+jsonObject.chartId+"-image_container'></div>" +
      "<div id='"+jsonObject.chartId+"-content_container' class='text-center' >"+
      "<span title='"+jsonObject.errorTitle+"' style='color: "+jsonObject.fontColor+";font-size: 14px;'>" + jsonObject.errorMsg + "<span>" +
      "</div>"+
    "</div>"
    }
    else if(jsonObject.chartType == "Text Value" && (jsonObject.textImageIconType == 'file' || jsonObject.textImageIconType == 'url')){

      valueLayout = "<div class='d-flex flex-row align-items-center col-md-12'>" +
        "<div id='" + jsonObject.chartId + "-image_container' class = 'col-md-4'></div>" +
        "<div id='" + jsonObject.chartId + "-content_container' class='d-flex flex-row  flex-wrap align-items-center col-md-8' >";
      let chartDataLength = jsonObject.chartData.length;
      let data = jsonObject.chartData;
      for (let i = 0; i < chartDataLength; i++) {
        let key = Object.keys(data[i]);
        let value = Object.values(data[i]);
        valueLayout = valueLayout + "<div class = 'm-3' id='" + jsonObject.chartId + "-" + i + "-object-graph-div'>" +
          "<h2 id='" + jsonObject.chartId + "-" + i + "-value-graph-content' style='color:" + jsonObject.fontColor + ";'>" + value[0] + "</h2>" +
          "<h3 id='" + jsonObject.chartId + "-" + i + "-key-graph-content' style='color:" + jsonObject.fontColor + ";'>" + this.getHeaderName(key[0]) + "</h3></div>";
      }
      valueLayout = valueLayout + "</div></div>";
    }
    else if(jsonObject.chartType=="Text" && jsonObject.timeInHeaders){
      valueLayout = "<div id='" + jsonObject.chartId + "-text_container' class='d-flex flex-row justify-content-center'>" +
      "<h1 id='" + jsonObject.chartId + "-graph-content' style='color:" + jsonObject.fontColor + ";'>"+jsonObject.chartData +"<br /> "+jsonObject.query +"</h1>" +
      "</div>"
    }
    else if(jsonObject.chartType=="Text" && !jsonObject.timeInHeaders) {
      valueLayout = "<div id='" + jsonObject.chartId + "-text_container' class='d-flex flex-row justify-content-center'>" +
      "<h1 id='" + jsonObject.chartId + "-graph-content' style='color:" + jsonObject.fontColor + ";'>"+jsonObject.chartData  +"</h1>" +
      "</div>"
    }
    else{
      valueLayout = "<div id='" + jsonObject.chartId + "-text_container' class='d-flex flex-row flex-wrap justify-content-center' style='height:100%;align-items: center;'>";
      let chartDataLength = jsonObject.chartData.length;
      let data = jsonObject.chartData;
      for (let i = 0; i < chartDataLength; i++) {
        let key = Object.keys(data[i]);
        let value = Object.values(data[i]);
        valueLayout = valueLayout + "<div class = 'm-3' id='" + jsonObject.chartId + "-" + i + "-object-graph-div' style ='display:grid; align-items:center;'>"+
        "<h2 id='" + jsonObject.chartId + "-" + i + "-value-graph-content' style='color:" + jsonObject.fontColor + ";'>" + value[0] + "</h2>"+
        "<h3 id='" + jsonObject.chartId + "-" + i + "-key-graph-content' style='color:" + jsonObject.fontColor + ";'>" + this.getHeaderName(key[0]) + "</h3></div>";
      }
      valueLayout = valueLayout + "</div>";
    }
    return this.defaultOptions = 
    "<div id='"+jsonObject.chartId+"-graph-div' class='text-center d-flex flex-column justify-content-center' style='height:100%;overflow-y:auto; background-color:"+ this.getBackgroundColor(jsonObject)+"; color:"+ jsonObject.fontColor+";'>"+
      // "<h2 id='"+jsonObject.chartId+"-graph-title' class='d-inline-block' style='color:"+jsonObject.fontColor+";' ><span>"+jsonObject.chartTitle+"</span></h2>"+
       valueLayout+
    "</div>";
  }

  getBackgroundColor(element){
    let bgColor = element.bgColor;
    if(element.metricDataUnit){
      if(element.metricDataUnit === 'Text'){
        if (element.chartData == element.criticalValue) {
          bgColor = "#dc3545";
        }
        else if (element.chartData == element.warningValue) {
          bgColor = "#ffc107";
        }
        else{
          bgColor = "#28a745";
        }
      }
      else{
        if (isNaN(+element.chartData)) {
          bgColor = "#28a745";
        }
        else{
          if (Number(element.chartData) >= Number(element.criticalValue)) {
            bgColor = "#dc3545";
          }
          else if (Number(element.chartData) >= Number(element.warningValue)) {
            bgColor = "#ffc107";
          }
          else if (Number(element.chartData) < Number(element.warningValue)) {
            bgColor = "#28a745";
          }
          else{
            bgColor = "#28a745";
          }
        }
        
      }
      element.graphBG = "color";
    }
    element.bgColor = bgColor;
    return element.bgColor;
  }

  getHeaderName(headerName: any) {
    let h = null;
    if (this.modifiedHeader) {
      if (this.modifiedHeader[headerName]) {
        h = this.modifiedHeader[headerName];
      }
      else {
        h = headerName;
      }
    }
    else {
      h = headerName;
    }

    return h;
  }
}