import { HttpClientModule } from "@angular/common/http";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { GuagechartService } from "./guage-chart-service";

import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import moment from 'moment';
import Highcharts from 'highcharts';

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

describe('GuagechartService', () => {
    let service: GuagechartService;
    let httpTestController: HttpTestingController;


    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                HttpClientTestingModule

            ],
            providers: [GuagechartService]
        });
        service = TestBed.inject(GuagechartService);
        httpTestController = TestBed.inject(HttpTestingController);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('buildChartJSON() is working', () => {
        let jsonObject: any = { "chartTitle": "chart", "chartData": { "name": "chart_" } };
        let response = {
            chart: {
                type: 'solidgauge',
                backgroundColor: '#141619',
                borderWidth: 0,
                borderRadius: 0,
                plotBackgroundColor: null,
                plotShadow: false,
                plotBorderWidth: 0,
                //height: 400
            },
            pane: {
                center: ['50%', '85%'],
                size: '140%',
                startAngle: -90,
                endAngle: 90,
                background: {
                    backgroundColor: Highcharts.defaultOptions.legend.backgroundColor || '#EEE',
                    innerRadius: '60%',
                    outerRadius: '100%',
                    shape: 'arc'
                }
            },
            legend: {
                enabled: true,
                itemStyle: {
                    color: '#CCC'
                },
                itemHoverStyle: {
                    color: '#FFF'
                },
                itemHiddenStyle: {
                    color: '#333'
                }
                , navigation: {
                    style: {
                        color: 'white'
                    }
                }
            },

            title: {
                text: jsonObject.chartTitle,
                style: {
                    color: '#c7d0d9',
                    font: '14px Roboto, Helvetica Neue,Arial sans-serif'
                },
                useHTML: true
            },

            yAxis: {

                stops: [
                    [0.1, '#55BF3B'], // green
                    [0.5, '#DDDF0D'], // yellow
                    [0.9, '#DF5353'] // red
                ],
                lineWidth: 0,
                tickWidth: 0,
                minorTickInterval: null,
                tickAmount: 2,
                title: {
                    y: -70
                },
                labels: {
                    y: 16,
                    style: {
                        color: 'white'
                    }
                },
                style: {
                    color: 'white',
                    font: '10px Roboto, Helvetica Neue,Arial sans-serif'
                },
                gridLineWidth: 0.3,

                // labels: {
                //   style: {
                //     color: 'white',
                //     fontWeight: 'bold'
                //   }
                // }	 
            },



            xAxis: {
                type: 'datetime',
                style: {
                    color: 'white',
                    font: '5px Roboto, Helvetica Neue,Arial sans-serif'
                },
                gridLineWidth: 0.3,
                lineColor: '#999',
                tickColor: '#999',
                // labels: {
                // format: '{value:'+jsonObject.chartDateFormat+'}',
                // //format: '{value:%m/%e %H:%M}',
                //   style: {
                //     color: 'white',
                //     fontWeight: 'bold'

                //   }
                // }	 
            },

            tooltip: {
                enabled: false
            },

            plotOptions: {
                solidgauge: {
                    dataLabels: {
                        y: 5,
                        borderWidth: 0,
                        useHTML: true
                    }
                },
                // series: {
                //     lineWidth: 0.9,
                //     fillOpacity: 0.3,
                //     marker: {
                //         enabled: false
                //     },
                // events: {
                //         legendItemClick: function() {
                //         return true;
                //         }
                //     }
                // }
            },

            // tooltip: {
            //     shared: true,
            //     crosshairs: true,
            //     backgroundColor: '#141619',
            //     positioner: function () {
            //         return { x: 80, y: 50 };
            //     },
            //     shadow: true,
            //     borderWidth: 0,

            //     style: {
            //         color: '#FFF',
            //     }
            // },

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
                                    let myDate = new Date(xData[index]).toUTCString();
                                    // let date = moment(myDate).format(dateFormat);

                                    let obj = { metric: name, timestamp: myDate, [chartId]: yData[index] };
                                    chartData.push(obj);
                                }

                            });

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
                            "downloadPNG",
                            "downloadJPEG",
                            "downloadCSV",
                            "downloadXLS"
                        ]
                    }
                }
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
                name: jsonObject.chartData.name,
                data: [jsonObject.chartData.data],
                dataLabels: {
                    format:
                        '<div style="text-align:center">' +
                        '<span style="font-size:15px;color:white">{y} %</span><br/>' +
                        '<span style="font-size:12px;opacity:0.4"></span>' +
                        '</div>'
                },
                tooltip: {
                    valueSuffix: ' %'
                }
            }],

            lang: {
                noData: "No Data To Display"
            },
            noData: {
                style: {
                    fontWeight: 'bold',
                    fontSize: '15px',
                    color: '#303030'
                }
            },

            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        legend: {
                            enabled: true,
                            floating: true,
                            verticalAlign: 'bottom',
                            align: 'left',
                            fontSize: '5px',
                            y: 40
                        },
                    }
                }]
            }
        }

        spyOn(service, 'buildChartJSON').and.returnValue(response);
        let result = service.buildChartJSON(jsonObject);
        expect(result).toBe(response);
    });



});