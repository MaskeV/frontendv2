// @ts-nocheck
import { Injectable } from '@angular/core';

import Highcharts from 'highcharts';
import 'highcharts/modules/exporting';
import 'highcharts/modules/export-data';
import 'highcharts/modules/offline-exporting';
import 'highcharts/modules/no-data-to-display';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import moment from 'moment';
import { jsPDF } from "jspdf";

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

@Injectable({
  providedIn: 'root'
})
export class TopNGraphService {

  charts: any = [];
  defaultOptions;
  counter = 1;
  defaultColors = ['#63b598', '#ffd04b', '#84a3ff', '#e67d32', '#f556b0', '#008eff', '#e535fc', '#513d98', '#008c00', '#e3d94c',
    '#7d9ff7', '#ef6e3c', '#6b0000', '#003772', '#520d3a', '#513d98', '#63b598', '#ffe2f8', '#00a0da', '#ffb380',
    '#f697c1', '#4ca2f9', '#ffa2bc', '#ba96ce', '#96e591', '#f1ae16', '#2f7b99', '#fc7e41', '#d02e29', '#21538e',
    '#b259ab', '#66006f', '#66006f', '#fce877', '#0099a5', '#ff8473', '#0086b3', '#f1a0ff', '#651be6', '#00861f',
    '#f7bf35', '#00696c', '#d36647', '#551500', '#004364', '#521250', '#7260d8', '#c6f5e4', '#e7dbce', '#ccfeff',
    '#f5f3e9', '#b5e0d3', '#f0f7f7',



    '#00d500', '#004fe5', '#c5eb00', '#0043c4', '#1eb700', '#e200ad', '#59be00', '#ff7dff', '#009500',
    '#ca86ff', '#97e142', '#003fa5', '#dafe7f', '#00f4b7', '#e70024', '#00ffff', '#a60000',
    '#00f9ff', '#ff5244', '#00f8e4', '#900019', '#00cd83', '#0050b9', '#f7bf35', '#003770', '#0055ad',
    '#d29600', '#0073ce', '#f556b0', '#003c85', '#ffc568', '#00861f', '#bb94ff', '#005500', '#f1a0ff',
    '#0a4700', '#ffadff', '#003600', '#ac6500', '#00bfff', '#0043c4', '#5b0000', '#3bd2ff', '#580000', '#e70024',
    '#73d4ff', '#460000', '#d3f7ff', '#440000', '#00b9bc', '#6c1b38', '#0a080b', '#003403', '#2b4a03',
    '#744900', '#00a9e1', '#612b00', '#532e00', '#afcfff', '#254100', '#142200',
    '#c3daff', '#121909', '#ffc7d3', '#003320', '#00346d', '#ffbca8', '#9bcbb9', '#002535', '#e0cce0',
    '#292a00', '#009ed3', '#002c29', '#d5b2d3', '#004833', '#0086b3', '#002838', '#ffd200', '#6b2e5f',
    '#ce7d78', '#ea9e70', '#a48a9e', '#c6e1e8', '#648177', '#0d5ac1', '#f205e6', '#1c0365', '#14a9ad', '#a4e43f', '#d298e2', '#6119d0',
    '#d2737d', '#c0a43c', '#f2510e', '#651be6', '#79806e', '#61da5e', '#cd2f00', '#9348af', '#01ac53', '#c5a4fb', '#996635', '#b11573',
    '#4bb473', '#75d89e', '#2f3f94', '#da967d', '#34891f', '#b0d87b', '#ca4751', '#7e50a8',
    '#c4d647', '#e0eeb8', '#11dec1', '#289812', '#566ca0', '#ffdbe1', '#2f1179', '#935b6d', '#916988', '#aead3a', '#9e6d71', '#4b5bdc', '#0cd36d',
    '#250662', '#cb5bea', '#228916', '#ac3e1b', '#df514a', '#539397', '#880977', '#679c9d', '#c6c42c', '#5d2c52', '#48b41b', '#e1cf3b',
    '#5be4f0', '#57c4d8', '#a4d17a', '#225b8', '#be608b', '#96b00c', '#088baf', '#f158bf', '#e145ba', '#ee91e3', '#05d371', '#5426e0', '#4834d0', '#802234',
    '#6749e8', '#0971f0', '#8fb413', '#b2b4f0', '#c3c89d', '#c9a941', '#41d158', '#fb21a3', '#51aed9', '#5bb32d', '#807fb', '#89d534',
    '#7fb411', '#0023b8', '#3b8c2a', '#986b53', '#f50422', '#983f7a', '#ea24a3', '#79352c', '#c79ed2', '#d6dd92', '#e33e52', '#b2be57', '#fa06ec',
    '#1bb699', '#64820f', '#1c271', '#21538e', '#89d534', '#d36647', '#7fb411', '#0023b8', '#3b8c2a', '#986b53', '#f50422', '#983f7a', '#ea24a3',
    '#79352c', '#521250', '#c79ed2', '#d6dd92', '#e33e52', '#b2be57', '#fa06ec', '#1bb699', '#6b2e5f', '#64820f', '#1c271', '#9cb64a', '#996c48', '#9ab9b7',
    '#06e052', '#e3a481', '#0eb621', '#fc458e', '#b2db15', '#aa226d', '#792ed8', '#73872a', '#cefcb8', '#a5b3d9', '#7d1d85', '#c4fd57',
    '#8fe22a', '#243eeb', '#1dc18', '#dd93fd', '#3f8473', '#421f79', '#7a3d93', '#635f6d', '#93f2d7', '#9b5c2a', '#15b9ee', '#0f5997',
    '#409188', '#911e20', '#1350ce', '#10e5b1', '#fff4d7', '#cb2582', '#ce00be', '#32d5d6', '#17232', '#608572', '#c79bc2', '#00f87c', '#77772a', '#6995ba',
    '#fc6b57', '#f07815', '#8fd883', '#060e27', '#21d52e', '#d00043', '#b47162', '#1ec227', '#4f0f6f', '#1d1d58', '#947002', '#bde052', '#e08c56',
    '#28fcfd', '#bb09b', '#36486a', '#1ae6db', '#3e464c', '#a84a8f', '#911e7e', '#3f16d9', '#0f525f', '#ac7c0a', '#b4c086', '#c9d730', '#30cc49',
    '#3d6751', '#fb4c03', '#640fc1', '#62c03e', '#d3493a', '#88aa0b', '#406df9', '#615af0', '#4be47', '#2a3434', '#4a543f', '#79bca0', '#a8b8d4', '#00efd4',
    '#7ad236', '#1deaa7', '#06f43a', '#823c59', '#dc1c06', '#f53b2a', '#b46238', '#2dfff6', '#a82b89', '#1a8011', '#436a9f', '#1a806a',
    '#4cf09d', '#c188a2', '#67eb4b', '#b308d3', '#af3101', '#fff065', '#71b1f4', '#a2f8a5', '#e23dd0', '#d3486d', '#00f7f9', '#474893', '#3cec35',
    '#1c65cb', '#5d1d0c', '#2d7d2a', '#ff3420', '#5cdd87', '#a259a4', '#e4ac44', '#1bede6', '#8798a4', '#d7790f', '#b2c24f', '#de73c2', '#d70a9c', '#25bb67',
    '#88e9b8', '#c2b0e2', '#86e98f', '#ae90e2', '#1a806b', '#436a9e', '#0ec0ff',
    '#f812b3', '#b17fc9', '#8d6c2f', '#d3277a', '#2ca1ae', '#9685eb', '#8a96c6', '#dba2e6', '#76fc1b', '#608fa4', '#20f6ba', '#07d7f6', '#dce77a', '#77ecca'];

