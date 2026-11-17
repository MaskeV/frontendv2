// @ts-nocheck
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { first, switchMap } from 'rxjs/operators';
import { BarGraphService } from '../../../../../services/bargraph.service';
import { DashboardService } from '../../../../../services/dashboard.service';
import { HaedwareTrendServiceService } from '../../../../../services/haedware-trend-service.service';
import { HighchartsService } from '../../../../../services/highchart.service';
import { PiechartService } from '../../../../../services/piechart.service';
import { GraphInputJSON } from '../../../../../models/graphInputJSON';
import moment from 'moment';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { from, interval } from 'rxjs';
import { Subscription, timer } from 'rxjs';
import { User } from '../../../../../models/user';
import { Feature } from '../../../../../models/feature';
import { ActivatedRoute, Router } from '@angular/router';
import { SubFeatureMaster } from '../../../../../models/subFeatureMaster';
import { FeatureMaster } from '../../../../../models/feature-master';
import { ResizedEvent } from 'angular-resize-event';
import { AuthenticationService } from '../../../../../services/authentication.service';
import { ThemeService } from '../../../../../services/theme.service';
import { AppComponent } from '../../../../../app.component';
import * as Highcharts from 'highcharts';
import 'highcharts/modules/export-data';
import { AlertService } from '../../../../../services/alert.service';
import { ApplicationMaster } from '../../../../../models/application-master';
import { UserService } from '../../../../../services/user.service';
import { ApplicationService } from '../../../../../services/application.service';
import { GuagechartService } from '../../../../../services/guage-chart-service';
import { DashboardLayout } from '../../../../../models/dashboardLayout';
import { FunnelChartService } from '../../../../../services/funnel-chart-service';
import { SingleValueService } from '../../../../../services/single-value.service';
import { TableChartService } from '../../../../../services/table-chart.service';
import { TopNGraphService } from '../../../../../services/top-n-graph.service'
import { StackedBarGraphService } from '../../../../../services/stacked-bar-graph.service';
import { CapacityPlannerService } from '../../../../../services/capacity-planner.service';
import {
  CompactType,
  DisplayGrid,
  GridsterComponentInterface,
  GridsterConfig,
  GridsterItem,
  GridsterItemComponentInterface,
  GridType
} from 'angular-gridster2';
import { EventEmitter } from 'events';
import { DecoderService } from '../../../../../services/decoder.service';
import { FeatureGraphMappingService } from '../../../../../services/feature-graph-mapping.service';
import { Graph } from '../../../../../models/feature-graph-mapping';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridsterModule } from 'angular-gridster2';

