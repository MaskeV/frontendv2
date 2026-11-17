import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { BarGraphService } from "./bargraph.service";
import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from "@angular/common/http";
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import moment from 'moment';


describe('BarGraphService', () => {
    let service: BarGraphService;
    let httpTestController: HttpTestingController;
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    let object1: any = { "chartCategory": null, "chartData": "{ chart: Object({ type: 'column', backgroundColor: '#141619', borderWidth: 0, borderRadius: 0, plotBackgroundColor: null, plotShadow: false, plotBorderWidth: 0 }), legend: Object({ enabled: true, itemStyle: Object({ color: '#CCC' }), itemHoverStyle: Object({ color: '#FFF' }), itemHiddenStyle: Object({ color: '#333' }), navigation: Object({ style: Object({ color: 'white' }) }) }), title: Object({ text: undefined, style: Object({ color: '#c7d0d9', font: '14px Roboto, Helvetica Neue,Arial sans-serif' }) }), yAxis: Object({ title: '', style: Object({ color: 'white', font: '10px Roboto, Helvetica Neue,Arial sans-serif' }), gridLineWidth: 0.3, labels: Object({ style: Object({ color: 'white' }) }) }), xAxis: Object({ type: 'datetime', style: Object({ color: 'white', font: '5px Roboto, Helvetica Neue,Arial sans-serif' }), labels: Object({ format: '{value:undefined}', style: Object({ color: 'white', fontWeight: 'bold' }) }) }), plotOptions: Object({ series: Object({ pointWidth: 10 }) }" };
    let object2: any;
    let object: any = {
        "chart": { type: 'column', backgroundColor: '#141619', borderWidth: 0, borderRadius: 0, plotBackgroundColor: null, plotShadow: false, plotBorderWidth: 0 },
        "legend": { enabled: true, itemStyle: Object({ color: '#CCC' }), itemHoverStyle: Object({ color: '#FFF' }), itemHiddenStyle: Object({ color: '#333' }), navigation: Object({ style: Object({ color: 'white' }) }) },
        "title": { text: undefined, style: Object({ color: '#c7d0d9', font: '14px Roboto, Helvetica Neue,Arial sans-serif' }) },
        "yAxis": { title: '', style: Object({ color: 'white', font: '10px Roboto, Helvetica Neue,Arial sans-serif' }), gridLineWidth: 0.3, labels: Object({ style: Object({ color: 'white' }) }) },
        "xAxis": { type: 'datetime', style: Object({ color: 'white', font: '5px Roboto, Helvetica Neue,Arial sans-serif' }), labels: Object({ format: '{value:undefined}', style: Object({ color: 'white', fontWeight: 'bold' }) }) }, "plotOptions": { series: Object({ pointWidth: 10 }) },
        // "exporting": {
        //     enabled: true,
        //     menuItemDefinitions: {
        //         // Custom definition
        //         downloadXLS: {
        //             onclick: function (event: any) {
        //                 let elementArr = event.path;
        //                 let element = elementArr[5];
        //                 console.log(element.id);
        //                 let chartId = element.id;
        //                 let series = this.series;
        //                 let chartData = [];
        //                 let dateFormat = 'yyyy-MM-DD HH:mm:ss';

        //                 series.forEach(element => {
        //                     let name = element.name
        //                     let xData = element.xData
        //                     let yData = element.yData

        //                     for (let index = 0; index < xData.length; index++) {
        //                         let myDate = new Date(xData[index]).toUTCString();
        //                         // let date = moment(myDate).format(dateFormat);

        //                         let obj = { metric: name, timestamp: myDate, [chartId]: yData[index] };
        //                         chartData.push(obj);
        //                     }

        //                 });

        //                 /*----------------------- Excel Service -----------------------*/

        //                 function exportAsExcelFile(json: any[], excelFileName: string): void {

        //                     const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(json);
        //                     console.log('worksheet', worksheet);
        //                     const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
        //                     const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        //                     //const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        //                     saveAsExcelFile(excelBuffer, excelFileName);
        //                 }

        //                 function saveAsExcelFile(buffer: any, fileName: string): void {
        //                     const data: Blob = new Blob([buffer], {
        //                         type: EXCEL_TYPE
        //                     });
        //                     FileSaver.saveAs(data, fileName + '_' + moment(new Date()).format(dateFormat) + EXCEL_EXTENSION);
        //                 }

        //                 /*----------------------- Excel Service -----------------------*/

        //                 exportAsExcelFile(chartData, `${chartId}_data`);

        //             },
        //             text: 'downloadXLS'
        //         },
        //         viewFullscreen: {
        //             onclick: function (event: any) {
        //                 let elementArr = event.path;
        //                 let element = elementArr[5];
        //                 console.log(element.id);

        //                 let chart = this;
        //                 console.log(chart);
        //                 this.oldChartWidth = this.chartWidth;
        //                 this.oldChartHeight = this.chartHeight;
        //                 console.log(this.oldChartWidth);
        //                 console.log(this.oldChartHeight);

        //                 let graph = document.getElementById(element.id);
        //                 if (graph.requestFullscreen) {
        //                     let screenWidth = screen.width;
        //                     let screenHeight = screen.height;
        //                     // console.log(chart)
        //                     chart.setSize(screenWidth, screenHeight, false);
        //                     graph.requestFullscreen();
        //                 }

        //             },
        //             text: 'viewFullscreen'
        //         }
        //     },
        //     buttons: {
        //         contextButton: {
        //             menuItems: ["printChart",
        //                 "viewFullscreen",
        //                 "downloadPNG",
        //                 "downloadJPEG",
        //                 "downloadCSV",
        //                 "downloadXLS"
        //             ]
        //         }
        //     },
        //     csv: {
        //         dateFormat: '' + + ''
        //     }
        // },
        "credits": { enabled: false },
        "colors": ['#00f400', '#e535fc', '#00d500', '#004fe5', '#c5eb00', '#0043c4', '#1eb700', '#e200ad', '#59be00', '#ff7dff', '#009500',
            '#ca86ff', '#97e142', '#003fa5', '#dafe7f', '#66006f', '#008c00', '#f556b0', '#00f4b7', '#e70024', '#00ffff', '#a60000',
            '#00f9ff', '#ff5244', '#00f8e4', '#900019', '#00cd83', '#0050b9', '#f7bf35', '#008eff', '#ffd04b', '#0055ad', '#d29600',
            '#0073ce', '#f556b0', '#003c85', '#ffc568', '#003772', '#00861f', '#bb94ff', '#005500', '#f1a0ff', '#0a4700', '#ffadff',
            '#003600', '#84a3ff', '#ac6500', '#00bfff', '#6b0000', '#0043c4', '#5b0000', '#3bd2ff', '#580000', '#e70024', '#551500',
            '#73d4ff', '#460000', '#d3f7ff', '#440000', '#00b9bc', '#6c1b38', '#b5e0d3', '#0a080b', '#ffe2f8', '#003403', '#b259ab',
            '#2b4a03', '#7d9ff7', '#744900', '#00a9e1', '#612b00', '#00a0da', '#532e00', '#afcfff', '#254100', '#ffa2bc', '#142200',
            '#c3daff', '#121909', '#ffc7d3', '#003320', '#ffb380', '#00346d', '#ffbca8', '#003770', '#9bcbb9', '#002535', '#e0cce0',
            '#292a00', '#009ed3', '#002c29', '#d5b2d3', '#004833', '#0086b3', '#002838', '#0099a5', '#ffd200', '#00696c', '#004364'],
        "series": undefined, "responsive": { rules: [Object({ condition: Object({ maxWidth: 500 }), chartOptions: Object({ legend: Object({ enabled: true, floating: true, verticalAlign: 'bottom', align: 'left', fontSize: '5px', y: 40 }) }) })] }
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                HttpClientTestingModule
            ],
            providers: [BarGraphService]
        });
        service = TestBed.inject(BarGraphService);

    });

    beforeEach(() => {
        httpTestController = TestBed.inject(HttpTestingController);
    });

    // it('should be created', () => {
    //     expect(service).toBeTruthy();
    // });

    it('buildBarChartJSON is working', () => {
        let page: any = {};
        // const result = service.buildBarChartJSON(object, page);
        // expect(result).toEqual(object);
    });
    it('buildColumnChartJSON is working', () => {
        let page: any = {};
        // const result = service.buildColumnChartJSON(object, page);
        // expect(result).toEqual(object);
    });
    it('createBarGraphDataObject is working', () => {
        // const result = service.createBarGraphDataObject(object1);
        // expect(result).toEqual(object);
    });



    //it()

})