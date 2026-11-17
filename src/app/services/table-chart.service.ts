// @ts-nocheck
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TableChartService {

  charts: any = [];
  defaultOptions;
  counter = 0;
  tableStruct: any = "";
  amount: number;
  normalCount: number = 0;
  warningCount: number = 0;
  criticalCount: number = 0;
  istrends: boolean;
  modifiedHeader: any;
  metricIndex : number = -1;
  metricOrder : any;
  ragPointNormalColor:any;
  ragPointWarningColor:any;
  ragPointCriticalColor:any; 
  isMultiMetric: boolean = false;
  idAndValueMap = new Map();	

  i: any;
  constructor() { }

  invertColor(hex, bw) {
    if (hex.indexOf('#') === 0) {
      hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
      throw new Error('Invalid HEX color.');
    }
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);
    if (bw) {
      // http://stackoverflow.com/a/3943023/112731
      return (r * 0.299 + g * 0.587 + b * 0.114) > 186
        ? '#000000'
        : '#FFFFFF';
    }
    // invert color components
    let r1 = (255 - r).toString(16);
    let g1 = (255 - g).toString(16);
    let b1 = (255 - b).toString(16);
    // pad each with zeros and return
    return "#" + this.padZero(r1, 2) + this.padZero(g1, 2) + this.padZero(b1, 2);
  }

  padZero(str, len) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
  }

  buildChartObject(jsonObject: any, graphObject: any) {
    let tableType = jsonObject.tableType;
   
    let data = jsonObject.chartData;
    this.normalCount=0;
    this.warningCount=0;
    this.criticalCount=0;

    let wordWrap = (jsonObject.wordWrap != undefined || jsonObject.wordWrap != null) ? jsonObject.wordWrap : "disable";
    // chartCategory can be an empty object {} when there is no data — guard before indexing
    const hasCategory = jsonObject.chartCategory != null && jsonObject.chartCategory != undefined
      && Array.isArray(jsonObject.chartCategory) && jsonObject.chartCategory.length >= 2;
    let mapCount = hasCategory ? jsonObject.chartCategory[0] : null;
    let headers = hasCategory ? jsonObject.chartCategory[1] : null;

    if (!hasCategory || headers == null || mapCount == null) {
      // No chart category data — return an empty table skeleton
      this.tableStruct = tableSkeletonTop + tableSkeletonBottom;
      return [this.tableStruct, this.idAndValueMap];
    }

    if(mapCount != (headers.length-1)){
      this.isMultiMetric = true;
    }else{
      this.isMultiMetric = false;
    }
    // let headerBgColor=this.invertColor(jsonObject.fontColor, true);
    let headerHighlightColor = jsonObject.tableHeaderBgColor;
    let headerFontColor = jsonObject.tableHeaderFontColor;
    this.modifiedHeader=JSON.parse(jsonObject.modifiedHeaders);
    this.ragPointCriticalColor = graphObject.criticalColor;
    this.ragPointNormalColor = graphObject.normalColor;
    this.ragPointWarningColor = graphObject.warningColor;
    // if (jsonObject.bgColor == "transparent") {
    //   headerFontColor = "#fff";
    // }
    // else {
    //   headerFontColor = jsonObject.bgColor;
    // }
    let classRAG="";
    // if(jsonObject.chartType == "RAG Table"){
    //   classRAG = ' isRAG';
    // }
    let tableSkeletonTop = "<div id='" + jsonObject.chartId + "-table-div' style='overflow: auto; height: 300px; color:" + jsonObject.fontColor + "; background-color:" + jsonObject.bgColor + "'>" +
      "<div class='row justify-content-center'>" +
      //   "<div>" +
      //     "<div class='dropdown'>" +
      //     "<button class='btn bg-transparent dropdown-toggle' style='color:" + jsonObject.fontColor + ";' type='button' id='" + jsonObject.chartId + "_dropdown' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>"+
      //         "<span id='" + jsonObject.chartId + "_tittle'>"+
      //           "<div style='font-size: 18px;' class='d-inline-block mx-2'>" + 
      //             "<span>"+jsonObject.chartTitle +"</span>"+
      //           "</div>"+
      //         "</span>"+
      //     "</button>" +
      //       "<div class='dropdown-menu' aria-labelledby='" + jsonObject.chartId + "_tittle'>" +
      //         "<a class='dropdown-item' id='" + jsonObject.chartId + "_export'>Export Data</a>" +
      //       "</div>" +
      //     "</div>" +
      //   "</div>" +
      //   // "<ul class='table-legend mt-2 mb-0 text-white'>" + 
      //   //   "<li id='critical-legend'><span class='bg-danger'></span></li>" + 
      //   //   "<li id='warning-legend'><span class='bg-warning'></span></li>" + 
      //   //   "<li id='normal-legend'><span class='bg-success'></span></li>" + 
      //   // "</ul>" +
      "</div>" +
      "<table id='" + jsonObject.chartId + "' class='table dynamic-table"
        + classRAG +"' border='1' style='width: 98%; color:" + jsonObject.fontColor + "; border-color:" + jsonObject.fontColor + "; background: " + jsonObject.bgColor + ";border-collapse: collapse;'>";
    let tableSkeletonBottom = "</table>" +
      "</div>";
    this.tableStruct = tableSkeletonTop;
    if (Object.keys(data).length > 0) {
      if(jsonObject.chartType == "RAG Table" && (jsonObject.metricID == null || jsonObject.metricID == "") && (jsonObject.status != "Graph not loaded, Please contact administrator!!" || jsonObject.status != "DATA NOT FOUND" || jsonObject.status != "Too Many Buckets")){
        this.tableStruct = this.tableStruct +"</br> <h5 style='text-align:center'>Kindly Provide a Metric for RAG Table </h5>";
      }else{
        if (tableType == "transpose" ) {
          if(data && data.data == undefined){
            this.amount = 0;
            if (headers.length > 0) {
              this.tableStruct = this.getColSpanHeaderData([data], mapCount - 1, jsonObject.chartCategory[0], headers, jsonObject.fontColor
                , headerHighlightColor, headerFontColor, jsonObject.metricColumns, '', graphObject.warningValue, graphObject.criticalValue
                , jsonObject.chartType, graphObject.metricDataUnit, graphObject.normalColor, graphObject.warningColor, graphObject.criticalColor,tableType);
    
            }
            this.tableStruct=this.createTransposeTableCells(data, mapCount-1, jsonObject.chartCategory[0], jsonObject.chartType
                , graphObject.warningValue, graphObject.criticalValue,jsonObject.fontColor, headers, jsonObject.metricColumns, ''
                , graphObject.metricDataUnit, graphObject.normalColor, graphObject.warningColor, graphObject.criticalColor)
                +"</tr></tbody>";
            
          }
          else{
            if (headers.length > 0) {
              this.tableStruct = this.tableStruct + "<thead><tr style='border: " + headerFontColor + "'>";
              for (let a = 0; a < headers.length; a++) {
                this.tableStruct = this.tableStruct +
                  "<th class='header-"+headers[a].replace(/[^A-Z0-9]+/ig, '')+"-cell' style='border-top:" + jsonObject.fontColor + "; background: " + headerHighlightColor 
                  + "'><span style='background: " + headerHighlightColor + "; color: " + headerFontColor + ";'>" + this.getHeaderName(headers[a]) + "</span></th>";
              }
              this.tableStruct = this.tableStruct + "</tr></thead>" +
                  "<tbody><tr><td colspan='"+headers.length+"' title='"+graphObject.errorTitle+"'>"+"<h5>"+graphObject.errorMsg+"</h5>"+"</td></tr></tbody>";

            }
          }
          
        }

        else if (tableType == "rowwise") {
          if (headers.length > 0) {
            this.tableStruct = this.tableStruct + "<thead><tr style='border: " + headerFontColor + "'>";
            for (let a = 0; a < headers.length; a++) {
              console.log("Check11");
              if(jsonObject.sortingColumns != null || jsonObject.sortingColumns != undefined){
                if(jsonObject.sortingColumns.replace(/[^A-Z0-9]+/ig, '') == headers[a].replace(/[^A-Z0-9]+/ig, ''))
                {
                  console.log("Check12");
                  this.metricIndex= a;
                  console.log(a+"checkSorting"+headers[a].replace(/[^A-Z0-9]+/ig, ''));
                }
              }
              else if(jsonObject.metricColumns != undefined && jsonObject.metricColumns !="")
              {
                if(jsonObject.metricColumns[0].replace(/[^A-Z0-9]+/ig, '') == headers[a].replace(/[^A-Z0-9]+/ig, ''))
                {
                  console.log("Check13");
                  this.metricIndex= a;
                  console.log(a+"check"+headers[a].replace(/[^A-Z0-9]+/ig, ''));
                }
              }
              this.tableStruct = this.tableStruct +
                "<th class='header-"+headers[a].replace(/[^A-Z0-9]+/ig, '')+"-cell' coloumn-count='"+a+"' (click)='testAlert()' style='border-top:" + jsonObject.fontColor + "; background: " + headerHighlightColor
                + "'><span style='background: " + headerHighlightColor + "; color: " + headerFontColor + ";'>" + this.getHeaderName(headers[a]) + "</span></th>";
            }
            this.tableStruct = this.tableStruct + "</tr></thead>";
          }
          if(data && data.data == undefined){
            this.tableStruct = this.createTableCells(data, mapCount - 1, jsonObject.chartCategory[0], jsonObject.chartType
              , graphObject.warningValue, graphObject.criticalValue, jsonObject.fontColor, headers
              , jsonObject.metricColumns, graphObject.metricDataUnit, graphObject.tableSorting, []
              , graphObject.normalColor, graphObject.warningColor, graphObject.criticalColor,jsonObject.chartId,wordWrap,tableType) +
              "</tbody>";
          }
          else if(data.data.length > 0) {
            this.tableStruct = this.createTableCellsForRawDta(data, mapCount - 1, jsonObject.chartCategory[0], jsonObject.chartType
              , graphObject.warningValue, graphObject.criticalValue, jsonObject.fontColor, headers
              , jsonObject.metricColumns, graphObject.metricDataUnit, graphObject.tableSorting, []
              , graphObject.normalColor, graphObject.warningColor, graphObject.criticalColor,jsonObject.chartId,wordWrap,tableType) +
              "</tbody>";
          }
          else if(jsonObject.status == "Too Many Buckets"){
            this.tableStruct = this.tableStruct + "<tbody><tr><td colspan='"+headers.length+"' title='"+graphObject.errorTitle+"'>"+"<h5>"+graphObject.errorMsg+"</h5>"+"</td></tr></tbody>";   

          }
          else{
            if(graphObject.tableSorting!="Yes"){
              this.tableStruct = this.tableStruct + 
              "<tbody><tr><td colspan='"+headers.length+"' title='"+graphObject.errorTitle+"'>"+"<h5>"+graphObject.errorMsg+"</h5>"+"</td></tr></tbody>";       
              } 
          }
        }else{
          this.tableStruct = this.tableStruct +"</br> <h5 style='text-align:center'>" + graphObject.errorMsg + "</h5>";
        }
        // this.tableStruct = this.tableStruct + tableSkeletonBottom;
      }
    }
    this.tableStruct = this.tableStruct + tableSkeletonBottom;
    // else {
    //   this.tableStruct = this.tableStruct + tableSkeletonBottom;
    // }
    console.log("Check1");
    if(jsonObject.sortingType != undefined || jsonObject.sortingType != null){
      this.metricOrder = jsonObject.sortingType;
    }
    jsonObject.legendBlocks =
      "<div class ='row' style='justify-content: center;'><ul class='table-legend mt-2 mb-1' style='color:" + jsonObject.fontColor + ";'>" +
      "<li id='" + jsonObject.chartId + "-critical-legend'><span style ='background-color:"+ this.ragPointCriticalColor + ";'  class='text-white text-center mr-1'>" + this.criticalCount + "</span> Critical</li>" +
      "<li id='" + jsonObject.chartId + "-warning-legend'><span style ='background-color:"+ this.ragPointWarningColor + ";'  class='text-white text-center mr-1'>" + this.warningCount + "</span> Warning</li>" +
      "<li id='" + jsonObject.chartId + "-normal-legend'><span style ='background-color:"+ this.ragPointNormalColor + ";'  class='text-white text-center mr-1'>" + this.normalCount + "</span> Normal</li>" +
      "</ul></div>";

    //console.log(this.tableStruct)
    return [this.tableStruct,this.idAndValueMap];
  }

  getDataKeysFromNested(nestedData: any, mapCount: any) {
    // if(mapCount){
    let mainReturn = {
      keys: [],
      upcomingNestedData: []
    };

    for (let k = 0; k < nestedData.length; k++) {             //main array looped
      if (Array.isArray(nestedData[k])) {
        mainReturn.upcomingNestedData.push(nestedData[k]);      //prepared arrays for next loop
        this.amount = 0;
        let colspanCount = this.getRowSpan(nestedData[k], mapCount - 1)
        mainReturn.keys.push({
          colspanCount: colspanCount,
          value: nestedData[k]
        });
      }
      else {
        let nestedDataKeys = Object.keys(nestedData[k]);
        for (let i = 0; i < nestedDataKeys.length; i++) {            //main array keys looped
          mainReturn.upcomingNestedData.push(nestedData[k][nestedDataKeys[i]]);      //prepared arrays for next loop
          this.amount = 0;
          let colspanCount = this.getRowSpan(nestedData[k][nestedDataKeys[i]], mapCount - 1)
          mainReturn.keys.push({
            colspanCount: colspanCount,
            value: nestedDataKeys[i]
          });
        }
      }
    }

    // this.getDataKeysFromNested(mainReturn.upcomingNestedData, mapCount-1, mainReturn);
    // }
    return mainReturn;
  }

  getColSpanHeaderData(data: any, mapCount: any, actualMapCount: any, headers: any, fontColor: any, headerHighlightColor : any
    , headerFontColor : any, metricHeaders : any, currentHeader : any, warningValue: any, criticalValue: any, chartType: any
    , metricDataUnit:any, normalColor:any, warningColor:any, criticalColor:any,tableType:any) {

    if (mapCount > 0) {

      let manupulatedData = this.getDataKeysFromNested(data, mapCount);
      let dataArrays = manupulatedData.keys;
      let nestedData = manupulatedData.upcomingNestedData;

      //tr inserted
      if(mapCount+1 == actualMapCount){
        this.normalCount=0;
        this.warningCount=0;
        this.criticalCount=0;
        this.tableStruct = this.tableStruct +
              "<thead><tr class='header-"+headers[0].replace(/[^A-Z0-9]+/ig, '')+"' style='border: " + headerFontColor + "'><th style='border-top:" 
              + fontColor + "; background: " + headerHighlightColor + "'><span style='background: "
              + headerHighlightColor + "; color: " + headerFontColor + ";'>"
              + this.getHeaderName(headers[0]).toUpperCase() + "</span></th>";
      }
      else{
        this.tableStruct = this.tableStruct + "<tr class='header-"+headers[0].replace(/[^A-Z0-9]+/ig, '')+"'><td style='border-top:" + fontColor + ";' >" 
              + this.getHeaderName(headers[0]) + "</td>";
      }
      currentHeader = headers[0];
      headers.shift();

      //main data keys inserted
      for (let k = 0; k < dataArrays.length; k++) {
        if(mapCount+1 == actualMapCount){
          this.tableStruct = this.tableStruct +
              "<th colspan='" + dataArrays[k].colspanCount + "' style='border-top:" + fontColor + "; background: " + headerHighlightColor + "'><span style='background: "
              + headerHighlightColor + "; color: " + headerFontColor + ";'>"
              + dataArrays[k].value.toUpperCase() + "</span></th>";
          // this.tableStruct = this.tableStruct +
          // "<th colspan='" + dataArrays[k].colspanCount + "' style='border-top:" + fontColor + ";'>" + dataArrays[k].value + "</th>";
        }
        else{
          // let cellClass = "";
          let bgColorRAG="";
          let textColorRAG="";
          if (chartType == "RAG Table" && $.inArray(currentHeader, metricHeaders) !== -1) {
            // cellClass = "square " + this.getRAGColorByValue(dataArrays[k].value, warningValue, criticalValue, metricDataUnit);
            // cellClass = "text-white " + this.getRAGColorByValue(dataArrays[k].value, warningValue, criticalValue, metricDataUnit);
            bgColorRAG=this.getRAGColorByValue(dataArrays[k].value, warningValue, criticalValue, metricDataUnit, normalColor, warningColor, criticalColor);
            textColorRAG=this.invertColor(bgColorRAG, true);
          }
          this.tableStruct = this.tableStruct +
            "<td colspan='" + dataArrays[k].colspanCount + "' style='border-top:" + fontColor + "; color:"+textColorRAG+"; background:"+bgColorRAG+";'>" 
                + dataArrays[k].value + "</td>";
          // this.tableStruct = this.tableStruct +
          //   "<td colspan='" + dataArrays[k].colspanCount + "' style='border-top:" + fontColor + ";' class='"+ cellClass +"'>" 
          //       + dataArrays[k].value + "</td>";
        }
        
      }
      //tr eneded
      this.tableStruct = this.tableStruct + "</tr>";
      if(mapCount+1 == actualMapCount){
        this.tableStruct = this.tableStruct + "</thead><tbody>";
      }
      // else if(mapCount == actualMapCount){
      //   this.tableStruct = this.tableStruct + "<tbody>";
      // }

      this.getColSpanHeaderData(nestedData, mapCount - 1, actualMapCount, headers, fontColor, headerHighlightColor
        , headerFontColor, metricHeaders, currentHeader, warningValue, criticalValue, chartType, metricDataUnit
        , normalColor, warningColor, criticalColor,tableType);
    }
    else if (mapCount == 0) {
      if (headers.length > 1) {
        this.tableStruct = this.tableStruct + "<tr class='header-"+headers[0].replace(/[^A-Z0-9]+/ig, '')+"'><td style='border-top:" + fontColor + ";' >" 
              + this.getHeaderName(headers[0]) + "</td>";
        currentHeader = headers[0];
        headers.shift();
      }

      for (let k = 0; k < data.length; k++) {
        for(let a = 0; a < data[k].length; a++){
          // let cellClass = "";
          let bgColorRAG="";
          let textColorRAG="";
          if (chartType == "RAG Table" && $.inArray(currentHeader, metricHeaders) !== -1) {
            // cellClass = "square " + this.getRAGColorByValue(data[k][a][0], warningValue, criticalValue, metricDataUnit);
            // cellClass = "text-white " + this.getRAGColorByValue(data[k][a][0], warningValue, criticalValue, metricDataUnit);
            bgColorRAG=this.getRAGColorByValue(data[k][a][0], warningValue, criticalValue, metricDataUnit, normalColor, warningColor, criticalColor);
            textColorRAG=this.invertColor(bgColorRAG, true);
          }
          this.tableStruct = this.tableStruct +
          "<td style='border-top:" + fontColor + "; color:"+textColorRAG+"; background:"+bgColorRAG+";'>" + data[k][a][0] + "</td>";
          
          // this.tableStruct = this.tableStruct +
          // "<td style='border-top:" + fontColor + ";' class='" + cellClass + "'>" + data[k][a][0] + "</td>";
        }
      }
      this.tableStruct=this.tableStruct+"</tr>";
    }
    return this.tableStruct;
  }

  createTransposeTableCells(data: any, mapCount: any, actualMapCount: any, chartType: any, warningValue: any, criticalValue: any
    , fontColor: any, headers: any[], metricHeaders : any, currentHeader : any, metricDataUnit:any, normalColor:any, warningColor:any
    , criticalColor:any) {
    if (mapCount > 0) {
      let dataKeys = Object.keys(data);
      for (let k = 0; k < dataKeys.length; k++) {
        let innerData = data[dataKeys[k]];
        if (actualMapCount == mapCount + 1 && headers.length) {
          this.tableStruct = this.tableStruct + "<tr class='header-"+headers[0].replace(/[^A-Z0-9]+/ig, '')+"'><td style='border-top:" + fontColor + ";' >" + this.getHeaderName(headers[0]) + "</td>";
          // this.tableStruct=this.tableStruct+
          //             "<td style='border-top:"+fontColor+";'>"+dataKeys[k]+"</td>";
          currentHeader = headers[0];
          headers.shift();
        }

        this.createTransposeTableCells(innerData, mapCount - 1, actualMapCount, chartType, warningValue, criticalValue, fontColor, headers
          , metricHeaders, currentHeader, metricDataUnit, normalColor, warningColor, criticalColor);
      }
    }
    else if (mapCount == 0) {

      for (let k = 0; k < data.length; k++) {
        // let cellClass = "";
        let bgColorRAG="";
        let textColorRAG="";
        if (chartType == "RAG Table" && $.inArray(currentHeader, metricHeaders) !== -1) {
          // cellClass = "square " + this.getRAGColorByValue(data[k][data[k].length - 1], warningValue, criticalValue, metricDataUnit);
          // cellClass = "text-white " + this.getRAGColorByValue(data[k][data[k].length - 1], warningValue, criticalValue, metricDataUnit);
          bgColorRAG=this.getRAGColorByValue(data[k][data[k].length - 1], warningValue, criticalValue, metricDataUnit, normalColor, warningColor, criticalColor);
          textColorRAG=this.invertColor(bgColorRAG, true);
        }
        this.tableStruct = this.tableStruct +
          "<td style='border-top:" + fontColor + "; color:"+textColorRAG+"; background:"+bgColorRAG+";'>" + data[k][data[k].length - 1] 
            + "</td>";
        // this.tableStruct = this.tableStruct +
        //   "<td style='border-top:" + fontColor + ";' class='" + cellClass + "'>" + data[k][data[k].length - 1] 
        //     + "</td>";
      }
      //this.tableStruct=this.tableStruct+"</tr>";

    }
    return this.tableStruct;
  }

  createTableCellsForRawDta(data: any, mapCount: any, actualMapCount: any, chartType: any, warningValue: any, criticalValue: any, fontColor: any
    , headers: any, metricHeaders: any, metricDataUnit: any, enableSorting: any, wanderingData: any[], normalColor: any, warningColor: any
    , criticalColor: any,chartId:any,wordWrap:any,tableType:any) {

    let k = 0;
    if(tableType == "rowwise"){
      this.tableStruct = this.tableStruct + "\n <tbody style='word-break: break-word;'>";
    }else{
    this.tableStruct = this.tableStruct + "\n<tbody>";
    }
    let metricHeadersIndex = [];
    if(metricHeaders!=null && metricHeaders!=undefined){
      for(let i = 0; i < metricHeaders.length;i++){
        for(let j = 0; j < headers.length;j++){
          if(metricHeaders[i] == headers[j]){
            metricHeadersIndex.push(j);
          }
        }
      }
    }
    for (let k = 0; k < data.data.length; k++) {
      this.tableStruct = this.tableStruct + "\n<tr>"
      for (let l = 0; l < data.data[k].length; l++) {
        let bgColorRAG = "";
        let textColorRAG = "";
        if (chartType == "RAG Table") {
          for(let x  of metricHeadersIndex)
          {
            if(x == l){
              bgColorRAG = this.getRAGColorByValue( data.data[k][l], warningValue, criticalValue, metricDataUnit, normalColor, warningColor, criticalColor);
              textColorRAG = this.invertColor(bgColorRAG, true);
              break;
            }
          }
        }
        if (wordWrap == "enable" && data.data[k][l].length > 1000) {
          let copyBtnId = chartId + "-copy-btn-" + (k + l);
          this.tableStruct = this.tableStruct +
            "<td class='header-" + headers[l].replace(/[^A-Z0-9]+/ig, '') + "-cell' style='border-top:" + fontColor + "; color:" + textColorRAG + "; background:" + bgColorRAG + ";'>" + data.data[k][l].substr(0, 1000) + "<button id='" + copyBtnId + "'>...Copy</button>" + "</td>";
          this.idAndValueMap.set(copyBtnId, data.data[k][l]);
        } else {
          this.tableStruct = this.tableStruct +
            "<td class='header-" + headers[l].replace(/[^A-Z0-9]+/ig, '') + "-cell' style='border-top:" + fontColor + "; color:" + textColorRAG + "; background:" + bgColorRAG + ";'>" + data.data[k][l] + " " + "</td>";
        }
        this.istrends = false;
      }
      this.tableStruct = this.tableStruct + "\n</tr>"
    }
    return this.tableStruct;
  }

  createTableCells(data: any, mapCount: any, actualMapCount: any, chartType: any, warningValue: any, criticalValue: any, fontColor: any
      , headers : any, metricHeaders:any, metricDataUnit:any, enableSorting:any, wanderingData:any[], normalColor:any, warningColor:any
      , criticalColor:any,chartId:any,wordWrap:any,tableType:any) {
    if (mapCount > 0) {
      if (actualMapCount == mapCount + 1) {
        this.i=1;
        actualMapCount = headers.length-1;
        this.normalCount=0;
        this.warningCount=0;
        this.criticalCount=0;
        if(tableType == "rowwise"){
          this.tableStruct = this.tableStruct + "\n <tbody style='word-break: break-word;'>";
        }else{
          this.tableStruct = this.tableStruct + "\n <tbody>";
        }
      }
      if(this.isMultiMetric && this.i==1){
        this.i = actualMapCount - mapCount;
        this.isMultiMetric = false;
      }
      
      let dataKeys = Object.keys(data);
      for (let k = 0; k < dataKeys.length; k++) {
        let innerData = data[dataKeys[k]];
        if (this.istrends) {
          this.tableStruct = this.tableStruct + "<tr style='background-color: transparent;'>";
        }
        this.amount = 0;
        // let cellClass = "";
        let bgColorRAG="";
        let textColorRAG="";
        if (chartType == "RAG Table" && $.inArray(headers[actualMapCount-mapCount-this.i], metricHeaders) !== -1) {
          // cellClass = "square " + this.getRAGColorByValue(dataKeys[k], warningValue, criticalValue, metricDataUnit);
          // cellClass = "text-white " + this.getRAGColorByValue(dataKeys[k], warningValue, criticalValue, metricDataUnit);
          bgColorRAG=this.getRAGColorByValue(dataKeys[k], warningValue, criticalValue, metricDataUnit, normalColor, warningColor, criticalColor);
          textColorRAG=this.invertColor(bgColorRAG, true);
        }

        if(enableSorting == 'Yes'){
          
          wanderingData[actualMapCount-mapCount-this.i] = {
            // cellClass : cellClass,
            textColorRAG : textColorRAG,
            bgColorRAG : bgColorRAG,
            header : headers[actualMapCount-mapCount-this.i],
            key : dataKeys[k],
            spanCount : this.getRowSpan(innerData, mapCount - 1) - 1
          }
          if (wordWrap == "enable" && dataKeys[k].length > 1000) {
            let copyBtnId = chartId + "-copy-btn-" + (k);
            this.tableStruct = this.tableStruct +
              "<td class='header-" + headers[actualMapCount-mapCount-this.i].replace(/[^A-Z0-9]+/ig, '') + "-cell' style='border-top:" + fontColor + "; color:" + textColorRAG + "; background:" + bgColorRAG + ";'>" + dataKeys[k].substr(0, 1000) + " <button id='" + copyBtnId + "'>...Copy</button>" + "</td>";
            this.idAndValueMap.set(copyBtnId, dataKeys[k]);
          } else {
            this.tableStruct = this.tableStruct +
              "<td class='header-" + headers[actualMapCount-mapCount-this.i].replace(/[^A-Z0-9]+/ig, '') + "-cell' style='border-top:" + fontColor + "; color:" + textColorRAG + "; background:" + bgColorRAG + ";'>" + dataKeys[k] + "</td>";
          }
          // this.tableStruct = this.tableStruct +
          //             "<td class='header-"+headers[actualMapCount-mapCount-1].replace(/[^A-Z0-9]+/ig, '')+"-cell "+ cellClass +"' style='border-top:" + fontColor + ";'>" + dataKeys[k] + "</td>";
              
        }
        else{
          if (wordWrap == "enable" && dataKeys[k].length > 1000) {
            let copyBtnId = chartId + "-copy-btn-" + (k);
            this.tableStruct = this.tableStruct +
              "<td class='header-" + headers[actualMapCount-mapCount-this.i].replace(/[^A-Z0-9]+/ig, '') + "-cell' rowspan='" + this.getRowSpan(innerData, mapCount - 1)
              + "' style='border-top:" + fontColor + "; color:" + textColorRAG + "; background:" + bgColorRAG + ";'>" + dataKeys[k].substr(0, 1000) + " <button id='" + copyBtnId + "'>...Copy</button>" + "</td>";
            this.idAndValueMap.set(copyBtnId, dataKeys[k]);
          } else {
            this.tableStruct = this.tableStruct +
              "<td class='header-" + headers[actualMapCount-mapCount-this.i].replace(/[^A-Z0-9]+/ig, '') + "-cell' rowspan='" + this.getRowSpan(innerData, mapCount - 1)
              + "' style='border-top:" + fontColor + "; color:" + textColorRAG + "; background:" + bgColorRAG + ";'>" + dataKeys[k] + "</td>";
          }
          // this.tableStruct = this.tableStruct +
          // "<td class='header-"+headers[actualMapCount-mapCount-1].replace(/[^A-Z0-9]+/ig, '')+"-cell "+ cellClass +"' rowspan='" + this.getRowSpan(innerData, mapCount - 1) 
          // + "' style='border-top:" + fontColor + ";'>" + dataKeys[k] + "</td>";
        }
        this.istrends = false;

        //Recursion started
        this.createTableCells(innerData, mapCount - 1, actualMapCount, chartType, warningValue, criticalValue, fontColor, headers
            , metricHeaders, metricDataUnit, enableSorting, wanderingData, normalColor, warningColor, criticalColor,chartId,wordWrap,tableType);
      }
    }
    else if (mapCount == 0) {
      
      for (let k = 0; k < data.length; k++) {
        for (let l = 0; l < data[k].length; l++) {
          let cnt = data[k].length;
          if (this.istrends) {
            this.tableStruct = this.tableStruct + "<tr style='background-color: transparent;'>";
          }
          if (l == data[k].length - 1) {
            // let cellClass = "";
            let bgColorRAG="";
            let textColorRAG="";
            if (chartType == "RAG Table" && $.inArray(headers[actualMapCount], metricHeaders) !== -1) {
              // cellClass = "square " + this.getRAGColorByValue(data[k][l], warningValue, criticalValue, metricDataUnit);
              // cellClass = "text-white " + this.getRAGColorByValue(data[k][l], warningValue, criticalValue, metricDataUnit);
              bgColorRAG=this.getRAGColorByValue(data[k][l], warningValue, criticalValue, metricDataUnit, normalColor, warningColor, criticalColor);
              textColorRAG=this.invertColor(bgColorRAG, true);
            }
            if (wordWrap == "enable" && data[k][l].length > 1000) {
              let copyBtnId = chartId + "-copy-btn-" + (k + l);
              this.tableStruct = this.tableStruct +
                "<td class='header-" + headers[actualMapCount].replace(/[^A-Z0-9]+/ig, '') + "-cell' style='border-top:" + fontColor + "; color:" + textColorRAG + "; background:" + bgColorRAG + ";'>" + data[k][l].substr(0, 1000) + " <button id='" + copyBtnId + "'>...Copy</button>" + "</td></tr>";
              this.idAndValueMap.set(copyBtnId, data[k][l]);
            } else {
              this.tableStruct = this.tableStruct +
              "<td class='header-" + headers[actualMapCount].replace(/[^A-Z0-9]+/ig, '') + "-cell' style='border-top:" + fontColor + "; color:" + textColorRAG + "; background:" + bgColorRAG + ";'>" + data[k][l] + "</td></tr>";
            }
            // this.tableStruct = this.tableStruct +
            //   "<td class='header-"+headers[actualMapCount].replace(/[^A-Z0-9]+/ig, '')+"-cell "+ cellClass +"' style='border-top:" + fontColor + ";'>" + data[k][l] + "</td></tr>";
            this.istrends = true;

            //for sorting logic
            if(enableSorting == 'Yes'){
              let wanderingDataSize = wanderingData.length;
              if(wanderingDataSize){
                for(let t=0; t<wanderingDataSize; t++){
                  if(wanderingData[t].spanCount){
                    if (this.istrends) {
                      this.tableStruct = this.tableStruct + "<tr style='background-color: transparent;'>";
                    }
                    if (wordWrap == "enable" && wanderingData[t].key.length > 1000) {
                      let copyBtnId = chartId + "-copy-btn-" + (k + l);
                      this.tableStruct = this.tableStruct +
                        "<td class='header-" + wanderingData[t].header.replace(/[^A-Z0-9]+/ig, '') + "-cell' style='border-top:" + fontColor + "; color:" + wanderingData[t].textColorRAG + "; background:" + wanderingData[t].bgColorRAG + ";'>" + wanderingData[t].key.substr(0, 1000) + " <button id='" + copyBtnId + "'>...Copy</button>" + "</td>";
                      this.idAndValueMap.set(copyBtnId, wanderingData[t].key);
                    } else {
                      this.tableStruct = this.tableStruct +
                        "<td class='header-" + wanderingData[t].header.replace(/[^A-Z0-9]+/ig, '') + "-cell' style='border-top:" + fontColor + "; color:" + wanderingData[t].textColorRAG + "; background:" + wanderingData[t].bgColorRAG + ";'>" + wanderingData[t].key + "</td>";
                    }
                    // this.tableStruct = this.tableStruct +
                    //   "<td class='header-"+wanderingData[t].header.replace(/[^A-Z0-9]+/ig, '')+"-cell "+ wanderingData[t].cellClass +"' style='border-top:" + fontColor + ";'>" + wanderingData[t].key + "</td>";
                    wanderingData[t].spanCount = wanderingData[t].spanCount-1;
                    this.istrends = false;
                    
                  }
                }
              }
            }
            
          }
          else {
            // let cellClass = "";
            let bgColorRAG="";
            let textColorRAG="";
            if (chartType == "RAG Table" && $.inArray(headers[actualMapCount-(cnt-(l+1))], metricHeaders) !== -1) {
              // cellClass = "text-white " + this.getRAGColorByValue(data[k][l], warningValue, criticalValue, metricDataUnit);
              bgColorRAG=this.getRAGColorByValue(data[k][l], warningValue, criticalValue, metricDataUnit, normalColor, warningColor, criticalColor);
              textColorRAG=this.invertColor(bgColorRAG, true);
            }

            if(wordWrap=="enable" && data[k][l].length > 1000){
              let copyBtnId = chartId+"-copy-btn-"+(k+l);
              this.tableStruct = this.tableStruct +
              "<td class='header-" + headers[actualMapCount-(cnt-(l+1))].replace(/[^A-Z0-9]+/ig, '') + "-cell' style='border-top:" + fontColor + "; color:" + textColorRAG + "; background:" + bgColorRAG + ";'>" + data[k][l].substr(0,1000) + " <button id='"+copyBtnId+"'>...Copy</button>" + "</td>";
              this.idAndValueMap.set(copyBtnId, data[k][l]);
            }else{
            this.tableStruct = this.tableStruct +
              "<td class='header-" + headers[actualMapCount-(cnt-(l+1))].replace(/[^A-Z0-9]+/ig, '') + "-cell' style='border-top:" + fontColor + "; color:" + textColorRAG + "; background:" + bgColorRAG + ";'>" + data[k][l] + "</td>";
            }
            // this.tableStruct = this.tableStruct +
            //   "<td class='header-"+headers[actualMapCount-(cnt-(l+1))].replace(/[^A-Z0-9]+/ig, '')+"-cell' style='border-top:" + fontColor + "; color:"+textColorRAG+"; background:"+bgColorRAG+";'>" + data[k][l] + "</td>";
              
            // this.tableStruct = this.tableStruct +
            //   "<td class='header-"+headers[actualMapCount-1].replace(/[^A-Z0-9]+/ig, '')+"-cell "+ cellClass +"' style='border-top:" + fontColor + ";'>" + data[k][l] + "</td>";
            this.istrends = false;
           }
        }
      }

    }
    return this.tableStruct;
  }

  getRowSpan(dArray: any, count: any) {
    if (count > 0) {
      let dataKeys = Object.keys(dArray);
      for (let i = 0; i < dataKeys.length; i++) {
        let innerData = dArray[dataKeys[i]];
        this.getRowSpan(innerData, count - 1);
      }
    }
    else if (count == 0) {
      this.amount = this.amount + dArray.length;
    }
    return this.amount;
  }

  getTransposeColSpan(dArray: any, count: any) {
    if (count > 1) {
      let dataKeys = Object.keys(dArray);
      for (let i = 0; i < dataKeys.length; i++) {
        let innerData = dArray[dataKeys[i]];
        this.getRowSpan(innerData, count - 1);
      }
    }
    else if (count == 1) {
      this.amount = this.amount + dArray.length;
    }
    return this.amount;
  };

  getRAGClassByValue(value: any, warningVal: any, criticalVal: any, metricDataUnit: any) {
    if(metricDataUnit === 'Text'){
      if (value == criticalVal) {
        this.criticalCount++;
        return 'bg-danger';
      }
      else if (value == warningVal) {
        this.warningCount++;
        return 'bg-warning';
      }
      else{
        this.normalCount++;
        return 'bg-success';
      }
    }
    else{
      if (isNaN(+value)) {
        this.normalCount++;
        return 'bg-success';
      }
      else{
        if (Number(value) >= Number(criticalVal)) {
          this.criticalCount++;
          return 'bg-danger';
        }
        else if (Number(value) >= Number(warningVal)) {
          this.warningCount++;
          return 'bg-warning';
        }
        else if (Number(value) < Number(warningVal)) {
          this.normalCount++;
          return 'bg-success';
        }
        else{
          this.normalCount++;
          return 'bg-success';
        }
      }
      
    }
    
  }

  getRAGColorByValue(value: any, warningVal: any, criticalVal: any, metricDataUnit: any, normalColor:any, warningColor:any, criticalColor:any) {
    if(metricDataUnit === 'Text'){
      this.metricOrder = "asc";
      if (value == criticalVal) {
        this.criticalCount++;
        return criticalColor;
      }
      else if (value == warningVal) {
        this.warningCount++;
        return warningColor;
      }
      else{
        this.normalCount++;
        return normalColor;
      }
    }
    else{
      if (isNaN(+value)) {
        this.normalCount++;
        return normalColor;
      }
      else{
        if(Number(criticalVal)>Number(warningVal)){
          this.metricOrder = "desc";
          if (Number(value) >= Number(criticalVal)) {
            this.criticalCount++;
            return criticalColor;
          }
          else if (Number(value) >= Number(warningVal)) {
            this.warningCount++;
            return warningColor;
          }
          else if (Number(value) < Number(warningVal)) {
            this.normalCount++;
            return normalColor;
          }
          else{
            this.normalCount++;
            return normalColor;
          }
        }
        else{
          this.metricOrder = "asc";
          if (Number(value) <= Number(criticalVal)) {
            this.criticalCount++;
            return criticalColor;
          }
          else if (Number(value) <= Number(warningVal)) {
            this.warningCount++;
            return warningColor;
          }
          else if (Number(value) > Number(warningVal)) {
            this.normalCount++;
            return normalColor;
          }
          else{
            this.normalCount++;
            return normalColor;
          }
        }
      }
      
    }
    
  }

  getHeaderName(headerName:any){
    let h=null;
    if(this.modifiedHeader){
      if(this.modifiedHeader[headerName]){
        h=this.modifiedHeader[headerName];
      }
      else{
        h=headerName;
      }
    }
    else{
      h=headerName;
    }

    return h;
  }

}