@Component({
  selector: 'app-apmosys-srg',
  templateUrl: './apmosys-srg.component.html',
  styleUrls: ['./apmosys-srg.component.css'],
  imports: [CommonModule, FormsModule, GridsterModule, RouterModule],
  providers: [
    HighchartsService,
    BarGraphService,
    PiechartService,
    GuagechartService,
    FunnelChartService,
    SingleValueService,
    TableChartService,
    TopNGraphService,
    StackedBarGraphService
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApmosysSrgComponent implements OnInit {

  currentUser: User;
  //dashboardLayout: DashboardLayout = new DashboardLayout();
  private subscription: Subscription = new Subscription();
  //@ViewChild('graph') public graph: ElementRef;
  graphInputObj = new GraphInputJSON();
  charts: any = [];
  defaultOptions;
  counter = 0;
  dateFilter: any;
  subFeatureName: any;
  dateFormat = 'YYYY-MM-DD HH:mm:ss';
  fromDate: any;
  toDate: any;
  param: any;
  modalRef: any;
  refreshTime: any;
  //interval:any;
  user: User = new User();
  featureList: Feature[];
  subFeatureList: any;
  applicationList: any;
  fullScreenMode: any;
  applicationID: any;
  AllGraphList: any[];
  ipAddressList: any[];
  ipAddress: any;

  /* Gridster - Main */
  options: GridsterConfig = {};
  dashboard: Array<GridsterItem>= [];
  remove: boolean;
  graphs:any[];
  userType:any;
  featureName:any;

  /* Child / Drilldown Dashboard */
  childOptions: GridsterConfig = {};
  childDashboard: Array<GridsterItem> = [];
  nodeGraphList: any;
  nodeGraphModalTittle: any;
  chartId: any;
  isPointGraph: boolean = false;
  pointName: any;
  isSubChildGraph: boolean = false;
  subChildBackButton: boolean = false;
  firstClickCounter: number = 0;
  subChildGraphCounter: number = 0;
  graphChartIdCounter: number = 100;
  hostGraphChartId: any;
  tempChartId: any;
  tempChartId2: any;
  tempChartTitle: any;
  tempChartTitle2: any;
  tempChildGraphName: string = '';
  sessionStorageKey: string = '';
  graphChartIdKey: string = '';
  childModalRef: any;

  /* Trend Dashboard */
  isTrendDashBoard: boolean = false;
  magicKey: boolean = false;
  lastOneDay: boolean = false;
  lastOneweek: boolean = false;
  lastOneMonth: boolean = false;
  lastThreeMonth: boolean = false;
  LastSixMonth: boolean = false;
  lastOneYear: boolean = false;
  trendgraphInObj = new GraphInputJSON();
  trendFromDate: any;
  trendToDate: any;

  /* Per-item Refresh (Table/RAG Table) */
  tableheader: any[] = [];
  isRefreshSuccess: boolean = false;
  isRefreshLoading: boolean = false;
  isRefreshError: boolean = false;
  refreshErrorMessage: string = '';
  refreshItem: any = null;
  refreshTableData: any[] = [];
  refreshTableHeaders: any[] = [];
  refreshModalRef: any;

  constructor(private authService: AuthenticationService,
    private hcs: HighchartsService, private modalService: NgbModal,
    private barGraphService: BarGraphService, private piechartService: PiechartService,
    private changeDetectionRef: ChangeDetectorRef, private dashboardService: DashboardService,
    private themeService: ThemeService, private alertService: AlertService,
    public appComponenet: AppComponent, private userService: UserService,
    private applicationService: ApplicationService, private guagechartService: GuagechartService,
    private funnelChartService: FunnelChartService, private singleValueService: SingleValueService,
    private tablechartService: TableChartService, private topNGraphService: TopNGraphService, private stackedBarGraphService: StackedBarGraphService,
    private capacityPlannerService: CapacityPlannerService, private decoderService: DecoderService,
    private featureGraphMappingService: FeatureGraphMappingService,
    private route: ActivatedRoute, private router: Router) {

    }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.currentUser = user;
        console.log(this.currentUser);
        this.userType = this.currentUser.userType;
        this.dateFilter = '5 MINUTE';
        this.fullScreenMode = false;
        this.refreshTime = "0_off";
        this.subFeatureList = [];
        this.applicationID = 'Select';
        this.subFeatureName = 'Select';
        this.ipAddress = 'Select';

        this.currentUser.subFeatures?.forEach(element => {
          if(element.name == 'Dashboard'){
            this.featureName = element.name;
          }
        });

        this.route.queryParams.subscribe(params => {
          if (params['appID']) {
            console.log("Got appID from route: ", params['appID']); this.applicationID = Number(params['appID']);
            this.getSubFeaturesByApplication();
          }
        });

    this.options = {
      gridType: GridType.ScrollVertical,
      itemInitCallback:  (item: GridsterItem, itemComponent: GridsterItemComponentInterface) => {
        console.info('itemInitialized', item, itemComponent);
        this.loadGraph(item);
      },
      itemChangeCallback: (item: GridsterItem, itemComponent: GridsterItemComponentInterface) => {
        this.updateGraphData(item);
      },
      itemResizeCallback:(item: GridsterItem, itemComponent: GridsterItemComponentInterface) => {
        this.updateGraphData(item);
      },
      compactType: CompactType.None,
      margin: 10,
      outerMargin: true,
      outerMarginTop: null,
      outerMarginRight: null,
      outerMarginBottom: null,
      outerMarginLeft: null,
      mobileBreakpoint: 640,
      minCols: 100,
      minRows: 1,
      maxRows: 1000,
      maxCols: 100,
      defaultItemCols: 1,
      defaultItemRows: 1,
      fixedColWidth: 49,
      fixedRowHeight: 15,
      enableEmptyCellClick: false,
      enableEmptyCellContextMenu: false,
      enableEmptyCellDrop: false,
      enableEmptyCellDrag: false,
      emptyCellDragMaxCols: 12,
      emptyCellDragMaxRows: 12,
      ignoreMarginInRow: false,
      draggable: {
        delayStart: 0,
        enabled: true,
        ignoreContentClass: 'gridster-item-content',
        ignoreContent: false,
        dragHandleClass: 'drag-handler',
      },
      resizable: {
        delayStart: 0,
        enabled: true,
        handles: {
          s: true, e: true, n: true, w: true,
          se: true, ne: true, sw: true, nw: true
        }
      },
      swap: false,
      pushItems: true,
      disablePushOnDrag: false,
      disablePushOnResize: false,
      pushDirections: {north: true, east: true, south: true, west: true},
      pushResizeItems: false,
      displayGrid: DisplayGrid.OnDragAndResize,
      disableWindowResize: false,
      disableWarnings: false,
      scrollToNewItems: false
    };

    // this.dashboard = [
    //   {cols: 2, rows: 1, y: 0, x: 0},
    //   {cols: 2, rows: 2, y: 0, x: 2},
    //   {cols: 1, rows: 1, y: 0, x: 4},
    //   {cols: 1, rows: 1, y: 2, x: 5},
    //   {cols: 2, rows: 2, y: 3, x: 5},
    //   {cols: 2, rows: 2, y: 2, x: 0},
    //   {cols: 2, rows: 1, y: 2, x: 2},
    //   {cols: 1, rows: 1, y: 2, x: 4},
    // ];
      }
    });
  }

  



  getSubFeaturesByApplication() {
    console.log("Calling API with applicationID: ", this.applicationID); this.subFeatureList = null;
    this.getDates(this.dateFilter);
    let payload = {
      "userId": this.currentUser.userId,
      "featureType": "SRG",
      "applicationIds": [Number(this.applicationID)],
      "st": this.fromDate,
      "et": this.toDate,
      "sessionDTO": this.currentUser.sessionDTO
    };

    this.applicationService.getFullApplicationDataByAppIds(payload).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.subFeatureList = response.serviceResponse?.subFeatures || [];
        this.ipAddressList = response.serviceResponse?.ipList || [];
        
        if (this.subFeatureList && this.subFeatureList.length > 0) {
          this.subFeatureName = this.subFeatureList[0].subFeatureName;
          this.getHardwareIp();
        }
        
        this.changeDetectionRef.detectChanges();
      }
    });
  }

  getHardwareIp() {
    if (this.subFeatureName == 'Hardware') {
      const appObj = new ApplicationMaster;
      appObj.applicationID = this.applicationID;
      this.capacityPlannerService.getIPAddressByApplicationID(appObj).pipe(first()).subscribe((response: any) => {
        this.ipAddressList = response.serviceResponse;
        this.ipAddressList.push({ ipAddress: 'All' });
        this.ipAddress = 'All';
      });    
    }else{
      this.getData();
    }
    
  }


  getData() {


    this.param = [];
    this.getDates(this.dateFilter);

    //this.fromDate = "2020-08-09 00:00:01";
    this.param.push(this.fromDate);

    //this.toDate = "2020-08-09 21:59:59";
    this.param.push(this.toDate);



    this.graphInputObj.applicationId = this.applicationID;
    this.graphInputObj.ipAddress = this.ipAddress;
    this.graphInputObj.subFeatureName = this.subFeatureName;
    //this.graphInputObj.params = this.param;
    this.graphInputObj.fromDate = this.fromDate;
    this.graphInputObj.toDate = this.toDate;
    this.graphInputObj.sessionDTO = this.currentUser.sessionDTO;
    this.graphInputObj.featureName = 'Dashboard';
    this.graphInputObj.savedBy = this.currentUser.id;
    this.graphInputObj.preferenceType = 'Preference';

    this.removeAllCharts();
    this.removeAllFromGrid();
    this.getAllGraphList(this.graphInputObj);



    //this.getAllGraphData(this.graphInputObj);
  }


  getDataByTimeRange() {
    if (this.modalRef) {
      this.modalRef.hide();
    }
    //let fromDateNew = moment(this.fromDate).format(this.dateFormat);
    //let toDateNew = moment(this.toDate).format(this.dateFormat);

    //this.param=[];
    //this.param.push(fromDateNew);
    //this.param.push(toDateNew);

    this.graphInputObj.applicationId = this.applicationID;
    this.graphInputObj.subFeatureName = this.subFeatureName;
    this.graphInputObj.fromDate = moment(this.fromDate).format(this.dateFormat);
    this.graphInputObj.toDate = moment(this.toDate).format(this.dateFormat);
    this.graphInputObj.sessionDTO = this.currentUser.sessionDTO;
    this.graphInputObj.featureName = 'Dashboard';
    this.graphInputObj.savedBy = this.currentUser.id;
    this.graphInputObj.preferenceType = 'Preference';

    this.removeAllCharts();
    this.removeAllFromGrid();
    this.getAllGraphData(this.graphInputObj);
  }

  public ngAfterViewInit() {

  }

  public ngOnDestroy() {

  }

   getAllGraphList(graphInputObj: any) {
    this.AllGraphList = [];
    this.charts = [];
    this.dashboard = [];
    // getAllGraphList response is NOT encrypted — subscribe directly
    this.dashboardService.getAllGraphs(graphInputObj).subscribe((response: any) => {
      if (response && response.serviceStatus === 'Success' && response.serviceResponse) {
        this.AllGraphList = response.serviceResponse;
        console.log(this.AllGraphList);

        this.AllGraphList.forEach((data, index) => {
         /* for gridster — include chart metadata needed by per-item controls */
         let graph = {
           x: data.graphXPos !== null && data.graphXPos !== undefined ? Number(data.graphXPos) : undefined, 
           y: data.graphYPos !== null && data.graphYPos !== undefined ? Number(data.graphYPos) : undefined, 
           rows: (data.graphRows === 0 || !data.graphRows) ? 15 : Number(data.graphRows), 
           cols: (data.graphCols === 0 || !data.graphCols) ? 10 : Number(data.graphCols),
           chartId: data.chartId, index: index,
           chartTitle: data.chartTitle, chartType: data.chartType,
           pointChildGraphs: data.pointChildGraphs,
           warningColor: data.warningColor, criticalColor: data.criticalColor, normalColor: data.normalColor,
           sourceDBEnable: data.isSourceDBEnabled
         };
         this.dashboard.push(graph);
        });

        this.changedOptions();
        // OnPush: manually trigger change detection so *ngFor re-renders
        this.changeDetectionRef.detectChanges();
      } else {
        console.warn('getAllGraphList: no graphs returned or error', response);
      }
    }, (err) => {
      console.error('getAllGraphList error', err);
    });
  }

  // plotGraphDivs(graphs: any[]) {
  //   graphs.forEach((data, index) => {

  //     let chartId = data.chartId;

  //     this.graphInputObj.chartId = chartId;
  //     this.getAllGraphData(this.graphInputObj);
  //   });
  //   console.log(this.dashboard);
    
  // }

  loadGraph(item: any) {
    let graph = this.AllGraphList[item.index];
    console.log(graph);

    // Clone graphInputObj so concurrent itemInitCallbacks don't overwrite each other's chartId
    const requestObj = Object.assign({}, this.graphInputObj);
    requestObj.chartId = item.chartId;
    this.getAllGraphData(requestObj);
    console.log(this.dashboard);
  }

  getAllGraphData(graphInputObj) {
    this.counter = 0;
    this.dashboardService.getGraph(graphInputObj).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {

      if (response.serviceStatus == "Success") {

        let element = response.serviceResponse;
        console.log(element);
        try {
          if (element.chartType == 'Line') {
            let graphData = this.hcs.createGraphDataObject(element);
            element = graphData;
            let graphOption = this.hcs.buildChartJSON(element);
            this.createChart(graphOption, element);

          } else if (element.chartType == 'Column') {
            let graphData = this.barGraphService.createBarGraphDataObject(element,"Series");
            element = graphData;
            let graphOption = this.barGraphService.buildColumnChartJSON(element);
            this.createChart(graphOption, element);

          } else if (element.chartType == 'Bar') {
            let graphData = this.barGraphService.createBarGraphDataObject(element,"Series");
            element = graphData;
            let graphOption = this.barGraphService.buildBarChartJSON(element);
            this.createChart(graphOption, element);

          } else if (element.chartType == 'Stacked Column') {
            let graphData = this.stackedBarGraphService.createStackedBarGraphDataObject(element);
            element = graphData;
            let graphOption = this.stackedBarGraphService.buildStackedColumnChartJSON(element);
            this.createChart(graphOption, element);

          } else if (element.chartType == 'Stacked Bar') {
            let graphData = this.stackedBarGraphService.createStackedBarGraphDataObject(element);
            element = graphData;
            let graphOption = this.stackedBarGraphService.buildStackedBarChartJSON(element);
            this.createChart(graphOption, element);
          } else if (element.chartType == 'Pie') {
            let graphData = this.piechartService.createPieGraphDataObject(element);
            element = graphData;
            let graphOption = this.piechartService.buildPieChartJSON(element, "dashboard", this.getChildData.bind(this));
            this.createChart(graphOption, element);

          } else if (element.chartType == 'DoughtNut' || element.chartType == 'DoughNut' || element.chartType == 'Doughnut') {
            let graphData = this.piechartService.createPieGraphDataObject(element);
            element = graphData;
            let graphOption = this.piechartService.buildDoughtNutChartJSON(element, "dashboard", this.getChildData.bind(this));
            this.createChart(graphOption, element);

          } else if (element.chartType == 'TopN') {
            let graphOption = this.topNGraphService.buildColumnChartJSON(element);
            this.createChart(graphOption, element);

          } else if (element.chartType == 'Gauge') {
            // let graphData = this.guagechartService.createPieGraphDataObject(element.chartData);
            // console.log(graphData);
            // element.chartData = graphData;
            let graphOption = this.guagechartService.buildChartJSON(element);
            this.createChart(graphOption, element);

          } else if (element.chartType == 'Funnel') {
            // let graphData = this.guagechartService.createPieGraphDataObject(element.chartData);
            // console.log(graphData);
            // element.chartData = graphData;
            let graphOption = this.funnelChartService.buildChartJSON(element);
            this.createChart(graphOption, element);


          } else if (element.chartType == 'Single Value' || element.chartType == 'Text Value' || element.chartType == 'Text Value - Circle' || element.chartType == 'Text') {

            let graphOption = this.singleValueService.buildChartObject(element);
            this.createDivAsGraph(graphOption, element);

          } else if (element.chartType == 'Table') {
            let graphOption = this.tablechartService.buildChartObject(element, element);
            this.createDivAsGraph(graphOption, element);
          }

        }
        catch (error) {
          console.error("Error in getAllGraphData:", error);

        }

      }
    });
  }


  createChart(graphOption: any, data: any, options?: Object) {

    let opts = !!options ? options : graphOption;

    let chartId = data.chartId;
    let chartWidth = document.getElementById(chartId).clientWidth - 42;
    let chartHeight = document.getElementById(chartId).clientHeight - 66;
    
    let parent = document.getElementById(chartId);
    let spinner = document.getElementById(chartId + '-spinner');
    parent.removeChild(spinner);
    // console.log("---------->" + parent);
    // console.log("'" + chartId + "'" + "------------------->" + chartId);
    let element = document.createElement("div");
    parent.appendChild(element);
    this.counter++;

    if (!!opts.chart) {
      opts.chart['renderTo'] = element;

    } else {
      opts.chart = {
        'renderTo': element
      }
    }

    let myChart = new Highcharts.Chart(opts);
    console.log(myChart);
    myChart.setSize(chartWidth, chartHeight, false);
    let chart = { chart: myChart, id: chartId };
    this.charts.push(chart);

  }

  createDivAsGraph(graphOption: any, data: any, options?: Object) {

    let opts = !!options ? options : graphOption;

    let chartId = data.chartId;
    let cardWidth = document.getElementById(chartId).clientWidth;
    let cardHeight = document.getElementById(chartId).clientHeight;
    let chartWidth = cardWidth-42;
    let chartHeight = cardHeight-66;
    

    let parent = document.getElementById(chartId);
    let spinner = document.getElementById(chartId + '-spinner');
    parent.removeChild(spinner);
    console.log("---------->" + parent);
    console.log("'" + chartId + "'" + "------------------->" + chartId);
    let element = document.createElement("div");
    element.innerHTML = opts;
    parent.appendChild(element);


    if (data.chartType == "Single Value" || data.chartType == "Text Value" || data.chartType == "Text Value - Circle" || data.chartType == "Text") {
      // for single valued graph
      let fontSizeTitle = 0.05 * (cardWidth + cardHeight);
      let fontSizeContent = 0.15 * (cardWidth + cardHeight);

      let titleEl = document.getElementById(chartId + "-graph-title");
      if (titleEl) titleEl.style.fontSize = "" + fontSizeTitle + "px";
      let contentEl = document.getElementById(chartId + "-graph-content");
      if (contentEl) contentEl.style.fontSize = "" + fontSizeContent + "px";
    }
    else if (data.chartType == "Table") {
      // for table graph
      let fontSizeContent = 0.05 * (cardWidth + cardHeight);
      let divHeight = chartHeight;
      let divWidth = chartWidth;

      document.getElementById("chartId-table-div").style.height = "" + divHeight + "px";
      document.getElementById("chartId-table-div").style.width = "" + divWidth + "px";
      $(".chartId-table-content").css('font-size', "" + fontSizeContent + "px")
    }
    this.counter++;
    let chart = { chart: opts, id: chartId };
    this.charts.push(chart);

  }
  // onResized(): void {
  //   console.log(ApmosysSrgComponent.updatedItem);
    
  //   let item = ApmosysSrgComponent.updatedItem
  //   setTimeout(() => {
  //     this. updateGraphData(item);
  //   }, 1000);
  // }

  updateGraphData(item:any): void {

    // console.log(item.index);
    
    // console.log("chartId : " + item.chartId);

    var w = document.getElementById(item.chartId).clientWidth - 42;
    var h = document.getElementById(item.chartId).clientHeight - 66;

    let graph = this.AllGraphList[item.index];

      if (graph.chartId == item.chartId) {

        // set data to update in DB 
        // graph.chartWidth = w;
        // graph.chartHeight = h;
        graph.graphRows = item.rows;
        graph.graphCols = item.cols;
        graph.graphXPos = item.x;
        graph.graphYPos = item.y;

        if (graph.chartType == "Single Value" || graph.chartType == "Text Value" || graph.chartType == "Text Value - Circle" || graph.chartType == "Text") {
          // for single valued graph
          this.updateSingleValGraph(item.chartId);
        }
        else if (graph.chartType == "Table") {
          // for table graph
          this.updateTableGraph(item.chartId);
        }
        else {
          this.charts.forEach((data) => {
            if (data.id == item.chartId) {
              let graph = data.chart;
              graph.setSize(w, h, false);
            }
          });
        }
      }
  }

  removeFirst() {
    this.charts.shift();
  }

  removeLast() {
    this.charts.pop();
  }

  removeAllCharts() {
    // Reassign to empty array — pop-while-iterating only removes half
    this.charts = [];
  }

  getChartInstances(): number {
    return this.charts.length;
  }

  getCharts() {
    return this.charts;
  }

  rmFirst() {
    //   this.hcs.removeFirst();
    //   this.changeDetectionRef.detectChanges();
    //   if (!!document.getElementById("test").firstChild) document.getElementById("test").firstChild.outerHTML = '';
    //   console.log('rm first', this.hcs.getCharts());
  }

  rmLast() {

    this.removeLast();
    // if(this.isNewLayout){
    //   this.changeDetectionRef.detectChanges();
    //   document.getElementById("newGraphLayout").innerHTML  = '';
    //   console.log('rm last', this.getCharts());
    // }else{
    //   this.changeDetectionRef.detectChanges();
    //   document.getElementById("savedGraphLayout").innerHTML  = '';
    //   console.log('rm last', this.getCharts());
    // }

  }

  getDates(choice: any) {
    let startDate: any;
    let endDate = new Date(); // current Date

    let dateFormat = 'YYYY-MM-DD HH:mm:ss';

    switch (choice) {
      case "5 MINUTE": {
        //for 5 min
        startDate = moment(endDate).subtract(5, 'minutes');
        this.fromDate = moment(startDate).format(dateFormat);
        this.toDate = moment(endDate).format(dateFormat);
        break;
      }
      case "10 MINUTE": {
        //for 10 min
        startDate = moment(endDate).subtract(10, 'minutes');
        this.fromDate = moment(startDate).format(dateFormat);
        this.toDate = moment(endDate).format(dateFormat);
        break;
      }
      case "15 MINUTE": {
        //for 15 min  
        startDate = moment(endDate).subtract(15, 'minutes');
        this.fromDate = moment(startDate).format(dateFormat);
        this.toDate = moment(endDate).format(dateFormat);
        break;
      }
      case "30 MINUTE": {
        //for 30 min
        startDate = moment(endDate).subtract(30, 'minutes');
        this.fromDate = moment(startDate).format(dateFormat);
        this.toDate = moment(endDate).format(dateFormat);
        break;
      }
      case "1 HOUR": {
        //for 1 hr
        startDate = moment(endDate).subtract(1, 'hours');
        this.fromDate = moment(startDate).format(dateFormat);
        this.toDate = moment(endDate).format(dateFormat);
        break;
      }
      case "6 HOUR": {
        //for 6 hr 
        startDate = moment(endDate).subtract(6, 'hours');
        this.fromDate = moment(startDate).format(dateFormat);
        this.toDate = moment(endDate).format(dateFormat);
        break;
      }
      case "12 HOUR": {
        //for 12 hr
        startDate = moment(endDate).subtract(12, 'hours');
        this.fromDate = moment(startDate).format(dateFormat);
        this.toDate = moment(endDate).format(dateFormat);
        break;
      }
      case "1 DAY": {
        //for 1 day
        startDate = moment(endDate).subtract(1, 'days');
        this.fromDate = moment(startDate).format(dateFormat);
        this.toDate = moment(endDate).format(dateFormat);
        break;
      }
      case "7 DAY": {
        //for 7 day
        startDate = moment(endDate).subtract(7, 'days');
        this.fromDate = moment(startDate).format(dateFormat);
        this.toDate = moment(endDate).format(dateFormat);
        break;
      }

    }

  }


  openDateModal(template: TemplateRef<any>) {
    this.modalRef = this.modalService.open(template, { size: 'sm' });

  }

  cancelDateModel() {
    this.modalRef.close();
  }

  refreshCharts() {

    let time: number;
    let timeType = this.refreshTime.split("_");


    if (timeType[1] == "s") {

      let seconds: number = timeType[0];
      time = seconds * 1000;

    } else if (timeType[2] == "m") {

      let minutes: number = timeType[0];
      time = minutes * 1000 * 60;

    } else if (timeType == "h") {
      let hours: number = timeType[0];
      time = hours * 1000 * 60 * 60;

    } else if (timeType == "d") {
      let days: number = timeType[0];
      time = days * 1000 * 60 * 60 * 24;
    } else if (timeType == "off") {
      time = 0;
    }
    console.log(time);
    this.setInterval(time);
  }

  setInterval(time: number) {

    if (this.refreshTime == "0_off") {
      this.subscription.unsubscribe();
      console.log("off");

    }
    else {
      if (this.subscription != undefined) {
        this.subscription.unsubscribe();
      }
      this.subscription = interval(time).subscribe((fun => {

        this.getData();
        //console.log(new Date());

      }));
    }
  }

  fullscreenModeToggle() {
    if (!document.fullscreenElement) {
      this.goFullScreen();
    } else {
      this.exitFullScreen();
    }
  }

  @HostListener('document:fullscreenchange')
  onFullScreenChange() {
    this.fullScreenMode = !!document.fullscreenElement;
  }

  goFullScreen() {

    let elem = document.getElementById("dashboard");

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  }

  exitFullScreen() {

    if (document.exitFullscreen) {
      document.exitFullscreen();
    }

  }

  // navigate to Feature Graph Mapping in edit mode for the selected chart
  editGraph(item: any) {
    const graph = this.AllGraphList[item.index];
    if (!graph) return;
    sessionStorage.setItem('isEditGraph', 'true');
    sessionStorage.setItem('editGraphId', graph.chartId);
    sessionStorage.setItem('editGraphSubFName', this.subFeatureName);
    sessionStorage.setItem('editGraphAppId', String(this.applicationID));
    this.router.navigate(['/admin-config/feature-graph-mapping']);
  }

  //save dashboard layout
  saveDashboardLayout() {
    this.AllGraphList.forEach((data) => {
      data.subFeatureName = this.subFeatureName;
      data.sessionDTO = this.currentUser.sessionDTO;
      data.savedBy = this.currentUser.id;
      data.userId = this.currentUser.id;
      data.preferenceType = 'Preference';
      data.featureName = 'Dashboard';
      this.dashboardService.saveDashboardLayout(data).pipe(first()).subscribe((response: any) => {
        console.log(response.serviceResponse);
        // status = response.serviceStatus;
        //alert(response.serviceResponse);
      });
    });
    this.showSuccessBanner("Dashboard Layout is saved successfully");
  }

  showErrorBanner(message: string) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: message, confirmButtonColor: '#3b82f6' });
  }
  showSuccessBanner(message = 'Success') {
    Swal.fire({ icon: 'success', title: 'Success!', text: message, confirmButtonColor: '#3b82f6' });
  }
  showUpdateBanner(message = 'Updated successfully') {
    Swal.fire({ icon: 'success', title: 'Update Successful!', text: message, confirmButtonColor: '#3b82f6' });
  }
  showDeleteBanner(message = 'Deleted successfully') {
    Swal.fire({ icon: 'success', title: 'Deleted!', text: message, confirmButtonColor: '#3b82f6' });
  }

   //update font size of single Val Graph
   updateSingleValGraph(chartId: any) {

    let parentDiv = document.getElementById(chartId); //chartId
    let w = parentDiv.clientWidth;
    let h = parentDiv.clientHeight;
    let fontSizeTitle = 0.05 * (w + h);
    let fontSizeContent = 0.15 * (w + h);

    console.log("Width of parent : " + w);
    console.log("Height of parent : " + h);
    console.log("fontSizeTitle : " + fontSizeTitle);
    console.log("fontSizecontent : " + fontSizeContent);
    console.log("title id : " + chartId + "-graph-title");
    console.log("content id : " + chartId + "-graph-title");


    let titleEl = document.getElementById(chartId + "-graph-title");
    if (titleEl) titleEl.style.fontSize = "" + fontSizeTitle + "px";
    let contentEl = document.getElementById(chartId + "-graph-content");
    if (contentEl) contentEl.style.fontSize = "" + fontSizeContent + "px";
  }


  //update table graph font and table size 
  updateTableGraph(chartId: any) {
    let parentDiv = document.getElementById(chartId);
    if (!parentDiv) return; // Guard: element not yet in DOM
    let w = parentDiv.clientWidth;
    let h = parentDiv.clientHeight;
    let fontSizeContent = 0.05 * (w + h);
    let divWidth = w - 42;
    let divHeight = h - 66;

    const tableDiv = document.getElementById(chartId + "-table-div");
    if (!tableDiv) return; // Guard: table div not yet rendered
    tableDiv.style.height = "" + divHeight + "px";
    tableDiv.style.width = "" + divWidth + "px";
    $(".chartId-table-content").css('font-size', "" + fontSizeContent + "px");
  }

  


  /*  gridster */
  removeItem($event, item) {
    $event.preventDefault();
    $event.stopPropagation();
    
    let graph = this.AllGraphList[item.index];
    graph.deletedBy = this.currentUser.userId;
   
    this.dashboardService.deleteGraph(graph).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        this.dashboard.splice(this.dashboard.indexOf(item), 1);
        this.showDeleteBanner(response.serviceResponse);
      }
      else{
        this.showErrorBanner(response.serviceResponse);
      }
    });
  }

  // addItem() {
  //   this.dashboard.push({cols: 1, rows: 1, y: 0, x: 0});
  // }

  removeAllFromGrid(){
    // Reassign to empty array — splicing while iterating skips every other element
    this.dashboard = [];
    console.log("grid items are removed !");
  }

  changedOptions(): void {
    if (this.options.api && this.options.api.optionsChanged) {
      this.options.api.optionsChanged();
    }
  }

  childChangedOptions(): void {
    if (this.childOptions.api && this.childOptions.api.optionsChanged) {
      this.childOptions.api.optionsChanged();
    }
  }

  /* ── Child / Drilldown Dashboard ─────────────────────────────── */

  openChildDashboard(item: any) {
    const graph = this.AllGraphList[item.index];
    if (!graph) return;
    this.nodeGraphModalTittle = graph.chartTitle;
    this.chartId = graph.chartId;
    this.tempChartId = graph.chartId;
    this.firstClickCounter++;
    this.isSubChildGraph = false;
    this.getChildData();
  }

  getChildData(chartTitle?: any, pointName?: any, isPointGraph?: any, chartId?: any) {
    this.childDashboard = [];
    
    // If called from openChildDashboard, these might be undefined, so we use component state.
    // If called from pie chart click, we receive specific values.
    const title = chartTitle || this.nodeGraphModalTittle;
    const cid = chartId || this.chartId;
    this.nodeGraphModalTittle = title;
    this.chartId = cid;

    if (isPointGraph !== undefined) {
      this.isPointGraph = isPointGraph;
      this.pointName = pointName;
    }

    if (this.isPointGraph && this.pointName) {
      // Point graph logic
      const data = {
        applicationId: this.applicationID,
        subFeatureName: this.subFeatureName,
        chartTitle: title,
        preferenceType: this.graphInputObj.preferenceType || 'Preference',
        id: this.currentUser.id,
        featureName: this.graphInputObj.featureName || 'Dashboard',
        pointName: this.pointName,
        chartId: cid,
        sessionDTO: this.currentUser.sessionDTO
      };

      this.dashboardService.getPointGraphsByHostIdAndPointName(data).pipe(first()).subscribe((response: any) => {
        if (response.serviceStatus === 'Success') {
          this.nodeGraphList = response.serviceResponse;

          if (!this.nodeGraphList || this.nodeGraphList.length === 0) {
            Swal.fire({ icon: 'warning', title: 'No point graphs', text: 'No child graphs mapped to this point.', confirmButtonColor: '#3b82f6' });
            return;
          }

          this.isSubChildGraph = true;
          this.nodeGraphList.forEach((element: any, index: number) => {
            const graph = {
              rows: element.graphRows || 10, cols: element.graphCols || 10,
              chartId: element.chartId, index: index,
              chartTitle: element.chartTitle, chartType: element.chartType,
              pointChildGraphs: element.pointChildGraphs,
              enableTitle: true,
              sourceDBEnable: element.isSourceDBEnabled,
              warningColor: element.warningColor, criticalColor: element.criticalColor, normalColor: element.normalColor
            };
            this.childDashboard.push(graph);
          });

          this.initChildOptions();
          this.childChangedOptions();
          const modalEl = document.getElementById('child_graph_modal');
          if (modalEl) { modalEl.style.display = 'flex'; }
          
          this.changeDetectionRef.detectChanges();
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: response.serviceResponse || 'Failed to load point graphs.', confirmButtonColor: '#3b82f6' });
        }
      }, err => {
        console.error('getPointGraphsByHostIdAndPointName error', err);
        this.showErrorBanner('Failed to load point graphs.');
      });

    } else {
      // Normal drilldown logic
      const data = {
        applicationId: this.applicationID,
        subFeatureName: this.subFeatureName,
        chartTitle: title,
        preferenceType: 'Preference',
        userId: this.currentUser.id,
        savedBy: this.currentUser.id,
        featureName: this.graphInputObj.featureName || 'Dashboard',
        chartId: cid,
        sessionDTO: this.currentUser.sessionDTO
      };

      this.dashboardService.getAllSubGraphList(data).pipe(
        switchMap(res => from(this.decoderService.decodeObject(res)))
      ).subscribe((response: any) => {
        if (response.serviceStatus === 'Success') {
          this.nodeGraphList = response.serviceResponse;
          this.isSubChildGraph = true;

          this.nodeGraphList.forEach((element: any, index: number) => {
            const graph = {
              rows: element.graphRows, cols: element.graphCols,
              chartId: element.chartId, index: index,
              chartTitle: element.chartTitle, chartType: element.chartType,
              pointChildGraphs: element.pointChildGraphs,
              enableTitle: true,
              sourceDBEnable: element.isSourceDBEnabled,
              warningColor: element.warningColor, criticalColor: element.criticalColor, normalColor: element.normalColor
            };
            this.childDashboard.push(graph);
          });

          this.initChildOptions();
          this.childChangedOptions();
          // Open modal first so gridster elements have dimensions when initialized
          const modalEl = document.getElementById('child_graph_modal');
          if (modalEl) { modalEl.style.display = 'flex'; }
          
          this.changeDetectionRef.detectChanges();
        } else {
          Swal.fire({ icon: 'warning', title: 'No child graphs', text: response.serviceResponse || 'No drilldown graphs found.', confirmButtonColor: '#3b82f6' });
        }
      }, err => {
        console.error('getChildData error', err);
        this.showErrorBanner('Failed to load drilldown graphs.');
      });
    }
  }

  loadNodeGraph(item: any) {
    if (!this.nodeGraphList || !this.nodeGraphList[item.index]) return;
    const graph = this.nodeGraphList[item.index];
    const obj = Object.assign({}, this.graphInputObj);
    obj.chartId = item.chartId;
    obj.subFeatureName = graph.subFeatureName || this.subFeatureName;
    obj.featureName = graph.featureName || 'Dashboard';
    obj.sessionDTO = this.currentUser.sessionDTO;
    this.getNodeGraph(obj);
  }

  getNodeGraph(graphInputObj: any) {
    this.dashboardService.getGraph(graphInputObj).pipe(
      switchMap(data => from(this.decoderService.decodeObject(data)))
    ).subscribe((response: any) => {
      if (response.serviceStatus === 'Success') {
        const element = response.serviceResponse;
        try {
          if (element.chartType === 'Line') {
            const gd = this.hcs.createGraphDataObject(element);
            this.createChildChart(this.hcs.buildChartJSON(gd), gd);
          } else if (element.chartType === 'Column') {
            const gd = this.barGraphService.createBarGraphDataObject(element, 'Series');
            this.createChildChart(this.barGraphService.buildColumnChartJSON(gd), gd);
          } else if (element.chartType === 'Bar') {
            const gd = this.barGraphService.createBarGraphDataObject(element, 'Series');
            this.createChildChart(this.barGraphService.buildBarChartJSON(gd), gd);
          } else if (element.chartType === 'Stacked Column') {
            const gd = this.stackedBarGraphService.createStackedBarGraphDataObject(element);
            this.createChildChart(this.stackedBarGraphService.buildStackedColumnChartJSON(gd), gd);
          } else if (element.chartType === 'Stacked Bar') {
            const gd = this.stackedBarGraphService.createStackedBarGraphDataObject(element);
            this.createChildChart(this.stackedBarGraphService.buildStackedBarChartJSON(gd), gd);
          } else if (element.chartType === 'Pie') {
            const gd = this.piechartService.createPieGraphDataObject(element);
            this.createChildChart(this.piechartService.buildPieChartJSON(gd), gd);
          } else if (['DoughNut', 'DoughtNut', 'Doughnut'].includes(element.chartType)) {
            const gd = this.piechartService.createPieGraphDataObject(element);
            this.createChildChart(this.piechartService.buildDoughtNutChartJSON(gd), gd);
          } else if (element.chartType === 'TopN') {
            this.createChildChart(this.topNGraphService.buildColumnChartJSON(element), element);
          } else if (element.chartType === 'Gauge') {
            this.createChildChart(this.guagechartService.buildChartJSON(element), element);
          } else if (element.chartType === 'Funnel') {
            this.createChildChart(this.funnelChartService.buildChartJSON(element), element);
          } else if (element.chartType === 'Single Value' || element.chartType === 'Text Value' || element.chartType === 'Text Value - Circle' || element.chartType === 'Text') {
            this.createChildDivAsGraph(this.singleValueService.buildChartObject(element), element);
          } else if (element.chartType === 'Table') {
            this.createChildDivAsGraph(this.tablechartService.buildChartObject(element), element);
          }
        } catch (e) { console.error('getNodeGraph render error', e); }
      }
    });
  }

  createChildChart(graphOption: any, data: any) {
    const chartId = 'child-' + data.chartId;
    const parent = document.getElementById(chartId);
    if (!parent) return;
    const spinner = document.getElementById(chartId + '-child-spinner');
    if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
    const el = document.createElement('div');
    parent.appendChild(el);
    const opts = graphOption;
    if (opts.chart) { opts.chart['renderTo'] = el; } else { opts.chart = { renderTo: el }; }
    const w = parent.clientWidth - 42;
    const h = parent.clientHeight - 66;
    const myChart = new Highcharts.Chart(opts);
    myChart.setSize(w, h, false);
    this.charts.push({ chart: myChart, id: data.chartId });
  }

  createChildDivAsGraph(graphOption: any, data: any) {
    const chartId = 'child-' + data.chartId;
    const parent = document.getElementById(chartId);
    if (!parent) return;
    const spinner = document.getElementById(chartId + '-child-spinner');
    if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
    const el = document.createElement('div');
    el.innerHTML = graphOption;
    parent.appendChild(el);
    this.charts.push({ chart: graphOption, id: data.chartId });
  }

  clearChildDashboard() {
    this.childDashboard = [];
    this.nodeGraphModalTittle = null;
    this.pointName = null;
    this.isPointGraph = false;
    this.isSubChildGraph = false;
    this.subChildBackButton = false;
    this.firstClickCounter = 0;
    this.subChildGraphCounter = 0;
    this.graphChartIdCounter = 100;
    const modalEl = document.getElementById('child_graph_modal');
    if (modalEl) { modalEl.style.display = 'none'; }
    this.changeDetectionRef.detectChanges();
  }

  clearSubChildDashboard() {
    this.childDashboard = [];
    this.subChildBackButton = false;
    this.isSubChildGraph = false;
    this.subChildGraphCounter = 0;
    this.chartId = this.hostGraphChartId;
    this.nodeGraphModalTittle = this.tempChildGraphName;
    this.getChildData();
    this.changeDetectionRef.detectChanges();
  }

  updateChildGraphData(item: any) {
    const parent = document.getElementById('child-' + item.chartId);
    if (!parent) return;
    const w = parent.clientWidth - 42;
    const h = parent.clientHeight - 66;
    // Highcharts charts are stored in this.charts — find and resize
    this.charts.forEach((c: any) => {
      if (c.id === item.chartId) { c.chart.setSize(w, h, false); }
    });
  }

  private initChildOptions() {
    this.childOptions = {
      gridType: GridType.ScrollVertical,
      itemInitCallback: (item: GridsterItem, itemComponent: GridsterItemComponentInterface) => {
        this.loadNodeGraph(item);
      },
      itemChangeCallback: (item: GridsterItem, itemComponent: GridsterItemComponentInterface) => {
        setTimeout(() => this.updateChildGraphData(item), 250);
      },
      itemResizeCallback: (item: GridsterItem, itemComponent: GridsterItemComponentInterface) => {
        setTimeout(() => this.updateChildGraphData(item), 250);
      },
      compactType: CompactType.CompactUp,
      margin: 10, outerMargin: true,
      minCols: 1, minRows: 1, maxRows: 150, maxCols: 100,
      defaultItemCols: 1, defaultItemRows: 1,
      fixedColWidth: 49, fixedRowHeight: 15,
      draggable: { enabled: false },
      resizable: { enabled: false },
      swap: false, pushItems: true,
      displayGrid: DisplayGrid.OnDragAndResize,
      disableWindowResize: false, disableWarnings: false, scrollToNewItems: false
    };
  }

  /* ── Trend Dashboard context menu ────────────────────────────── */

  evaluate(item: any) {
    this.magicKey = true;
    this.lastOneDay = false;
    this.lastOneweek = false;
    this.lastOneMonth = false;
    this.lastThreeMonth = false;
    this.LastSixMonth = false;
    this.lastOneYear = false;
    const graph = new GraphInputJSON();
    graph.chartId = item.chartId;
    graph.sessionDTO = this.currentUser.sessionDTO;
    this.dashboardService.getTrendStatus(graph).pipe(first()).subscribe((response: any) => {
      const list = response.serviceResponse || [];
      this.lastOneDay     = list[0];
      this.lastOneweek   = list[1];
      this.lastOneMonth  = list[2];
      this.lastThreeMonth = list[3];
      this.LastSixMonth  = list[4];
      this.lastOneYear   = list[5];
      this.magicKey = false;
      this.changeDetectionRef.detectChanges();
    });
  }

  getTrendData(item: any, duration: string) {
    this.getFromToFromDuration(duration);
    this.trendgraphInObj.chartId = item.chartId;
    this.trendgraphInObj.fromDate = this.trendFromDate;
    this.trendgraphInObj.toDate = this.trendToDate;
    this.trendgraphInObj.subFeatureName = this.subFeatureName;
    this.trendgraphInObj.applicationId = this.applicationID;
    this.trendgraphInObj.featureName = this.graphInputObj.featureName || 'Dashboard';
    this.trendgraphInObj.sessionDTO = this.currentUser.sessionDTO;
    this.dashboardService.getGraph(this.trendgraphInObj).pipe(
      switchMap(data => from(this.decoderService.decodeObject(data)))
    ).subscribe((response: any) => {
      if (response.serviceStatus === 'Success') {
        const data = response.serviceResponse;
        // Re-render the chart in place
        const parent = document.getElementById(data.chartId);
        if (!parent) return;
        // Remove old content (except spinner)
        Array.from(parent.children).forEach((c: any) => {
          if (!c.id || !c.id.includes('spinner')) parent.removeChild(c);
        });
        // Delegate to existing render path
        this.getAllGraphData(this.trendgraphInObj);
      }
    });
  }

  private getFromToFromDuration(duration: string) {
    const endDate = new Date();
    const fmt = 'YYYY-MM-DD HH:mm:ss';
    switch (duration) {
      case '1_day':    this.trendFromDate = moment(endDate).subtract(1, 'days').format(fmt); break;
      case '1_week':   this.trendFromDate = moment(endDate).subtract(1, 'weeks').format(fmt); break;
      case '1_month':  this.trendFromDate = moment(endDate).subtract(1, 'months').format(fmt); break;
      case '3_months': this.trendFromDate = moment(endDate).subtract(3, 'months').format(fmt); break;
      case '6_months': this.trendFromDate = moment(endDate).subtract(6, 'months').format(fmt); break;
      case '1_year':   this.trendFromDate = moment(endDate).subtract(1, 'years').format(fmt); break;
    }
    this.trendToDate = moment(endDate).format(fmt);
  }

  /* ── Per-item Refresh (Table / RAG Table with live DB) ───────── */

  openRefreshGraphModal(item: any) {
    this.refreshItem = item;
    this.refreshTableData = [];
    this.refreshTableHeaders = [];
    this.isRefreshLoading = true;
    this.isRefreshSuccess = false;
    this.isRefreshError = false;
    this.refreshErrorMessage = '';

    const modalEl = document.getElementById('refresh_graph_modal');
    if (modalEl) { modalEl.style.display = 'flex'; }

    this.graphInputObj.chartId = item.chartId;
    this.graphInputObj.isSourceDBEnabled = item.sourceDBEnable;
    this.graphInputObj.sessionDTO = this.currentUser.sessionDTO;

    this.dashboardService.getRefreshGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
      this.isRefreshLoading = false;
      if (response.serviceStatus === 'Success') {
        const element = response.serviceResponse;
        this.refreshTableHeaders = Object.assign([], element.chartCategory?.[1] || []);
        this.refreshTableData = element.chartData || [];
        this.isRefreshSuccess = true;
      } else {
        this.isRefreshError = true;
        this.refreshErrorMessage = response.serviceResponse || 'Error fetching live data.';
      }
      this.changeDetectionRef.detectChanges();
    }, err => {
      this.isRefreshLoading = false;
      this.isRefreshError = true;
      this.refreshErrorMessage = 'Network error fetching live data.';
      this.changeDetectionRef.detectChanges();
    });
  }

  closeRefreshModal() {
    const modalEl = document.getElementById('refresh_graph_modal');
    if (modalEl) { modalEl.style.display = 'none'; }
    this.refreshItem = null;
    this.refreshTableData = [];
    this.refreshTableHeaders = [];
    this.isRefreshLoading = false;
    this.isRefreshSuccess = false;
    this.isRefreshError = false;
  }

  setZIndex(chartId: string) {
    // Elevate current item so dropdown is not clipped by overflow:hidden
    const wrapper = document.getElementById(chartId);
    if (wrapper) { wrapper.style.zIndex = '100'; }
  }
  // ═══════════════════════════════════════════════════════════════
  // Download Methods
  // ═══════════════════════════════════════════════════════════════

  exportDashboardToPDF() {
    const dashboardElement = document.getElementById('dashboard-canvas-container');
    if (!dashboardElement) return;

    Swal.fire({
      title: 'Exporting Dashboard',
      text: 'Please wait while the PDF is being generated...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    html2canvas(dashboardElement, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape A4
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const dateStr = moment().format('YYYY-MM-DD_HH-mm-ss');
      pdf.save(`Dashboard_${this.subFeatureName}_${dateStr}.pdf`);

      Swal.close();
      this.alertService.success('Dashboard exported successfully!', '');
    }).catch(err => {
      console.error('Error exporting dashboard:', err);
      Swal.close();
      this.alertService.error('Failed to export dashboard.', '');
    });
  }

  exportGraphToPNG(item: any) {
    const chartId = item.chartId;
    const element = document.getElementById(chartId);
    if (!element) return;

    Swal.fire({
      title: 'Exporting Graph',
      text: 'Please wait while the image is being generated...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Temporarily hide action buttons so they aren't in the screenshot
    const buttons = element.parentElement?.querySelector('.item-buttons') as HTMLElement;
    if (buttons) buttons.style.display = 'none';

    html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
      if (buttons) buttons.style.display = ''; // Restore buttons

      const link = document.createElement('a');
      link.download = `${item.chartTitle || 'Graph'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      Swal.close();
      this.alertService.success('Graph exported successfully!', '');
    }).catch(err => {
      if (buttons) buttons.style.display = '';
      console.error('Error exporting graph to PNG:', err);
      Swal.close();
      this.alertService.error('Failed to export graph.', '');
    });
  }

  exportTableToExcel(item: any) {
    const chartId = item.chartId;
    const element = document.getElementById(chartId);
    if (!element) return;

    const table = element.querySelector('table');
    if (!table) {
      this.alertService.error('No table found to export.', '');
      return;
    }

    Swal.fire({
      title: 'Exporting Table',
      text: 'Please wait while the Excel file is being generated...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet JS" });
      const dateStr = moment().format('YYYY-MM-DD');
      XLSX.writeFile(wb, `${item.chartTitle || 'Table_Data'}_${dateStr}.xlsx`);

      Swal.close();
      this.alertService.success('Excel exported successfully!', '');
    } catch (err) {
      console.error('Error exporting table to Excel:', err);
      Swal.close();
      this.alertService.error('Failed to export Excel.', '');
    }
  }

  exportTableToPDF(item: any) {
    const chartId = item.chartId;
    const element = document.getElementById(chartId);
    if (!element) return;

    Swal.fire({
      title: 'Exporting Table',
      text: 'Please wait while the PDF is being generated...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const buttons = element.parentElement?.querySelector('.item-buttons') as HTMLElement;
    if (buttons) buttons.style.display = 'none';

    html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
      if (buttons) buttons.style.display = '';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait A4
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // If the table is very long, it might get cut off, but this captures what is visible/rendered
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      
      const dateStr = moment().format('YYYY-MM-DD');
      pdf.save(`${item.chartTitle || 'Table'}_${dateStr}.pdf`);

      Swal.close();
      this.alertService.success('PDF exported successfully!', '');
    }).catch(err => {
      if (buttons) buttons.style.display = '';
      console.error('Error exporting table to PDF:', err);
      Swal.close();
      this.alertService.error('Failed to export PDF.', '');
    });
  }

}