  constructor() { }

  buildColumnChartJSON(jsonObject: any, page: any, getGraphWidgetDimension?:any, setGraphWidgetDimension?:any) {

    let exportMenu: boolean = true;
    if (page == "dashboardEdit") {
      exportMenu = true;
    } else {
      exportMenu = false;
    }
    let jsonColors = jsonObject.colors;
    let labelColor = Object.assign([], this.defaultColors);
    if (jsonColors) {
      labelColor.splice(0, 0, jsonColors);
    }

    let manuData = [];
    let  dataArray = jsonObject.chartData;	
    if(Array.isArray(dataArray) && dataArray.length){
    for (let a = 0; a < jsonObject.chartData[0].length; a++) {
      manuData[a] = [jsonObject.chartData[0][a], jsonObject.chartData[1][a]];
    }
  }
    return this.defaultOptions = {
      chart: {
        type: 'bar',
        // backgroundColor: '#141619',
        backgroundColor: jsonObject.bgColor,
        borderWidth: 0,
        borderRadius: 0,
        plotBackgroundColor: null,
        plotShadow: false,
        plotBorderWidth: 0,
        marginRight: 50
      },

      title: {
        // text: jsonObject.chartTitle,
        text: null,
        style: {
          // color: '#c7d0d9',
          color: jsonObject.fontColor,
          // font: '18px Roboto, Helvetica Neue,Arial sans-serif'
          // fontSize: '18px',
          fontWeight: 'bold',
          font: `${jsonObject.fontSizeTitle}px Open Sans`
        },
        useHTML: true
      },
      xAxis: {
        type: 'category',
        // categories: jsonObject.chartData[0],
        title: {
          text: null,
          style: {
            // color: 'white',
            color: jsonObject.fontColor,
            fontWeight: 'bold'

          }
        },
        labels: {
          animate: true,
          style: {
            color: jsonObject.fontColor
          }
        }
      },
      yAxis: {
        visible: false,
        allowOverlap: true,
        min: 0,
        title: {
          // text: 'Population (millions)',
          align: 'high'
        },
        labels: {
          overflow: 'allow'
        }
      },
      tooltip: {
        // valueSuffix: ' millions'
      },
      plotOptions: {
        bar: {
          keys: ['y', 'value'],
          dataLabels: {
            enabled: true,
            style: {
              color: jsonObject.fontColor,
              textOutline: 0,
            }
          },
          events: {
            click: function (event) {
              console.log("funnel console------" + event);
              // console.log("funnel console------"+event.point.options);
              if (page == "graph") {
                event.preventDefault();
                showFrontLayer();
              }

              function showFrontLayer() {
                document.getElementById('bg_mask').style.visibility = 'visible';
                document.getElementById('frontlayer').style.visibility = 'visible';
                $(".legendColorCodeClass").val(event.point.color);
                $("#legendNameID").html(event.point.options.name);
                // $("#legendNameID").attr("indexID",event.point.options.colorByIndex);
              }
            }
          }
        }
      },
      legend: {
        enabled: true,
        floating: true,
        verticalAlign: 'bottom',
        align: 'left',
        fontSize: '5px',
        y: 40
      },
      credits: {
        enabled: false
      },
      colors: labelColor,
      series: [{

        keys: ['name', 'y'],
        dataSorting: {
          enabled: true,
          sortKey: 'y'
        },
        data: manuData
      }],
      lang: {
        noData: jsonObject.errorMsg,
      },
      noData: {
        style: {
          fontWeight: 'bold',
          fontSize: '15px',
          color: '#303030'
        },
        useHTML: true,
      },
      exporting: {
        // enabled: exportMenu,
        enabled: false,
        fallbackToExportServer: false,
        chartOptions: {
          title: {
            text: jsonObject.chartTitle,
            verticalAlign: 'top',	
            fontSize: '5px',
          }
        },
        menuItemDefinitions: {
          // Custom definition
          downloadXLS: {
            onclick: function (event: any) {
              let titleOptn = this.title;
              let title = titleOptn.textStr;

              let series = this.series;
              let chartData = [];
              let dateFormat = 'yyyy-MM-DD HH:mm:ss';

              // alert('series');
              // console.log(this);

              series.forEach(element => {
                let name;
                let xData = element.xData
                let xAxis = element.xAxis;
                let categories = xAxis.categories
                let yData = element.yData

                // console.log(xData);
                // console.log(categories);
                // console.log(yData);

                for (let index = 0; index < xData.length; index++) {
                  let obj = { metric: categories[xData[index]], [title]: yData[index] };
                  chartData.push(obj);
                }

              });

              // console.log(chartData)

              // let series = [{metric : '192.168.0.1', time : 'Wednesday, 19 May 2021 10:58:10', [chartId] : '0'},
              //               {metric : '192.168.0.1', time : 'Wednesday, 19 May 2021 11:58:10', [chartId] : '1'}, 
              //               {metric : '192.168.0.1', time : 'Wednesday, 19 May 2021 12:58:10', [chartId] : '2'}
              //             ];

              /*----------------------- Excel Service -----------------------*/

              function exportAsExcelFile(json: any[], excelFileName: string): void {

                const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(json);
                // console.log('worksheet',worksheet);
                const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
                const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                //const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
                saveAsExcelFile(excelBuffer, excelFileName);
              }

              function saveAsExcelFile(buffer: any, fileName: string): void {
                const data: Blob = new Blob([buffer], {
                  type: EXCEL_TYPE
                });
                FileSaver.saveAs(data, fileName + '_' + moment(new Date()).format(dateFormat) + EXCEL_EXTENSION);
              }

              /*----------------------- Excel Service -----------------------*/

              exportAsExcelFile(chartData, `${title}_data`);

            },
            text: 'downloadXLS'
          },
          viewFullscreen: {
            onclick: function (event: any) {
              let elementArr = event.path;
              let element = elementArr[5];
              console.log(element.id);

              let chart = this;
              console.log(chart);
              this.oldChartWidth = this.chartWidth;
              this.oldChartHeight = this.chartHeight;
              console.log(this.oldChartWidth);
              console.log(this.oldChartHeight);

              let graph = document.getElementById(element.id);
              if (graph.requestFullscreen) {
                let screenWidth = screen.width;
                let screenHeight = screen.height;
                // console.log(chart)
                chart.setSize(screenWidth, screenHeight, false);
                graph.requestFullscreen()
                  .then(() => {
                    if (graph.style.backgroundColor == "transparent") {
                      graph.style.backgroundColor = "#6c757d";
                    }
                  });
              }

            },
            text: 'View Full Screen, Esc to exit'
          },
          //   changeBackgroundColor: {
          //     onclick: function (e:any) {
          //       // alert("chart clicked !!");
          //       let options = this.options;

          //       let title = options.title
          //       let style = title.style
          //       let fontColor = style.color;
          //       //alert("fontColor : " + fontColor);

          //       let chartTitle = title.text;
          //       //alert("chartTitle : "+chartTitle);

          //       let chart = options.chart;
          //       let backgroundColor = chart.backgroundColor;
          //       //alert("backgroundColor : " + backgroundColor);

          //       // let legend = options.legend;
          //       // let itemStyle = legend.itemStyle;
          //       // let fontColor = itemStyle.color;

          //       e.preventDefault();
          //       showFrontLayer();

          //       function showFrontLayer() {
          //         let bgType:any;

          //         ($('#bgcolor_modal') as any).modal({ show: true });

          //         if(backgroundColor == 'transparent'){
          //           bgType = 'transparent';
          //         }else{
          //           bgType = 'color';
          //         }

          //         $("#graphBG").val(bgType);
          //         $(".bgColor").val(backgroundColor);
          //         $(".fontColor").val(fontColor);

          //       }
          //       return true;

          //     },
          //     text: 'Change Graph Colors'
          // }
          downloadPDFDocument: {
            onclick: function (event: any) {



              let chart = this;
              let myChartTitle = chart.title.textStr;

              let svgString = chart.getSVG();
              let parser = new DOMParser();
              let svgElem = parser.parseFromString(svgString, "image/svg+xml").documentElement as HTMLCanvasElement;

              // Use toDataURL extension to generate Base64 string
              let b64 = svgElem.toDataURL()

              // Log string in console
              console.log(b64);


              run();

              function base64SvgToBase64Png(originalBase64: string, width: any) {
                return new Promise(resolve => {
                  let img = document.createElement('img');
                  img.onload = function () {
                    document.body.appendChild(img);
                    let canvas = document.createElement("canvas");
                    let ratio = (img.clientWidth / img.clientHeight) || 1;
                    document.body.removeChild(img);
                    canvas.width = width;
                    canvas.height = width / ratio;
                    let ctx = canvas.getContext("2d");
                    if (ctx != null) {
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      try {
                        let data = canvas.toDataURL('image/png');
                        resolve(data);
                      } catch (e) {
                        resolve(null);
                      }
                    }

                  };
                  img.src = originalBase64;
                });
              }

              function run() {


                //1900 ->width of actual 
                base64SvgToBase64Png(b64, 1900).then((pngSrc: any) => {

                  console.log(pngSrc)
                  let src = pngSrc
                  const doc = new jsPDF('p', 'pt', 'a4', true);
                  doc.addImage(src, 'PNG', 100, 40, 400, 220);
                  doc.save(myChartTitle + '.pdf');
                });
              }

            },
            text: "Download PDF"
          },
          getWidgetDimension: {
            onclick: function (event: any) {
              getGraphWidgetDimension(jsonObject.chartId);
            },
            text: "Get Widget Dimension"
          },
          setGraphWidgetDimension : {
            onclick: function (event: any) {
              setGraphWidgetDimension(jsonObject.chartId);
            },
            text: "Set Widget Dimension"
          }
        },
        buttons: {
          contextButton: {
            menuItems: [//"printChart",
              "viewFullscreen",
              // "exitFullscreen",
              "downloadPNG",
              "downloadJPEG",
              "downloadCSV",
              "downloadXLS",
              "downloadPDFDocument",
              // "getWidgetDimension",
              // "setGraphWidgetDimension"
              // {
              //   textKey: 'downloadPDF',
              //   onclick: function () {
              //     this.exportChart({
              //       type: 'application/pdf'
              //     });
              //   }
              // }
              // "changeBackgroundColor"
            ]
          }
        }
      }

    }

  }

  createTopNGraphDataObject(response: any) {


  }

}
