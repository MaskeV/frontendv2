import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { analyzeAndValidateNgModules } from '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import moment from 'moment';

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';


import { FunnelChartService } from './funnel-chart-service';

describe('FunnelChartService', () => {
    let service: FunnelChartService;
    let httpTestController: HttpTestingController;


    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                HttpClientTestingModule
            ],
            providers: [FunnelChartService]
        });
        service = TestBed.inject(FunnelChartService);
        httpTestController = TestBed.inject(HttpTestingController);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('buildChartJSON() is working', () => {
        let jsonObject: any = { "chartTitle": "chartTitle" }
        let response: any = {
            chart: {
                type: 'funnel',
                backgroundColor: '#141619',
            },
            title: {
                text: jsonObject.chartTitle,
                style: {
                    color: '#c7d0d9',
                    font: '14px Roboto, Helvetica Neue,Arial sans-serif'
                }
            },
            plotOptions: {
                series: {
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b> ({point.y:,.0f})',
                        softConnector: true
                    },
                    center: ['40%', '50%'],
                    neckWidth: '30%',
                    neckHeight: '25%',
                    width: '80%'
                }
            },
            legend: {
                enabled: false
            },
            // series: [{
            //     name: jsonObject.chartTitle,
            //     data: [
            //         ['Website visits', 15654],
            //         ['Downloads', 4064],
            //         ['Requested price list', 1987],
            //         ['Invoice sent', 976],
            //         ['Finalized', 846]
            //     ]
            // }],
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
            series: [jsonObject.chartData],
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
                        plotOptions: {
                            series: {
                                dataLabels: {
                                    inside: true
                                },
                                center: ['50%', '50%'],
                                width: '100%'
                            }
                        }
                    }
                }]
            },
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
                                let data = element.data;

                                data.forEach(e => {
                                    let name = e.name
                                    let xData = e.x
                                    let yData = e.y

                                    let obj = { metric: name, [chartId]: yData };
                                    chartData.push(obj);
                                });
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
                            // "exitFullscreen",
                            "downloadPNG",
                            "downloadJPEG",
                            "downloadCSV",
                            "downloadXLS"
                        ]
                    }
                }
            }
            //     chart: {
            //         type: 'funnel',
            //         backgroundColor: '#141619',
            //         borderWidth: 0,
            //         borderRadius: 0,
            //         plotBackgroundColor: null,
            //         plotShadow: false,
            //         plotBorderWidth: 0,
            //         //height: 400
            //       }, 

            //       legend: {
            //         enabled: false,
            //         itemStyle: {
            //           color: '#CCC'
            //         },
            //         itemHoverStyle: {
            //           color: '#FFF'
            //         },
            //         itemHiddenStyle: {
            //           color: '#333'
            //         }
            //         ,navigation: {
            //           style: {
            //           color:'white'
            //           }
            //         }
            //       },

            //       title: {
            //         text: 'Sales funnel',
            //         style: {
            //           color: '#c7d0d9',
            //           font: '14px Roboto, Helvetica Neue,Arial sans-serif'
            //         }
            //       },

            //       plotOptions: {
            //         series: {
            //             dataLabels: {
            //                 enabled: true,
            //                 format: '<b>{point.name}</b> ({point.y:,.0f})',
            //                 softConnector: true
            //             },
            //             center: ['40%', '50%'],
            //             neckWidth: '30%',
            //             neckHeight: '25%',
            //             width: '80%'
            //         }
            //     },

            //     tooltip: {
            //         shared: true,
            //         crosshairs: true,
            //         backgroundColor: '#141619',
            //         positioner: function () {
            //             return { x: 80, y: 50 };
            //         },
            //         shadow: true,
            //         borderWidth: 0,

            //         style: {
            //             color: '#FFF',
            //         }
            //     },
            //       exporting: {
            //       enabled: true,
            //           buttons: {
            //           contextButton: {
            //               menuItems: ["printChart",
            //                       "viewFullscreen",
            //                           "downloadPNG",
            //                           "downloadJPEG",
            //                           "downloadCSV",
            //                           "downloadXLS"
            //                           ]
            //           }
            //           }
            //       },
            //       credits: {
            //           enabled: false
            //       },
            //       series: [{
            //             name: 'Unique users',
            //             data: [
            //                 ['Website visits', 15654],
            //                 ['Downloads', 4064],
            //                 ['Requested price list', 1987],
            //                 ['Invoice sent', 976],
            //                 ['Finalized', 846]
            //             ]
            //         }],

            //       lang: {
            //         noData: "No Data To Display"
            //       },
            //       noData: {
            //           style: {
            //               fontWeight: 'bold',
            //               fontSize: '15px',
            //               color: '#303030'
            //           }
            //       },

            //       responsive: {
            //           rules: [{
            //               condition: {
            //                   maxWidth: 500
            //               },
            //               chartOptions: {
            //                 series: {
            //                     dataLabels: {
            //                         inside: true
            //                     },
            //                     center: ['50%', '50%'],
            //                     width: '100%'
            //                 },

            //               }
            //           }]
            //       }    
            // }
        }
        spyOn(service, 'buildChartJSON').and.returnValue(response);
        let result = service.buildChartJSON(jsonObject)
        expect(result).toBe(response);
        console.log(result);

    })

    it('createGraphDataObject() is working', () => {
        let jsonObject: any = { "chartTitle": "chartTitle" }
        let response: any = {
            chart: {
                type: 'funnel',
                backgroundColor: '#141619',
            },
            title: {
                text: jsonObject.chartTitle,
                style: {
                    color: '#c7d0d9',
                    font: '14px Roboto, Helvetica Neue,Arial sans-serif'
                }
            },
            plotOptions: {
                series: {
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b> ({point.y:,.0f})',
                        softConnector: true
                    },
                    center: ['40%', '50%'],
                    neckWidth: '30%',
                    neckHeight: '25%',
                    width: '80%'
                }
            },
            legend: {
                enabled: false
            },
            // series: [{
            //     name: jsonObject.chartTitle,
            //     data: [
            //         ['Website visits', 15654],
            //         ['Downloads', 4064],
            //         ['Requested price list', 1987],
            //         ['Invoice sent', 976],
            //         ['Finalized', 846]
            //     ]
            // }],
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
            series: [jsonObject.chartData],
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
                        plotOptions: {
                            series: {
                                dataLabels: {
                                    inside: true
                                },
                                center: ['50%', '50%'],
                                width: '100%'
                            }
                        }
                    }
                }]
            },
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
                                let data = element.data;

                                data.forEach(e => {
                                    let name = e.name
                                    let xData = e.x
                                    let yData = e.y

                                    let obj = { metric: name, [chartId]: yData };
                                    chartData.push(obj);
                                });
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
                            // "exitFullscreen",
                            "downloadPNG",
                            "downloadJPEG",
                            "downloadCSV",
                            "downloadXLS"
                        ]
                    }
                }
            }
            //     chart: {
            //         type: 'funnel',
            //         backgroundColor: '#141619',
            //         borderWidth: 0,
            //         borderRadius: 0,
            //         plotBackgroundColor: null,
            //         plotShadow: false,
            //         plotBorderWidth: 0,
            //         //height: 400
            //       }, 

            //       legend: {
            //         enabled: false,
            //         itemStyle: {
            //           color: '#CCC'
            //         },
            //         itemHoverStyle: {
            //           color: '#FFF'
            //         },
            //         itemHiddenStyle: {
            //           color: '#333'
            //         }
            //         ,navigation: {
            //           style: {
            //           color:'white'
            //           }
            //         }
            //       },

            //       title: {
            //         text: 'Sales funnel',
            //         style: {
            //           color: '#c7d0d9',
            //           font: '14px Roboto, Helvetica Neue,Arial sans-serif'
            //         }
            //       },

            //       plotOptions: {
            //         series: {
            //             dataLabels: {
            //                 enabled: true,
            //                 format: '<b>{point.name}</b> ({point.y:,.0f})',
            //                 softConnector: true
            //             },
            //             center: ['40%', '50%'],
            //             neckWidth: '30%',
            //             neckHeight: '25%',
            //             width: '80%'
            //         }
            //     },

            //     tooltip: {
            //         shared: true,
            //         crosshairs: true,
            //         backgroundColor: '#141619',
            //         positioner: function () {
            //             return { x: 80, y: 50 };
            //         },
            //         shadow: true,
            //         borderWidth: 0,

            //         style: {
            //             color: '#FFF',
            //         }
            //     },
            //       exporting: {
            //       enabled: true,
            //           buttons: {
            //           contextButton: {
            //               menuItems: ["printChart",
            //                       "viewFullscreen",
            //                           "downloadPNG",
            //                           "downloadJPEG",
            //                           "downloadCSV",
            //                           "downloadXLS"
            //                           ]
            //           }
            //           }
            //       },
            //       credits: {
            //           enabled: false
            //       },
            //       series: [{
            //             name: 'Unique users',
            //             data: [
            //                 ['Website visits', 15654],
            //                 ['Downloads', 4064],
            //                 ['Requested price list', 1987],
            //                 ['Invoice sent', 976],
            //                 ['Finalized', 846]
            //             ]
            //         }],

            //       lang: {
            //         noData: "No Data To Display"
            //       },
            //       noData: {
            //           style: {
            //               fontWeight: 'bold',
            //               fontSize: '15px',
            //               color: '#303030'
            //           }
            //       },

            //       responsive: {
            //           rules: [{
            //               condition: {
            //                   maxWidth: 500
            //               },
            //               chartOptions: {
            //                 series: {
            //                     dataLabels: {
            //                         inside: true
            //                     },
            //                     center: ['50%', '50%'],
            //                     width: '100%'
            //                 },

            //               }
            //           }]
            //       }    
            // }
        }
        //let response: ["1", "2"];
        spyOn(service, 'createGraphDataObject').and.returnValue(response);
        let result = service.createGraphDataObject(jsonObject)
        expect(result).toBe(response);
        console.log(response);
        console.log(result);

    })

    it("removeFirst() is working", () => {
        service.charts = [1, 2, 3, 4,];
        service.removeFirst();
        expect(service.charts).toEqual([2, 3, 4]);
        console.log(service.charts);

    })



});