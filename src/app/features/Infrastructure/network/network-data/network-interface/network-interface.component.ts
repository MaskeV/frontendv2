import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { NetworkService } from '../../../../../services/network.service';
import { AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { DateService } from '../../../../../services/date.service';
import { AuthenticationService } from '../../../../../services/authentication.service';
import * as Highcharts from 'highcharts';
import * as HighchartsMore from 'highcharts/highcharts-more';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HighchartsChartModule } from 'highcharts-angular';



@Component({
    selector: 'app-network-interface',
    imports: [CommonModule, FormsModule, HighchartsChartModule,
        RouterModule, MatButtonModule, MatTooltipModule],
    templateUrl: './network-interface.component.html',
    styleUrl: './network-interface.component.css'
})
export class NetworkInterfaceComponent {

 Highcharts: any = Highcharts;
  chartOptions: any[] = [];
  graphData: any[] = [];
  tagName: any = ""
  // executingPortChart: boolean = true;
  executingChartLoad: boolean = true;
  selectedPort: any = null;
  networkGraphItemsData: any;
  private destroy$ = new Subject<void>();
  selectedTagName: any;
  serviceId!: string;
  skeletonArray = Array(8);
  datemodel: any;
  startTime!: number;
  endTime!: number;
  portData: any[] = [];
  private datesubscription: Subscription = new Subscription();
  description!: string;
  groupedCharts: { [key: string]: any[] } = {};
  groupOrder: string[] = [];
  groupedInterfaceCharts: { [key: string]: any[] } = {};



