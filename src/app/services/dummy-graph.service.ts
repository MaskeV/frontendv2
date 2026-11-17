// @ts-nocheck
import { Injectable } from '@angular/core';
import Highcharts from 'highcharts';
import 'highcharts/modules/exporting';
import 'highcharts/modules/export-data';
import 'highcharts/modules/offline-exporting';
import 'highcharts/modules/no-data-to-display';
@Injectable()
export class DummyGraphService {

  charts: any = [];
  defaultOptions;
  counter = 1;

  constructor() {
  }

  getDummyLineGraph() {

    return this.defaultOptions = {
      chart: {
        type: 'area',
        backgroundColor: '#141619',
        borderWidth: 0,
        borderRadius: 0,
        plotBackgroundColor: null,
        plotShadow: false,
        plotBorderWidth: 0,
        //height: 400
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
        text: 'Line Graph',
        style: {
          color: '#c7d0d9',
          font: '14px Roboto, Helvetica Neue,Arial sans-serif'
        }
      },

      yAxis: {
        title: '',
        style: {
          color: 'white',
          font: '10px Roboto, Helvetica Neue,Arial sans-serif'
        },
        gridLineWidth: 0.3,
        labels: {
          style: {
            color: 'white'
          }
        }
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
        labels: {
          //format: '{value:'+jsonObject.chartDateFormat+'}',
          format: '{value:%m/%e %H:%M}',
          style: {
            color: 'white',
            fontWeight: 'bold'

          }
        }
      },
      plotOptions: {
        series: {
          lineWidth: 0.9,
          fillOpacity: 0.3,
          marker: {
            enabled: false
          },
          events: {
            legendItemClick: function () {
              return true;
            }
          }
        }
      },

      tooltip: {
        shared: true,
        crosshairs: true,
        backgroundColor: '#141619',
        positioner: function () {
          return { x: 80, y: 50 };
        },
        shadow: true,
        borderWidth: 0,

        style: {
          color: '#FFF',
        }
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: [//"printChart",
              "viewFullscreen",
              "downloadPNG",
              "downloadJPEG",
              "downloadCSV",
              "downloadXLS",
              {
                textKey: 'downloadPDF',
                onclick: function () {
                  this.exportChart({
                    type: 'application/pdf'
                  });
                }
              }
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

      //series: jsonObject.chartData,

      series: [{
        name: 'Installation',
        data: [43934, 52503, 57177, 69658, 97031, 119931, 137133, 154175]
      }, {
        name: 'Manufacturing',
        data: [24916, 24064, 29742, 29851, 32490, 30282, 38121, 40434]
      }, {
        name: 'Sales & Distribution',
        data: [11744, 17722, 16005, 19771, 20185, 24377, 32147, 39387]
      }],

      lang: {
        noData: "No Data"
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

  }


}
