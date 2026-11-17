import { TestBed } from '@angular/core/testing';

import { TopNGraphService } from './top-n-graph.service';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import moment from 'moment';

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

describe('TopNGraphService', () => {
  let service: TopNGraphService;
  let jsonObject = {
    "chartTitle": "chart", "chartData": { "name": "chart_" }, "chartDateFormat": "YYYY MM dd",
    'chartCategory': ""
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TopNGraphService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('buildColumnChartJSON() is working', () => {
    let response = {
      chart: {
        type: 'bar',
        backgroundColor: '#141619',
        borderWidth: 0,
        borderRadius: 0,
        plotBackgroundColor: null,
        plotShadow: false,
        plotBorderWidth: 0,
      },

      title: {
        text: jsonObject.chartTitle,
        style: {
          color: '#c7d0d9',
          font: '14px Roboto, Helvetica Neue,Arial sans-serif'
        },
        useHTML: true
      },
      xAxis: {
        categories: jsonObject.chartData[0],
        title: {
          text: null,
          style: {
            color: 'white',
            fontWeight: 'bold'

          }
        }
      },
      yAxis: {
        visible: false,
        min: 0,
        title: {
          text: 'Population (millions)',
          align: 'high'
        },
        labels: {
          overflow: 'justify'
        }
      },
      tooltip: {
        valueSuffix: ' millions'
      },
      plotOptions: {
        bar: {
          dataLabels: {
            enabled: true
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
      colors:
        ['#00f400', '#e535fc', '#00d500', '#004fe5', '#c5eb00', '#0043c4', '#1eb700', '#e200ad', '#59be00', '#ff7dff', '#009500',
          '#ca86ff', '#97e142', '#003fa5', '#dafe7f', '#66006f', '#008c00', '#f556b0', '#00f4b7', '#e70024', '#00ffff', '#a60000',
          '#00f9ff', '#ff5244', '#00f8e4', '#900019', '#00cd83', '#0050b9', '#f7bf35', '#008eff', '#ffd04b', '#0055ad', '#d29600',
          '#0073ce', '#f556b0', '#003c85', '#ffc568', '#003772', '#00861f', '#bb94ff', '#005500', '#f1a0ff', '#0a4700', '#ffadff',
          '#003600', '#84a3ff', '#ac6500', '#00bfff', '#6b0000', '#0043c4', '#5b0000', '#3bd2ff', '#580000', '#e70024', '#551500',
          '#73d4ff', '#460000', '#d3f7ff', '#440000', '#00b9bc', '#6c1b38', '#b5e0d3', '#0a080b', '#ffe2f8', '#003403', '#b259ab',
          '#2b4a03', '#7d9ff7', '#744900', '#00a9e1', '#612b00', '#00a0da', '#532e00', '#afcfff', '#254100', '#ffa2bc', '#142200',
          '#c3daff', '#121909', '#ffc7d3', '#003320', '#ffb380', '#00346d', '#ffbca8', '#003770', '#9bcbb9', '#002535', '#e0cce0',
          '#292a00', '#009ed3', '#002c29', '#d5b2d3', '#004833', '#0086b3', '#002838', '#0099a5', '#ffd200', '#00696c', '#004364',],
      series: [{

        zoneAxis: 'x',
        dataSorting: {
          enabled: true,
          sortKey: 'y'
        },
        data: jsonObject.chartData[1]
      }],
      exporting: {
        enabled: true,
        menuItemDefinitions: {
          // Custom definition
          downloadXLS: {
            onclick: function (event: any) {
              let elementArr = event.path;
              let element = elementArr[5];
              console.log(element.id);
              let chartId = element.id;
              let series = this.series;
              let chartData = [];
              let dateFormat = 'yyyy-MM-DD HH:mm:ss';

              series.forEach(element => {
                let name = element.name
                let xData = element.xData
                let yData = element.yData

                for (let index = 0; index < xData.length; index++) {
                  console.log(xData[0]);
                  let myDate = new Date(xData[index]).toUTCString();
                  // let date = moment(myDate).format(dateFormat);

                  // let myDate = new Date(0).setUTCMilliseconds(xData[index]);
                  // let date = moment(myDate).format(dateFormat);

                  let obj = { metric: name, timestamp: myDate, [chartId]: yData[index] };
                  chartData.push(obj);
                }

                // xData.forEach(data => {
                //   console.log(xData[0])
                //   let epochDate = data;
                //   let myDate = new Date(epochDate);
                //   // myDate.toLocaleString();
                //   // myDate.toUTCString();

                //   let date = moment(myDate).format(dateFormat);
                //   console.log(date);
                // });
              });

              console.log(chartData)

              // let series = [{metric : '192.168.0.1', time : 'Wednesday, 19 May 2021 10:58:10', [chartId] : '0'},
              //               {metric : '192.168.0.1', time : 'Wednesday, 19 May 2021 11:58:10', [chartId] : '1'}, 
              //               {metric : '192.168.0.1', time : 'Wednesday, 19 May 2021 12:58:10', [chartId] : '2'}
              //             ];

              /*----------------------- Excel Service -----------------------*/

              function exportAsExcelFile(json: any[], excelFileName: string): void {

                const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(json);
                console.log('worksheet', worksheet);
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

              exportAsExcelFile(chartData, `${chartId}_data`);

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
                graph.requestFullscreen();
              }

            },
            text: 'viewFullscreen'
          }
        },
        buttons: {
          contextButton: {
            menuItems: ["printChart",
              "viewFullscreen",
              // "exitFullscreen",
              "downloadPNG",
              "downloadJPEG",
              "downloadCSV",
              "downloadXLS"
            ]
          }
        }
      }
    }
    spyOn(service, 'buildColumnChartJSON').and.returnValue(response);
    const result = service.buildColumnChartJSON(jsonObject);
    expect(result).toBe(response);
  });
});