  constructor(
    private router: Router,
    private dateService: DateService,
    private route: ActivatedRoute,
    private networkService: NetworkService,
    private authService: AuthenticationService,
  ) { }
  ngOnInit(): void {
     Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    const hostName = localStorage.getItem('HostName');
    this.serviceId = sessionStorage.getItem('HostName')!;
    this.route.queryParams.subscribe(params => {
      this.graphData = params['graphData'] ? JSON.parse(params['graphData']) : null;
      this.tagName = params['tagName'] ?? null;
    });

    this.dateService.setActiveComponent('NetworkPortGraphComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'NetworkPortGraphComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);

        if (this.graphData) {
          console.log("graphData");

          this.fetchGraphData(this.serviceId, this.graphData);
        }
      });
  }

 private chartTypeMapping: { [key: string]: string } = {
    // ⚙️ Interface state
    "Operational status": "column",
    "Interface type": "line",
    //  Blocked traffic
    "Inbound IPv4 traffic blocked": "column",
    "Inbound IPv4 packets blocked": "column",
    "Inbound IPv6 traffic blocked": "column",
    "Inbound IPv6 packets blocked": "column",
    "Outbound IPv4 traffic blocked": "column",
    "Outbound IPv4 packets blocked": "column",
    "Outbound IPv6 traffic blocked": "column",
    "Outbound IPv6 packets blocked": "column",

    // Errors & Discards
    "Inbound packets discarded": "column",
    "Inbound packets with errors": "column",
    "Outbound packets discarded": "line",
    "Outbound packets with errors": "line",

    //  Passed traffic
    "Inbound IPv4 traffic passed": "area",
    "Inbound IPv4 packets passed": "spline",
    "Inbound IPv6 traffic passed": "area",
    "Inbound IPv6 packets passed": "spline",
    "Outbound IPv4 traffic passed": "area",
    "Outbound IPv4 packets passed": "spline",
    "Outbound IPv6 traffic passed": "area",
    "Outbound IPv6 packets passed": "spline",

    //  Raw counters

    //  Rule metrics
    "Rules references count": "column",

    // 🚀 Speed gauge
    "Speed": "gauge",
        "Bits received": "gauge",
    "Bits sent": "gauge",
  };

  // Add after processGraphData()
  processAndGroupInterfaceCharts(serviceResponse: any[]) {
    const charts = this.chartOptions; // From processGraphData
    const groupedCharts: { [key: string]: any[] } = {};
    const groupOrder: string[] = [];

    // 🗂️ Refined grouping map based on your full chart list
    const chartGroupingMap: { [key: string]: string[] } = {
      "Interface Overview": ["Operational status", "Duplex status", "Speed","Bits sent","Bits received","Interface type"],

      "Inbound Blocked": [
        "Inbound IPv4 traffic blocked",
        "Inbound IPv4 packets blocked",
        "Inbound IPv6 traffic blocked",
        "Inbound IPv6 packets blocked"
      ],

      "Inbound Passed": [
        "Inbound IPv4 traffic passed",
        "Inbound IPv4 packets passed",
        "Inbound IPv6 traffic passed",
        "Inbound IPv6 packets passed"
      ],

      "Inbound Health": [
        "Inbound packets discarded",
        "Inbound packets with errors",
      ],

      "Outbound Blocked": [
        "Outbound IPv4 traffic blocked",
        "Outbound IPv4 packets blocked",
        "Outbound IPv6 traffic blocked",
        "Outbound IPv6 packets blocked"
      ],

      "Outbound Passed": [
        "Outbound IPv4 traffic passed",
        "Outbound IPv4 packets passed",
        "Outbound IPv6 traffic passed",
        "Outbound IPv6 packets passed"
      ],

      "Outbound Health": [
        "Outbound packets discarded",
        "Outbound packets with errors",
      ],

      "Counters & References": [
        "Rules references count"
      ]
    };

    // 🧩 Extract metric name (cleanly handle prefix)
    const extractMetricName = (fullName: string): string => {
      const parts = fullName.split(":");
      return parts.length > 1 ? parts[1].trim() : fullName.trim();
    };

    // 🏗️ Categorize charts dynamically
    charts.forEach(chart => {
      const metric = extractMetricName(chart.itemName);
      let assigned = false;

      for (const [groupName, keywords] of Object.entries(chartGroupingMap)) {
        if (keywords.some(k => metric.toLowerCase().includes(k.toLowerCase()))) {
          if (!groupedCharts[groupName]) groupedCharts[groupName] = [];
          groupedCharts[groupName].push(chart);
          assigned = true;
          break;
        }
      }

      // 🧱 Unknown charts → Additional Graphs
      if (!assigned) {
        if (!groupedCharts["Additional Graphs"]) groupedCharts["Additional Graphs"] = [];
        groupedCharts["Additional Graphs"].push(chart);
      }
    });

    // 🧹 Remove empty groups (don’t display in UI)
    for (const groupName of Object.keys(groupedCharts)) {
      if (groupedCharts[groupName].length === 0) {
        delete groupedCharts[groupName];
      }
    }

    const preferredOrder = [
      "Interface Overview",
      "Inbound Blocked",
      "Outbound Blocked",
      "Inbound Passed",
      "Outbound Passed",
      "Inbound Health",
      "Outbound Health",
      "Counters & References",
      "Additional Graphs"
    ];


    const existingGroups = preferredOrder.filter(g => groupedCharts[g]);

    // existingGroups.sort((a, b) => {
    //   const countA = groupedCharts[a].filter(c => !c.isPlaceholder).length;
    //   const countB = groupedCharts[b].filter(c => !c.isPlaceholder).length;

    //   const aHas3OrMore = countA >= 3 ? 1 : 0;
    //   const bHas3OrMore = countB >= 3 ? 1 : 0;

    //   if (aHas3OrMore !== bHas3OrMore) {
    //     return bHas3OrMore - aHas3OrMore; 
    //   }

    //   return preferredOrder.indexOf(a) - preferredOrder.indexOf(b);
    // });

    // ✅ Step 3: Push sorted order
    groupOrder.push(...existingGroups);


    // 🧱 Add placeholders (to keep 3-column layout clean)
    for (const groupName in groupedCharts) {
      const chartsInGroup = groupedCharts[groupName];
      const remainder = chartsInGroup.length % 3;
      if (remainder > 0) {
        for (let i = 0; i < 3 - remainder; i++) {
          chartsInGroup.push({ isPlaceholder: true });
        }
      }
    }

    // ✅ Assign to component
    this.groupedInterfaceCharts = groupedCharts;
    this.groupOrder = groupOrder;
  }


  chartRowHeight = 205;

  getRowsCount(groupName: string): number {
    return Math.ceil((this.groupedInterfaceCharts[groupName]?.length || 0) / 3);
  }

  getSectionHeaderHeight(charts: any[]): number {
    if (!charts?.length) return this.chartRowHeight;

    // Each row has 3 charts

    const numRows = Math.ceil(charts.length / 3);
    if (numRows > 1) {
      return numRows * this.chartRowHeight + (6 * numRows - 1);
    }
    else {
      return numRows * this.chartRowHeight
    }
  }



  fetchGraphData(hostName: string, graphData: string | any[]) {
    setTimeout(() => {
      let parsedGraphData: any[] = [];

      if (typeof graphData === 'string') {
        try {
          parsedGraphData = JSON.parse(graphData);
        } catch {
          console.warn('Invalid JSON string for graphData');
          return;
        }
      } else if (Array.isArray(graphData)) {
        parsedGraphData = graphData;
      }

      if (!parsedGraphData.length) {
        console.warn('== No graphData available, API not called');
        return;
      }

      const requestData = {
        host: this.serviceId,
        startTime: this.startTime,
        endTime: this.endTime,
        graphData: parsedGraphData
      };

      this.networkService.getGraphData(requestData).pipe(takeUntil(this.destroy$)).subscribe(
        (response) => {
          this.networkGraphItemsData = response.body.serviceResponse ? response.body.serviceResponse : [];
          this.processGraphData(response.body.serviceResponse);

        },
        (error) => {
          console.error('API Error:', error);
        }
      );
      this.executingChartLoad = false;
    }, 500);
  }


  // processGraphData(serviceResponse: any[]) {
  //   const styles = getComputedStyle(document.body);
  //   const labelColor = styles.getPropertyValue('--text-color').trim() || '#333';
  //   const gridColor = styles.getPropertyValue('--border-color').trim() || '#e6e6e6';
  //   const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#fff';
  //   const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#333';

  //   this.chartOptions = [];

  //   serviceResponse.forEach(item => {
  //     const { interfaceName, metricName } = this.getItemNameParts(item.itemName);
  //     const shortName = metricName;

  //     // ⚡ Units
  //     let unit = this.graphData.find(graphItem => graphItem.itemName === item.itemName)?.unit || '';

  //     if (unit === "bps") {
  //       item.timeSeriesData = item.timeSeriesData.map((point: any) => ({
  //         ...point,
  //         value: point.value ? parseFloat((point.value / 1000).toFixed(3)) : 0
  //       }));
  //       unit = "Kbps";
  //     }

  //     console.log("names", shortName)

  //     const isSpeedGauge = shortName.toLowerCase().includes("speed");
  //     let chartType = this.chartTypeMapping[shortName] || "line";
  //     let seriesData: any[];
  //     let yAxisConfig: any;

  //     if (isSpeedGauge) {
  //       chartType = "gauge";

  //       // pick first value as current; guard when array empty
  //       const speedBps = item.timeSeriesData?.[0]?.value || 0;
  //       const isSpeedPositive = true;// <-- set to false if higher speed is bad

  //       // Determine appropriate unit and convert value (use different var name to avoid shadowing)
  //       let speedValue: number;
  //       let speedUnit: string;

  //       if (speedBps >= 1e9) {
  //         speedValue = speedBps / 1e9;
  //         speedUnit = 'Gbps';
  //       } else if (speedBps >= 1e6) {
  //         speedValue = speedBps / 1e6;
  //         speedUnit = 'Mbps';
  //       } else if (speedBps >= 1e3) {
  //         speedValue = speedBps / 1e3;
  //         speedUnit = 'Kbps';
  //       } else {
  //         speedValue = speedBps;
  //         speedUnit = 'bps';
  //       }

  //       // Set maximum gauge value slightly higher than current speed for visualization
  //       const maxGauge = Math.max(speedValue * 1.2, 1); // ensure max >= 1
  //       const bandStep = maxGauge / 3;

  //       // Determine colors based on network speed criticality
  //       const colors = isSpeedPositive
  //         ? ['#DF5353', '#DDDF0D', '#55BF3B'] // low → red, mid → yellow, high → green
  //         : ['#55BF3B', '#DDDF0D', '#DF5353']; // low → green, mid → yellow, high → red

  //       seriesData = [{
  //         name: 'Speed',
  //         data: [speedValue],
  //         tooltip: { valueSuffix: ` ${speedUnit}` },
  //         dial: { radius: '80%', backgroundColor: 'gray', baseWidth: 12, baseLength: '0%', rearLength: '0%' },
  //         pivot: { backgroundColor: 'gray', radius: 6 },
  //         dataLabels: {
  //           format: `{y} ${speedUnit}`,
  //           borderWidth: 0,
  //           style: { fontSize: '16px', color: labelColor }
  //         }
  //       }];

  //       yAxisConfig = {
  //         min: 0,
  //         max: maxGauge,
  //         tickPixelInterval: 72,
  //         tickPosition: 'inside',
  //         tickColor: '#FFFFFF',
  //         tickLength: 20,
  //         tickWidth: 2,
  //         minorTickInterval: null,
  //         labels: { distance: 20, style: { fontSize: '14px', color: labelColor } },
  //         lineWidth: 0,
  //         plotBands: [
  //           { from: 0, to: bandStep, color: colors[0], thickness: 20, borderRadius: '50%' },
  //           { from: bandStep, to: 2 * bandStep, color: colors[1], thickness: 20, borderRadius: '50%' },
  //           { from: 2 * bandStep, to: maxGauge, color: colors[2], thickness: 20, borderRadius: '50%' }
  //         ]
  //       };
  //     } else {
  //       // Non-gauge series: Convert to object data so zeros are real points and hover works
  //       const points = (item.timeSeriesData || [])
  //         .filter((point: { value: any }) => point.value !== null)
  //         .map((point: { timeStamp: string, value: number }) => ({
  //           x: this.convertTimestamp(point.timeStamp),
  //           y: point.value !== undefined && point.value !== null ? point.value : 0
  //         }));

  //       // make sure there is at least one point so hasData logic is consistent
  //       seriesData = [{
  //         name: `${shortName} (${unit})`,
  //         data: points,
  //         // column-specific overrides (pointWidth + minPointLength) applied later in plotOptions/series
  //       }];

  //       yAxisConfig = {
  //         title: { text: unit },
  //         min: 0,
  //         tickAmount: 6,
  //         labels: { style: { color: labelColor, fontSize: '9px' } },
  //         gridLineColor: gridColor
  //       };
  //     }

  //     // Global per-chart plotOptions (per-type tweaks)
  //     const plotOptions: any = {
  //       column: {
  //         minPointLength: 3,
  //         borderWidth: 1,
  //         // groupPadding: 0.8,
  //         // pointPadding: 0.2
  //       },
  //       line: {
  //         marker: { enabled: true, radius: 3 }
  //       },
  //       spline: {
  //         marker: { enabled: true, radius: 3 }
  //       }
  //     };

  //     // ✅ Push normal chart
  //     this.chartOptions.push({
  //       chart: {
  //         type: chartType,
  //         backgroundColor: 'transparent',
  //         spacing: [5, 5, 5, 5],
  //         style: { fontSize: '10px' }
  //       },
  //       title: { text: null },
  //       credits: { enabled: false },
  //       exporting: { enabled: false },
  //       plotOptions,
  //       pane: isSpeedGauge ? {
  //         startAngle: -90,
  //         endAngle: 90,
  //         background: null,
  //         center: ['50%', '75%'],
  //         size: '110%'
  //       } : undefined,
  //       xAxis: !isSpeedGauge ? {
  //         type: 'datetime',
  //         title: { text: null },
  //         labels: { style: { color: labelColor, fontSize: '9px' } },
  //         gridLineColor: gridColor
  //       } : undefined,
  //       yAxis: yAxisConfig,
  //       legend: { enabled: false },
  //       tooltip: {
  //         shared: !isSpeedGauge,
  //         backgroundColor: tooltipBgColor,
  //         style: { color: tooltipTextColor, fontSize: '10px' },
  //         valueSuffix: isSpeedGauge ? '' : ' ' + unit,
  //         formatter: function(this: any) {
  //           // Use series metadata where possible
  //           const parts = this.series?.name?.split(':') || [];
  //           const label = parts.length > 1 ? parts[1] : this.series?.name;
  //           // show 'No data' for null/undefined points
  //           const yVal = (this.y === null || this.y === undefined) ? 'No data' : this.y;
  //           return `<b>${label}</b><br/>Value: ${yVal} ${isSpeedGauge ? '' : unit}`;
  //         }
  //       },
  //       series: seriesData.map(s => {
  //         // ensure series-level column tweaks if chart type column is chosen by mapping
  //         if (s && chartType === 'column') {
  //           return {
  //             ...s,
  //             pointWidth: 10,
  //             minPointLength: 3
  //           };
  //         }
  //         return s;
  //       }),
  //       min: item.min,
  //       max: item.max,
  //       avg: item.avg,
  //       last: item.last,
  //       itemName: item.itemName,
  //       hasData: (seriesData && seriesData[0] && (seriesData[0].data || []).length > 0),
  //       description : item.description
  //     });
  //   });

  //   // group charts (use the serviceResponse or chartOptions as needed)
  //   this.processAndGroupInterfaceCharts(serviceResponse);
  // }

  processGraphData(serviceResponse: any[]) {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim() || '#333';
    const gridColor = styles.getPropertyValue('--border-color').trim() || '#e6e6e6';
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#fff';
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#333';

    this.chartOptions = [];

    serviceResponse.forEach(item => {
      const { interfaceName, metricName } = this.getItemNameParts(item.itemName);
      const shortName = metricName;

      // ⚡ Units
      let unit = this.graphData.find(graphItem => graphItem.itemName === item.itemName)?.unit || '';

      // ✅ Fix: Only convert bps → Kbps for non-gauge charts
      const isGauge = shortName.toLowerCase().includes("speed") || shortName.toLowerCase().includes("bits received") || shortName.toLowerCase().includes("bits sent");
      if (unit === "bps" && !isGauge) {
        item.timeSeriesData = item.timeSeriesData.map((point: any) => ({
          ...point,
          value: point.value ? parseFloat((point.value / 1000).toFixed(3)) : 0
        }));
        unit = "Kbps";
      }

      let chartType = this.chartTypeMapping[shortName] || "line";
      let seriesData: any[];
      let yAxisConfig: any;

      if (isGauge) {
        chartType = "gauge";

        // pick last value as current; guard when array empty
        const bpsValue = item.timeSeriesData?.[item.timeSeriesData.length - 1]?.value || 0;
        const isPositive = true;

        // ⚡ Keep your conversion snippet intact
        let value: number;
        let displayUnit: string;

        if (bpsValue >= 1e9) {
          value = bpsValue / 1e9;
          displayUnit = 'Gbps';
        } else if (bpsValue >= 1e6) {
          value = bpsValue / 1e6;
          displayUnit = 'Mbps';
        } else if (bpsValue >= 1e3) {
          value = bpsValue / 1e3;
          displayUnit = 'Kbps';
        } else {
          value = bpsValue;
          displayUnit = 'bps';
        }

        // Set maximum gauge value slightly higher than current speed for visualization
        const maxGauge = Math.max(value * 1.2, 1);
        const bandStep = maxGauge / 3;

        const colors = isPositive
          ? ['#DF5353', '#DDDF0D', '#55BF3B']
          : ['#55BF3B', '#DDDF0D', '#DF5353'];

        seriesData = [{
          name: shortName,
          data: [value],
          tooltip: { valueSuffix: ` ${displayUnit}` },
          dial: { radius: '80%', backgroundColor: 'gray', baseWidth: 12, baseLength: '0%', rearLength: '0%' },
          pivot: { backgroundColor: 'gray', radius: 6 },
          dataLabels: {
            format: `{y} ${displayUnit}`,
            borderWidth: 0,
            style: { fontSize: '16px', color: labelColor }
          }
        }];

        yAxisConfig = {
          min: 0,
          max: maxGauge,
          tickPixelInterval: 72,
          tickPosition: 'inside',
          tickColor: '#FFFFFF',
          tickLength: 20,
          tickWidth: 2,
          minorTickInterval: null,
          labels: { distance: 20, style: { fontSize: '14px', color: labelColor } },
          lineWidth: 0,
          plotBands: [
            { from: 0, to: bandStep, color: colors[0], thickness: 20, borderRadius: '50%' },
            { from: bandStep, to: 2 * bandStep, color: colors[1], thickness: 20, borderRadius: '50%' },
            { from: 2 * bandStep, to: maxGauge, color: colors[2], thickness: 20, borderRadius: '50%' }
          ]
        };
      } else {
        const points = (item.timeSeriesData || [])
          .filter((point: { value: any }) => point.value !== null)
          .map((point: { timeStamp: string, value: number }) => ({
            x: this.convertTimestamp(point.timeStamp),
            y: point.value !== undefined && point.value !== null ? point.value : 0
          }));

        seriesData = [{
          name: `${shortName} (${unit})`,
          data: points,
        }];

        yAxisConfig = {
          title: { text: unit },
          min: 0,
          tickAmount: 6,
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        };
      }

      const plotOptions: any = {
        column: { minPointLength: 3, borderWidth: 1 },
        line: { marker: { enabled: true, radius: 3 } },
        spline: { marker: { enabled: true, radius: 3 } }
      };

      this.chartOptions.push({
        chart: { type: chartType, backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '10px' } },
        title: { text: null },
        credits: { enabled: false },
        exporting: { enabled: false },
        plotOptions,
        pane: isGauge ? { startAngle: -90, endAngle: 90, background: null, center: ['50%', '75%'], size: '110%' } : undefined,
        xAxis: !isGauge ? { type: 'datetime', title: { text: null }, labels: { style: { color: labelColor, fontSize: '9px' } }, gridLineColor: gridColor } : undefined,
        yAxis: yAxisConfig,
        legend: { enabled: false },
        tooltip: {
          shared: !isGauge,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          valueSuffix: isGauge ? '' : ' ' + unit,
          formatter: isGauge ? undefined : function (this: any) {
            const parts = this.series?.name?.split(':') || [];
            const label = parts.length > 1 ? parts[1] : this.series?.name;
            const yVal = (this.y === null || this.y === undefined) ? 'No data' : this.y;
            return `<b>${label}</b><br/>Value: ${yVal} ${unit}`;
          }
        },
        series: seriesData.map(s => chartType === 'column' ? { ...s, pointWidth: 10, minPointLength: 3 } : s),
        min: item.min,
        max: item.max,
        avg: item.avg,
        last: item.last,
        itemName: item.itemName,
        hasData: (seriesData && seriesData[0] && (seriesData[0].data || []).length > 0),
        description: item.description
      });
    });

    this.processAndGroupInterfaceCharts(serviceResponse);
  }


  getItemNameParts(itemName: string): { interfaceName: string, metricName: string } {
    if (!itemName) return { interfaceName: 'Unknown', metricName: '' };

    // Normalize string (remove "Interface" keyword and extra brackets)
    let cleaned = itemName.replace(/^Interface\s*/i, "").trim();

    // Split on the first colon
    const parts = cleaned.split(":");
    if (parts.length < 2) {
      return { interfaceName: 'Unknown', metricName: cleaned };
    }

    // Extract interfaceName and metricName separately
    let interfaceName = parts[0].trim()
      .replace(/^\[|\]$/g, "")   // remove [ ]
      .replace(/\(\)/g, "");     // remove ()

    let metricName = parts.slice(1).join(":").trim(); // in case there are extra colons

    return { interfaceName, metricName };
  }





  convertTimestamp(timebucket: string) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    return new Date(year, month, day, hour, minute).getTime();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  onPortChange() {
    if (this.selectedPort) {
      const selected = this.portData.find(p => p.tagName === this.selectedPort);
      if (selected) {
        this.selectedTagName = selected;
        this.fetchGraphData(selected.tagName, selected.graphData);
      }
    }
  }
  formatBpsValue(val: any): string {
  if (val === null || val === undefined || val === '') return 'N/A';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' Gbps';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' Mbps';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + ' Kbps';
  return num + ' bps';
}

}
