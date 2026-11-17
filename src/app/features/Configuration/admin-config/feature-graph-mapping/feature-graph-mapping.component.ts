// @ts-nocheck
import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, SecurityContext, ViewChild, ViewContainerRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { Graph } from '../../../../models/feature-graph-mapping';
import { first, isEmpty, switchMap } from 'rxjs/operators';
import { ThemeService } from '../../../../services/theme.service';
// AppComponent removed - storedTheme is now a direct component property
import { FeatureGraphMappingService } from '../../../../services/feature-graph-mapping.service';
import { TemplateRef } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { UserService } from '../../../../services/user.service';
import { FeatureService } from '../../../../services/feature-services.service';
import { ApplicationService } from '../../../../services/application.service';
import Highcharts from 'highcharts';
import { DummyGraphService } from '../../../../services/dummy-graph.service';
import { ActivatedRoute, Router } from '@angular/router';
import { GraphInputJSON } from '../../../../models/graphInputJSON';
import { HighchartsService } from '../../../../services/highchart.service';
import { PiechartService } from '../../../../services/piechart.service';
import { FunnelChartService } from '../../../../services/funnel-chart-service';
import { TableChartService } from '../../../../services/table-chart.service';
import { BarGraphService } from '../../../../services/bargraph.service';
import { GuagechartService } from '../../../../services/guage-chart-service';
import { SingleValueService } from '../../../../services/single-value.service';
import { TopNGraphService } from '../../../../services/top-n-graph.service';
import { DashboardService } from '../../../../services/dashboard.service';
import { StackedBarGraphService } from '../../../../services/stacked-bar-graph.service';
import moment from 'moment';
import { ExcelService } from "../../../../services/excel.service";
import { UserTypeCrudMapObject } from '../../../../models/UserTypeCrudMapObject';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { SessionService } from '../../../../services/session.service';
import { Threshold } from '../../../../models/Threshold';
import { ThresholdService } from '../../../../services/threshold.service';
import { DomSanitizer } from '@angular/platform-browser';
import { ImageDetails } from '../../../../models/ImageDetails';
import * as XLSX from 'xlsx';
import { GuagemeterChartService } from '../../../../services/guagemeter-chart.service';
import { Role } from '../../../../models/Role';
import * as CryptoJS from 'crypto-js';
import { LoggerService } from '../../../../services/logger.service';
import { FeatureMaster } from '../../../../models/feature-master';
import { ApplicationMaster } from '../../../../models/application-master';
import { browserRefresh } from '../../../../app.component';
import { DatasourceService } from '../../../../services/datasource.service';
import { BucketScript, Metric, Query } from '../../../../models/Query';
import { QueryGroupBy } from '../../../../models/QueryGroupBy';
import { datasourceDetails } from '../../../../models/datasource';
import { RequestbodyService } from '../../../../services/requestbody.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { DecoderService } from '../../../../services/decoder.service';
import { CommonModule } from '@angular/common';
import { GrdFilterPipe } from '../../../../grd-filter.pipe';
import { SortPipe } from '../../../../sort.pipe';
import { NgxPaginationModule } from 'ngx-pagination';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';


import { MatDialogModule } from '@angular/material/dialog';
import { IDropdownSettings, NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';

@Component({
  selector: 'app-feature-graph-mapping',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GrdFilterPipe, SortPipe, NgxPaginationModule, MatAutocompleteModule, MatInputModule, MatDialogModule, NgMultiSelectDropDownModule],
  providers: [
    PiechartService,
    BarGraphService,
    HighchartsService,
    DummyGraphService,
    GuagechartService,
    FunnelChartService,
    GuagemeterChartService,
  ],
  templateUrl: './feature-graph-mapping.component.html',
  styleUrls: ['./feature-graph-mapping.component.css'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class FeatureGraphMappingComponent implements OnInit {
  displayedColumns: string[] = ["Graph Title", "Feature", "Application Name", "Sub Feature", "Graph Category", "Data Source", "Data Mode", "Data Unit", "Graph Type", "Table Type", "Created On", "Created By"];
  displayLoader: number = 0;
  buttonDisable: boolean = false;
  storedTheme: any = sessionStorage.getItem('themeColour');

  charts = [];
  //@ViewChild('charts') public chartEl: ElementRef;
  @ViewChild('alert_message', { read: TemplateRef }) alertTemplate: TemplateRef<any>;
  @ViewChild('bgcolorTemplate', { read: TemplateRef }) bgcolorTemplate: TemplateRef<any>;
  @ViewChild('seeAllModalTemplate', { read: TemplateRef }) seeAllModalTemplate: TemplateRef<any>;
  @ViewChild('uploadImageModalTemplate', { read: TemplateRef }) uploadImageModalTemplate: TemplateRef<any>;
  @ViewChild('childModalTemplate', { read: TemplateRef }) childModalTemplate: TemplateRef<any>;
  uploadImageModalRef: BsModalRef;
  seeAllModalRef: BsModalRef;
  childModalRef: BsModalRef;

  p: number = 1;
  searchText: any;
  pointSearchText: any;
  pChild: number = 1;
  currentUser: any;
  graphObj: Graph = new Graph();
  viewGraphObj: Graph = new Graph();
  featureList: any;
  subFeatureList: any;
  dataUnit: any = ["Any", "Percent","MB to Bytes", "GigaBytes", "Bytes/Second", "MicroSeconds to Millisecond/s", "MicroSeconds to Second/s", "MicroSeconds to Minute/s", "MicroSeconds to Day/s","Milliseconds to Second/s" ,"Milliseconds to Minute/s", "Milliseconds to Day/s"];
  graphType: any = ["Pie", "DoughNut", "Bar", "Column", "Line", "Gauge"
    , "Funnel", "Stacked Bar", "Stacked Column", "Text", "Text Value", "Text Value - Circle"
    , "Table", "TopN", "IFrame", "RAG Table", "Gauge Meter", "Group"];
  graphTypes = [{ val: "Pie", name: "Pie" }, { val: "DoughNut", name: "DoughNut" }, { val: "Bar", name: "H Bar" }
    , { val: "Column", name: "V Bar" }, { val: "Line", name: "Line" }, { val: "Gauge", name: "Gauge" }
    , { val: "Funnel", name: "Funnel" }, { val: "Stacked Bar", name: "H Stack Bar" }
    , { val: "Stacked Column", name: "V Stack Bar" }, { val: "Text", name: "Text" }, { val: "Text Value", name: "Text Value" }
    , { val: "Text Value - Circle", name: "Text Value - Circle" }, { val: "Table", name: "Table" }
    , { val: "TopN", name: "TopN" }, { val: "IFrame", name: "IFrame" }, { val: "RAG Table", name: "RAG Table" }
    , { val: "Gauge Meter", name: "Gauge Meter" }, { val: "Group", name: "Group" }]
  graphList: any[] = [];
  isAddGraphBtn: boolean;
  isEditGraphBtn: boolean;
  isForm: boolean
  isTable: boolean
  isDesc: boolean;
  column: any;
  minGraphWidth: any = 500;
  minGraphHeight = 150;
  maxGraphWidth: any = 5000;
  maxGraphHeight = 1500;
  alertMessage: any;
  modalRef: BsModalRef;
  allApplications: any;
  applicationID: any;
  isError: boolean = false;
  isSuccess: boolean = false;
  pageState: any;
  name: any;
  groupgraphList: any[];
  groupgraphtempList: any[];
  graphInputObj = new GraphInputJSON();
  fromDate: any;
  toDate: any;
  param: any;
  graphChoice: any;
  isGraph: boolean = false;
  isStat: boolean = false;
  isGauge: boolean = false;
  isStackBar: boolean = false;
  isTableChart: boolean = false;
  isText: boolean = false;
  isFunnel: boolean = false;
  isPie: boolean = false;
  isDonut: boolean = false;
  sortDirection: 'asc' | 'desc' = 'asc';
  sortparam: any;
  allGraphExcelList: any;
  excelJsonData: any;
  userTypeCrudMap = new UserTypeCrudMapObject();
  user: User;
  appGraphList: any;
  fieldTextType: boolean;
  fieldTextType1: boolean;
  startDate: any;
  endDate: any;
  private _fromTODate: any;

  get fromTODate(): any {
    if (this.startDate && this.endDate) {
      return [this.startDate, this.endDate];
    }
    return this._fromTODate;
  }

  set fromTODate(value: any) {
    this._fromTODate = value;
    if (Array.isArray(value) && value.length === 2) {
      this.startDate = value[0];
      this.endDate = value[1];
    } else if (typeof value === 'string' && value.includes(" - ")) {
      let dates = value.split(" - ");
      this.startDate = new Date(dates[0]);
      this.endDate = new Date(dates[1]);
    } else if (!value) {
      this.startDate = undefined;
      this.endDate = undefined;
    }
  }

  public nodeGraphFields: Object = { text: 'chartName', value: 'id' };
  nodeGraphIds: any[] = [];
  childGraphDropdownSettings: IDropdownSettings = {
    singleSelection: false,
    idField: 'id',
    textField: 'chartName',
    selectAllText: 'Select All',
    unSelectAllText: 'Unselect All',
    itemsShowLimit: 3,
    allowSearchFilter: true
  };
  tableColumnsDropdownSettings: IDropdownSettings = {
    singleSelection: false,
    idField: 'item_id',
    textField: 'item_text',
    selectAllText: 'Select All',
    unSelectAllText: 'Unselect All',
    itemsShowLimit: 3,
    allowSearchFilter: true
  };
  legendValuesDropdownSettings: IDropdownSettings = {
    singleSelection: false,
    idField: 'id',
    textField: 'value',
    selectAllText: 'Select All',
    unSelectAllText: 'Unselect All',
    itemsShowLimit: 3,
    allowSearchFilter: false
  };
  labelPositionDropdownSettings: IDropdownSettings = {
    singleSelection: false,
    idField: 'id',
    textField: 'value',
    selectAllText: 'Select All',
    unSelectAllText: 'Unselect All',
    itemsShowLimit: 3,
    allowSearchFilter: false
  };
  sessionObject: Session = new Session();
  legendColorCode: any;
  metricList: any[];

  bgColor: any;
  isVisualized: boolean = false;

  dateFormat = 'YYYY-MM-DD HH:mm:ss';

  public max = new Date();
  isUploadImage: any;
  imageUploadObj = new ImageDetails();
  image: File;
  sameImage = new GraphInputJSON();
  previewImage: any;
  isImageUpdate: boolean;
  uploadSameImage: boolean;

  /* update Graph color */
  graphBgColor: any;
  graphFontColor: any;
  updateImageFileName: any;
  allTableColumns: any[];
  tableHeaders: any[];
  allTableMetricColumns: any[];
  metricColumns: any[];
  mainTableColumns: any;
  sortingColumns: any[];
  sortingColumnsList: any[];
  isSortingType: boolean;
  legendValues:any[];
  labelPositions:any[];
  tableHeaderFontColor: any;
  tableHeaderBgColor: any;
  isPrefrence: boolean = false;
  isDefault: boolean = true;
  prefGraphList: any = [];
  selectAll: boolean;
  editSeeAllPage: any;
  isEnable: boolean;
  isSelectAll: boolean;
  isUpdateIcon: boolean;
  isIconName: boolean;
  isSetPreferenceEnable: boolean;
  isSetPreferenceButtonEnable: boolean = true;
  modifiedHeaderName: any;
  isSeeAll: boolean = false;
  // isLegendEnabled:boolean=true;
  // errorMsg:any = "";
  // errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
  //                     <div class="col-md-12">
  //                       <h2 style="color: #757575;">${this.errorMsg}</h2>
  //                     </div>
  //                   </div>`;

  pointName: any;
  pointGraphList: any[] = [];
  selectAllPointGraphs: boolean;
  pointGraphs: any = [];
  allPointGraphs: Map<string, Graph[]> = new Map();
  hasSubChildNode: boolean = false;

  graphBorders: any = [];
  isTopBorder: any;
  isRightBorder: any;
  isBottomBorder: any;
  isLeftBorder: any;
  testConnectStatus: string;
  browserRefresh:any =false;
  modifiedTextValueHeaderName:any;
  aliasName:any;
  ragPointNormalColor:any;	
  ragPointWarningColor:any;	
  ragPointCriticalColor:any;	
  editFromDashboardSubFId :any = "";	
  editFromDashboardAppId :any = "";	
  editFromDashboardSubFName :any = "";	
  isEditGraph :any = "false";	
  idAndValueMap = new Map();
  pagevalue: "false";

  allDatasourceList: any;
  datasource: datasourceDetails = new datasourceDetails();
  datasourceId: any;
  queryObj: Query = new Query();
  queryObjList: Query[] = [];
  queryGroupByObj: QueryGroupBy = new QueryGroupBy();
  isQueryMetricCount: boolean = false;
  isQueryMetricRawData: boolean = false;
  isQueryMetricNotSelected: boolean = false;

  queryGroupByList: any;
  fieldtermsList: [] = [];
  fieldMetricList: [] = [];
  fielddateHistogramList: [] = [];
  createRequestBody: any;
  derivativeFieldList: String[] = [];

  graphTitleFontColor:any;
  fontSizeArr  = new Array<any>(50);
  myControl = new FormControl('');
  fontStyleList = ['ABeeZee','Abel','Acme','Actor','Adamina','Aldrich','Amita','Arizonia','Armata','Asset','Geostar','Poppins','Roboto','Tourney','Trispace','Unbounded','Viga','Wallpoet','WindSong'];
  customDateInHeader:any;
  
  constructor(private featureGraphMappingService: FeatureGraphMappingService,
    private themeService: ThemeService, private userService: UserService, private excelService: ExcelService,
    private applicationService: ApplicationService,
    private modalService: BsModalService, private dummyGraphService: DummyGraphService,
    private changeDetectionRef: ChangeDetectorRef, private activatedroute: ActivatedRoute
    , private router: Router, private hcs: HighchartsService, private barGraphService: BarGraphService,
    private piechartService: PiechartService, private guagechartService: GuagechartService,
    private funnelChartService: FunnelChartService, private singleValueService: SingleValueService, private dashboardService: DashboardService,private loggerService: LoggerService,
    private tablechartService: TableChartService, private topNGraphService: TopNGraphService
    , private stackedBarGraphService: StackedBarGraphService, private sessionService: SessionService
    , private thresholdService: ThresholdService, private sanitizer: DomSanitizer, private decoderService: DecoderService,
    private guagemeterChartService: GuagemeterChartService, private datasourceService: DatasourceService, private requestBodyService: RequestbodyService, private featureService: FeatureService) {

    // this.name = this.router.getCurrentNavigation().extras.state.example;
  }

  public legendValueData: Object[] =  [
    { id: 'Percent', value: 'Percent' },
    { id: 'Value', value: 'Value' }
  ];
  public legendValue: Object = { text: 'value', value: 'id' };
 public legendLabelData: Object[] = [{ id: 'Value', value: 'Value' }];
  public labelPositionData: Object[] =  [
    { id: 'LabelText', value: 'Pie with Label Text' },
    { id: 'Percent', value: 'Pie with Percent' },
    { id: 'Value', value: 'Pie with Value' },
    { id: 'MLabelText', value: 'Monochrome-Pie with Label Text' },
    { id: 'MPercent', value: 'Monochrome-Pie with Percent' },
    { id: 'MValue', value: 'Monochrome-Pie with Value' }
  ];
  public labelPosition: Object = { text: 'value', value: 'id' };

  ngOnInit(): void {
    this.browserRefresh = browserRefresh;
    if(!this.browserRefresh){
    sessionStorage.setItem("onPageNavigateTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
    } else if (this.browserRefresh) {
      sessionStorage.setItem("isEditGraph", "false");
    }
    this.editFromDashboardSubFId = "";
    this.editFromDashboardAppId = "";
    this.editFromDashboardSubFName = "";
    this.isEditGraph = sessionStorage.getItem("isEditGraph");

    // this.user = <User>(JSON.parse(sessionStorage.getItem('currentUser')));
    this.user = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.currentUser = this.user.userId;
    // let name = this.router.getCurrentNavigation().extras.state.example;
    // console.log(this.name );
    // alert(this.name);

    // this.activatedroute.queryParams.subscribe(data => {
    //   this.pageState = data[0]; 
    // })
    // console.log(this.activatedroute.queryParams);

    //   this.activatedroute.paramMap.subscribe(params => { 
    //     console.log(params);
    //     alert(params);
    //     //  this.id = params.get('id'); 
    //     //  let products=this._productService.getProducts();
    //     //  this.product=products.find(p => p.productID==this.id);    
    //  });
    this.sessionObject.featureName = "Configuration";
    this.sessionObject.menu = "Admin Config"
    this.sessionObject.configTab = "Graph"
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    this.isSortingType =true;
    this.isEditGraphBtn = false;
    this.isForm = true;
    this.isTable = false;
    this.isUploadImage = false;
    this.isImageUpdate = false;
    this.uploadSameImage = false;
    this.isUpdateIcon = false;
    this.isIconName = false;
    this.isSetPreferenceEnable = false;
    this.subFeatureList = [];
    this.getAllFeatureByFeatureType();
    this.graphObj.chartType = "Select";
    this.graphObj.applicationId = "Select";
    this.graphObj.subFeatureId = "";
    this.graphObj.dataSource = "Select";
    this.graphObj.unit = "Select";
    this.graphObj.dataMode = "Select";
    this.graphObj.tableType = "Select";
    this.graphObj.category = "Select";
    this.graphObj.graphBG = "Select";
    this.graphObj.lineAreaFill = "Select";
    this.graphObj.tableSorting = "Select";
    this.graphObj.sortingColumns = "Select";
    this.graphObj.sortingType = "Select";
    this.graphObj.metricID = "";
    this.graphObj.colors = null;
    this.graphObj.tableBorders = "enable";
    this.graphObj.textImageIconType = "Select";
    this.graphObj.ifcount = "Select";
    this.graphObj.pointChildGraphs = "Select";
    this.graphObj.dbType = "Select";
    this.pagevalue = "false";
    this.graphObj.pagination = "enable";	
    this.graphObj.wordWrap = "disable";
    this.graphObj.onBasisOf = "Select";
    this.graphObj.fontSize = "Select";
    this.graphObj.fontStyle="Select";
    this.graphObj.fontWeight="Select";
    this.graphObj.textAlignment = "Select";
    this.graphObj.customDateOrCurrentDateInHeader = false;
    
    let num = 0;
    for(let i = 0 ;i<this.fontSizeArr.length;i++){
      this.fontSizeArr[i] = num + 2;
      num = num+2;
    }

    this.datasourceId=null;
    this.resetQuery();
    this.resetRequestBody();
    this.graphObj.createRequestBody = false;
    // this.appComponenet.changeButtonColor(this.themeService.getMyTheme()); // removed - method does not exist in V2 AppComponent
    // this.getAllGraphs();
    this.userTypeCrudMap = JSON.parse(sessionStorage.getItem("userTypeCrudMapList")).featureGraphMapping;
    // this.graphType.sort();
    this.graphTypes.sort(function (a, b) {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

  

    //this.getAllApplications();
    this.getApplicationByUserId();
    this.getAllDatasourceList();
    if (this.isEditGraph == "true") {
      this.isEditGraphBtn = true;
      // this.appComponenet.setFocus('Admin-Config'); // removed - method does not exist in V2 AppComponent
      let graph: Graph = new Graph();
      graph.chartId = sessionStorage.getItem("editGraphId");
      this.editFromDashboardSubFName = sessionStorage.getItem("editGraphSubFName");
      graph.sessionDTO = this.sessionObject;
      this.getGraphByChartId(graph);
    }
  
  }

  validateIP(value, template: TemplateRef<any>) {
    const re = /^[0-9.]*$/;

    if (!re.test(value)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Only Number and '.' allowed !!");
    }

  }

  validateIP1(ip: string) {
    if (ip) {
      const re = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
      // console.log(re.test(ip));
      return re.test(ip);
    }
    else {
      return true;
    }

  }

  // validatePort(value, template: TemplateRef<any>) {
  //   const re = /^[0-9]*$/;
  //   //const re=/^()([1-9]|[1-5]?[0-9]{2,4}|6[1-4][0-9]{3}|65[1-4][0-9]{2}|655[1-2][0-9]|6553[1-5])$/;

  //   if (!re.test(value)) {
  //     this.isError = true;
  //     this.isSuccess = false;
  //     this.openAlertMod(template, "Kindly provide valid Port Number !!");
  //     // console.log(this.schedulerObj.port);

  //   }


  // }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }
  toggleFieldTextType1() {
    this.fieldTextType1 = !this.fieldTextType1;
  }
  showForm() {
    this.isForm = true;
    this.isTable = false;
    this.isEditGraphBtn = false;
    this.resetGraphObj();
    this.sortingColumnsList = null;
    this.graphObj.isActive  = 'yes';
    this.graphObj.sortingColumns = "Select";
    this.isSortingType = false;
    this.viewGraphObj.subFeatureId = "";
    this.subFeatureList = [];
    this.isSetPreferenceEnable = false;
    this.isSetPreferenceButtonEnable = true;
    this.editSeeAllPage = false;
  }

  testConnection(template: TemplateRef<any>) {
    this.testConnectStatus = "";
    if (!this.graphObj.ipAddress) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide IP Address !!");
      return false;
    }
    else if (this.graphObj.dbType == 'MySql'  && !this.validateIP1(this.graphObj.ipAddress)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Valid IP Address!!");
      return false;
    }
    if (this.graphObj.port && (!this.validateNumber(this.graphObj.port) || !this.validatePort(this.graphObj.port))) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Valid Port !!");
      return;
    }
    if (!this.graphObj.dbName) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Database Name !!");
      return false;
    }
    if (this.graphObj.dbType == "Select" || this.graphObj.dbType == null || this.graphObj.dbType == undefined) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly select Database Type !!");
      return false;
    }
    if (!this.graphObj.dbUsername) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide UserName !!");
      return false;
    }
    if (!this.graphObj.dbPassword) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Password !!");
      return false;
    }
    this.graphObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    this.graphObj.sessionDTO = this.sessionObject;
    this.featureGraphMappingService.testConnection(this.graphObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        // this.msg=response.serviceResponse
        //console.log(this.msg);
        this.isError = false;
        this.isSuccess = true;
        this.testConnectStatus="Connected successfully";
        this.testConnectStatus = response.serviceResponse;
        this.openAlertMod(template, this.testConnectStatus);
      }
      
      else {
        console.log("at 353====="+response.serviceStatus);
        this.testConnectStatus = response.serviceResponse;
        if (this.testConnectStatus === "Database Connected") {
          this.isError = false;
          this.isSuccess = true;
        }
        else {
          this.isError = true;
          this.isSuccess = false;
        }
        this.openAlertMod(template, this.testConnectStatus);
      }
    
    });
    this.graphObj.dbPassword = this.setDecryption(this.graphObj.dbPassword);
  }
  /* Check Table Sorting - Ganesh*/
  checkTableSorting(sortType : String) {
    if(sortType == 'Yes'){
      this.graphObj.tableSorting = "Yes";
    }else{
      this.graphObj.sortingColumns = "Select";
      this.isSortingType = false;
      this.graphObj.sortingType = "Select";
    }
  }
  sortingTypeCheck() {
    if(this.graphObj.sortingColumns == "Select"){
      this.isSortingType = false;
      this.graphObj.sortingType = "Select";
    }else{
      this.isSortingType = true;
    }
  }

  /* set Application and subfeature on cancel update */
  cancelUpdate() {
    let tempObj: any;

    if (this.isImageUpdate) {
      tempObj = this.imageUploadObj;
    } else {
      tempObj = this.graphObj;
    }
    this.appGraphList = [];
    /* for on point sub-graphs */
    this.allPointGraphs = new Map();
    this.pointName = null;

    this.isUpdateIcon = false;
    this.resetGraphObj();
    this.resetImageUploadObj();
    this.showAllGraphList();
    this.viewGraphObj = tempObj;
    this.getGraphDetailByApp(this.viewGraphObj.applicationId, this.viewGraphObj.subFeatureId);
  }

  discardForm() {
    this.resetGraphObj();
    this.resetQuery();
    this.resetRequestBody();
    this.startDate = undefined;
    this.endDate = undefined;
    this.isVisualized = false;
    this.isUploadImage = false;
    this.isImageUpdate = false;
    this.image = null;
  }

  validateNumber(num: string) {
    if (num) {
      const re = /^[0-9]{1,5}$/;
      return re.test(num);
    }
    else {
      return true;
    }
  }

  validatePort(num : any, template?: any){
  if(num != undefined && num != ""){
   num = num.replace(/ /g,'')
  if(num.trim != undefined && num != ""){
    if(num > 0 && num <= 65535){
       return true; 
  }else{
    return false;
  }
  }else{
    return true;
  }
  }
  }
  

  showAllGraphList() {


    this.viewGraphObj.applicationId = "Select";
    this.viewGraphObj.subFeatureId = "";
    this.searchText = "";
    // this.isForm = false; // We want the form to stay visible behind the modal
    // this.isTable = true;
    
    this.graphList = [];
    this.graphObj.chartType ="Select";
    this.isGraph = true;
    this.isStat = true;
    this.isGauge = true;
    this.isStackBar = true;
    this.isTableChart = true;
    this.isText = true;
    this.isFunnel = true;
    this.isPie = true;
    this.isDonut = true;
    this.isEditGraphBtn = false;
    this.isUploadImage = false;
    this.isImageUpdate = false;

    this.isVisualized = false;
    this.graphList = [];
    this.editSeeAllPage = false;
    this.isDefault = true;
    this.isPrefrence = false;//changes
    // this.isSeeAll = true;
    // this.userTypeCrudMap.create = false;
    console.log("isEdit",this.isEditGraphBtn)
    

    console.log("isDefault",this.isDefault)
    console.log("isPrefrence",this.isPrefrence)
    console.log("userTypeCrudMap",this.userTypeCrudMap.view)
    console.log("userTypeCrudMap",this.userTypeCrudMap.create)
    console.log("istabel",this.isTable)

    this.seeAllModalRef = this.modalService.show(this.seeAllModalTemplate, { class: 'modal-xl' });
  }

  closeSeeAllModal() {
    if (this.seeAllModalRef) {
      this.seeAllModalRef.hide();
    }
  }

  showAddGraph() {

    this.isEditGraphBtn = false;
    this.isAddGraphBtn = false;
    // this.getAllGraphs();
    this.resetGraphObj();


  }

  showEditForm(graph: any) {
    // console.log(graph);
    this.closeSeeAllModal();
    this.isEditGraphBtn = true;
    this.isForm = true;
    this.isTable = false;
    this.isUploadImage = false;
    this.nodeGraphIds = [];
    this.graphBorders = [];
    this.allTableColumns = [];
    this.allTableMetricColumns = [];
    this.legendValues = [];
    this.labelPositions = [];
    this.image = null;
    this.isIconName = true;
    this.queryObjList = [];
    this.queryGroupByList = [];
    this.graphObj = graph;
    this.graphObj.isLegendEnabled = JSON.parse(graph.isLegendEnabled);
    this.graphObj.textImageIconType = (this.graphObj.iconName == null) ? "Select" : this.graphObj.textImageIconType;
    this.graphObj.enableTitle = JSON.parse(graph.enableTitle);

    if (graph.createRequestBody != null && graph.createRequestBody == "true") {
      this.graphObj.createRequestBody = true;
    } else {
      this.graphObj.createRequestBody = false;
    }
    // this.allApplications.forEach(element => {
    //   if(element.id == graph.applicationId){
    //     this.graphObj.applicationId = graph.applicationId;
    //   }
    // });
    //this.getAllApplications();
    this.getAllSubFeaturesByApplication(graph.applicationId);
    this.blurVisualisation(this.graphObj.chartType);
    if (this.graphObj.tableHeaders) {
      this.allTableColumns = this.graphObj.tableHeaders.split(",");
      this.tableHeaders = this.graphObj.tableHeaders.split(",");
    }
    if (this.graphObj.metricColumns) {
      this.allTableMetricColumns = this.graphObj.metricColumns.split(",");
      this.metricColumns = this.graphObj.metricColumns.split(",");
    }
    if (!this.graphObj.groupGraphWidgetList) {
      this.graphObj.groupGraphWidgetList = [{}];
    }
    if (this.graphObj.legendValues) {
      this.legendValues = this.graphObj.legendValues.split(",");
    }
    if(this.graphObj.caCertificate)
    {
      this.graphObj.isCAcertificate = 'yes';
    }
    if (this.graphObj.labelPositions) {
      this.labelPositions = this.graphObj.labelPositions.split(",");
    }
    if(this.graphObj.sortingColumns == null){
      this.graphObj.sortingColumns = "Select";
      this.graphObj.sortingType = "Select";
      this.sortingColumnsList = null;
      this.isSortingType = false;
    }else{
      this.isSortingType = true;
      this.sortingColumnsList = this.graphObj.sortingColumns.split(",");
    }
    if(graph.elasticAuthEnable == 'yes'){	
      this.graphObj.isElasticAuthEnabled = "yes";	
    }	
    if(graph.sourceDBEnabled == 'yes'){	
      this.graphObj.isSourceDBEnabled = "yes";	
    }
    if(this.graphObj.dbPassword != null){
      this.graphObj.dbPassword = this.setDecryption(this.graphObj.dbPassword);
    }

    this.graphBorders = graph.graphBorders.split(",");

    this.graphBorders.forEach(element => {
      if (element == "Top") this.isTopBorder = true;
      else if (element == "Right") this.isRightBorder = true;
      else if (element == "Bottom") this.isBottomBorder = true;
      else if (element == "Left") this.isLeftBorder = true;
    });
    
    if(this.graphObj.chartType == "Text"){
      this.customDateInHeader = new Date(this.graphObj.query);
    }

    if (this.graphObj.dataSource == "Elastic Search") {
      this.resetQuery();
      this.datasourceId = this.graphObj.datasourceId;
      if (this.datasourceId != null || this.datasourceId != undefined) {
        this.getfieldByDatasource(this.alertTemplate);
      }
      this.queryObjList = [];
      let queryDetails = this.graphObj.queryDetails;
      let queryDetailsLength = queryDetails.length;
      for (let i = 0; i < queryDetailsLength; i++) {

        let tempQueryObj = new Query();
        let metricTemplist = queryDetails[i].queryMetricList;
        let metricTempLength = metricTemplist.length;
        for (let k = 0; k < metricTempLength; k++) {
          let metricTemp = new Metric();
          metricTemp.metricType = metricTemplist[k].metricType;
          metricTemp.metricField = metricTemplist[k].metricField;
          metricTemp.derivateField = metricTemplist[k].derivateField;
          metricTemp.derivateUnit = metricTemplist[k].derivateUnit;
          metricTemp.derivativeMetricIndexNo = metricTemplist[k].derivativeMetricIndexNo;
          metricTemp.bucketScriptValue = metricTemplist[k].bucketScriptValue;
          metricTemp.queryMetricId = metricTemplist[k].queryMetricId;
          if (metricTemplist[k].metricBucketScriptList != null && metricTemplist[k].metricBucketScriptList.length > 0) {
            let bucketScriptListLength = metricTemplist[k].metricBucketScriptList.length
            for (let a = 0; a < bucketScriptListLength; a++) {
              let bucketScriptObj = new BucketScript();
              bucketScriptObj.bucketScriptField = metricTemplist[k].metricBucketScriptList[a].bucketScriptField;
              bucketScriptObj.bucketScriptVariable = metricTemplist[k].metricBucketScriptList[a].bucketScriptVariable;
              bucketScriptObj.derivativeMetricIndexNo = metricTemplist[k].metricBucketScriptList[a].derivativeMetricIndexNo;
              metricTemp.metricBucketScriptList.push(bucketScriptObj);
            }
          }
          tempQueryObj.queryMetricList.push(metricTemp);
          this.queryMetricTypeChanged(tempQueryObj, metricTemp, i);
        }
        tempQueryObj.id = queryDetails[i].id;
        tempQueryObj.rawDataSize = queryDetails[i].rawDataSize;
        tempQueryObj.luceneQuery = queryDetails[i].luceneQuery;
        let queryGroupByList = queryDetails[i].queryGroupByList;
        let queryGroupByListLength = queryGroupByList.length;

        for (let j = 0; j < queryGroupByListLength; j++) {
          let tempQueryGroupByObj = new QueryGroupBy();
          tempQueryGroupByObj.termsField = queryGroupByList[j].termsField;
          tempQueryGroupByObj.termsOrder = queryGroupByList[j].termsOrder;
          tempQueryGroupByObj.termsSize = queryGroupByList[j].termsSize;
          tempQueryGroupByObj.termsMinDocCount = queryGroupByList[j].termsMinDocCount;
          tempQueryGroupByObj.filtersQuery = queryGroupByList[j].filtersQuery;
          tempQueryGroupByObj.filtersLabel = queryGroupByList[j].filtersLabel;
          tempQueryGroupByObj.dateHistogramField = queryGroupByList[j].dateHistogramField;
          tempQueryGroupByObj.dateHistogramMinDocCount = queryGroupByList[j].dateHistogramMinDocCount;
          tempQueryGroupByObj.interval = queryGroupByList[j].interval;
          tempQueryGroupByObj.groupBy = queryGroupByList[j].groupBy;

          if (tempQueryGroupByObj.groupBy == "Terms") {
            tempQueryGroupByObj.isDateHistogram = false;
            tempQueryGroupByObj.isFilters = false;
            tempQueryGroupByObj.isTerms = true;
          } else if (tempQueryGroupByObj.groupBy == "Filters") {
            tempQueryGroupByObj.isDateHistogram = false;
            tempQueryGroupByObj.isFilters = true;
            tempQueryGroupByObj.isTerms = false;
          } else if (tempQueryGroupByObj.groupBy == "DateHistogram") {
            tempQueryGroupByObj.isDateHistogram = true;
            tempQueryGroupByObj.isFilters = false;
            tempQueryGroupByObj.isTerms = false;
          }
          tempQueryObj.queryGroupByList.push(tempQueryGroupByObj);
        }
        this.queryObjList.push(tempQueryObj);
      }
    }

  }

  showUpdateImage(graph: any) {

    this.isEditGraphBtn = false;
    this.isForm = false;
    this.isTable = false;
    this.isUploadImage = true;
    this.isImageUpdate = true;
    this.nodeGraphIds = [];

    //this.imageUploadObj = graph;
    this.imageUploadObj.id = graph.id;
    this.imageUploadObj.imageId = graph.chartId;
    this.imageUploadObj.imageName = graph.chartName;
    this.imageUploadObj.imageTitle = graph.chartTitle;
    this.imageUploadObj.applicationId = graph.applicationId;
    this.imageUploadObj.subFeatureId = graph.subFeatureId;

    /* 
      saving graph Obj to reset preview & name,
      If upload same image toggled on After new image is uploaded first. 
    */
    this.sameImage = graph;
    // alert("id : "+ graph.id);

    this.getAllSubFeaturesByApplication(graph.applicationId);
  }



  getAllApplications() {
    this.applicationService.getAllApplications(this.sessionObject).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.allApplications = response.serviceResponse;
      }
    });
  }

  getApplicationByUserId() {
    this.user.sessionDTO = this.sessionObject;
    this.applicationService.getFullApplicationData(this.currentUser.userId, 'SRG', this.sessionObject).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.allApplications = response.serviceResponse.applications;
        this.allApplications.sort(function (a, b) {
          return a.applicationName.toLowerCase().localeCompare(b.applicationName.toLowerCase());
        });

      }
    });
  }

  getAllFeatureByFeatureType() {
    let fm = new FeatureMaster();
    fm.sessionDTO = this.sessionObject;
    fm.featureType = 'APP';
    this.featureGraphMappingService.getAllFeatureByFeatureType(fm).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.featureList = response.serviceResponse;
      }
    });
  }

  getSubFeaturesByFeatureId(featureId: any) {
    console.log("In getSubFeature");
    let fm = new FeatureMaster();
    fm.id = featureId;
    fm.sessionDTO = this.sessionObject;
    this.featureGraphMappingService.getSubFeaturesByFeatureId(fm).pipe(first()).subscribe((response: any) => {
      this.subFeatureList = response.serviceResponse;
    });
  }

  // getSubFeaturesByFeatureName(featureName: any) {
  //   console.log("In getSubFeature");
  //   this.featureGraphMappingService.getSubFeaturesByFeatureName(featureName).pipe(first()).subscribe((response: any) => {
  //     this.subFeatureList = response.serviceResponse;
  //   });
  // }

  getUpdatedSubFeaturesByApplication(applicationId: any) {
    this.imageUploadObj.subFeatureId = "Select";
    this.featureService.getSubFeaturesByAppIdAndType(applicationId, 'SRG').pipe(first()).subscribe((response: any) => {
      if (response && response.serviceStatus == 'Success') {
        this.subFeatureList = response.serviceResponse;

      }
    });

  }
  getAllGraphInSubfeature() {
    this.groupgraphList = [];
    if (this.graphObj.applicationId && this.graphObj.subFeatureId && this.graphObj.category) {
      let data = {applicationId:this.graphObj.applicationId,  subFeatureId: this.graphObj.subFeatureId ,category: this.graphObj.category,sessionDTO :this.sessionObject};
      if (this.isEditGraph == "true") {
        data.subFeatureId = this.editFromDashboardSubFId;
        data.applicationId = this.editFromDashboardAppId;
      }
      this.userService.getAllGraphInSubfeature(data).pipe(first()).subscribe((response: any) => {
        if (response.serviceStatus == 'Success') {
          this.groupgraphList = response.serviceResponse;
        }
      });
    }
  }

  getAllSubFeatureByAppId(applicationId: any) {
    console.log('[DEBUG] getAllSubFeatureByAppId called with:', applicationId);
    console.log('[DEBUG] allApplications sample:', this.allApplications && this.allApplications[0]);
    this.graphList = [];
    if (!applicationId || applicationId === 'Select') {
      return;
    }
    this.featureService.getSubFeaturesByAppIdAndType(applicationId, 'SRG').pipe(first()).subscribe((response: any) => {
      console.log('[DEBUG] getSubFeaturesByAppIdAndType response:', response);
      if (response && response.serviceStatus == 'Success') {
        this.subFeatureList = response.serviceResponse;
      }
    });
  }

  getAllSubFeaturesByApplication(applicationId: any) {
    if (!this.isEditGraphBtn == true) {
      this.graphObj.subFeatureId = "Select";
    }
    this.subFeatureList = [];
    this.graphList = [];
    if (this.isUploadImage && !this.isImageUpdate) {
      this.imageUploadObj.subFeatureId = "Select";
    }	
    if(this.viewGraphObj.applicationId != applicationId){	
      this.graphObj.subFeatureId = "Select";	
      this.graphObj.metricID = null;	
    }
    this.viewGraphObj.subFeatureId = null;
    this.featureService.getSubFeaturesByAppIdAndType(applicationId, 'SRG').pipe(first()).subscribe((response: any) => {
      if (response && response.serviceStatus == 'Success') {
        this.subFeatureList = response.serviceResponse;
      }
    });
    let data = {applicationId:applicationId ,chartId :this.graphObj.id, sessionDTO : this.sessionObject }
    this.userService.getGraphByApplicationID(data).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.appGraphList = response.serviceResponse[0];
        this.nodeGraphIds = response.serviceResponse[1];
        this.appGraphList.forEach((value, index) => {
          if (value.id == this.graphObj.id) this.appGraphList.splice(index, 1);
        });
      }
    });
    this.getAllGraphInSubfeature();
    this.getMetricName(applicationId);
  }

  getAllGraphs() {
    this.graphList = [];
    this.featureGraphMappingService.getAllGraphs(this.sessionObject).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.graphList = response.serviceResponse;
      }
    });
  }

  submitFeatureGraphMap(template: TemplateRef<any>) {

    console.log(this.graphObj);
    // this.isError = false;
    // this.isSuccess = false;

    // const regex_chartName = /^[a-zA-Z_ ]*$/;
    // if (!regex_chartName.test(this.graphObj.chartName)) {
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Graph Name Not Valid - Allow Only Alphabets,Underscore & Space");
    //   return;
    // }

    // const regex_chartTitle = /^[a-zA-Z-_ ]*$/;
    // if (!regex_chartTitle.test(this.graphObj.chartTitle)) {
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Graph Title Not Valid - Allow Only Alphabets,Underscore,Dash & Space");
    //   return;
    // }
    // const regex = /^[a-zA-Z0-9-_]*$/;
    // if (!regex.test(this.graphObj.chartId)) {
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Graph Id Not Valid - Allow Only Alphanumeric,Underscore,Dash");
    //   return;
    // }

    // if(this.graphObj.chartType !="IFrame"){
    //   if (this.graphObj.chartName == null || this.graphObj.chartName == ""
    //     || this.graphObj.chartTitle == null || this.graphObj.chartTitle == ""
    //     || this.graphObj.chartId == null || this.graphObj.chartId == ""
    //     || this.graphObj.chartType == null || this.graphObj.chartType == ""
    //     || this.graphObj.chartType == "Select" || this.graphObj.applicationId == "Select"
    //     || this.graphObj.applicationId == null || this.graphObj.applicationId == ""
    //     || this.graphObj.subFeatureId == null || this.graphObj.subFeatureId == ""
    //     || this.graphObj.subFeatureId == "Select" || this.graphObj.dataSource == "Select"
    //     || this.graphObj.dataSource == null || this.graphObj.dataSource == ""
    //     || this.graphObj.unit == null || this.graphObj.unit == "" || this.graphObj.unit == "Select"
    //     || this.graphObj.query == null || this.graphObj.query.trim() == ""
    //     || this.graphObj.graphBG == null || this.graphObj.graphBG == "Select"
    //     || this.graphObj.graphBG == "") {

    //       this.isError = true;
    //       this.isSuccess = false;
    //       this.openAlertMod(template, "All Mandatory(*) Fields Are Required");
    //       return;
    //   }
    // }


    // if (this.graphObj.dataSource == 'Elastic Search') {
    //   if (this.graphObj.requestBody == null || this.graphObj.requestBody == "") {
    //     this.isError = true;
    //     this.isSuccess = false;
    //     this.openAlertMod(template, "Kindly Enter Request Body");
    //     return;
    //   }
    // }
    // this.graphObj.nodeGraphId = [];
    // this.graphObj.nodeGraphId = this.nodeGraphIds;
    // // for(let id in this.nodeGraphIds){
    // //   this.graphObj.nodeGraphId.push(this.nodeGraphIds[id]);
    // // }
    // this.graphObj.createdBy = this.currentUser;
    // if(this.graphObj.chartType =="IFrame"){
    //   this.graphObj.category = "host";
    // }

    // // Background Color
    // if(this.bgColor != null){
    //   this.graphObj.bgColor = this.bgColor;
    // }

    this.isError = false;
    this.isSuccess = false;

    const regex_chartName = /^[a-zA-Z0-9()%-]*$/;
    if (this.graphObj.chartName == "" || this.graphObj.chartName == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Name !!");
      return;
    }

    if (!regex_chartName.test(this.graphObj.chartName)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Name Not Valid - Only AlphaNumeric,dash,Open and Closed bracket & Percentage symbols are allowed");
      return;
    }
    if (this.graphObj.chartTitle == "" || this.graphObj.chartTitle == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Title !!");
      return;
    }

    const regex_chartTitle = /^[ A-Za-z0-9_()%\s-]*$/;
    if (!regex_chartTitle.test(this.graphObj.chartTitle)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Title Not Valid - Only AlphaNumeric,Hyphen,Underscore,Space,Round bracket & Percentage symbols are allowed");
      return;
    }

    if (this.graphObj.chartId == "" || this.graphObj.chartId == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Id !!");
      return;
    }

    const regex = /^[a-zA-Z0-9_:,. -]*$/;
    if (!regex.test(this.graphObj.chartId)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Id Not Valid - Allow Only Alphanumeric,Underscore,Dash");
      return;
    }
    if (this.graphObj.chartType == "Select" || this.graphObj.chartType == null || this.graphObj.chartType == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Type !!");
      return;
    }

    if (this.graphObj.chartType != "IFrame" && this.graphObj.chartType != "Group") {
      if (this.graphObj.dataSource == "Select" || this.graphObj.dataSource == null || this.graphObj.dataSource == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Data Source !!");
        return;
      }
      if (this.graphObj.chartType == 'Table' || this.graphObj.chartType == 'RAG Table') {
        if (this.graphObj.tableType == "Select" || this.graphObj.tableType == null || this.graphObj.tableType == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly provide Table Type !!");
          return;
        }
      }
      if (this.graphObj.chartType == 'Bar' || this.graphObj.chartType == 'Column' ||
        this.graphObj.chartType == 'Line' || this.graphObj.chartType == 'Stacked Bar' ||
        this.graphObj.chartType == 'Stacked Column') {
        if (this.graphObj.dataMode == "Select" || this.graphObj.dataMode == null || this.graphObj.dataMode == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly provide Data Mode !!");
          return;
        }
      }

      if (this.graphObj.unit == "Select" && this.graphObj.dataSource != 'NA' || this.graphObj.unit == null && this.graphObj.dataSource != 'NA' || this.graphObj.unit == "" && this.graphObj.dataSource != 'NA') {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Data Unit !!");
        return;
      }
      if (this.graphObj.category == "Select" || this.graphObj.category == null || this.graphObj.category == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Graph Category !!");
        return;
      }

      /* Point Child Graphs */
      if (this.graphObj.chartType == 'Pie' || this.graphObj.chartType == 'DoughNut') {
        if (this.graphObj.pointChildGraphs == "Select" || this.graphObj.pointChildGraphs == null || this.graphObj.pointChildGraphs == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly provide Point Child Graphs !!");
          return;
        }
      }

      if (this.graphObj.applicationId == "Select" || this.graphObj.applicationId == null || this.graphObj.applicationId == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Application Name !!");
        return;
      }
      if (this.graphObj.subFeatureId == "Select" || this.graphObj.subFeatureId == null || this.graphObj.subFeatureId == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Sub Feature !!");
        return;
      }

      // if (this.graphObj.category == 'host') {
      //   if (this.nodeGraphIds == undefined) {
      //     this.isError = true;
      //     this.isSuccess = false;
      //     this.openAlertMod(template, "Kindly provide Child Graph !!");
      //     return;
      //   }
      // }
      if ((this.graphObj.chartType == 'RAG Table' || this.graphObj.chartType == 'Gauge' || this.graphObj.pointChildGraphs == 'RAG') && !this.graphObj.metricID) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Metric Name !!");
        return;
      }

    }
    if (this.graphObj.applicationId == "Select" || this.graphObj.applicationId == null || this.graphObj.applicationId == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Application Name!!");
      return;
    }
    if (this.graphObj.subFeatureId == "Select" || this.graphObj.subFeatureId == null || this.graphObj.subFeatureId == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Sub Feature !!");
      return;
    }

    if (this.graphObj.graphBG == "Select" || this.graphObj.graphBG == null || this.graphObj.graphBG == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Background !!");
      return;
    }
    if (this.graphObj.chartType == 'Table' || this.graphObj.chartType == 'RAG Table') {
      if (this.graphObj.tableSorting== "Select" || this.graphObj.tableSorting == null) {
         this.isError = true;
         this.isSuccess = false;
         this.openAlertMod(template, "Kindly provide table sorting !!");
        return;
      }
    }

    if(this.graphObj.sortingColumns == "Select" || this.graphObj.sortingColumns == null){
      this.graphObj.sortingColumns = null;
      this.graphObj.sortingType = null;
    }
    else if(this.graphObj.sortingType == "Select" || this.graphObj.sortingType == null || this.graphObj.sortingType == ""){
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Sorting Type !!");
      return;
    }
    
    if(this.graphObj.isSourceDBEnabled == "yes" || this.graphObj.dataSource == "Database"){

      if (!this.graphObj.ipAddress) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide IP Address !!");
        return false;
      }
      else if (this.graphObj.dbType == 'MySql'  && !this.validateIP1(this.graphObj.ipAddress)) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Valid IP Address!!");
        return false;
      }
      if (this.graphObj.port && (!this.validateNumber(this.graphObj.port) || !this.validatePort(this.graphObj.port))) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Valid Port !!");
        return false;
      }
      if (!this.graphObj.dbName) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Database Name !!");
        return false;
      }
      if (this.graphObj.dbType == "Select" || this.graphObj.dbType == null || this.graphObj.dbType == undefined) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly select Database Type !!");
        return false;
      }
      if (!this.graphObj.dbUsername) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide UserName !!");
        return false;
      }
      if (!this.graphObj.dbPassword) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Password !!");
        return false;
      }
      if (!this.graphObj.dbQuery) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide DB Query !!");
        return false;
      }

    }

    // if(this.graphObj.chartType =="" && this.graphObj.tableType == "Select")
    // {
    //   alert();
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Kindly provide Table Type !!");
    //   return;
    // }
    // if(this.graphObj.chartType !="IFrame"){
    //   if (this.graphObj.chartName == null || this.graphObj.chartName == ""
    //     || this.graphObj.chartTitle == null || this.graphObj.chartTitle == ""
    //     || this.graphObj.chartId == null || this.graphObj.chartId == ""
    //     || this.graphObj.chartType == null || this.graphObj.chartType == ""
    //     || this.graphObj.chartType == "Select" || this.graphObj.applicationId == "Select"
    //     || this.graphObj.applicationId == null || this.graphObj.applicationId == ""
    //     || this.graphObj.subFeatureId == null || this.graphObj.subFeatureId == ""
    //     || this.graphObj.subFeatureId == "Select" || this.graphObj.dataSource == "Select"
    //     || this.graphObj.dataSource == null || this.graphObj.dataSource == ""
    //     || this.graphObj.unit == null || this.graphObj.unit == "" || this.graphObj.unit == "Select"
    //     || this.graphObj.query == null || this.graphObj.query.trim() == "") {

    //       this.isError = true;
    //       this.isSuccess = false;
    //       this.openAlertMod(template, "All Mandatory(*) Fields Are Required");
    //       return;
    //   }
    // }
    if (this.graphObj.dataSource == 'Database' || this.graphObj.chartType == 'IFrame') {
      if (this.graphObj.dbQuery == "" || this.graphObj.dbQuery == null) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Query !!");
        return;
      }
    }


    if (this.graphObj.dataSource == 'Elastic Search') {
      if(this.graphObj.isElasticAuthEnabled=='yes'){
        if (this.graphObj.elasticUser == null || this.graphObj.elasticUser == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly Provide Elastic username !!");
          return;
        }
        if (this.graphObj.elasticPassword == null || this.graphObj.elasticPassword == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly Provide Elastic Password !!");
          return;
        }
      }
      if (this.graphObj.isCAcertificate == 'yes') {
        if (this.graphObj.caCertificate == null || this.graphObj.caCertificate == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly Provide CA/SSL Certificate !!");
          return;
        }
      }else{
        this.graphObj.caCertificate = null;
      }
      if (this.graphObj.query == null || this.graphObj.query == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly Provide API !!");
        return;
      }
      if (this.graphObj.requestBody == null || this.graphObj.requestBody == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly Provide Request Body !!");
        return;
      }
    }
    this.graphObj.nodeGraphId = [];
    if (this.nodeGraphIds && this.nodeGraphIds.length > 0) {
      this.nodeGraphIds.forEach((node: any) => {
        if (node && typeof node === 'object' && node.id) {
          this.graphObj.nodeGraphId.push(node.id);
        } else {
          this.graphObj.nodeGraphId.push(node);
        }
      });
    }
    // for(let id in this.nodeGraphIds){
    //   this.graphObj.nodeGraphId.push(this.nodeGraphIds[id]);
    // }
    this.graphObj.createdBy = this.currentUser;
    if (this.graphObj.chartType == "IFrame") {
      this.graphObj.category = "host";
    }

    if (this.graphObj.chartType == "Line") {
      if (this.graphObj.lineAreaFill == "Select" || this.graphObj.lineAreaFill == "" || this.graphObj.lineAreaFill == null) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Line Graph Area Fill !!");
        return;
      }
    }

    if (this.graphObj.chartType == 'Table' || this.graphObj.chartType == 'RAG Table') {
      if (this.graphObj.tableSorting == "Select" || this.graphObj.tableSorting == null || this.graphObj.tableSorting == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Table Sorting !!");
        return;
      }
    }

    // if (this.graphObj.chartType == "Text Value") {
    //   if (this.graphObj.graphTitlePosition == "" || this.graphObj.graphTitlePosition == null || this.graphObj.graphTitlePosition == "Select") {
    //     this.isError = true;
    //     this.isSuccess = false;
    //     this.openAlertMod(template, "Kindly provide Title Position !!");
    //     return;
    //   }
    // }

    // if (this.graphObj.graphDescription == "" || this.graphObj.graphDescription == null) {
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Kindly provide Graph Description !!");
    //   return;
    // }

    // Background Color
    if (this.bgColor != null) {
      this.graphObj.bgColor = this.bgColor;
    }
    if (this.graphTitleFontColor != null) {
      this.graphObj.graphTitleFontColor = this.graphTitleFontColor;
    }
    if (this.tableHeaders) {
      this.graphObj.tableHeaders = this.tableHeaders.map((x:any) => x.item_id || x).join(',');
    }
    if (this.metricColumns) {
      this.graphObj.metricColumns = this.metricColumns.map((x:any) => x.item_id || x).join(',');
    }

    if (this.allPointGraphs.size != 0) {
      const convMap = {};
      this.allPointGraphs.forEach((val: Graph[], key: string) => {
        convMap[key] = val;
      });
      this.graphObj.pointChildGraphList = convMap;
    }
    if(this.legendValues && this.legendValues.length != 0){
      this.graphObj.legendValues = this.legendValues.map((x:any) => x.id || x).join(',');
    }else{
      this.graphObj.legendValues = null;
    }
    if(this.labelPositions && this.labelPositions.length != 0){
      this.graphObj.labelPositions = this.labelPositions.map((x:any) => x.id || x).join(',');
    }else{
      this.graphObj.labelPositions = null;
    }
    this.graphObj.graphBorders = this.graphBorders.toString();
    // if (this.nodeGraphIds !== null) {
    //   if (this.nodeGraphIds.length === 0) {
    //     return;
    //   }
    //   else {
    //     if (this.graphObj.category === 'node' && this.nodeGraphIds !== null) {
    //       alert("subchild added");
    //       this.graphObj.hasSubChild = true;
    //     }
    //   }
    // }

    if(this.graphObj.dbPassword != null){
      this.graphObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    }
    if(this.graphObj.chartType == "Text"  && this.graphObj.timeInHeaders){
      var d = new Date(this.customDateInHeader).toLocaleString(undefined, {timeZone: 'Asia/Kolkata'});
      this.graphObj.query = d;
    }
    if (this.graphObj.metricID === "") {
      this.graphObj.metricID = null as any;
    }
    this.graphObj.queryDetails = this.queryObjList;
    this.graphObj.datasourceId = this.datasourceId;
    this.graphObj.sessionDTO = this.sessionObject;
    this.featureGraphMappingService.createGraphFeatureMap(this.graphObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        if (this.graphObj.textImageIconType == 'file') {
          const formData = new FormData();
          formData.append("graphID", response.serviceResponse[0].id);
          formData.append("image", this.image);

          this.updateGraphTextIconImage(formData);
        }

        this.isError = false;
        this.isSuccess = true;
        this.openAlertMod(template, response.serviceResponse[1]);
        this.resetGraphObj();
        this.showAllGraphList();
      } else {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, response.serviceResponse);
      }
    });
  }

  updateGraphTextIconImage(fd: FormData) {
    this.featureGraphMappingService.updateGraphTextIconImage(this.sessionObject,fd).pipe(first()).subscribe((response: any) => {

    });

  }

  updateFeatureGraphMap(template: TemplateRef<any>) {
    // this.isError = false;
    // this.isSuccess = false;

    // const regex_chartName = /^[a-zA-Z_ ]*$/;
    // if (!regex_chartName.test(this.graphObj.chartName)) {
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Graph Name Not Valid - Allow Only Alphabets,Underscore & Space");
    //   return;
    // }

    // const regex_chartTitle = /^[a-zA-Z-_ ]*$/;
    // if (!regex_chartTitle.test(this.graphObj.chartTitle)) {
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Graph Title Not Valid - Allow Only Alphabets,Underscore,Dash & Space");
    //   return;
    // }
    // const regex = /^[a-zA-Z0-9-_]*$/;
    // if (!regex.test(this.graphObj.chartId)) {
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Graph Id Not Valid - Allow Only Alphanumeric,Underscore,Dash");
    //   return;
    // }

    // if (this.graphObj.chartName == null || this.graphObj.chartName == ""
    //   || this.graphObj.chartTitle == null || this.graphObj.chartTitle == ""
    //   || this.graphObj.chartId == null || this.graphObj.chartId == ""
    //   || this.graphObj.chartType == null || this.graphObj.chartType == ""
    //   || this.graphObj.applicationId == null || this.graphObj.applicationId == ""
    //   || this.graphObj.subFeatureId == null || this.graphObj.subFeatureId == ""
    //   || this.graphObj.dataSource == null || this.graphObj.dataSource == ""
    //   || this.graphObj.unit == null || this.graphObj.unit == ""
    //   || this.graphObj.query == null || this.graphObj.query.trim() == ""
    //   || this.graphObj.graphBG == null || this.graphObj.graphBG == "Select"
    //   || this.graphObj.graphBG == "") {

    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "All Mandatory(*) Fields Are Required");
    //   return;
    // }

    // if(this.graphObj.chartType=='Table'){
    //   if(!this.graphObj.tableType){
    //     this.isError = true;
    //     this.isSuccess = false;
    //     this.openAlertMod(template, "Kindly Enter Table Type...");
    //     return;
    //   }
    // }

    // if(this.graphObj.chartType=='Bar' || this.graphObj.chartType=='Column' || 
    //       this.graphObj.chartType=='Line' || this.graphObj.chartType=='Stacked Bar' || 
    //       this.graphObj.chartType=='Stacked Column'){
    //   if(!this.graphObj.dataMode){
    //     this.isError = true;
    //     this.isSuccess = false;
    //     this.openAlertMod(template, "Kindly Enter Data Mode...");
    //     return;
    //   }
    // }

    // if (this.graphObj.dataSource == 'Elastic Search') {
    //   if (this.graphObj.requestBody == null || this.graphObj.requestBody == "") {
    //     this.isError = true;
    //     this.isSuccess = false;
    //     this.openAlertMod(template, "Kindly Enter Request Body");
    //     return;
    //   }
    // }

    // this.graphObj.editedBy = this.currentUser;
    // this.graphObj.nodeGraphId = [];
    // this.graphObj.nodeGraphId = this.nodeGraphIds;
    // // for(let id in this.nodeGraphIds){
    // //   this.graphObj.nodeGraphId.push(this.nodeGraphIds[id]);
    // // }

    // // Background Color
    // if(this.bgColor != null){
    //   this.graphObj.bgColor = this.bgColor;
    // }

    // console.log(this.graphObj);


    this.isError = false;
    this.isSuccess = false;

    const regex_chartName = /^[a-zA-Z0-9-()%]*$/;
    if (this.graphObj.chartName == "" || this.graphObj.chartName == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Name !!");
      return;
    }

    if (!regex_chartName.test(this.graphObj.chartName)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Name Not Valid - Only AlphaNumeric,dash,Open and Closed bracket & Percentage symbols are allowed");
      return;
    }
    if (this.graphObj.chartTitle == "" || this.graphObj.chartTitle == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Title !!");
      return;
    }

    const regex_chartTitle = /^[ A-Za-z0-9_()%\s-]*$/;
    if (!regex_chartTitle.test(this.graphObj.chartTitle)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Title Not Valid - Only AlphaNumeric,Hyphen,Underscore,Space,Round bracket & Percentage symbols are allowed");
      return;
    }

    if (this.graphObj.chartId == "" || this.graphObj.chartId == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Id !!");
      return;
    }

    const regex = /^[a-zA-Z0-9_:,. -]*$/;
    if (!regex.test(this.graphObj.chartId)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Id Not Valid - Allow Only Alphanumeric,Underscore,Dash");
      return;
    }
    if (this.graphObj.chartType == "Select") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Type !!");
      return;
    }

    if (this.graphObj.chartType != "IFrame" && this.graphObj.chartType != "Group") {
      if (this.graphObj.dataSource == "Select") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Data Source !!");
        return;
      }
      if (this.graphObj.chartType == 'Table' || this.graphObj.chartType == 'RAG Table') {
        if (this.graphObj.tableType == "Select") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly provide Table Type !!");
          return;
        }
        if(this.graphObj.sortingColumns == "Select" || this.graphObj.sortingColumns == null){
          this.graphObj.sortingColumns = null;
          this.graphObj.sortingType = null;
        }
        else if(this.graphObj.sortingType == "Select" || this.graphObj.sortingType == null || this.graphObj.sortingType == ""){
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly provide Sorting Type !!");
          return;
        }
      }
      if (this.graphObj.chartType == 'Bar' || this.graphObj.chartType == 'Column' ||
        this.graphObj.chartType == 'Line' || this.graphObj.chartType == 'Stacked Bar' ||
        this.graphObj.chartType == 'Stacked Column') {
        if (this.graphObj.dataMode == "Select") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly provide Data Mode !!");
          return;
        }
      }

      if (this.graphObj.unit == "Select" && this.graphObj.dataSource != 'NA') {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Data Unit !!");
        return;
      }
      if (this.graphObj.category == "Select") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Graph Category !!");
        return;
      }

      /* Point Child Graphs */
      if (this.graphObj.chartType == 'Pie' || this.graphObj.chartType == 'DoughNut') {
        if (this.graphObj.pointChildGraphs == "Select" || this.graphObj.pointChildGraphs == null || this.graphObj.pointChildGraphs == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly provide Point Child Graphs !!");
          return;
        }
      }

      if (this.graphObj.applicationId == "Select") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Application Name!!");
        return;
      }
      if (this.graphObj.subFeatureId == "Select" || this.graphObj.subFeatureId == null || this.graphObj.subFeatureId == "" ) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Sub Feature !!");
        return;
      }

      // if (this.graphObj.category == 'host') {
      //   if (this.nodeGraphIds == undefined) {
      //     this.isError = true;
      //     this.isSuccess = false;
      //     this.openAlertMod(template, "Kindly provide Child Graph !!");
      //     return;
      //   }
      // }
      if ((this.graphObj.chartType == 'RAG Table' || this.graphObj.chartType == 'Gauge' || this.graphObj.pointChildGraphs == 'RAG') && !this.graphObj.metricID) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Metric Name !!");
        return;
      }

    }
    if (this.graphObj.applicationId == "Select") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Application Name!!");
      return;
    }
    if (this.graphObj.subFeatureId == "Select") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Sub Feature !!");
      return;
    }

    if (this.graphObj.graphBG == "Select" || this.graphObj.graphBG == null || this.graphObj.graphBG == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Background !!");
      return;
    }
    // if(this.graphObj.chartType =="" && this.graphObj.tableType == "Select")
    // {
    //   alert();
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Kindly provide Table Type !!");
    //   return;
    // }
    // if(this.graphObj.chartType !="IFrame"){
    //   if (this.graphObj.chartName == null || this.graphObj.chartName == ""
    //     || this.graphObj.chartTitle == null || this.graphObj.chartTitle == ""
    //     || this.graphObj.chartId == null || this.graphObj.chartId == ""
    //     || this.graphObj.chartType == null || this.graphObj.chartType == ""
    //     || this.graphObj.chartType == "Select" || this.graphObj.applicationId == "Select"
    //     || this.graphObj.applicationId == null || this.graphObj.applicationId == ""
    //     || this.graphObj.subFeatureId == null || this.graphObj.subFeatureId == ""
    //     || this.graphObj.subFeatureId == "Select" || this.graphObj.dataSource == "Select"
    //     || this.graphObj.dataSource == null || this.graphObj.dataSource == ""
    //     || this.graphObj.unit == null || this.graphObj.unit == "" || this.graphObj.unit == "Select"
    //     || this.graphObj.query == null || this.graphObj.query.trim() == "") {

    //       this.isError = true;
    //       this.isSuccess = false;
    //       this.openAlertMod(template, "All Mandatory(*) Fields Are Required");
    //       return;
    //   }
    // }
    if (this.graphObj.dataSource == 'Database' || this.graphObj.chartType == 'IFrame') {
      if (this.graphObj.dbQuery == "" || this.graphObj.dbQuery == null) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Query !!");
        return;
      }
    }

    if(this.graphObj.isSourceDBEnabled == "yes" || this.graphObj.dataSource == "Database"){

      if (!this.graphObj.ipAddress) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide IP Address !!");
        return false;
      }
      else if (this.graphObj.dbType == 'MySql'  &&  !this.validateIP1(this.graphObj.ipAddress)) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Valid IP Address!!");
        return false;
      }
      if (this.graphObj.port && (!this.validateNumber(this.graphObj.port) || !this.validatePort(this.graphObj.port))) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Valid Port !!");
        return false;
      }
      if (!this.graphObj.dbName) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Database Name !!");
        return false;
      }
      if (this.graphObj.dbType == "Select" || this.graphObj.dbType == null || this.graphObj.dbType == undefined) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly select Database Type !!");
        return false;
      }
      if (!this.graphObj.dbUsername) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide UserName !!");
        return false;
      }
      if (!this.graphObj.dbPassword) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Password !!");
        return false;
      }
      if (!this.graphObj.dbQuery) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide DB Query !!");
        return false;
      }

    }


    if (this.graphObj.dataSource == 'Elastic Search') {
      if(this.graphObj.isElasticAuthEnabled=='yes'){
        if (this.graphObj.elasticUser == null || this.graphObj.elasticUser == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly Provide Elastic username !!");
          return;
        }
        if (this.graphObj.elasticPassword == null || this.graphObj.elasticPassword == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly Provide Elastic Password !!");
          return;
        }
      }
      if (this.graphObj.isCAcertificate == 'yes') {
        if (this.graphObj.caCertificate == null || this.graphObj.caCertificate == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly Provide CA/SSL Certificate !!");
          return;
        }
      }else{
        this.graphObj.caCertificate = null;
      }
      if (this.graphObj.query == null || this.graphObj.query == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly Provide API !!");
        return;
      }
      if (this.graphObj.requestBody == null || this.graphObj.requestBody == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly Provide Request Body !!");
        return;
      }
    }
    this.graphObj.nodeGraphId = [];
    if (this.nodeGraphIds && this.nodeGraphIds.length > 0) {
      this.nodeGraphIds.forEach((node: any) => {
        if (node && typeof node === 'object' && node.id) {
          this.graphObj.nodeGraphId.push(node.id);
        } else {
          this.graphObj.nodeGraphId.push(node);
        }
      });
    }
    // for(let id in this.nodeGraphIds){
    //   this.graphObj.nodeGraphId.push(this.nodeGraphIds[id]);
    // }
    this.graphObj.createdBy = this.currentUser;
    if (this.graphObj.chartType == "IFrame") {
      this.graphObj.category = "host";
    }

    // Line Area Fill 
    if (this.graphObj.chartType == "Line") {
      if (this.graphObj.lineAreaFill == "Select" || this.graphObj.lineAreaFill == "" || this.graphObj.lineAreaFill == null) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Line Graph Area Fill !!");
        return;
      }
    }

    if (this.graphObj.chartType == 'Table' || this.graphObj.chartType == 'RAG Table') {
      if (this.graphObj.tableSorting == "Select" || this.graphObj.tableSorting == null || this.graphObj.tableSorting == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Table Sorting !!");
        return;
      }
    }

    // if (this.graphObj.chartType == "Text Value") {
    //   if (this.graphObj.graphTitlePosition == "" || this.graphObj.graphTitlePosition == null || this.graphObj.graphTitlePosition == "Select") {
    //     this.isError = true;
    //     this.isSuccess = false;
    //     this.openAlertMod(template, "Kindly provide Title Position !!");
    //     return;
    //   }
    // }

    // if (this.graphObj.graphDescription == "" || this.graphObj.graphDescription == null) {
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Kindly provide Graph Description !!");
    //   return;
    // }


    // Background Color
    if (this.bgColor != null) {
      this.graphObj.bgColor = this.bgColor;
    }
    if (this.graphTitleFontColor != null) {
      this.graphObj.graphTitleFontColor = this.graphTitleFontColor;
    }
    if (this.tableHeaders) {
      this.graphObj.tableHeaders = this.tableHeaders.map((x:any) => x.item_id || x).join(',');
    }
    if (this.metricColumns) {
      this.graphObj.metricColumns = this.metricColumns.map((x:any) => x.item_id || x).join(',');
    }
    if(this.legendValues && this.legendValues.length != 0){
      this.graphObj.legendValues = this.legendValues.map((x:any) => x.id || x).join(',');
    }else{
      this.graphObj.legendValues = null;
    }
    if(this.labelPositions && this.labelPositions.length != 0){
      this.graphObj.labelPositions = this.labelPositions.map((x:any) => x.id || x).join(',');
    }else{
      this.graphObj.labelPositions = null;
    }
    /* point Graphs */
    if (this.allPointGraphs.size != 0) {
      const convMap = {};
      this.allPointGraphs.forEach((val: Graph[], key: string) => {
        convMap[key] = val;
      });
      this.graphObj.pointChildGraphList = convMap;
    }

    this.graphObj.graphBorders = this.graphBorders.toString();

    console.log(this.graphObj);
    // if (this.nodeGraphIds !== null) {
    //   if (this.nodeGraphIds.length === 0) {
    //     return;
    //   }
    //   else {
    //     if (this.graphObj.category === 'node' && this.nodeGraphIds !== null) {
    //       alert("subchild added");
    //       this.graphObj.hasSubChild = true;
    //     }
    //   }
    // }

    if(this.graphObj.dbPassword != null){
      this.graphObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    }
    if(this.graphObj.chartType == "Text"  && this.graphObj.timeInHeaders){
      var d = new Date(this.customDateInHeader).toLocaleString(undefined, {timeZone: 'Asia/Kolkata'});
      this.graphObj.query = d;
    }
    if (this.graphObj.metricID === "") {
      this.graphObj.metricID = null as any;
    }
    this.graphObj.datasourceId = this.datasourceId;
    this.graphObj.queryDetails = this.queryObjList;
    this.graphObj.sessionDTO = this.sessionObject;
    this.featureGraphMappingService.updateGraphFeatureMap(this.graphObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        if (this.graphObj.textImageIconType == 'file') {
          const formData = new FormData();
          formData.append("graphID", response.serviceResponse[0].id);
          formData.append("image", this.image);

          this.updateGraphTextIconImage(formData);
        }
        this.isError = false;
        this.isSuccess = true;
        this.appGraphList = [];
        this.openAlertMod(template, response.serviceResponse[1]);
        let tempObj = this.graphObj;
        this.resetGraphObj();
        this.showAllGraphList();
        this.viewGraphObj = tempObj;
        if(this.isEditGraph == "true"){	
          this.goToDashboard();	
        }
        this.getGraphDetailByApp(this.viewGraphObj.applicationId, this.viewGraphObj.subFeatureId);
      } else {
        this.isError = true;
        this.isSuccess = false;
        this.appGraphList = [];
        this.openAlertMod(template, response.serviceResponse);
      }
    });
  }



  openDeleteGraphModel(graph: any, template: TemplateRef<any>) {
    //return;
    this.graphObj = graph;
    this.modalRef = this.modalService.show(template, { class: 'modal-sm' });
    //this.openAlertMod(this.alertMessage, "Are you sure! you want to delete the graph?");
    this.alertMessage = "Are you sure! you want to delete the graph?";
  }

  deleteGraph(template: TemplateRef<any>) {

    //graph.deletedBy = this.currentUser;
    this.graphObj.deletedBy = this.currentUser;
    this.toggleDeleteTemplateButtons('disable');
    this.graphObj.sessionDTO = this.sessionObject;
    this.graphObj.featureName = "Admin Config";
    this.featureGraphMappingService.deleteGraph(this.graphObj).pipe(first()).subscribe((response: any) => {
      this.cancelRequest();
      if (response.serviceStatus == 'Success') {
        this.isError = false;
        this.isSuccess = true;
        this.toggleDeleteTemplateButtons('enable');
        this.openAlertMod(template, response.serviceResponse);
        // this.cancelRequest();
        this.viewGraphObj.subFeatureId = "";
        this.subFeatureList = [];
        this.showAllGraphList();
      } else {
        this.isError = true;
        this.isSuccess = false;
        this.toggleDeleteTemplateButtons('enable');
        this.openAlertMod(template, response.serviceResponse);
      }
    });

  }



  resetGraphObj() {
    this.graphObj = new Graph();
    this.fromTODate = undefined;
    this.graphBorders = [];
    this.isTopBorder = false;
    this.isRightBorder = false;
    this.isBottomBorder = false;
    this.isLeftBorder = false;


    this.graphObj.applicationId ="Select";	
    this.graphObj.chartType = "Select";	
    this.graphObj.dataSource = "Select";	
    this.graphObj.isActive = "";	
    this.graphObj.unit = "Select";	
    this.graphObj.dataMode = "Select";	
    this.graphObj.tableType = "Select";	
    this.graphObj.category = "Select";	
    this.graphObj.graphBG = "Select";	
    this.graphObj.lineAreaFill = "Select";	
    this.graphObj.tableSorting = "Select";	
    this.graphObj.sortingColumns = "Select";	
    this.graphObj.sortingType = "Select";	
    this.graphObj.metricID = "";	
    this.graphObj.colors = null;	
    this.graphObj.metricColumns = "";	
    this.graphObj.tableBorders = "enable";	
    this.graphObj.pagination = "enable";	
    this.graphObj.wordWrap = "disable";	
    this.graphObj.textImageIconType = "Select";	
    this.graphObj.ifcount = "Select";	
    this.graphObj.pointChildGraphs = "Select";	
    this.graphObj.dbType = "Select";	
    this.graphObj.onBasisOf = "Select";	
    this.idAndValueMap = new Map();
    this.queryObjList = [];
    this.resetQuery();
    this.resetRequestBody();
  }

  sortByCol(event, property, tableData) {

    this.isDesc = !this.isDesc; //change the direction    
    this.column = property;
    let direction = this.isDesc ? 1 : -1;

    let target = event.currentTarget,
      classList = target.classList;

    if (classList.contains("fa-chevron-up")) {
      classList.remove("fa-chevron-up");
      classList.add("fa-chevron-down");

    } else {
      classList.add("fa-chevron-up");
      classList.remove("fa-chevron-down");

    }

    let dataArray = tableData;
    dataArray.sort(function (a, b) {
      if (a[property] < b[property]) {
        return -1 * direction;
      }
      else if (a[property] > b[property]) {
        return 1 * direction;
      }
      else {
        return 0;
      }
      //this.changeDetectorRef.detectChanges();
    });
    // this.allRoles=dataArray;

    return dataArray;
  };

  openAlertMod(template: TemplateRef<any>, message: any) {
    this.modalRef = this.modalService.show(template, { class: 'modal-sm' });
    this.alertMessage = message;
  }

  cancelRequest() {
    this.modalRef.hide();
  }

  validateGraphName(value, template: TemplateRef<any>) {
    const regex = /^[a-zA-Z0-9-()%]*$/;
    if (!regex.test(value)) {
      // value = value.slice(0, -1); 
      // console.log(value);
      // this.graphObj.chartName = value;
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Name Not Valid - Only AlphaNumeric,dash,Open and Closed bracket & Percentage symbols are allowed");
    }

  }

  validateGraphTitle(value, template: TemplateRef<any>) {

    const regex = /^[ A-Za-z0-9_()%\s-]*$/;
    if (!regex.test(value)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Title Not Valid - Only AlphaNumeric,Hyphen,Underscore,Space,Round bracket & Percentage symbols are allowed");
    }
  }


  validateGraphId(value, template: TemplateRef<any>) {
    const regex = /^[a-zA-Z0-9_:,. -]*$/;
    if (!regex.test(value)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Allow Only Alphanumeric,Underscore,Dash");
    }
  }

  // openVisualizationModel(template: TemplateRef<any>, message: any) {
  // openVisualizationModel(callback:any) {

  //   //this.modalRef = this.modalService.show(template, { class: 'modal-lg' });
  //   // let graphOption = this.dummyGraphService.getDummyLineGraph();
  //   // this.createChart(graphOption);

  //   this.param = [];
  //   this.param.push(this.fromDate);
  //   this.param.push(this.toDate);


  //   let startDate: any;
  //   let endDate = new Date(); // current Date
  //   let dateFormat = 'yyyy-MM-DD HH:mm:ss';

  //   startDate = moment(endDate).subtract(5, 'minutes');
  //   this.fromDate = moment(startDate).format(dateFormat);
  //   this.toDate = moment(endDate).format(dateFormat);



  //   this.graphInputObj.chartId = this.graphObj.chartId;
  //   this.graphInputObj.chartName = this.graphObj.chartName;
  //   this.graphInputObj.chartTitle = this.graphObj.chartTitle;
  //   this.graphInputObj.chartType = this.graphObj.chartType;
  //   this.graphInputObj.unit = this.graphObj.unit;
  //   this.graphInputObj.dataSource = this.graphObj.dataSource;
  //   this.graphInputObj.query = this.graphObj.query;
  //   this.graphInputObj.requestBody = this.graphObj.requestBody;

  //   this.graphInputObj.ipAddress = "";
  //   this.graphInputObj.applicationId = this.graphObj.applicationId;
  //   // this.graphInputObj.subFeatureId = this.graphObj.subFeatureId;
  //   this.graphInputObj.fromDate = this.fromDate;
  //   this.graphInputObj.toDate = this.toDate;


  //   this.getAllGraphData(this.graphInputObj);
  //   // callback(this.graphInputObj);

  // }


  /* Visualization validation */

  checkInputObj(graphInputObj: any, template: TemplateRef<any>): boolean {

    const regex_chartName = /^[a-zA-Z0-9()%-]*$/;
    if (graphInputObj.chartName == "" || graphInputObj.chartName == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Name !!");
      return false;
    }

    if (!regex_chartName.test(graphInputObj.chartName)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Name Not Valid - Only AlphaNumeric,dash,Open and Closed bracket & Percentage symbols are allowed");
      return false;
    }
    if (graphInputObj.chartTitle == "" || graphInputObj.chartTitle == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Title !!");
      return false;
    }

    const regex_chartTitle = /^[ A-Za-z0-9_()%\s-]*$/;
    if (!regex_chartTitle.test(graphInputObj.chartTitle)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Title Not Valid - Only AlphaNumeric,Hyphen,Underscore,Space,Round bracket & Percentage symbols are allowed");
      return false;
    }

    if (graphInputObj.chartId == "" || graphInputObj.chartId == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Id !!");
      return false;
    }

    const regex = /^[a-zA-Z0-9_:,. -]*$/;
    if (!regex.test(graphInputObj.chartId)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Id Not Valid - Allow Only Alphanumeric,Underscore,Dash");
      return false;
    }
    if (graphInputObj.chartType == "Select" || graphInputObj.chartType == null || graphInputObj.chartType == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Type !!");
      return false;
    }

    if (this.graphObj.chartType != "IFrame" && this.graphObj.chartType != "Group") {
      if (graphInputObj.dataSource == "Select" || graphInputObj.dataSource == null || graphInputObj.dataSource == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Data Source !!");
        return false;
      }
      if (graphInputObj.chartType == 'Table' || graphInputObj.chartType == 'RAG Table') {
        if (graphInputObj.tableType == "Select" || graphInputObj.tableType == null || graphInputObj.tableType == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly provide Table Type !!");
          return false;
        }
      }
      if (graphInputObj.chartType == 'Bar' || graphInputObj.chartType == 'Column' ||
        graphInputObj.chartType == 'Line' || graphInputObj.chartType == 'Stacked Bar' ||
        graphInputObj.chartType == 'Stacked Column') {
        if (graphInputObj.dataMode == "Select" || graphInputObj.dataMode == null || graphInputObj.dataMode == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly provide Data Mode !!");
          return false;
        }
      }

      if (graphInputObj.unit == "Select" && graphInputObj.dataSource != 'NA' || graphInputObj.unit == null && graphInputObj.dataSource != 'NA' || graphInputObj.unit == "" && graphInputObj.dataSource != 'NA') {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Data Unit !!");
        return false;
      }
      if (graphInputObj.category == "Select" || graphInputObj.category == null || graphInputObj.category == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Graph Category !!");
        return false;
      }

      /* Point Child Graphs */
      if (this.graphObj.chartType == 'Pie' || this.graphObj.chartType == 'DoughNut') {
        if (this.graphObj.pointChildGraphs == "Select" || this.graphObj.pointChildGraphs == null || this.graphObj.pointChildGraphs == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly provide Point Child Graphs !!");
          return;
        }
      }

      // if (this.graphObj.chartType == "Text Value") {
      //   if (this.graphObj.graphTitlePosition == "" || this.graphObj.graphTitlePosition == null || this.graphObj.graphTitlePosition == "Select") {
      //     this.isError = true;
      //     this.isSuccess = false;
      //     this.openAlertMod(template, "Kindly provide Title Position !!");
      //     return false;
      //   }
      // }

      if (graphInputObj.applicationId == "Select" || graphInputObj.applicationId == null || graphInputObj.applicationId == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Application Name !!");
        return false;
      }
      if (graphInputObj.subFeatureId == "Select" || graphInputObj.subFeatureId == null || graphInputObj.subFeatureId == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Sub Feature !!");
        return false;
      }

      if ((graphInputObj.chartType == 'RAG Table' || graphInputObj.chartType == 'Gauge' || graphInputObj.pointChildGraphs == 'RAG') && !graphInputObj.metricID) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Metric Name !!");
        return false;
      }

    }
    if (graphInputObj.applicationId == "Select" || graphInputObj.applicationId == null || graphInputObj.applicationId == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Application Name!!");
      return false;
    }
    if (graphInputObj.subFeatureId == "Select" || graphInputObj.subFeatureId == null || graphInputObj.subFeatureId == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Sub Feature !!");
      return false;
    }

    if (graphInputObj.graphBG == "Select" || graphInputObj.graphBG == null || graphInputObj.graphBG == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly provide Graph Background !!");
      return false;
    }

    if (graphInputObj.chartType == "Line") {
      if (graphInputObj.lineAreaFill == "Select" || graphInputObj.lineAreaFill == "" || graphInputObj.lineAreaFill == null) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Line Graph Area Fill !!");
        return false;
      }
    }

    if (graphInputObj.chartType == 'Table' || graphInputObj.chartType == 'RAG Table') {
      if (graphInputObj.tableSorting == "Select" || graphInputObj.tableSorting == null || graphInputObj.tableSorting == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Table Sorting !!");
        return false;
      }
    }



    // if (graphInputObj.graphDescription == "" || graphInputObj.graphDescription == null) {
    //   this.isError = true;
    //   this.isSuccess = false;
    //   this.openAlertMod(template, "Kindly provide Graph Description !!");
    //   return;
    // }

    if (graphInputObj.dataSource == 'Database' || graphInputObj.chartType == 'IFrame') {
      if (graphInputObj.dbQuery == "" || graphInputObj.dbQuery == null) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly provide Query !!");
        return false;
      }
    }

    if (graphInputObj.dataSource == 'Elastic Search' && graphInputObj.createRequestBody == "false") {
      if (graphInputObj.query == null || graphInputObj.query == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly Provide API !!");
        return false;
      }
      if (graphInputObj.requestBody == null || graphInputObj.requestBody == "") {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly Provide Request Body !!");
        return false;
      }
    }

    return true;
  }

  getLineGraph(template: TemplateRef<any>) {

    this.graphInputObj = new GraphInputJSON();

    this.param = [];
    this.param.push(this.fromDate);
    this.param.push(this.toDate);


    let startDate: any;
    let endDate = new Date(); // current Date
    let dateFormat = 'yyyy-MM-DD HH:mm:ss';

    startDate = moment(endDate).subtract(5, 'minutes');
    this.fromDate = moment(startDate).format(dateFormat);
    this.toDate = moment(endDate).format(dateFormat);



    this.graphInputObj.chartId = this.graphObj.chartId;
    this.graphInputObj.chartName = this.graphObj.chartName;
    this.graphInputObj.chartTitle = this.graphObj.chartTitle;
    this.graphInputObj.chartType = this.graphObj.chartType;
    this.graphInputObj.unit = this.graphObj.unit;
    this.graphInputObj.dataSource = this.graphObj.dataSource;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbType = this.graphObj.dbType;
    this.graphInputObj.port = this.graphObj.port;
    this.graphInputObj.dbName = this.graphObj.dbName;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbQuery = this.graphObj.dbQuery;
    this.graphInputObj.dbipAddress = this.graphObj.ipAddress;
    this.graphInputObj.dbUsername = this.graphObj.dbUsername;
    if (this.graphObj.dataSource == "Database") {
      this.graphInputObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    }
    this.graphInputObj.requestBody = this.graphObj.requestBody;
    this.graphInputObj.elasticUser = this.graphObj.elasticUser;
    this.graphInputObj.elasticPassword = this.graphObj.elasticPassword;
    this.graphInputObj.dataMode = this.graphObj.dataMode;
    this.graphInputObj.tableType = this.graphObj.tableType;
    this.graphInputObj.colors = this.graphObj.colors;
    this.graphInputObj.bgColor = this.graphObj.bgColor;
    this.graphInputObj.fontColor = this.graphObj.fontColor;
    this.graphInputObj.graphBG = this.graphObj.graphBG;
    this.graphInputObj.graphTitlePosition = this.graphObj.graphTitlePosition;
    this.graphInputObj.ipAddress = "";
    this.graphInputObj.applicationId = this.graphObj.applicationId;
    this.graphInputObj.ifBucketScript = this.graphObj.ifBucketScript;
    this.graphInputObj.isElasticAuthEnabled = this.graphObj.isElasticAuthEnabled;
    this.graphInputObj.caCertificate = this.graphObj.caCertificate;
    this.graphInputObj.metricID=this.graphObj.metricID;
    // this.graphInputObj.subFeatureId = this.graphObj.subFeatureId;
    this.graphInputObj.timeframe = this.graphObj.timeframe;
    this.graphInputObj.expression = this.graphObj.expression;
    this.graphInputObj.lineAreaFill = this.graphObj.lineAreaFill;
    this.graphInputObj.graphDescription = this.graphObj.graphDescription;
    this.graphInputObj.legendPosition = this.graphObj.legendPosition;
    this.graphInputObj.ifcount = this.graphObj.ifcount;
    this.graphInputObj.sessionDTO = this.sessionObject;
    this.graphInputObj.port = this.graphObj.port;	
    this.graphInputObj.dbName = this.graphObj.dbName;
    this.graphInputObj.metricID = this.graphObj.metricID;
    this.graphInputObj.alias_name = this.graphObj.alias_name;
    this.graphInputObj.datasourceId = this.datasourceId;
    this.graphInputObj.createRequestBody = this.graphObj.createRequestBody;

    if (this.graphInputObj.createRequestBody) {
      let datasource = new datasourceDetails();
      for (let x of this.allDatasourceList) {
        if (x.id == this.datasourceId) {
          datasource = x;
          this.graphInputObj.isElasticAuthEnabled = datasource.authenticationEnabled;
          this.graphInputObj.elasticUser = datasource.datasourceUsername;
          this.graphInputObj.elasticPassword = datasource.datasourcePassword;
          break;
        }
      }
      let requestBodyAndURL = this.requestBodyService.refreshRequestBody(this.queryObjList, datasource);
      this.graphInputObj.query = requestBodyAndURL[1];
      this.graphInputObj.requestBody = requestBodyAndURL[0];
    }
  
    if (this.fromTODate) {
      let dates = Array.isArray(this.fromTODate) ? this.fromTODate : (typeof this.fromTODate === 'string' ? this.fromTODate.split(" - ") : [this.fromTODate]);
      this.graphInputObj.fromDate = dates[0] ? moment(dates[0]).format(this.dateFormat) : this.fromDate;
      this.graphInputObj.toDate = dates[1] ? moment(dates[1]).format(this.dateFormat) : this.toDate;
    }
    else {
      this.graphInputObj.fromDate = this.fromDate;
      this.graphInputObj.toDate = this.toDate;
    }

    if(this.graphInputObj.chartType == "Text" && this.graphObj.timeInHeaders){
      var d = new Date(this.customDateInHeader).toLocaleString(undefined, {timeZone: 'Asia/Kolkata'});
      this.graphInputObj.query = d;
    }

    let isInputValid = this.checkInputObj(this.graphObj, template);
    if (isInputValid) {
      this.isVisualized = true;

      if (this.graphInputObj.chartType == 'Line') {

        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {

              let data = element.chartData.data;
              
              for (let x of this.metricList) {
                
                if (x.id == parseInt(this.graphInputObj.metricID)) {
                  
                  element.metricID = x.id;
                  element.warningValue = x.warningPercentage;
                  element.criticalValue = x.criticalPercentage;
                  element.metricDataUnit = x.dataUnit;
                  element.criticalColor = x.criticalColor;
                  element.warningColor = x.warningColor;
                  
                  break;
                }
              }
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "One TimeStamp is required") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please select one Timestamp Column as first column!!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Invalid Timestamp Format") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Invalid time stamp format!!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "More than one TimeStamp Column") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please select one Timestamp Column as first column!!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else {
                // let graphData = this.hcs.createGraphDataObject(element.chartData);
                // element.chartData = graphData;

                // If Bg is transperent then dont check brightness
                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                let graphData = this.hcs.createGraphDataObject(element);
                element = graphData;
                element.isLegendEnabled = this.graphObj.isLegendEnabled;
                let graphOption = this.hcs.buildChartJSON(element, "graph");
                this.createChart(graphOption, element, graphOption);
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();
            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });

      }
      else if (this.graphInputObj.chartType == 'Column') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {

              let data = element.chartData.data;
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {
                let graphData = this.barGraphService.createBarGraphDataObject(element);
                element = graphData;
                // let graphData = this.barGraphService.createBarGraphDataObject(element.chartData, "");
                // element.chartData = graphData;
                element.isLegendEnabled = this.graphObj.isLegendEnabled;
                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                let graphOption = this.barGraphService.buildColumnChartJSON(element, "graph");
                this.createChart(graphOption, element, graphOption);
              }

            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();

            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      }
      else if (this.graphInputObj.chartType == 'Bar') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {

              let data = element.chartData.data;
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {
                // let graphData = this.barGraphService.createBarGraphDataObject(element.chartData);
                // element.chartData = graphData;
                let graphData = this.barGraphService.createBarGraphDataObject(element);
                element = graphData;
                element.isLegendEnabled = this.graphObj.isLegendEnabled;
                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                let graphOption = this.barGraphService.buildBarChartJSON(element, "graph");
                this.createChart(graphOption, element, graphOption);
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();

            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      }
      else if (this.graphInputObj.chartType == 'TopN') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {

              let data = element.chartData;
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } 
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {

                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                let graphOption = this.topNGraphService.buildColumnChartJSON(element, "graph");
                this.createChart(graphOption, element, graphOption);
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();

            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      } else {
        this.isError = true;
        this.isSuccess = false;
        let parent = document.getElementById("test");
        let existingElement = document.getElementById("child");
        if (existingElement != undefined) {
          parent.removeChild(existingElement)
        }
        let errorMsg = "Please select another visualization mode !!";
        let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
        parent.insertAdjacentHTML('beforeend', errorTemplate);
      }
    }
  }

  // getBarGraph(){

  //   this.graphInputObj = new GraphInputJSON();

  //   this.param = [];
  //   this.param.push(this.fromDate);
  //   this.param.push(this.toDate);


  //   let startDate: any;
  //   let endDate = new Date(); // current Date
  //   let dateFormat = 'yyyy-MM-DD HH:mm:ss';

  //   startDate = moment(endDate).subtract(5, 'minutes');
  //   this.fromDate = moment(startDate).format(dateFormat);
  //   this.toDate = moment(endDate).format(dateFormat);



  //   this.graphInputObj.chartId = this.graphObj.chartId;
  //   this.graphInputObj.chartName = this.graphObj.chartName;
  //   this.graphInputObj.chartTitle = this.graphObj.chartTitle;
  //   this.graphInputObj.chartType = this.graphObj.chartType;
  //   this.graphInputObj.unit = this.graphObj.unit;
  //   this.graphInputObj.dataSource = this.graphObj.dataSource;
  //   this.graphInputObj.query = this.graphObj.query;
  //   this.graphInputObj.requestBody = this.graphObj.requestBody;

  //   this.graphInputObj.ipAddress = "";
  //   this.graphInputObj.applicationId = this.graphObj.applicationId;
  //   // this.graphInputObj.subFeatureId = this.graphObj.subFeatureId;
  //   this.graphInputObj.fromDate = this.fromDate;
  //   this.graphInputObj.toDate = this.toDate;

  //   this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {

  //     if (response.serviceStatus == "Success") {

  //       let element = response.serviceResponse;
  //       console.log(element);
  //       try {
  //         if (element.chartType == 'Column') {
  //           let graphData = this.barGraphService.createBarGraphDataObject(element.chartData);
  //           element.chartData = graphData;
  //           let graphOption = this.barGraphService.buildColumnChartJSON(element);
  //           this.createChart(graphOption, element);

  //         } else if (element.chartType == 'Bar') {
  //           let graphData = this.barGraphService.createBarGraphDataObject(element.chartData);
  //           element.chartData = graphData;
  //           let graphOption = this.barGraphService.buildBarChartJSON(element);
  //           this.createChart(graphOption, element);

  //         }
  //       }
  //       catch (error) {
  //         console.error();

  //       }
  //     }
  //   });
  // }


  getStackedGraph(template: TemplateRef<any>) {
    this.graphInputObj = new GraphInputJSON();

    this.param = [];
    this.param.push(this.fromDate);
    this.param.push(this.toDate);


    let startDate: any;
    let endDate = new Date(); // current Date
    let dateFormat = 'yyyy-MM-DD HH:mm:ss';

    startDate = moment(endDate).subtract(5, 'minutes');
    this.fromDate = moment(startDate).format(dateFormat);
    this.toDate = moment(endDate).format(dateFormat);



    this.graphInputObj.chartId = this.graphObj.chartId;
    this.graphInputObj.chartName = this.graphObj.chartName;
    this.graphInputObj.chartTitle = this.graphObj.chartTitle;
    this.graphInputObj.chartType = this.graphObj.chartType;
    this.graphInputObj.unit = this.graphObj.unit;
    this.graphInputObj.dataSource = this.graphObj.dataSource;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbType = this.graphObj.dbType;
    this.graphInputObj.port = this.graphObj.port;
    this.graphInputObj.dbName = this.graphObj.dbName;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbQuery = this.graphObj.dbQuery;
    this.graphInputObj.dbipAddress = this.graphObj.ipAddress;
    this.graphInputObj.dbUsername = this.graphObj.dbUsername;
    if (this.graphObj.dataSource == "Database") {
      this.graphInputObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    }
    this.graphInputObj.isElasticAuthEnabled = this.graphObj.isElasticAuthEnabled;
    this.graphInputObj.caCertificate = this.graphObj.caCertificate;
    this.graphInputObj.requestBody = this.graphObj.requestBody;
    this.graphInputObj.elasticUser = this.graphObj.elasticUser;
    this.graphInputObj.elasticPassword = this.graphObj.elasticPassword;
    this.graphInputObj.dataMode = this.graphObj.dataMode;
    this.graphInputObj.tableType = this.graphObj.tableType;
    this.graphInputObj.bgColor = this.graphObj.bgColor;
    this.graphInputObj.fontColor = this.graphObj.fontColor;
    this.graphInputObj.graphBG = this.graphObj.graphBG;
    this.graphInputObj.colors = this.graphObj.colors;
    this.graphInputObj.ifcount = this.graphObj.ifcount;
    this.graphInputObj.ipAddress = "";
    this.graphInputObj.applicationId = this.graphObj.applicationId;
    // this.graphInputObj.subFeatureId = this.graphObj.subFeatureId;
    this.graphInputObj.graphDescription = this.graphObj.graphDescription;
    this.graphInputObj.legendPosition = this.graphObj.legendPosition;
    this.graphInputObj.timeframe = this.graphObj.timeframe;
    this.graphInputObj.datasourceId = this.datasourceId;
    this.graphInputObj.createRequestBody = this.graphObj.createRequestBody;

    if (this.graphInputObj.createRequestBody) {
      let datasource = new datasourceDetails();
      for (let x of this.allDatasourceList) {
        if (x.id == this.datasourceId) {
          datasource = x;
          this.graphInputObj.isElasticAuthEnabled = datasource.authenticationEnabled;
          this.graphInputObj.elasticUser = datasource.datasourceUsername;
          this.graphInputObj.elasticPassword = datasource.datasourcePassword;
          break;
        }
      }
      let requestBodyAndURL = this.requestBodyService.refreshRequestBody(this.queryObjList, datasource);
      this.graphInputObj.query = requestBodyAndURL[1];
      this.graphInputObj.requestBody = requestBodyAndURL[0];
    }
    if (this.fromTODate) {
      let dates = Array.isArray(this.fromTODate) ? this.fromTODate : (typeof this.fromTODate === 'string' ? this.fromTODate.split(" - ") : [this.fromTODate]);
      this.graphInputObj.fromDate = dates[0] ? moment(dates[0]).format(this.dateFormat) : this.fromDate;
      this.graphInputObj.toDate = dates[1] ? moment(dates[1]).format(this.dateFormat) : this.toDate;
    }
    else {
      this.graphInputObj.fromDate = this.fromDate;
      this.graphInputObj.toDate = this.toDate;
    }
    this.graphInputObj.sessionDTO = this.sessionObject;
    let isInputValid = this.checkInputObj(this.graphObj, template);

    if (isInputValid) {
      this.isVisualized = true;
      if (this.graphInputObj.chartType == 'Stacked Column') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {
              let data = element.chartData.data;
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } 
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {
                // let graphData = this.stackedBarGraphService.createStackedBarGraphDataObject(element.chartData);
                // element.chartData = graphData;

                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                let graphData = this.stackedBarGraphService.createStackedBarGraphDataObject(element);
                element = graphData;
                element.isLegendEnabled = this.graphObj.isLegendEnabled;
                let graphOption = this.stackedBarGraphService.buildStackedColumnChartJSON(element, "graph");
                this.createChart(graphOption, element, graphOption);
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();

            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });

      } else if (this.graphInputObj.chartType == 'Stacked Bar') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {
              let data = element.chartData.data;
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {
                // let graphData = this.stackedBarGraphService.createStackedBarGraphDataObject(element.chartData);
                // element.chartData = graphData;

                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                let graphData = this.stackedBarGraphService.createStackedBarGraphDataObject(element);
                element = graphData;
                element.isLegendEnabled = this.graphObj.isLegendEnabled;
                let graphOption = this.stackedBarGraphService.buildStackedBarChartJSON(element, "graph");
                this.createChart(graphOption, element, graphOption);
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();

            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      } else {
        this.isError = true;
        this.isSuccess = false;
        let parent = document.getElementById("test");
        let existingElement = document.getElementById("child");
        if (existingElement != undefined) {
          parent.removeChild(existingElement)
        }
        let errorMsg = "Please select another visualization mode !!";
        let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
        parent.insertAdjacentHTML('beforeend', errorTemplate);
      }
    }
  }


  getPieGraph(template: TemplateRef<any>) {
    this.graphInputObj = new GraphInputJSON();

    this.param = [];
    this.param.push(this.fromDate);
    this.param.push(this.toDate);


    let startDate: any;
    let endDate = new Date(); // current Date
    let dateFormat = 'yyyy-MM-DD HH:mm:ss';

    startDate = moment(endDate).subtract(5, 'minutes');
    this.fromDate = moment(startDate).format(dateFormat);
    this.toDate = moment(endDate).format(dateFormat);



    this.graphInputObj.chartId = this.graphObj.chartId;
    this.graphInputObj.chartName = this.graphObj.chartName;
    this.graphInputObj.chartTitle = this.graphObj.chartTitle;
    this.graphInputObj.chartType = this.graphObj.chartType;
    this.graphInputObj.unit = this.graphObj.unit;
    this.graphInputObj.dataSource = this.graphObj.dataSource;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbType = this.graphObj.dbType;
    this.graphInputObj.port = this.graphObj.port;
    this.graphInputObj.dbName = this.graphObj.dbName;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbQuery = this.graphObj.dbQuery;
    this.graphInputObj.dbipAddress = this.graphObj.ipAddress;
    this.graphInputObj.dbUsername = this.graphObj.dbUsername;
    if (this.graphObj.dataSource == "Database") {
      this.graphInputObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    }
    this.graphInputObj.requestBody = this.graphObj.requestBody;
    this.graphInputObj.isElasticAuthEnabled = this.graphObj.isElasticAuthEnabled;
    this.graphInputObj.caCertificate = this.graphObj.caCertificate;
    this.graphInputObj.elasticUser = this.graphObj.elasticUser;
    this.graphInputObj.elasticPassword = this.graphObj.elasticPassword;
    this.graphInputObj.bgColor = this.graphObj.bgColor;
    this.graphInputObj.fontColor = this.graphObj.fontColor;
    this.graphInputObj.graphBG = this.graphObj.graphBG;
    this.graphInputObj.colors = this.graphObj.colors;
    this.graphInputObj.ipAddress = "";
    this.graphInputObj.applicationId = this.graphObj.applicationId;
    this.graphInputObj.ifBucketScript = this.graphObj.ifBucketScript;
    // this.graphInputObj.subFeatureId = this.graphObj.subFeatureId;
    this.graphInputObj.graphDescription = this.graphObj.graphDescription;
    this.graphInputObj.pointChildGraphs = this.graphObj.pointChildGraphs;
    this.graphInputObj.ifcount = this.graphObj.ifcount;
    this.graphInputObj.legendPosition = this.graphObj.legendPosition;
    this.graphInputObj.sessionDTO = this.sessionObject;
    this.graphInputObj.datasourceId = this.datasourceId;
    this.graphInputObj.createRequestBody = this.graphObj.createRequestBody;
    if (this.graphInputObj.createRequestBody) {
      let datasource = new datasourceDetails();
      for (let x of this.allDatasourceList) {
        if (x.id == this.datasourceId) {
          datasource = x;
          this.graphInputObj.isElasticAuthEnabled = datasource.authenticationEnabled;
          this.graphInputObj.elasticUser = datasource.datasourceUsername;
          this.graphInputObj.elasticPassword = datasource.datasourcePassword;
          break;
        }
      }
      let requestBodyAndURL = this.requestBodyService.refreshRequestBody(this.queryObjList, datasource);
      this.graphInputObj.query = requestBodyAndURL[1];
      this.graphInputObj.requestBody = requestBodyAndURL[0];
    }
    if (this.fromTODate) {
      let dates = Array.isArray(this.fromTODate) ? this.fromTODate : (typeof this.fromTODate === 'string' ? this.fromTODate.split(" - ") : [this.fromTODate]);
      this.graphInputObj.fromDate = dates[0] ? moment(dates[0]).format(this.dateFormat) : this.fromDate;
      this.graphInputObj.toDate = dates[1] ? moment(dates[1]).format(this.dateFormat) : this.toDate;
    }
    else {
      this.graphInputObj.fromDate = this.fromDate;
      this.graphInputObj.toDate = this.toDate;
    }

    let isInputValid = this.checkInputObj(this.graphObj, template);

    if (isInputValid) {
      this.isVisualized = true;

      if (this.graphInputObj.chartType == 'Pie') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {
              let data = element.chartData.data;
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {

                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }
                let graphData = this.piechartService.createPieGraphDataObject(element);
                element = graphData;
                element.isLegendEnabled = this.graphObj.isLegendEnabled;
                element.legendPosition = this.graphObj.legendPosition;
                element.legendValues = this.legendValues != undefined ? this.legendValues : [];
                element.labelPositions = this.labelPositions != undefined ? this.labelPositions : [];
                // let graphData = this.piechartService.createPieGraphDataObject(element.chartData);
                // element.chartData = graphData;
                let graphOption = this.piechartService.buildPieChartJSON(element, "graph", this.showSelectChildGraphs.bind(this));
                this.createChart(graphOption, element, graphOption);
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();
            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      }
      else {
        this.isError = true;
        this.isSuccess = false;
        let parent = document.getElementById("test");
        let existingElement = document.getElementById("child");
        if (existingElement != undefined) {
          parent.removeChild(existingElement)
        }
        let errorMsg = "Please select another visualization mode !!";
        let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
        parent.insertAdjacentHTML('beforeend', errorTemplate);
      }
    }
  }



  getDonutGraph(template: TemplateRef<any>) {
    this.graphInputObj = new GraphInputJSON();

    this.param = [];
    this.param.push(this.fromDate);
    this.param.push(this.toDate);


    let startDate: any;
    let endDate = new Date(); // current Date
    let dateFormat = 'yyyy-MM-DD HH:mm:ss';

    startDate = moment(endDate).subtract(5, 'minutes');
    this.fromDate = moment(startDate).format(dateFormat);
    this.toDate = moment(endDate).format(dateFormat);

    this.graphInputObj.chartId = this.graphObj.chartId;
    this.graphInputObj.chartName = this.graphObj.chartName;
    this.graphInputObj.chartTitle = this.graphObj.chartTitle;
    this.graphInputObj.chartType = this.graphObj.chartType;
    this.graphInputObj.unit = this.graphObj.unit;
    this.graphInputObj.dataSource = this.graphObj.dataSource;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbType = this.graphObj.dbType;
    this.graphInputObj.port = this.graphObj.port;
    this.graphInputObj.dbName = this.graphObj.dbName;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbQuery = this.graphObj.dbQuery;
    this.graphInputObj.dbipAddress = this.graphObj.ipAddress;
    this.graphInputObj.dbUsername = this.graphObj.dbUsername;
    if (this.graphObj.dataSource == "Database") {
      this.graphInputObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    }
    this.graphInputObj.requestBody = this.graphObj.requestBody;
    this.graphInputObj.isElasticAuthEnabled = this.graphObj.isElasticAuthEnabled;
    this.graphInputObj.caCertificate = this.graphObj.caCertificate;
    this.graphInputObj.elasticUser = this.graphObj.elasticUser;
    this.graphInputObj.elasticPassword = this.graphObj.elasticPassword;
    this.graphInputObj.bgColor = this.graphObj.bgColor;
    this.graphInputObj.fontColor = this.graphObj.fontColor;
    this.graphInputObj.graphBG = this.graphObj.graphBG;
    this.graphInputObj.colors = this.graphObj.colors;
    this.graphInputObj.warningValue = this.graphObj.warningValue;
    this.graphInputObj.criticalValue = this.graphObj.criticalValue;
    this.graphInputObj.metricDataUnit = this.graphObj.metricDataUnit;
    this.graphInputObj.ifcount = this.graphObj.ifcount;
    console.log(this.graphObj.ifcount);
    this.graphInputObj.ipAddress = "";
    this.graphInputObj.applicationId = this.graphObj.applicationId;
    // this.graphInputObj.subFeatureId = this.graphObj.subFeatureId;
    this.graphInputObj.graphDescription = this.graphObj.graphDescription;
    this.graphInputObj.pointChildGraphs = this.graphObj.pointChildGraphs;
    this.graphInputObj.legendPosition = this.graphObj.legendPosition;
    this.graphInputObj.ifBucketScript = this.graphObj.ifBucketScript;
    this.graphInputObj.sessionDTO = this.sessionObject;

    this.graphInputObj.onBasisOf = this.graphObj.onBasisOf;	
    this.graphInputObj.timeframe = this.graphObj.timeframe;
    this.graphInputObj.datasourceId = this.datasourceId;
    this.graphInputObj.createRequestBody = this.graphObj.createRequestBody;

    if (this.graphInputObj.createRequestBody) {
      let datasource = new datasourceDetails();
      for (let x of this.allDatasourceList) {
        if (x.id == this.datasourceId) {
          datasource = x;
          this.graphInputObj.isElasticAuthEnabled = datasource.authenticationEnabled;
          this.graphInputObj.elasticUser = datasource.datasourceUsername;
          this.graphInputObj.elasticPassword = datasource.datasourcePassword;
          break;
        }
      }
      let requestBodyAndURL = this.requestBodyService.refreshRequestBody(this.queryObjList, datasource);
      this.graphInputObj.query = requestBodyAndURL[1];
      this.graphInputObj.requestBody = requestBodyAndURL[0];
    }
    if (this.fromTODate) {
      let dates = Array.isArray(this.fromTODate) ? this.fromTODate : (typeof this.fromTODate === 'string' ? this.fromTODate.split(" - ") : [this.fromTODate]);
      this.graphInputObj.fromDate = dates[0] ? moment(dates[0]).format(this.dateFormat) : this.fromDate;
      this.graphInputObj.toDate = dates[1] ? moment(dates[1]).format(this.dateFormat) : this.toDate;
    }
    else {
      this.graphInputObj.fromDate = this.fromDate;
      this.graphInputObj.toDate = this.toDate;
    }

    let isInputValid = this.checkInputObj(this.graphObj, template);

    if (isInputValid) {
      this.isVisualized = true;

      if (this.graphInputObj.chartType == 'DoughNut') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {
              for (let x of this.metricList) {
                if (x.id == parseInt(this.graphObj.metricID)) {
                  element.warningValue = x.warningPercentage;
                  element.criticalValue = x.criticalPercentage;
                  element.metricDataUnit = x.dataUnit;
                  element.normalColor = x.normalColor;
                  element.warningColor = x.warningColor;
                  element.criticalColor = x.criticalColor;
                  this.ragPointCriticalColor = x.criticalColor;	
                  this.ragPointNormalColor = x.normalColor;	
                  this.ragPointWarningColor = x.warningColor;
                  break;
                }
              }
              let data = element.chartData.data;
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {

                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }
                let graphData = this.piechartService.createDoughnutGraphDataObject(element);
                element = graphData;
                // let graphData = this.piechartService.createPieGraphDataObject(element.chartData);
                // element.chartData = graphData;
                element.isLegendEnabled = this.graphObj.isLegendEnabled;
                element.legendPosition = this.graphObj.legendPosition;
                element.legendValues = this.legendValues != undefined ? this.legendValues : [];
                element.labelPositions = this.labelPositions != undefined ? this.labelPositions : [];
                let graphOption = this.piechartService.buildDoughtNutChartJSON(element, "graph", this.showSelectChildGraphs.bind(this));
                this.createChart(graphOption, element, graphOption);
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();
            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      }
      else {
        this.isError = true;
        this.isSuccess = false;
        let parent = document.getElementById("test");
        let existingElement = document.getElementById("child");
        if (existingElement != undefined) {
          parent.removeChild(existingElement)
        }
        let errorMsg = "Please select another visualization mode !!";
        let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
        parent.insertAdjacentHTML('beforeend', errorTemplate);
      }
    }
  }


  getGaugeGraph(template: TemplateRef<any>) {
    this.graphInputObj = new GraphInputJSON();

    this.param = [];
    this.param.push(this.fromDate);
    this.param.push(this.toDate);


    let startDate: any;
    let endDate = new Date(); // current Date
    let dateFormat = 'yyyy-MM-DD HH:mm:ss';

    startDate = moment(endDate).subtract(5, 'minutes');
    this.fromDate = moment(startDate).format(dateFormat);
    this.toDate = moment(endDate).format(dateFormat);

    this.graphInputObj.chartId = this.graphObj.chartId;
    this.graphInputObj.chartName = this.graphObj.chartName;
    this.graphInputObj.chartTitle = this.graphObj.chartTitle;
    this.graphInputObj.chartType = this.graphObj.chartType;
    this.graphInputObj.unit = this.graphObj.unit;
    this.graphInputObj.dataSource = this.graphObj.dataSource;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbType = this.graphObj.dbType;
    this.graphInputObj.port = this.graphObj.port;
    this.graphInputObj.dbName = this.graphObj.dbName;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbQuery = this.graphObj.dbQuery;
    this.graphInputObj.dbipAddress = this.graphObj.ipAddress;
    this.graphInputObj.dbUsername = this.graphObj.dbUsername;
    if (this.graphObj.dataSource == "Database") {
      this.graphInputObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    }
    this.graphInputObj.requestBody = this.graphObj.requestBody;
    this.graphInputObj.isElasticAuthEnabled = this.graphObj.isElasticAuthEnabled;
    this.graphInputObj.caCertificate = this.graphObj.caCertificate;
    this.graphInputObj.elasticUser = this.graphObj.elasticUser;
    this.graphInputObj.elasticPassword = this.graphObj.elasticPassword;
    this.graphInputObj.bgColor = this.graphObj.bgColor;
    this.graphInputObj.fontColor = this.graphObj.fontColor;
    this.graphInputObj.graphBG = this.graphObj.graphBG;
    this.graphInputObj.warningValue = this.graphObj.warningValue;
    this.graphInputObj.criticalValue = this.graphObj.criticalValue;
    this.graphInputObj.metricDataUnit = this.graphObj.metricDataUnit;
    this.graphInputObj.ifcount = this.graphObj.ifcount;
    this.graphInputObj.ipAddress = "";
    this.graphInputObj.applicationId = this.graphObj.applicationId;
    // this.graphInputObj.subFeatureId = this.graphObj.subFeatureId;
    this.graphInputObj.graphDescription = this.graphObj.graphDescription;
    this.graphInputObj.modifiedHeaders = this.graphObj.modifiedHeaders;
    this.graphInputObj.dataMode = this.graphObj.dataMode;
    this.graphInputObj.timeframe = this.graphObj.timeframe;
    this.graphInputObj.ifcount = this.graphObj.ifcount;
    this.graphInputObj.metricID = this.graphObj.metricID;
    this.graphInputObj.sessionDTO = this.sessionObject;
    this.graphInputObj.datasourceId = this.datasourceId;
    this.graphInputObj.createRequestBody = this.graphObj.createRequestBody;
    if (this.graphInputObj.createRequestBody) {
      let datasource = new datasourceDetails();
      for (let x of this.allDatasourceList) {
        if (x.id == this.datasourceId) {
          datasource = x;
          this.graphInputObj.isElasticAuthEnabled = datasource.authenticationEnabled;
          this.graphInputObj.elasticUser = datasource.datasourceUsername;
          this.graphInputObj.elasticPassword = datasource.datasourcePassword;
          break;
        }
      }
      let requestBodyAndURL = this.requestBodyService.refreshRequestBody(this.queryObjList, datasource);
      this.graphInputObj.query = requestBodyAndURL[1];
      this.graphInputObj.requestBody = requestBodyAndURL[0];
    }
    if (this.fromTODate) {
      let dates = Array.isArray(this.fromTODate) ? this.fromTODate : (typeof this.fromTODate === 'string' ? this.fromTODate.split(" - ") : [this.fromTODate]);
      this.graphInputObj.fromDate = dates[0] ? moment(dates[0]).format(this.dateFormat) : this.fromDate;
      this.graphInputObj.toDate = dates[1] ? moment(dates[1]).format(this.dateFormat) : this.toDate;
    }
    else {
      this.graphInputObj.fromDate = this.fromDate;
      this.graphInputObj.toDate = this.toDate;
    }
    this.graphInputObj.minValue = this.graphObj.minValue;
    this.graphInputObj.maxValue = this.graphObj.maxValue;

    let isInputValid = this.checkInputObj(this.graphObj, template);

    if (isInputValid) {
      this.isVisualized = true;

      if (this.graphInputObj.chartType == 'Gauge') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {
              // let graphData = this.guagechartService.createPieGraphDataObject(element.chartData);
              // console.log(graphData);
              // element.chartData = graphData;
              for (let x of this.metricList) {
                if (x.id == parseInt(this.graphObj.metricID)) {
                  element.warningValue = x.warningPercentage;
                  element.criticalValue = x.criticalPercentage;
                  element.metricDataUnit = x.dataUnit;
                  element.normalColor = x.normalColor;
                  element.warningColor = x.warningColor;
                  element.criticalColor = x.criticalColor;
                  break;
                }
              }
              let data = element.chartData.data;
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {

                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                let graphOption = this.guagechartService.buildChartJSON(element, "graph");
                this.createGaugeChart(graphOption, element, graphOption);
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();
            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      }
      if (this.graphInputObj.chartType == 'Gauge Meter') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {
              // let graphData = this.guagechartService.createPieGraphDataObject(element.chartData);
              // console.log(graphData);
              // element.chartData = graphData;
              for (let x of this.metricList) {
                if (x.id == parseInt(this.graphObj.metricID)) {
                  element.warningValue = x.warningPercentage;
                  element.criticalValue = x.criticalPercentage;
                  element.metricDataUnit = x.dataUnit;
                  element.normalColor = x.normalColor;
                  element.warningColor = x.warningColor;
                  element.criticalColor = x.criticalColor;
                  break;
                }
              }
              let data = element.chartData.data;
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body 2!!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {

                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                let graphOption = this.guagemeterChartService.buildChartJSON(element, "graph");
                this.createGaugeChart(graphOption, element, graphOption);
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();
            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      }
      else {
        this.isError = true;
        this.isSuccess = false;
        let parent = document.getElementById("test");
        let existingElement = document.getElementById("child");
        if (existingElement != undefined) {
          parent.removeChild(existingElement)
        }
        let errorMsg = "Please select another visualization mode !!";
        let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
        parent.insertAdjacentHTML('beforeend', errorTemplate);
      }
    }
  }


  getFunnelGraph(template: TemplateRef<any>) {
    this.graphInputObj = new GraphInputJSON();

    this.param = [];
    this.param.push(this.fromDate);
    this.param.push(this.toDate);


    let startDate: any;
    let endDate = new Date(); // current Date
    let dateFormat = 'yyyy-MM-DD HH:mm:ss';

    startDate = moment(endDate).subtract(5, 'minutes');
    this.fromDate = moment(startDate).format(dateFormat);
    this.toDate = moment(endDate).format(dateFormat);



    this.graphInputObj.chartId = this.graphObj.chartId;
    this.graphInputObj.chartName = this.graphObj.chartName;
    this.graphInputObj.chartTitle = this.graphObj.chartTitle;
    this.graphInputObj.chartType = this.graphObj.chartType;
    this.graphInputObj.unit = this.graphObj.unit;
    this.graphInputObj.dataSource = this.graphObj.dataSource;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbType = this.graphObj.dbType;
    this.graphInputObj.port = this.graphObj.port;
    this.graphInputObj.dbName = this.graphObj.dbName;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbQuery = this.graphObj.dbQuery;
    this.graphInputObj.dbipAddress = this.graphObj.ipAddress;
    this.graphInputObj.dbUsername = this.graphObj.dbUsername;
    if (this.graphObj.dataSource == "Database") {
      this.graphInputObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    }
    this.graphInputObj.requestBody = this.graphObj.requestBody;
    this.graphInputObj.isElasticAuthEnabled = this.graphObj.isElasticAuthEnabled;
    this.graphInputObj.caCertificate = this.graphObj.caCertificate;
    this.graphInputObj.elasticUser = this.graphObj.elasticUser;
    this.graphInputObj.elasticPassword = this.graphObj.elasticPassword;
    this.graphInputObj.bgColor = this.graphObj.bgColor;
    this.graphInputObj.fontColor = this.graphObj.fontColor;
    this.graphInputObj.graphBG = this.graphObj.graphBG;
    this.graphInputObj.colors = this.graphObj.colors;
    this.graphInputObj.ifcount = this.graphObj.ifcount;
    this.graphInputObj.ipAddress = "";
    this.graphInputObj.applicationId = this.graphObj.applicationId;
    // this.graphInputObj.subFeatureId = this.graphObj.subFeatureId;
    this.graphInputObj.graphDescription = this.graphObj.graphDescription;
    this.graphInputObj.timeframe = this.graphObj.timeframe;
    this.graphInputObj.datasourceId = this.datasourceId;
    this.graphInputObj.createRequestBody = this.graphObj.createRequestBody;

    if (this.graphInputObj.createRequestBody) {
      let datasource = new datasourceDetails();
      for (let x of this.allDatasourceList) {
        if (x.id == this.datasourceId) {
          datasource = x;
          this.graphInputObj.isElasticAuthEnabled = datasource.authenticationEnabled;
          this.graphInputObj.elasticUser = datasource.datasourceUsername;
          this.graphInputObj.elasticPassword = datasource.datasourcePassword;
          break;
        }
      }
      let requestBodyAndURL = this.requestBodyService.refreshRequestBody(this.queryObjList, datasource);
      this.graphInputObj.query = requestBodyAndURL[1];
      this.graphInputObj.requestBody = requestBodyAndURL[0];
    }
    if (this.fromTODate) {
      let dates = Array.isArray(this.fromTODate) ? this.fromTODate : (typeof this.fromTODate === 'string' ? this.fromTODate.split(" - ") : [this.fromTODate]);
      this.graphInputObj.fromDate = dates[0] ? moment(dates[0]).format(this.dateFormat) : this.fromDate;
      this.graphInputObj.toDate = dates[1] ? moment(dates[1]).format(this.dateFormat) : this.toDate;
    }
    else {
      this.graphInputObj.fromDate = this.fromDate;
      this.graphInputObj.toDate = this.toDate;
    }

    let isInputValid = this.checkInputObj(this.graphObj, template);
    this.graphInputObj.sessionDTO = this.sessionObject;
    if (isInputValid) {
      this.isVisualized = true;

      if (this.graphInputObj.chartType == 'Funnel') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            try {
              // let graphData = this.guagechartService.createPieGraphDataObject(element.chartData);
              // console.log(graphData);
              // element.chartData = graphData;
              let data = element.chartData.data;

              console.log("data", data);


              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {
                let zeroCheck = true;
                for (let z = 0; z < data.length; z++) {
                  if (data[z].y > 0) {
                    zeroCheck = false;
                    break;
                  }
                }
                if (zeroCheck) {
                  element.chartData.data = [];
                }

                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                element.isLegendEnabled = this.graphObj.isLegendEnabled;
                element.legendPosition = this.graphObj.legendPosition;
                let graphOption = this.funnelChartService.buildChartJSON(element, "graph");
                this.createChart(graphOption, element, graphOption);
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              console.error();
            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      }
      else {
        this.isError = true;
        this.isSuccess = false;
        let parent = document.getElementById("test");
        let existingElement = document.getElementById("child");
        if (existingElement != undefined) {
          parent.removeChild(existingElement)
        }
        let errorMsg = "Please select another visualization mode !!";
        let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
        parent.insertAdjacentHTML('beforeend', errorTemplate);
      }
    }
  }

  getSingleValuedGraph(template: TemplateRef<any>) {
    this.graphInputObj = new GraphInputJSON();

    this.param = [];
    this.param.push(this.fromDate);
    this.param.push(this.toDate);


    let startDate: any;
    let endDate = new Date(); // current Date
    let dateFormat = 'yyyy-MM-DD HH:mm:ss';

    startDate = moment(endDate).subtract(5, 'minutes');
    this.fromDate = moment(startDate).format(dateFormat);
    this.toDate = moment(endDate).format(dateFormat);



    this.graphInputObj.chartId = this.graphObj.chartId;
    this.graphInputObj.chartName = this.graphObj.chartName;
    this.graphInputObj.chartTitle = this.graphObj.chartTitle;
    this.graphInputObj.chartType = this.graphObj.chartType;
    this.graphInputObj.unit = this.graphObj.unit;
    this.graphInputObj.dataSource = this.graphObj.dataSource;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbType = this.graphObj.dbType;
    this.graphInputObj.port = this.graphObj.port;
    this.graphInputObj.dbName = this.graphObj.dbName;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbQuery = this.graphObj.dbQuery;
    this.graphInputObj.dbipAddress = this.graphObj.ipAddress;
    this.graphInputObj.dbUsername = this.graphObj.dbUsername;
    if (this.graphObj.dataSource == "Database") {
      this.graphInputObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    }
    this.graphInputObj.ifcount = this.graphObj.ifcount;
    this.graphInputObj.requestBody = this.graphObj.requestBody;
    this.graphInputObj.isElasticAuthEnabled = this.graphObj.isElasticAuthEnabled;
    this.graphInputObj.caCertificate = this.graphObj.caCertificate;
    this.graphInputObj.elasticUser = this.graphObj.elasticUser;
    this.graphInputObj.elasticPassword = this.graphObj.elasticPassword;
    this.graphInputObj.bgColor = this.graphObj.bgColor;
    this.graphInputObj.fontColor = this.graphObj.fontColor;
    this.graphInputObj.graphBG = this.graphObj.graphBG;
    this.graphInputObj.graphTitlePosition = this.graphObj.graphTitlePosition;
    this.graphInputObj.metricID = this.graphObj.metricID;
    this.graphInputObj.warningValue = this.graphObj.warningValue;
    this.graphInputObj.criticalValue = this.graphObj.criticalValue;
    this.graphInputObj.metricDataUnit = this.graphObj.metricDataUnit;
    this.graphInputObj.ipAddress = "";
    this.graphInputObj.applicationId = this.graphObj.applicationId;
    this.graphInputObj.expression = this.graphObj.expression;
    this.graphInputObj.timeframe = this.graphObj.timeframe;
    this.graphInputObj.sessionDTO = this.sessionObject;
    this.graphInputObj.modifiedHeaders = this.graphObj.modifiedHeaders;
    this.graphInputObj.datasourceId = this.datasourceId;
    this.graphInputObj.createRequestBody = this.graphObj.createRequestBody;
    this.graphInputObj.fontSize = this.graphObj.fontSize;
    this.graphInputObj.fontWeight = this.graphObj.fontWeight;
    this.graphInputObj.fontStyle = this.graphObj.fontStyle;
    this.graphInputObj.textAlignment = this.graphObj.textAlignment;
    this.graphInputObj.timeInHeaders=this.graphObj.timeInHeaders;
    this.graphInputObj.customDateOrCurrentDateInHeader=this.graphObj.customDateOrCurrentDateInHeader;
    this.graphInputObj.timeFormatInHeader=this.graphObj.timeFormatInHeader;

    if (this.graphInputObj.createRequestBody) {
      let datasource = new datasourceDetails();
      for (let x of this.allDatasourceList) {
        if (x.id == this.datasourceId) {
          datasource = x;
          this.graphInputObj.isElasticAuthEnabled = datasource.authenticationEnabled;
          this.graphInputObj.elasticUser = datasource.datasourceUsername;
          this.graphInputObj.elasticPassword = datasource.datasourcePassword;
          break;
        }
      }
      let requestBodyAndURL = this.requestBodyService.refreshRequestBody(this.queryObjList, datasource);
      this.graphInputObj.query = requestBodyAndURL[1];
      this.graphInputObj.requestBody = requestBodyAndURL[0];
    }

    // this.graphInputObj.subFeatureId = this.graphObj.subFeatureId;
    if (this.fromTODate) {
      let dates = Array.isArray(this.fromTODate) ? this.fromTODate : (typeof this.fromTODate === 'string' ? this.fromTODate.split(" - ") : [this.fromTODate]);
      this.graphInputObj.fromDate = dates[0] ? moment(dates[0]).format(this.dateFormat) : this.fromDate;
      this.graphInputObj.toDate = dates[1] ? moment(dates[1]).format(this.dateFormat) : this.toDate;
    }
    else {
      this.graphInputObj.fromDate = this.fromDate;
      this.graphInputObj.toDate = this.toDate;
    }
    this.graphInputObj.textImageIconType = this.graphObj.textImageIconType;
    //this.graphInputObj.textIconImagePath = this.graphObj.textIconImagePath;
    this.graphInputObj.imageBytes = this.graphObj.imageBytes;
    this.graphInputObj.graphDescription = this.graphObj.graphDescription;

    if (this.graphObj.textImageIconType == 'file') {
      if (this.image) {
        this.graphInputObj.iconName = this.image.name;
      } else {
        this.graphInputObj.iconName = this.graphObj.iconName;
      }
    } else if (this.graphObj.textImageIconType == 'url') {
      this.graphInputObj.iconName = this.graphObj.iconName;
    }

    let isInputValid = this.checkInputObj(this.graphObj, template);

    if(this.graphInputObj.chartType == "Text" && this.graphObj.timeInHeaders){
      var d = new Date(this.customDateInHeader).toLocaleString(undefined, {timeZone: 'Asia/Kolkata'});
      this.graphInputObj.query = d;
    }

    if (isInputValid) {
      this.isVisualized = true;

      //if (this.graphInputObj.chartType == 'Text Value') {
      if (this.graphInputObj.chartType == 'Text Value' || this.graphInputObj.chartType == 'Text Value - Circle' || this.graphInputObj.chartType == 'Text') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            element.imageBytes = this.graphInputObj.imageBytes;
            try {
              let data = element.chartData.data;
              for (let x of this.metricList) {
                if (x.id == parseInt(this.graphInputObj.metricID)) {
                  element.metricID = x.id;
                  element.warningValue = x.warningPercentage;
                  element.criticalValue = x.criticalPercentage;
                  element.metricDataUnit = x.dataUnit;
                  break;
                }
              }
              if (this.fromTODate == undefined && this.graphInputObj.chartType != 'Text') {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {

                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                let graphOption = this.singleValueService.buildChartObject(element);
                this.createDivAsGraph(graphOption, element);
              }

            }
            catch (error) {
              if (this.fromTODate == undefined && this.graphInputObj.chartType != 'Text') {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      }
      else {
        this.isError = true;
        this.isSuccess = false;
        let parent = document.getElementById("test");
        let existingElement = document.getElementById("child");
        if (existingElement != undefined) {
          parent.removeChild(existingElement)
        }
        let errorMsg = "Please select another visualization mode !!";
        let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
        parent.insertAdjacentHTML('beforeend', errorTemplate);
      }
    }
  }

  checkTableAndMetricColumns(text: any) {
    if (this.graphObj.chartType == 'RAG Table') {
      if (text == 'metric') {
        for (let a = 0; a < this.metricColumns.length; a++) {
          for (let b = 0; b < this.tableHeaders.length; b++) {
            if (this.metricColumns[a] == this.tableHeaders[b]) {
              this.tableHeaders.splice(b, 1);
            }
          }
        }
      }
      else {
        for (let a = 0; a < this.tableHeaders.length; a++) {
          for (let b = 0; b < this.metricColumns.length; b++) {
            if (this.tableHeaders[a] == this.metricColumns[b]) {
              this.metricColumns.splice(b, 1);
            }
          }
        }
      }
    }

  }

  getTableGraph(template: TemplateRef<any>) {

    // if(this.graphObj.chartType == "RAG Table")
    // {
    //   if(!this.graphObj.metricID)
    //   {
    //     this.isError = true;
    //     this.isSuccess = false;
    //     this.openAlertMod(template, "Kindly provide Metric Name !!");
    //     return;
    //   }
    // }
    this.graphInputObj = new GraphInputJSON();

    this.param = [];
    this.param.push(this.fromDate);
    this.param.push(this.toDate);
    this.idAndValueMap = new Map();

    let startDate: any;
    let endDate = new Date(); // current Date
    let dateFormat = 'yyyy-MM-DD HH:mm:ss';

    startDate = moment(endDate).subtract(5, 'minutes');
    this.fromDate = moment(startDate).format(dateFormat);
    this.toDate = moment(endDate).format(dateFormat);

    this.graphInputObj.chartId = this.graphObj.chartId;
    this.graphInputObj.chartName = this.graphObj.chartName;
    this.graphInputObj.chartTitle = this.graphObj.chartTitle;
    this.graphInputObj.chartType = this.graphObj.chartType;
    this.graphInputObj.unit = this.graphObj.unit;
    this.graphInputObj.dataSource = this.graphObj.dataSource;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbType = this.graphObj.dbType;
    this.graphInputObj.port = this.graphObj.port;
    this.graphInputObj.dbName = this.graphObj.dbName;
    this.graphInputObj.query = this.graphObj.query;
    this.graphInputObj.dbQuery = this.graphObj.dbQuery;
    this.graphInputObj.dbipAddress = this.graphObj.ipAddress;
    this.graphInputObj.dbUsername = this.graphObj.dbUsername;
    if (this.graphObj.dataSource == "Database") {
      this.graphInputObj.dbPassword = this.setEncryption(this.graphObj.dbPassword);
    }
    this.graphInputObj.requestBody = this.graphObj.requestBody;
    this.graphInputObj.isElasticAuthEnabled = this.graphObj.isElasticAuthEnabled;
    this.graphInputObj.isSourceDBEnabled = this.graphObj.isSourceDBEnabled;
    this.graphInputObj.caCertificate = this.graphObj.caCertificate;
    this.graphInputObj.elasticUser = this.graphObj.elasticUser;
    this.graphInputObj.elasticPassword = this.graphObj.elasticPassword;
    this.graphInputObj.dataMode = this.graphObj.dataMode;
    this.graphInputObj.tableType = this.graphObj.tableType;
    this.graphInputObj.metricID = this.graphObj.metricID;
    this.graphInputObj.warningValue = this.graphObj.warningValue;
    this.graphInputObj.criticalValue = this.graphObj.criticalValue;
    this.graphInputObj.normalColor = this.graphObj.normalColor;
    this.graphInputObj.warningColor = this.graphObj.warningColor;
    this.graphInputObj.criticalColor = this.graphObj.criticalColor;
    this.graphInputObj.metricDataUnit = this.graphObj.metricDataUnit;
    this.graphInputObj.bgColor = this.graphObj.bgColor;
    this.graphInputObj.modifiedHeaders = this.graphObj.modifiedHeaders;
    this.graphInputObj.fontColor = this.graphObj.fontColor;
    this.graphInputObj.graphBG = this.graphObj.graphBG;
    if(this.graphObj.sortingColumns == "Select"){
      this.graphInputObj.sortingColumns = null;
      this.graphInputObj.sortingType = null;
    }else{
      this.graphInputObj.sortingColumns = this.graphObj.sortingColumns;
      this.graphInputObj.sortingType = this.graphObj.sortingType;
    }
    this.graphInputObj.ifcount = this.graphObj.ifcount;
    this.graphInputObj.ipAddress = "";
    this.graphInputObj.applicationId = this.graphObj.applicationId;
    // this.graphInputObj.subFeatureId = this.graphObj.subFeatureId;
    this.graphInputObj.tableHeaderFontColor = this.graphObj.tableHeaderFontColor;
    this.graphInputObj.tableHeaderBgColor = this.graphObj.tableHeaderBgColor;
    this.graphInputObj.tableSorting = this.graphObj.tableSorting;

    this.graphInputObj.graphDescription = this.graphObj.graphDescription;
    this.graphInputObj.tableBorders = this.graphObj.tableBorders;
    this.graphInputObj.timeframe = this.graphObj.timeframe;
    this.graphInputObj.sessionDTO = this.sessionObject;
    this.graphInputObj.sessionDTO = this.sessionObject;
    this.graphInputObj.pagination = this.graphObj.pagination;	
    this.graphInputObj.wordWrap = this.graphObj.wordWrap;
    this.graphInputObj.datasourceId = this.datasourceId;
    this.graphInputObj.createRequestBody = this.graphObj.createRequestBody;

    if (this.graphInputObj.createRequestBody) {
      let datasource = new datasourceDetails();
      for (let x of this.allDatasourceList) {
        if (x.id == this.datasourceId) {
          datasource = x;
          this.graphInputObj.isElasticAuthEnabled = datasource.authenticationEnabled;
          this.graphInputObj.elasticUser = datasource.datasourceUsername;
          this.graphInputObj.elasticPassword = datasource.datasourcePassword;
          break;
        }
      }
      let requestBodyAndURL = this.requestBodyService.refreshRequestBody(this.queryObjList, datasource);
      this.graphInputObj.query = requestBodyAndURL[1];
      this.graphInputObj.requestBody = requestBodyAndURL[0];
    }
    if (this.fromTODate) {
      let dates = Array.isArray(this.fromTODate) ? this.fromTODate : (typeof this.fromTODate === 'string' ? this.fromTODate.split(" - ") : [this.fromTODate]);
      this.graphInputObj.fromDate = dates[0] ? moment(dates[0]).format(this.dateFormat) : this.fromDate;
      this.graphInputObj.toDate = dates[1] ? moment(dates[1]).format(this.dateFormat) : this.toDate;
    }
    else {
      this.graphInputObj.fromDate = this.fromDate;
      this.graphInputObj.toDate = this.toDate;
    }

    let isInputValid = this.checkInputObj(this.graphObj, template);

    if (isInputValid) {
      this.isVisualized = true;

      if (this.graphInputObj.chartType == 'Table' || this.graphInputObj.chartType == 'RAG Table') {
        this.dashboardService.visualizeGraph(this.graphInputObj).pipe(first()).subscribe((response: any) => {
          if (response.serviceStatus == "Success") {
            let element = response.serviceResponse;
            if (element.chartCategory) {
              this.mainTableColumns = Object.assign([], element.chartCategory[1]);
              this.allTableColumns = Object.assign([], element.chartCategory[1]);
              this.allTableMetricColumns = Object.assign([], element.chartCategory[1]);
              this.sortingColumnsList = Object.assign([], element.chartCategory[1]);
            }

            // element.chartData=JSON.parse("{\r\n"
            // + "  \"mq\": {\r\n"
            // + "    \"host1\": {\r\n"
            // + "      \"host.child1\": [\r\n"
            // + "        [\r\n"
            // + "          \"elfkk\",\r\n"
            // + "          768\r\n"
            // + "        ]\r\n"
            // + "      ],\r\n"
            // + "	  \"host.child2\": [\r\n"
            // + "        [\r\n"
            // + "          \"dash\",\r\n"
            // + "          800\r\n"
            // + "        ]\r\n"
            // + "      ]\r\n"
            // + "    },\r\n"
            // + "	\"host2\": {\r\n"
            // + "      \"host.child3\": [\r\n"
            // + "        [\r\n"
            // + "          \"home\",\r\n"
            // + "          700\r\n"
            // + "        ]\r\n"
            // + "      ]\r\n"
            // + "    }\r\n"
            // + "  },\r\n"
            // + "  \"multistep\": {\r\n"
            // + "    \"host4\": {\r\n"
            // + "      \"host.child4\": [\r\n"
            // + "        [\r\n"
            // + "          \"elfkk2\",\r\n"
            // + "          12\r\n"
            // + "        ]\r\n"
            // + "      ]\r\n"
            // + "    }\r\n"
            // + "  },\r\n"
            // + "  \"network\": {\r\n"
            // + "    \"host3\": {\r\n"
            // + "      \"host.child5\": [\r\n"
            // + "        [\r\n"
            // + "          \"elfkk3\",\r\n"
            // + "          216\r\n"
            // + "        ]\r\n"
            // + "      ]\r\n"
            // + "    }\r\n"
            // + "  }\r\n"
            // + "}");
            if (this.graphInputObj.chartType == 'RAG Table') {
              for (let x of this.metricList) {
                if (x.id == parseInt(this.graphInputObj.metricID)) {
                  this.graphInputObj.warningValue = x.warningPercentage;
                  this.graphInputObj.criticalValue = x.criticalPercentage;
                  this.graphInputObj.metricDataUnit = x.dataUnit;
                  this.graphInputObj.normalColor = x.normalColor;
                  this.graphInputObj.warningColor = x.warningColor;
                  this.graphInputObj.criticalColor = x.criticalColor;
                  break;
                }
              }
            }
            if (!element.metricColumns) {
              element.metricColumns = this.metricColumns;
            }
            if (!element.sortingColumns) {
              element.sortingColumns = element.sortingColumns;
            }
            try {
              let data = element.chartData.data;
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                errorMsg = "Please Reduce Selected Time Range !!";
                //let errorMsg = "Please check your Request API or Request body !!";	
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (Array.isArray(data) && !data.length) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                if(element.status == "DATA NOT FOUND")
                {
                  errorMsg = "No Data !!";
                }else{
                  errorMsg = "Please check your Request API or Request body !!";
                }
                //let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } else {

                if (element.graphBG == 'transparent') {
                  element.bgColor = 'transparent';
                  if (element.fontColor == null) {
                    element.fontColor = '#000';
                  }
                } else {
                  // for Color BG
                  // ------------------- check color is light or dark & set Font color ----------------
                  //console.log(element.bgColor);
                  let bgColor: any;

                  if (element.bgColor != null) {
                    bgColor = element.bgColor;
                  } else {
                    bgColor = '#141619';
                  }

                  if (element.fontColor == null) {

                    let brightness = this.lightOrDark(bgColor);
                    // alert(brightness);

                    if (brightness == 'dark') {
                      element.fontColor = '#eee';
                    } else if (brightness == 'light') {
                      element.fontColor = '#000';
                    }
                  }
                  element.bgColor = bgColor;
                }

                if (element.tableHeaderFontColor == null || element.tableHeaderFontColor == undefined) {
                  element.tableHeaderFontColor = '#fff';
                }
                if (element.tableHeaderBgColor == null || element.tableHeaderBgColor == undefined) {
                  element.tableHeaderBgColor = '#000';
                }

                let graphOption = this.tablechartService.buildChartObject(element, this.graphInputObj);
                this.idAndValueMap = graphOption[1];	
                this.createDivAsGraph(graphOption[0], element);

                if (this.tableHeaders) {
                  let et = "";
                  let classEt = "";
                  for (let a = 0; a < this.tableHeaders.length; a++) {
                    for (let b = 0; b < this.allTableColumns.length; b++) {
                      if (this.tableHeaders[a] == this.allTableColumns[b]) {
                        if (et) {
                          et = et + ",";
                        }
                        if (element.tableType == 'rowwise') {
                          et = et + 'td:nth-child(' + (b + 1) + '),th:nth-child(' + (b + 1) + ')';
                        }
                        else {
                          et = et + 'tr:nth-child(' + (b + 1) + ')';
                        }
                      }
                    }
                    if (classEt) {
                      classEt = classEt + ",";
                    }
                    // classEt=classEt + ".header-"+this.tableHeaders[a].replace(/\s+/g, '') 
                    //       + ", .header-"+this.tableHeaders[a].replace(/\s+/g, '')+"-cell";

                    classEt = classEt + ".header-" + this.tableHeaders[a].replace(/[^A-Z0-9]+/ig, '')
                      + ", .header-" + this.tableHeaders[a].replace(/[^A-Z0-9]+/ig, '') + "-cell";

                    // $(".header-"+this.tableHeaders[a]).hide();
                    // $(".header-"+this.tableHeaders[a]+"-cell").hide();
                  }
                  // $(et).hide();
                  $(classEt).hide();
                }
                let check=true;
                if(check)
                {
                  let et = "";
                  let classEt = "";
                  for (let a = 0; a < 1; a++) {
                    for (let b = 0; b < this.allTableColumns.length; b++) {
                      if ('omitcolumn' == this.allTableColumns[b]) {
                        if (et) {
                          et = et + ",";
                        }
                        if (element.tableType == 'rowwise') {
                          et = et + 'td:nth-child(' + (b + 1) + '),th:nth-child(' + (b + 1) + ')';
                        }
                        else {
                          et = et + 'tr:nth-child(' + (b + 1) + ')';
                        }
                      }
                    }
                    classEt = classEt + ".header-omitcolumn, .header-omitcolumn-cell";
                  }
                  $(classEt).hide();
                }

                if (this.graphInputObj.tableBorders == "disable") {
                  $(".table#" + this.graphInputObj.chartId).addClass("no-border");
                }
                if (this.graphInputObj.tableSorting == "Yes") {
                  let index=this.tablechartService.metricIndex;
                  let order=this.tablechartService.metricOrder;
                  if (this.graphInputObj.pagination == "enable") {
                    if (index > -1) {
                      $('.table#' + this.graphInputObj.chartId).DataTable({
                        "language": {
                          "emptyTable": "No Records Found..."
                        },
                        "order": [[index, order]],
                        "searching": false,
                        "paging": true,
                        "info": true,
                        "lengthChange": true
                      });
                      this.tablechartService.metricIndex = -1;
                    } else {
                      $(".table#" + this.graphInputObj.chartId).DataTable(
                        {
                          "language": {
                            "emptyTable": "No Records Found..."
                          },
                          "searching": false,
                          "paging": true,
                          "info": true,
                          "lengthChange": true
                        }
                      );
                    }
                  }
                  else {
                  if(index > -1)
                  {
                    $('.table#' + this.graphInputObj.chartId).DataTable( {
                      "language": {
                        "emptyTable": "No Records Found..."
                      },
                      "order": [[ index, order ]],
                      "searching": false,
                      "paging": false,
                      "info": true,
                      "lengthChange": false
                    });
                    this.tablechartService.metricIndex=-1;
                  }else
                  {
                    $(".table#" + this.graphInputObj.chartId).DataTable(
                      {
                        "language": {
                          "emptyTable": "No Records Found..."
                        },
                        "searching": false,
                        "paging": false,
                        "info": true,
                        "lengthChange": false
                      }
                    );
                  }
                }
                }
                
                document.querySelectorAll('.dynamic-table th').forEach(e => e.addEventListener("click", function () {
                  document.getElementById('header_mask').style.visibility = 'visible';
                  document.getElementById('header_mask_frontlayer').style.visibility = 'visible';
                  $("#modifyHeaderID").html(element.chartCategory[1][e.getAttribute("coloumn-count")]);
                  $("#modifyHeaderInputID").val(e.textContent);
                  // $("#changeHeaderDiv").remove();
                  // var boxText = document.createElement("div");
                  // boxText.setAttribute("id","changeHeaderDiv")
                  // const contentString = `<input style="background: `+element.tableHeaderBgColor+`; color: `+element.tableHeaderFontColor+`;">`;
                  // boxText.innerHTML = contentString;
                  // const button = document.createElement('button');
                  // button.addEventListener('click', (e) => {

                  //   if (!this.graphObj.modifiedHeaders) {
                  //     this.graphObj.modifiedHeaders = null;
                  //   }
                  //   else{
                  //     let modifiedHeaders = JSON.parse(this.graphObj.modifiedHeaders);
                  //     let headerName = $("#changeHeaderDiv").text();
                  //     if (modifiedHeaders) {
                  //       //legendColors[legend]=this.legendColorCode;
                  //     }
                  //     else {
                  //       modifiedHeaders = {};

                  //     }
                  //   }
                  // });
                  // button.innerHTML=`<i class="fa fa-save"></i>`;
                  // boxText.appendChild(button);
                  // e.append(boxText);
                }));
              }
            }
            catch (error) {
              if (this.fromTODate == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement);
                }
                let errorMsg = "Please Select Date Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                        <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "401 Unauthorized") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please Enter Valid Elastic Credentials !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              }
              else if (element.status == "Too Many Buckets") {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "";
                errorMsg = "Please Reduce Selected Time Range !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">	
                      <div class="col-md-12">	
                      <h5 style="color: #757575;">${errorMsg}</h5>	
                      </div>	
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);
              } 
              else if (element.chartData == null || element == undefined) {
                let parent = document.getElementById("test");
                let existingElement = document.getElementById("child");
                if (existingElement != undefined) {
                  parent.removeChild(existingElement)
                }
                let errorMsg = "Please check your Request API or Request body !!";
                let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
                parent.insertAdjacentHTML('beforeend', errorTemplate);

              }
              console.error();
            }
          } else {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, response.serviceResponse);
          }
        });
      }
      else {
        this.isError = true;
        this.isSuccess = false;
        let parent = document.getElementById("test");
        let existingElement = document.getElementById("child");
        if (existingElement != undefined) {
          parent.removeChild(existingElement)
        }
        let errorMsg = "Please select another visualization mode !!";
        let errorTemplate = `<div id="child" class="row d-flex justify-content-center align-items-center text-center text-secondary" style="height: 100%; display: block; color: #bdbdbd;">
                      <div class="col-md-12">
                      <h5 style="color: #757575;">${errorMsg}</h5>
                      </div>
                    </div>`;
        parent.insertAdjacentHTML('beforeend', errorTemplate);
      }
    }
  }

  createChart(graphOption: any, data: any, options?: Object) {
    let opts = !options ? options : graphOption;

    let parent = document.getElementById("test");
    let chartWidth = document.getElementById("test").clientWidth;
    let chartHeight = document.getElementById("test").clientHeight;
    let rag_bar = document.getElementById("test-status-bar");
    let doughnutChartFontColor = sessionStorage.getItem("doughnutChartFontColor");
    let BODY_HEIGHT = 1;
    if (data.chartType == 'DoughNut' && (data.pointChildGraphs == 'RAG' || data.pointChildGraphs == 'RAGCOUNT_POINTGRAPHS' )) {
      /* FOR RAG Status bar, adjusting graph size & applying same BG color as graph */
      BODY_HEIGHT = 0.9;
      let critical_count = document.getElementById("test-critical-count");
      critical_count.innerText = data.criticalcount;
      let warning_count = document.getElementById("test-warning-count");
      warning_count.innerText = data.warningcount;
      let normal_count = document.getElementById("test-normal-count");
      normal_count.innerText = data.normalcount;
      if (data.graphBG == 'transparent') {
        rag_bar.style.backgroundColor = 'transparent';
      } else {
        if (data.bgColor != null){
          rag_bar.style.backgroundColor = data.bgColor;
          rag_bar.style.color = doughnutChartFontColor;
        }
        else{
          rag_bar.style.backgroundColor = "#141619";
        }
      }
    }

    let existingElement = document.getElementById("child");
    if (existingElement != undefined) {
      parent.removeChild(existingElement)
    }
    let element = document.createElement("div");
    element.setAttribute("id", `child`);
    parent.appendChild(element);

    if (!!opts.chart) {
      opts.chart['renderTo'] = element;
    }
    else {
      opts.chart = {
        'renderTo': element
      }
    }
    let myChart = new Highcharts.Chart(opts);
    myChart.setSize(chartWidth, chartHeight * BODY_HEIGHT, false);

    if (this.charts.length > 0) {
      this.charts.pop();
    }
    this.charts.push(myChart);

    this.setGraphDescription(data.chartTitle, data.graphDescription, data.chartId, data.chartType, data.pointChildGraphs);
  }

  createGaugeChart(graphOption: any, data: any, options?: Object) {
    let parent = document.getElementById("test");
    let chartWidth = document.getElementById("test").clientWidth;
    let chartHeight = document.getElementById("test").clientHeight;
    let BODY_HEIGHT = 1;

    let existingElement = document.getElementById("child");
    if (existingElement != undefined) {
      parent.removeChild(existingElement)
    }
    let element = document.createElement("div");
    element.setAttribute("id", `child`);
    let elementCss = `display:flex;
                      flex-wrap :wrap;
                      overflow-y :auto;
                      justify-content:center`;
    element.style.cssText = elementCss;
    parent.appendChild(element);

    for(let i =0 ;i<graphOption.length ;i++){
      let opts = !options ? options : graphOption[i];
      let child_element = document.createElement("div");
      child_element.setAttribute("id", `child_graph`+i);
      element.appendChild(child_element);
      if (!!opts.chart) {
        opts.chart['renderTo'] = child_element;
      }
      else {
        opts.chart = {
          'renderTo': child_element
        }
      }
      let myChart = new Highcharts.Chart(opts);
      myChart.setSize(chartWidth/3 *0.95 , chartHeight * BODY_HEIGHT, false);
      this.charts.push(myChart);
    }

    let chartData = data.chartData;
    for(let a = 0; a < chartData.length;a++){
      let dataKeys = Object.keys(chartData[a]);
      for(let x of dataKeys){
        let spanId= document.getElementById(data.chartId +"-"+x); 
        spanId.addEventListener('click', () => {
          this.showTextValueHeaderUpdate(spanId);
        });
      }
    }
    this.setGraphDescription(data.chartTitle, data.graphDescription, data.chartId, data.chartType, data.pointChildGraphs);
  }

  createDivAsGraph(graphOption: any, data: any, options?: Object) {

    let opts = !!options ? options : graphOption;
    let chartId = data.chartId;
    let parent = document.getElementById("test");
    let cardWidth = document.getElementById("test").clientWidth;
    let cardHeight = document.getElementById("test").clientHeight;
    let existingElement = document.getElementById("child");

    if (existingElement != undefined) {
      parent.removeChild(existingElement)
    }

    let element = document.createElement("div");
    element.setAttribute("id", `child`);
    element.innerHTML = opts;
    parent.appendChild(element);

    if (data.chartType == "Text Value" || data.chartType == "Text") {
     
      //setting child div to 100%
      let warpperDiv = document.getElementById(chartId + "-graph-div");
      let graphTitle = document.getElementById(chartId + "-graph-title");
      let graphContent = document.getElementById(chartId + "-graph-content");

      if (data.graphTitlePosition == "Left") {
        warpperDiv.classList.remove("flex-column", "justify-content-center", "flex-row", "justify-content-around", "flex-row-reverse", "flex-column-reverse");
        warpperDiv.classList.add("flex-row", "justify-content-around", "align-items-center");
      }

      if (data.graphTitlePosition == "Right") {
        warpperDiv.classList.remove("flex-column", "justify-content-center", "flex-row", "justify-content-around", "flex-row-reverse", "flex-column-reverse");
        warpperDiv.classList.add("flex-row-reverse", "justify-content-around", "align-items-center");
      }

      if (data.graphTitlePosition == "Bottom") {
        warpperDiv.classList.remove("flex-column", "justify-content-center", "flex-row", "justify-content-around", "flex-row-reverse", "flex-column-reverse");
        warpperDiv.classList.add("flex-column-reverse",);
      }

      document.getElementById("child").style.height = '100%';
      let content_container = document.getElementById(chartId + "-content_container");
      if (data.chartType == "Text") {
        let fontSizeContent = 0.15 * cardWidth;
        if (content_container) {
          fontSizeContent = 0.15 * (cardWidth * 0.8);
        }
  
        let graph_content = document.getElementById(chartId + "-graph-content");
        let graph_title = document.getElementById(chartId + "-graph-title");
        let text_container = document.getElementById(chartId + "-text_container");
  
        if (data.fontSize != null && data.fontSize != undefined && data.fontSize != "" && data.fontSize != "Select") {
          graph_content.style.fontSize = data.fontSize + "px";
        } else {
          graph_content.style.fontSize = fontSizeContent + "px";
        }
       
        if (data.fontStyle != null && data.fontStyle != undefined && data.fontStyle != "") {
          if(data.fontStyle == "Select"){
            graph_content.style.removeProperty("font-family");
          }else{
            graph_content.style.fontFamily = data.fontStyle + "!important";
            graph_content.style.setProperty("font-family","'"+data.fontStyle + "'");
          }
        }else{
          graph_content.style.removeProperty("font-family");
        }
    
        if (data.fontWeight != null && data.fontWeight != undefined && data.fontWeight != "" && data.fontWeight != "Select") {
          if (data.fontWeight == "bold" || data.fontWeight == "normal") {
            graph_content.style.setProperty("font-weight",data.fontWeight);
          } 
          else if (data.fontWeight == "bold+italic") {
            graph_content.style.setProperty("font-weight","bold");
            graph_content.style.setProperty("font-style","italic");
          }
          else if (data.fontWeight == "italic") {
            graph_content.style.setProperty("font-style",data.fontWeight);
          }
        }
  
        if (data.textAlignment != null && data.textAlignment != undefined && data.textAlignment != "" && data.textAlignment != "Select") {
          text_container.classList.remove("justify-content-center");
          text_container.classList.add("justify-content-" + data.textAlignment);
        }else{
          text_container.classList.add("justify-content-center");
        }
      }
      else if (data.chartType == "Text Value"  && (data.textImageIconType != 'url' ||  data.textImageIconType != 'file')) {
        for (let j = 0; j < data.chartData.length; j++) {
          let key = chartId + "-" + j + "-key-graph-content";
          let value = chartId + "-" + j + "-value-graph-content";
          let object = chartId + "-" + j + "-object-graph-div";
          let graph_header_content = document.getElementById(key);
          let graph_content = document.getElementById(value);
          let wrapper_div = document.getElementById(object);
          let graph_div = document.getElementById(chartId+"-graph-div"); 
          let fontSizeContent = 0.1 * graph_div.clientWidth/2;
          graph_header_content.style.fontSize = fontSizeContent/2 + "px";
          graph_content.style.fontSize = fontSizeContent + "px";

          if (data.fontSize != null && data.fontSize != undefined && data.fontSize != "" && data.fontSize != "Select") {
            graph_content.style.fontSize = data.fontSize + "px";
            graph_header_content.style.fontSize = data.fontSize/2  + "px";
          graph_content.style.fontSize = data.fontSize + "px";
          } else {
            graph_header_content.style.fontSize = fontSizeContent/2 + "px";
            graph_content.style.fontSize = fontSizeContent + "px";
          }

          if (data.fontStyle != null && data.fontStyle != undefined && data.fontStyle != "") {
            if(data.fontStyle == "Select"){
              graph_content.style.removeProperty("font-family");
              graph_header_content.style.removeProperty("font-family");
            }else{
              graph_header_content.style.setProperty("font-family","'"+data.fontStyle + "'");
              graph_content.style.setProperty("font-family","'"+data.fontStyle + "'");
            }
          }else{
            graph_content.style.removeProperty("font-family");
            graph_header_content.style.removeProperty("font-family");
          }

          if (data.fontWeight != null && data.fontWeight != undefined && data.fontWeight != "" && data.fontWeight != "Select") {
            if (data.fontWeight == "bold" || data.fontWeight == "normal") {
              graph_content.style.setProperty("font-weight",data.fontWeight);
              graph_header_content.style.setProperty("font-weight",data.fontWeight);
            } 
            else if (data.fontWeight == "bold+italic") {
              graph_content.style.setProperty("font-weight","bold");
              graph_content.style.setProperty("font-style","italic");
              graph_header_content.style.setProperty("font-weight","bold");
              graph_header_content.style.setProperty("font-style","italic");
            }
            else if (data.fontWeight == "italic") {
              graph_content.style.setProperty("font-style",data.fontWeight);
              graph_header_content.style.setProperty("font-style",data.fontWeight);
            }
          }

          if (data.textAlignment != null && data.textAlignment != undefined && data.textAlignment != "" && data.textAlignment != "Select") {
            wrapper_div.classList.remove("justify-content-center");
            graph_content.style.setProperty("text-align",data.textAlignment);
            graph_header_content.style.setProperty("text-align",data.textAlignment);
          }else{
            wrapper_div.classList.add("justify-content-center");
          }

          graph_header_content.addEventListener('click', () => {
            this.showTextValueHeaderUpdate(graph_header_content);
          });
        }
      }
      else if (data.chartType == "Text Value" && data.textImageIconType == 'url') {
        let src = data.iconName;
        let image_container = document.getElementById(chartId + "-image_container");
        let content_container = document.getElementById(chartId + "-content_container");
        let imageElement = document.createElement("IMG");
        imageElement.setAttribute("src", src);
        imageElement.setAttribute("id", "PreviewImage");
        imageElement.style.height = "250px";
        imageElement.style.width = "250px";

        image_container.style.width = (cardWidth * 0.4) + "px";
        image_container.style.height = (cardHeight * 0.7) + "px";

        content_container.style.width = (cardWidth * 0.6) + "px";
        content_container.style.height = "100%";

        for (let j = 0; j < data.chartData.length; j++) {
          let key = chartId + "-" + j + "-key-graph-content";
          let value = chartId + "-" + j + "-value-graph-content";
          let object = chartId + "-" + j + "-object-graph-div";
          let graph_header_content = document.getElementById(key);
          let graph_content = document.getElementById(value);
          let wrapper_div = document.getElementById(object);
          let graph_div = document.getElementById(chartId+"-graph-div"); 
          graph_div.classList.remove("justify-content-center");
          wrapper_div.style.width = 0.5 * graph_div.clientWidth/2 + "px";
          let fontSizeContent = 0.10 * wrapper_div.clientWidth;
          graph_header_content.style.fontSize = fontSizeContent/2 + "px";
          graph_content.style.fontSize = fontSizeContent + "px";
         
          graph_header_content.addEventListener('click', () => {
            this.showTextValueHeaderUpdate(graph_header_content);
          });
        }
        image_container.appendChild(imageElement);

      } 
      else if (data.chartType == "Text Value" && data.textImageIconType == 'file') {
        let byteFile = null;

        if (this.image) {
          const formData = new FormData();
          formData.append("image", this.image);
          this.featureGraphMappingService.previewImage(this.sessionObject,formData).pipe(first()).subscribe((response: any) => {
            byteFile = response.serviceResponse;

            let objectURL = 'data:image/*;base64,' + byteFile;
            let src: string = this.sanitizer.sanitize(SecurityContext.RESOURCE_URL, this.sanitizer.bypassSecurityTrustResourceUrl(objectURL));
            let image_container = document.getElementById(chartId + "-image_container");
            let content_container = document.getElementById(chartId + "-content_container");
            let imageElement = document.createElement("IMG");
            imageElement.setAttribute("src", src);
            imageElement.setAttribute("id", "PreviewImage");
            imageElement.style.height = "250px";
            imageElement.style.width = "250px";

            image_container.style.width = (cardWidth * 0.4) + "px";
            image_container.style.height = (cardHeight * 0.7) + "px";

            content_container.style.width = (cardWidth * 0.6) + "px";
            content_container.style.height ="100%";

            for (let j = 0; j < data.chartData.length; j++) {
              let key = chartId + "-" + j + "-key-graph-content";
              let value = chartId + "-" + j + "-value-graph-content";
              let object = chartId + "-" + j + "-object-graph-div";
              let graph_header_content = document.getElementById(key);
              let graph_content = document.getElementById(value);
              let wrapper_div = document.getElementById(object);
              let graph_div = document.getElementById(chartId+"-graph-div"); 
              graph_div.classList.remove("justify-content-center");
              wrapper_div.style.width = 0.5 * graph_div.clientWidth/2 + "px";
              let fontSizeContent = 0.10 * wrapper_div.clientWidth;
              graph_header_content.style.fontSize = fontSizeContent/2 + "px";
              graph_content.style.fontSize = fontSizeContent + "px";
            
              graph_header_content.addEventListener('click', () => {
                this.showTextValueHeaderUpdate(graph_header_content);
              });
            }
            image_container.appendChild(imageElement);

          });
          // this.appendTextImageIcon(this.image, null);
        } else if (data.imageBytes) {
          byteFile = data.imageBytes;

          let objectURL = 'data:image/*;base64,' + byteFile;
          let src: string = this.sanitizer.sanitize(SecurityContext.RESOURCE_URL, this.sanitizer.bypassSecurityTrustResourceUrl(objectURL));
          let image_container = document.getElementById(chartId + "-image_container");
          let content_container = document.getElementById(chartId + "-content_container");
          let imageElement = document.createElement("IMG");
          imageElement.setAttribute("src", src);
          imageElement.setAttribute("id", "PreviewImage");
          imageElement.style.height = "250px";
          imageElement.style.width = "250px";

          image_container.style.width = (cardWidth * 0.4) + "px";
          image_container.style.height = (cardHeight * 0.7) + "px";

          content_container.style.width = (cardWidth * 0.6) + "px";
          content_container.style.height = "100%";

          for (let j = 0; j < data.chartData.length; j++) {
            let key = chartId + "-" + j + "-key-graph-content";
            let value = chartId + "-" + j + "-value-graph-content";
            let object = chartId + "-" + j + "-object-graph-div";
            let graph_header_content = document.getElementById(key);
            let graph_content = document.getElementById(value);
            let wrapper_div = document.getElementById(object);
            let graph_div = document.getElementById(chartId+"-graph-div"); 
            graph_div.classList.remove("justify-content-center");
            wrapper_div.style.width = 0.5 * graph_div.clientWidth/2 + "px";
            let fontSizeContent = 0.10 * wrapper_div.clientWidth;
            graph_header_content.style.fontSize = fontSizeContent/2 + "px";
            graph_content.style.fontSize = fontSizeContent + "px";
            graph_header_content.addEventListener('click', () => {
              this.showTextValueHeaderUpdate(graph_header_content);
            });
          }

          image_container.appendChild(imageElement);
          //this.appendTextImageIcon(null, data.imageBytes);

        }
      }
    }
    else if (data.chartType == "Text Value - Circle") {

      let parentDiv = document.getElementById("child");
      let borderColor;
      let backgroundColor: any;
      let fontColor: any;

      if (data.bgColor == 'transparent') {
        backgroundColor = 'transparent';
        borderColor = '#000';
      } 
      else {
        if (data.bgColor != null) {
          backgroundColor = data.bgColor;
        } else {
          backgroundColor = '#141619';
        }

        let brightness = this.lightOrDark(backgroundColor);

        if (brightness == 'dark') {
          borderColor = '#eee';
        } else if (brightness == 'light') {
          borderColor = '#000';
        }
      }

      if (data.fontColor != null) {
        fontColor = data.fontColor;
      }
      else {
        fontColor = '#eee';
      }

      // create circle around text
      for (let j = 0; j < data.chartData.length; j++) {      
        let graph_header_content = document.getElementById(chartId + "-" + j + "-key-graph-content");
        let graph_content = document.getElementById(chartId + "-" + j + "-value-graph-content");
        let wrapper_div = document.getElementById(chartId + "-" + j + "-object-graph-div");
        let graph_div = document.getElementById(chartId+"-graph-div"); 

        wrapper_div.style.width = 0.4 * graph_div.clientWidth/2 + "px";
        graph_content.style.width = wrapper_div.clientWidth * 0.75 + "px";
        let minorDimension = wrapper_div.clientWidth;
        
        let roundStyle = `
        height: ${minorDimension}px;
        width: ${minorDimension}px;
        border-color: ${borderColor};
        border-width: 5px;
        border-style: solid;
        border-radius: 50%;
        color: ${data.fontColor};
        background-color: ${backgroundColor};
        display:grid !important;
        justify-content: center !important;
        align-content:center !important;
        align-items :center !important;
        `;
        
        wrapper_div.style.cssText = roundStyle;
        graph_content.style.cssText = `word-wrap: break-word;`;

        if (data.fontSize != null && data.fontSize != undefined && data.fontSize != "" && data.fontSize != "Select") {
          graph_content.style.fontSize = data.fontSize + "px";
          graph_header_content.style.fontSize = data.fontSize/2  + "px";
        } else {
          graph_content.style.fontSize = (cardHeight * 0.05) + "px";
          graph_header_content.style.fontSize = (cardHeight * 0.05) + "px";
        }

        if (data.fontStyle != null && data.fontStyle != undefined && data.fontStyle != "") {
          if(data.fontStyle == "Select"){
            graph_content.style.removeProperty("font-family");
            graph_header_content.style.removeProperty("font-family");
          }else{
            graph_header_content.style.setProperty("font-family","'"+data.fontStyle + "'");
            graph_content.style.setProperty("font-family","'"+data.fontStyle + "'");
          }
        }else{
          graph_content.style.removeProperty("font-family");
          graph_header_content.style.removeProperty("font-family");
        }

        if (data.fontWeight != null && data.fontWeight != undefined && data.fontWeight != "" && data.fontWeight != "Select") {
          if (data.fontWeight == "bold" || data.fontWeight == "normal") {
            graph_content.style.setProperty("font-weight",data.fontWeight);
            graph_header_content.style.setProperty("font-weight",data.fontWeight);
          } 
          else if (data.fontWeight == "bold+italic") {
            graph_content.style.setProperty("font-weight","bold");
            graph_content.style.setProperty("font-style","italic");
            graph_header_content.style.setProperty("font-weight","bold");
            graph_header_content.style.setProperty("font-style","italic");
          }
          else if (data.fontWeight == "italic") {
            graph_content.style.setProperty("font-style",data.fontWeight);
            graph_header_content.style.setProperty("font-style",data.fontWeight);
          }
        }

        graph_header_content.addEventListener('click', () => {
          this.showTextValueHeaderUpdate(graph_header_content);
        });
      }

      parentDiv.style.cssText = `height: 100%;background-color: ${backgroundColor};`;
    }
    else if (data.chartType == "Table" || data.chartType == "RAG Table") {
      // for table graph
      let fontSizeContent = 0.05 * cardWidth;
      let divHeight = cardHeight;
      let divWidth = cardWidth;

      let bgColor: any;
      let fontColor: any;

      if (data.graphBG == 'transparent') {
        parent.style.backgroundColor = '#fff';
      }

      document.getElementById(chartId + "-table-div").style.height = divHeight + "px";
      document.getElementById(chartId + "-table-div").style.width = divWidth + "px";
      $("." + chartId + "-table-content").css('font-size', fontSizeContent + "px");

      if (data.chartType == "RAG Table") {
        $("#" + chartId + "-table-div .row").append(data.legendBlocks);
      }
      let idListArr = Array.from(this.idAndValueMap.keys());	
      for(let i=0;i<idListArr.length;i++ ){	
        let copyBtn = document.getElementById(idListArr[i]);	
        copyBtn?.addEventListener('click',() => {	
          this.copyTableText(idListArr[i]);	
        });	
      }
    }

    this.setGraphDescription(data.chartTitle, data.graphDescription, data.chartId, data.chartType, data.pointChildGraphs);

    if (this.charts.length > 0) {
      this.charts.pop();
    }
    let chart = opts;
    this.charts.push(chart);

    // Remove Export menu 
    let dropdown_btn = document.getElementById(data.chartTitle + "_dropdown");
    if (dropdown_btn) {
      let parentDiv = dropdown_btn.parentElement;
      dropdown_btn.classList.remove("dropdown-toggle");
      if (parentDiv) {
        parentDiv.classList.remove("dropdown");
        parentDiv.lastElementChild.remove();
      }
    }
  }

  setGraphDescription(chartTitle: any, graphDescription: any, chartID: any, chartType: any, pointChildGraphs: any) {
    var spanTags = document.getElementsByTagName("span");
    var searchText = chartTitle;
    var found;

    for (var i = 0; i < spanTags.length; i++) {
      if (spanTags[i].textContent == searchText) {
        found = spanTags[i];
        break;
      }
    }

    if (found) {
      if ((chartType == 'Pie' || chartType == 'DoughNut') && pointChildGraphs == 'RAG') {
        let element = `
        <div class="d-flex flex-column align-items-center">
          <span id="${chartID.replace(/[^A-Z0-9]+/ig, '')}-title">${chartTitle}</span>
          <div class="row justify-content-center pt-1">
            <h6 id="${chartID.replace(/[^A-Z0-9]+/ig, '')}-critical-legend" class="mx-2"><span class="badge bg-danger mr-1">&nbsp;&nbsp;</span>Critical</h6>
            <h6 id="${chartID.replace(/[^A-Z0-9]+/ig, '')}-warning-legend" class="mx-2"><span class="badge bg-warning mr-1">&nbsp;&nbsp;</span>Warning</h6>
            <h6 id="${chartID.replace(/[^A-Z0-9]+/ig, '')}-normal-legend" class="mx-2"><span class="badge bg-success mr-1">&nbsp;&nbsp;</span>Normal</h6>
          </div>
        </div>
        `;
        found.innerHTML = element;
        found.style.left = '415.5px';

        let title = document.getElementById(chartID.replace(/[^A-Z0-9]+/ig, '') + "-title");

        let criticalLegend = document.getElementById(chartID.replace(/[^A-Z0-9]+/ig, '') + "-critical-legend");
        let warningLegend = document.getElementById(chartID.replace(/[^A-Z0-9]+/ig, '') + "-warning-legend");
        let normalLegend = document.getElementById(chartID.replace(/[^A-Z0-9]+/ig, '') + "-normal-legend");

        title.style.cursor = 'pointer';
        criticalLegend.style.cursor = 'pointer';
        warningLegend.style.cursor = 'pointer';
        normalLegend.style.cursor = 'pointer';


        /* Popover Attributes for Graph info */
        if (graphDescription) {
          title.setAttribute("data-trigger", "hover");
          title.setAttribute("data-placement", "top");
          title.setAttribute("data-toggle", "popover");
          title.setAttribute("data-container", "body");
          title.setAttribute("title", chartTitle);
          title.setAttribute("data-content", graphDescription);

          title.addEventListener('mouseover', (event) => {
            ($('#' + chartID.replace(/[^A-Z0-9]+/ig, '') + "-title") as any).popover({
              container: 'body',
              show: true
            });
          });

        } else {
          title.setAttribute("title", chartTitle);
        }

        /* RAG Legends Event */
        criticalLegend.addEventListener('click', () => {
          this.showSelectChildGraphs('Critical');
        });

        warningLegend.addEventListener('click', () => {
          this.showSelectChildGraphs('Warning');
        });

        normalLegend.addEventListener('click', () => {
          this.showSelectChildGraphs('Normal');
        });

      } else {
        found.setAttribute("id", `${chartID.replace(/[^A-Z0-9]+/ig, '')}-title`);
        /* Popover Attributes for Graph info */
        found.setAttribute("data-trigger", "hover");
        found.setAttribute("data-placement", "top");
        found.setAttribute("data-toggle", "popover");
        found.setAttribute("data-container", "body");
        found.setAttribute("title", chartTitle);
        found.setAttribute("data-content", graphDescription);

        found.style.cursor = 'pointer';
        try {
          found.addEventListener('mouseover', (event) => {
            ($('#' + chartID.replace(/[^A-Z0-9]+/ig, '') + "-title") as any).popover({
              container: 'body',
              show: true
            });
          });
        }
        catch (error) {

        }

      }
    }
  }

  // pagiation
  search() {
    this.p = 1;
  }

  pageChange($event) {
    this.p = $event;
  }

  refreshDatasource() {
    this.getAllDatasourceList();
    this.graphObj.query = "";
    this.graphObj.requestBody = "";
  }

  blurVisualisation(graphType) {

    if (graphType == "Bar" || graphType == "Column" || graphType == "Line") {
      this.isGraph = false;
      this.isStat = true;
      this.isGauge = true;
      this.isStackBar = true;
      this.isTableChart = true;
      this.isText = true;
      this.isFunnel = true;
      this.isPie = true;
      this.isDonut = true;
    }
    else if (graphType == 'Stacked Bar' || graphType == 'Stacked Column') {

      this.isGraph = true;
      this.isStat = true;
      this.isGauge = true;
      this.isStackBar = false;
      this.isTableChart = true;
      this.isText = true;
      this.isFunnel = true;
      this.isPie = true;
      this.isDonut = true;
    }
    else if (graphType == "Text Value" || graphType == "Text Value - Circle" || graphType == "Text") {
      this.isGraph = true;
      this.isStat = true;
      this.isGauge = true;
      this.isStackBar = true;
      this.isTableChart = true;
      this.isText = false;
      this.isFunnel = true;
      this.isPie = true;
      this.isDonut = true;

    }
    else if (graphType == "Gauge" || graphType == "Gauge Meter") {
      this.isGraph = true;
      this.isStat = true;
      this.isGauge = false;
      this.isStackBar = true;
      this.isTableChart = true;
      this.isText = true;
      this.isFunnel = true;
      this.isPie = true;
      this.isDonut = true;

    }
    else if (graphType == "Funnel") {
      this.isGraph = true;
      this.isStat = true;
      this.isGauge = true;
      this.isStackBar = true;
      this.isTableChart = true;
      this.isText = true;
      this.isFunnel = false;
      this.isPie = true;
      this.isDonut = true;

    }
    else if (graphType == "Table" || graphType == "RAG Table") {
      this.isGraph = true;
      this.isStat = true;
      this.isGauge = true;
      this.isStackBar = true;
      this.isTableChart = false;
      this.isText = true;
      this.isFunnel = true;
      this.isPie = true;
      this.isDonut = true;

    }
    else if (graphType == "Pie") {
      this.isGraph = true;
      this.isStat = true;
      this.isGauge = true;
      this.isStackBar = true;
      this.isTableChart = true;
      this.isText = true;
      this.isFunnel = true;
      this.isPie = false;
      this.isDonut = true;

    }
    else if (graphType == "DoughNut") {
      this.isGraph = true;
      this.isStat = true;
      this.isGauge = true;
      this.isStackBar = true;
      this.isTableChart = true;
      this.isText = true;
      this.isFunnel = true;
      this.isPie = true;
      this.isDonut = false;

    }
    else if (graphType == "TopN") {
      this.isGraph = false;
      this.isStat = true;
      this.isGauge = true;
      this.isStackBar = true;
      this.isTableChart = true;
      this.isText = true;
      this.isFunnel = true;
      this.isPie = true;
      this.isDonut = true;

    }

    this.graphChoice = graphType;


  }

  sortBy(value: String) {
    this.sortparam = value;
    if (this.sortDirection === 'desc') {
      this.sortDirection = 'asc';
    }
    else {
      this.sortDirection = 'desc';
    }
  }

  getAllGraphList() {
    this.allGraphExcelList = null;
    this.viewGraphObj.sessionDTO = this.sessionObject;
    this.featureGraphMappingService.allGraphExcelList(this.viewGraphObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        this.allGraphExcelList = response.serviceResponse;
        this.allGraphExcelList.unshift(this.displayedColumns);
        this.excelJsonData = this.allGraphExcelList;
      }

    });
  }

  exportAsXLSX(): void {
    this.allGraphExcelList = null;
    this.viewGraphObj.sessionDTO = this.sessionObject;
    this.featureGraphMappingService.allGraphExcelList(this.viewGraphObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        response.serviceResponse.unshift(this.displayedColumns);
        this.excelService.exportAsExcelFile(response.serviceResponse, "ExcelSheet");
        // this.allGraphExcelList = response.serviceResponse;
        // this.allGraphExcelList.unshift(this.displayedColumns);
        // this.excelJsonData = this.allGraphExcelList;
      }

    });
    // this.excelService.exportAsExcelFile(response.serviceResponse, "ExcelSheet");
  }

  // showFrontLayer() {
  //   alert("working");
  //   document.getElementById('bg_mask').style.visibility='visible';
  //   document.getElementById('frontlayer').style.visibility='visible';
  // }
  hideFrontLayer() {
    document.getElementById('bg_mask').style.visibility = 'hidden';
    document.getElementById('frontlayer').style.visibility = 'hidden';
    $(".legendColorCodeClass").val();
    $("#legendNameID").html();
    $(".aliasClass").val();
    $("#aliasNameID").html();
  }

  hideHeaderFrontLayer() {
    document.getElementById('header_mask').style.visibility = 'hidden';
    document.getElementById('header_mask_frontlayer').style.visibility = 'hidden';
    $("#modifyHeaderInputID").val();
    $("#modifyHeaderID").html();
  }

  updateLegendColorCode() {
    this.hideFrontLayer();
    if (!this.graphObj.colors) {
      this.graphObj.colors = null;
    }
    if (this.graphInputObj.chartType == "TopN") {
      this.graphObj.colors = this.legendColorCode;
    }
    else {
      // let legendColors = JSON.parse(this.graphObj.colors);
      let legendColors = {};
      try {
        legendColors = JSON.parse(this.graphObj.colors);
      }
      catch (e) {
        // console.error(e);
      }
      let legend = $("#legendNameID").text();
      if (legendColors) {
        //legendColors[legend]=this.legendColorCode;
      }
      else {
        legendColors = {};

      }
      legendColors[legend] = this.legendColorCode;
      this.graphObj.colors = JSON.stringify(legendColors);
    }


    if (this.graphInputObj.chartType == "Line" || this.graphInputObj.chartType == "Bar"
      || this.graphInputObj.chartType == "Column" || this.graphInputObj.chartType == "TopN") {
      this.getLineGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Stacked Column' || this.graphInputObj.chartType == 'Stacked Bar') {
      this.getStackedGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Pie') {
      this.getPieGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'DoughNut') {
      this.getDonutGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Gauge') {
      this.getGaugeGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Gauge Meter') {
      this.getGaugeGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Funnel') {
      this.getFunnelGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Text Value') {
      this.getSingleValuedGraph(this.alertTemplate);
    }

  }

  getMetricName(applicationID: any) {
    this.metricList = [];
    if (applicationID && (this.graphObj.chartType == 'RAG Table' || this.graphObj.chartType == 'Gauge' ||
      this.graphObj.chartType == 'Text Value' || this.graphObj.chartType == 'Text Value - Circle' || this.graphObj.chartType == 'DoughNut' || this.graphObj.chartType == 'Gauge Meter'|| this.graphObj.chartType == 'Line')) {
      const thres = new Threshold();
      // thres.healthRuleTypeID = 2;
      thres.applicationID = applicationID;
      if (this.graphObj.metricID == undefined) {
        this.graphObj.metricID = "";
      }
      thres.sessionDTO = this.sessionObject;
      this.thresholdService.getThresholdByApplicationID(thres).pipe(first()).subscribe((response: any) => {
        console.log(response.serviceResponse);
        if (response.serviceStatus == 'Success') {
          this.metricList = response.serviceResponse
        }
      });
    }
  }

  /* ------------------------ Dynamic BG Color ------------------------------ */

  lightOrDark(color: any) {

    // Variables for red, green, blue values
    var r, g, b, hsp;

    // Check the format of the color, HEX or RGB?
    if (color.match(/^rgb/)) {

      // If RGB --> store the red, green, blue values in separate variables
      color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

      r = color[1];
      g = color[2];
      b = color[3];
    }
    else {

      // If hex --> Convert it to RGB: http://gist.github.com/983661
      color = +("0x" + color.slice(1).replace(
        color.length < 5 && /./g, '$&$&'));

      r = color >> 16;
      g = color >> 8 & 255;
      b = color & 255;
    }

    // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
    hsp = Math.sqrt(
      0.299 * (r * r) +
      0.587 * (g * g) +
      0.114 * (b * b)
    );

    // Using the HSP value, determine whether the color is light or dark
    if (hsp > 127.5) {

      return 'light';
    }
    else {

      return 'dark';
    }
  }

  showGraphColorModal() {
    let bgType = this.graphObj.graphBG;
    this.graphBgColor = this.graphObj.bgColor
    this.graphFontColor = this.graphObj.fontColor
    this.tableHeaderBgColor = this.graphObj.tableHeaderBgColor;
    this.tableHeaderFontColor = this.graphObj.tableHeaderFontColor;
    this.graphTitleFontColor =this.graphObj.graphTitleFontColor;

    if (bgType == 'transparent') {
      this.graphBgColor = 'transparent';

      if (this.graphFontColor == null || this.graphFontColor == undefined) {
        this.graphFontColor = '#000';
      }

      if (this.tableHeaderBgColor == null || this.tableHeaderBgColor == undefined) {
        this.tableHeaderBgColor = 'transparent';
      }

      if (this.tableHeaderFontColor == null || this.tableHeaderFontColor == undefined) {
        this.tableHeaderFontColor = '#000';
      }

      if (this.graphTitleFontColor == null || this.graphTitleFontColor == undefined) {
        this.graphTitleFontColor = '#000';
      }

    } else if (bgType == 'color') {

      if (this.graphFontColor == null || this.graphFontColor == undefined) {
        this.graphFontColor = '#eee';
      }

      if (this.graphBgColor == null || this.graphBgColor == undefined) {
        this.graphBgColor = '#141619';
      }

      if (this.tableHeaderBgColor == null || this.tableHeaderBgColor == undefined) {
        this.tableHeaderBgColor = '#141619';
      }

      if (this.tableHeaderFontColor == null || this.tableHeaderFontColor == undefined) {
        this.tableHeaderFontColor = '#eee';
      }

      if (this.graphTitleFontColor == null || this.graphTitleFontColor == undefined) {
        this.graphTitleFontColor = '#141619';
      }
    }

    if (this.isEditGraphBtn || this.isVisualized) {
      // ($('#bgcolor_modal') as any).modal({ show: true });
      this.modalRef = this.modalService.show(this.bgcolorTemplate);

    }

    // if (backgroundColor == 'transparent') {
    //   bgType = 'transparent';
    // } else {
    //   bgType = 'color';
    // }

    // $("#graphBG").val(bgType);
    // $(".bgColor").val(backgroundColor);
    // $(".fontColor").val(fontColor);
  }

  clearBgColor() {
    $(".bgColor").val();


  }

  updateBgColor() {
    this.cancelRequest();
    // ($('#bgcolor_modal') as any).modal('hide');
    // alert(this.bgColor);
    this.graphObj.bgColor = this.graphBgColor;
    this.graphObj.fontColor = this.graphFontColor;
    this.graphObj.tableHeaderBgColor = this.tableHeaderBgColor;
    this.graphObj.tableHeaderFontColor = this.tableHeaderFontColor;
    this.graphObj.graphTitleFontColor = this.graphTitleFontColor ;
    // console.log("bgColor " + this.graphObj.bgColor);
    // console.log("fontColor " + this.graphObj.fontColor);
    // console.log("tableHeaderBgColor " + this.graphObj.tableHeaderBgColor);
    // console.log("tableHeaderFontColor " + this.graphObj.tableHeaderFontColor);


    if (this.graphInputObj.chartType == "Line" || this.graphInputObj.chartType == "Bar"
      || this.graphInputObj.chartType == "Column" || this.graphInputObj.chartType == "TopN") {
      this.getLineGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Stacked Column' || this.graphInputObj.chartType == 'Stacked Bar') {
      this.getStackedGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Pie') {
      this.getPieGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'DoughNut') {
      this.getDonutGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Gauge') {
      this.getGaugeGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Gauge Meter') {
      this.getGaugeGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Funnel') {
      this.getFunnelGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Text Value' || this.graphInputObj.chartType == 'Text Value - Circle') {
      this.getSingleValuedGraph(this.alertTemplate);
    }
    else if (this.graphInputObj.chartType == 'Table' || this.graphInputObj.chartType == 'RAG Table') {
      this.getTableGraph(this.alertTemplate);
    }
  }

  /* ------ Image Upload ------- */

  showFileName(event) {
    let infoArea = document.getElementById('file-upload-filename');
    var input = event.srcElement;
    var fileName = input.files[0].name;
    infoArea.textContent = 'File name: ' + fileName;
  }

  toggleUploadImage(e) {

    if (e.target.checked) {
      console.log("checked");
      // Instead of hiding the form, we open the modal
      this.isUploadImage = true;
      this.uploadImageModalRef = this.modalService.show(this.uploadImageModalTemplate, { class: 'modal-xl', backdrop: 'static', keyboard: false });

      setTimeout(() => {
        let input = document.getElementById('file-upload');
        if (input) {
            input.addEventListener('change', this.showFileName);
        }
      }, 2000);
    } else {
      this.isUploadImage = false;
      this.isImageUpdate = false;
      if (this.uploadImageModalRef) {
          this.uploadImageModalRef.hide();
      }
    }
    this.isTable = false;
    this.isEditGraphBtn = false;
    this.resetGraphObj();
    this.resetImageUploadObj();
  }

  closeUploadImageModal() {
      if (this.uploadImageModalRef) {
          this.uploadImageModalRef.hide();
      }
      this.isUploadImage = false;
      this.isImageUpdate = false;
  }

  onImageSelect(event) {
    if (event.target.files[0] != null) {
      this.image = event.target.files[0];
      this.imageUploadObj.imageName = this.image.name;
      console.log(this.image);
      this.showPreviewImage(this.image);
    }
  }

  onTextImageSelect(event) {
    if (event.target.files[0] != null) {
      this.image = event.target.files[0];
    }
  }

  appendTextImageIcon(imageFile: File, imageBytes: String) {
    let byteFile = null;

    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      this.featureGraphMappingService.previewImage(this.sessionObject,formData).pipe(first()).subscribe((response: any) => {
        byteFile = response.serviceResponse;

        let objectURL = 'data:image/*;base64,' + byteFile;
        let src: string = this.sanitizer.sanitize(SecurityContext.RESOURCE_URL, this.sanitizer.bypassSecurityTrustResourceUrl(objectURL));
        let image_container = document.getElementById("image_container");
        let imageElement = document.createElement("IMG");
        imageElement.setAttribute("src", src);
        imageElement.setAttribute("id", "PreviewImage");
        imageElement.style.height = "200px";
        imageElement.style.width = "200px";

        image_container.appendChild(imageElement);

      });
    }
    else {
      byteFile = imageBytes;

      let objectURL = 'data:image/*;base64,' + byteFile;
      let src: string = this.sanitizer.sanitize(SecurityContext.RESOURCE_URL, this.sanitizer.bypassSecurityTrustResourceUrl(objectURL));
      let image_container = document.getElementById("image_container");
      let imageElement = document.createElement("IMG");
      imageElement.setAttribute("src", src);
      imageElement.setAttribute("id", "PreviewImage");
      imageElement.style.height = "200px";
      imageElement.style.width = "200px";

      image_container.appendChild(imageElement);
    }

  }

  convertFileToBytes(imageFile: File) {
    const formData = new FormData();
    formData.append("image", imageFile);
    this.featureGraphMappingService.previewImage(this.sessionObject,formData).pipe(first()).subscribe((response: any) => {
      return response.serviceResponse;
    });
  }

  resetImageUploadObj() {
    this.imageUploadObj = new ImageDetails();
    this.image = null;
    this.previewImage = null;
    this.imageUploadObj.applicationId = "Select";
    this.imageUploadObj.subFeatureId = "Select";
    this.uploadSameImage = false;

    this.sameImage = new GraphInputJSON();
  }

  showPreviewImage(image: File) {
    this.previewImage = null;
    let byteFile;

    const formData = new FormData();
    formData.append("image", image);

    this.featureGraphMappingService.previewImage(this.sessionObject,formData).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        byteFile = response.serviceResponse;
        let objectURL = 'data:image/*;base64,' + byteFile;
        // this.previewImage = this.sanitizer.bypassSecurityTrustUrl(objectURL);
        let src: string = this.sanitizer.sanitize(SecurityContext.RESOURCE_URL, this.sanitizer.bypassSecurityTrustResourceUrl(objectURL));


        let image_container = document.getElementById("image_container");
        let previewText = document.getElementById("PreviewText");
        let PreviewImage = document.getElementById("PreviewImage");
        if (PreviewImage != null) {
          image_container.removeChild(PreviewImage);
        }

        if (previewText != null) {
          image_container.removeChild(previewText);
        }

        let imageElement = document.createElement("IMG");
        imageElement.setAttribute("src", src);
        imageElement.setAttribute("id", "PreviewImage");
        imageElement.style.width = '100%';
        imageElement.style.height = '100%';

        image_container.appendChild(imageElement);
      } else {
        this.isError = true;
        this.isSuccess = false;
        alert(response.serviceResponse);
      }
    });
  }

  uploadImage(template: TemplateRef<any>) {
    console.log("imageUploadObj", this.imageUploadObj)


    this.isError = false;
    this.isSuccess = false;

    const regex_imageTitle = /^[a-zA-Z^[a-zA-Z]([\w -]*[a-zA-Z])?$/;

    if (this.imageUploadObj.imageTitle == undefined || this.imageUploadObj.imageTitle == "" || this.imageUploadObj.imageTitle == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly Fill Image Name.");
      return;
    }
    else if (!regex_imageTitle.test(this.imageUploadObj.imageTitle)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Image Name Not Valid - Allow Only Alphabets,Underscore,Dash & Space");
      return;
    }

    const regex = /^[a-zA-Z0-9_:,.-]*$/;
    if (this.imageUploadObj.imageId == undefined || this.imageUploadObj.imageId == "" || this.imageUploadObj.imageId == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly Fill Image ID.");
      return;
    }
    else if (!regex.test(this.imageUploadObj.imageId)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Id Not Valid - Allow Only Alphanumeric,Underscore,Dash");
      return;
    }

    if (this.imageUploadObj.applicationId == "Select" || this.imageUploadObj.applicationId == null ||
      this.imageUploadObj.applicationId == "" || this.imageUploadObj.applicationId == undefined) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly Select Application.");
      return;
    }

    if (this.imageUploadObj.subFeatureId == null || this.imageUploadObj.subFeatureId == "" ||
      this.imageUploadObj.subFeatureId == "Select" || this.imageUploadObj.subFeatureId == undefined) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly Select Sub-Feature.");
      return;
    }

    if (this.image == null) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly Select Image.");
      return;
    }


    const formData = new FormData();
    // formData.append("imageDetails", JSON.stringify(this.imageUploadObj));
    formData.append("imageId", this.imageUploadObj.imageId);
    formData.append("imageName", this.imageUploadObj.imageName);
    formData.append("imageTitle", this.imageUploadObj.imageTitle);
    formData.append("applicationId", this.imageUploadObj.applicationId);
    formData.append("subFeatureId", this.imageUploadObj.subFeatureId);
    formData.append("createdBy", this.currentUser);
    formData.append("image", this.image);
    formData.append("isActive", this.imageUploadObj.isActive);

    formData.append("userId", this.sessionObject.userId);
    formData.append("loginTime", this.sessionObject.loginTime);
    formData.append("browserName", this.sessionObject.browserName);
    formData.append("browserVersion", this.sessionObject.browserVersion);
    formData.append("featureName", this.sessionObject.featureName);
    formData.append("menu", this.sessionObject.menu);
    formData.append("configTab", this.sessionObject.configTab);
    formData.append("requestURI", this.sessionObject.requestURI);
    formData.append("sessionId",this.sessionObject.sessionId);

    this.featureGraphMappingService.uploadImage(formData).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.isError = false;
        this.isSuccess = true;
        this.openAlertMod(template, response.serviceResponse);

        // let objectURL = 'data:image/*;base64,' + response.serviceResponse;
        // this.previewImage = this.sanitizer.bypassSecurityTrustUrl(objectURL);

        //this.previewImageURL = response.serviceResponse;
        this.showAllGraphList();
        this.viewGraphObj.applicationId = this.imageUploadObj.applicationId;
        this.viewGraphObj.subFeatureId = this.imageUploadObj.subFeatureId;
        this.resetImageUploadObj();

        this.getGraphDetailByApp(this.viewGraphObj.applicationId, this.viewGraphObj.subFeatureId);
      } else {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, response.serviceResponse);
      }
    });
  }

  /*  Update Image */
  updateImage(template: TemplateRef<any>) {

    this.isError = false;
    this.isSuccess = false;

    const regex_imageTitle = /^[a-zA-Z^[a-zA-Z]([\w -]*[a-zA-Z])?$/;

    if (this.imageUploadObj.imageTitle == undefined || this.imageUploadObj.imageTitle == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly Fill Image Name.");
      return;
    }
    else if (!regex_imageTitle.test(this.imageUploadObj.imageTitle)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Image Name Not Valid - Allow Only Alphabets,Underscore,Dash & Space");
      return;
    }

    const regex = /^[a-zA-Z0-9_:,.-]*$/;
    if (this.imageUploadObj.imageId == undefined || this.imageUploadObj.imageId == "") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly Fill Image ID.");
      return;
    }
    else if (!regex.test(this.imageUploadObj.imageId)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Graph Id Not Valid - Allow Only Alphanumeric,Underscore,Dash");
      return;
    }

    if (this.imageUploadObj.applicationId == "Select" || this.imageUploadObj.applicationId == null ||
      this.imageUploadObj.applicationId == "" || this.imageUploadObj.applicationId == undefined) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly Select Application.");
      return;
    }

    if (this.imageUploadObj.subFeatureId == null || this.imageUploadObj.subFeatureId == "" ||
      this.imageUploadObj.subFeatureId == "Select" || this.imageUploadObj.subFeatureId == undefined) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly Select Sub-Feature.");
      return;
    }

    if (!this.uploadSameImage) {
      if (this.image == null) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, "Kindly Select Image.");
        return;
      }
    }

    const formData = new FormData();
    // formData.append("imageDetails", JSON.stringify(this.imageUploadObj));
    formData.append("id", this.imageUploadObj.id);
    formData.append("imageId", this.imageUploadObj.imageId);
    formData.append("imageName", this.imageUploadObj.imageName);
    formData.append("imageTitle", this.imageUploadObj.imageTitle);
    formData.append("applicationId", this.imageUploadObj.applicationId);
    formData.append("subFeatureId", this.imageUploadObj.subFeatureId);
    formData.append("createdBy", this.currentUser);
    formData.append("image", this.image);
    formData.append("isActive", this.imageUploadObj.isActive);

    formData.append("userId", this.sessionObject.userId);
    formData.append("loginTime", this.sessionObject.loginTime);
    formData.append("browserName", this.sessionObject.browserName);
    formData.append("browserVersion", this.sessionObject.browserVersion);
    formData.append("featureName", this.sessionObject.featureName);
    formData.append("menu", this.sessionObject.menu);
    formData.append("configTab", this.sessionObject.configTab);
    formData.append("requestURI", this.sessionObject.requestURI);
    formData.append("sessionId",this.sessionObject.sessionId);
    this.featureGraphMappingService.updateImage(formData).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.isError = false;
        this.isSuccess = true;
        this.openAlertMod(template, response.serviceResponse);
        this.showAllGraphList();
        this.viewGraphObj.applicationId = this.imageUploadObj.applicationId;
        this.viewGraphObj.subFeatureId = this.imageUploadObj.subFeatureId;
        this.resetImageUploadObj();

        this.getGraphDetailByApp(this.viewGraphObj.applicationId, this.viewGraphObj.subFeatureId);
      } else {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, response.serviceResponse);
      }
    });
  }

  showImagePreviewOnUpdateForm(graph: any) {

    setTimeout((demo) => {                           // <<<---using ()=> syntax
      let objectURL = 'data:image/*;base64,' + graph.imageBytes;

      let src: string = this.sanitizer.sanitize(SecurityContext.RESOURCE_URL, this.sanitizer.bypassSecurityTrustResourceUrl(objectURL));

      let image_container = document.getElementById("image_container");
      let previewText = document.getElementById("PreviewText");
      let PreviewImage = document.getElementById("PreviewImage");

      // If Already Image is in preview
      if (PreviewImage != null) {
        image_container.removeChild(PreviewImage);
      }

      // For Preview Text
      if (previewText != null) {
        image_container.removeChild(previewText);
      }

      let imageElement = document.createElement("IMG");
      imageElement.setAttribute("src", src);
      imageElement.style.width = '100%';
      imageElement.style.height = '100%';
      imageElement.setAttribute("id", "PreviewImage");

      image_container.appendChild(imageElement);
    }, 3000);

  }

  toggleUploadUpdatedImage(event: any) {
    if (event.target.checked) {
      this.image = null;

      // Image Name & Preview Reset to Same Image
      console.log(this.sameImage)
      this.imageUploadObj.imageName = this.sameImage;
      this.showImagePreviewOnUpdateForm(this.sameImage);
    }

    setTimeout(() => {
      let input = document.getElementById('file-upload');
      input.addEventListener('change', this.showFileName);
    }, 2000);
  }

  getGraphDetailByApp(applicationId: any, subFeature: any) {
    let appName: "";
    this.p = 1;
    console.log(this.viewGraphObj);
    this.viewGraphObj.sessionDTO = this.sessionObject;
    this.featureGraphMappingService.getGraphDetailByApp(this.viewGraphObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.graphList = response.serviceResponse;
        this.isSetPreferenceEnable = true;
        this.getAllDatasourceList();
      }
    });
  }

  toggleDeleteTemplateButtons(status: string) {
    let divElement = document.getElementById('graphDeleteDiv');
    if (status === 'enable') {
      divElement.style.pointerEvents = 'auto';
      divElement.style.opacity = "1";
      return;
    }
    if (status === 'disable') {
      divElement.style.pointerEvents = 'none';
      divElement.style.opacity = "0.5";
      return;
    }
  }

  toggleEditSeeAllPage(event) {
    if (this.editSeeAllPage) {
      this.isDefault = false;
      this.isPrefrence = true;
    }
    else {
      this.isDefault = true;
      this.isPrefrence = false;
    }

  }

  updatePreferenceList(event, graph) {
    console.log("Target Checked : " + event.target.checked);
    console.log(graph);

    this.graphList.forEach(element => {
      if (element.category == "host" && element.id == graph.id) {
        if (event.target.checked) {
          element.enable = true;
        }
        else {
          element.enable = false;
        }
      }
      else {
        if (element.id == graph.id && element.hostGraphId == graph.hostGraphId) {
          if (event.target.checked) {
            element.enable = true;
          }
          else {
            element.enable = false;
          }
        }
      }

    });

    console.log(this.graphList);

    setTimeout(() => {
      //   let count= document.getElementsByClassName('enabled');
      //   console.log(count);
      //   console.log(this.graphList.length);
      //  if(count.length == this.graphList.length)
      //   {
      //     this.selectAll=true;
      //   } 
      //  else
      //  {
      //    this.selectAll=false;
      //  }
      // }, 100);
      let count = 0;
      this.graphList.forEach(element => {

        if (element.enable) {
          ++count;
        }
        else {
          count;
        }
      });
      console.log(count);
      if (this.graphList.length == count) {
        this.selectAll = true;
      }
      else {
        this.selectAll = false;
      }



    }, 1000);

    this.isSetPreferenceButtonEnable = false;

  }

  checkAll(event) {

    this.graphList.forEach(element => {
      if (event.target.checked) {
        element.enable = true;
      }
      else {
        element.enable = false;
      }


    });
    console.log(this.graphList);
    this.isSetPreferenceButtonEnable = false;

  }


  getDataByUserIdandSubFandApp(viewGraphObj: any) {
    this.viewGraphObj.createdBy = this.user.id;
    this.viewGraphObj.sessionDTO = this.sessionObject;
    this.featureGraphMappingService.getDataByUserIdandSubFandApp(this.viewGraphObj).pipe(first()).subscribe((response: any) => {
      this.graphList = [];
      if (response.serviceStatus == 'Success') {
        this.graphList = response.serviceResponse;
      }
    });
    setTimeout(() => {
      //   let count= document.getElementsByClassName('enabled');
      //   console.log(count.length);
      //   console.log(this.graphList.length);
      //  if(count.length == this.graphList.length)
      //   {
      //     this.selectAll=true;
      //   } 
      //  else
      //  {
      //    this.selectAll=false;
      //  }

      // }, 1000);
      let count = 0;
      this.graphList.forEach(element => {

        if (element.enable) {
          ++count;
        }

      }, 100);
      console.log(count);

      if (this.graphList.length == count && this.graphList != 0) {
        this.selectAll = true;
      }
      else {
        this.selectAll = false;
      }
    }, 1000);
  }


  savePreference(template: TemplateRef<any>) {
    if(this.graphList.length == 0){
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template,"Sub Feature Contain Empty Graph List !!");
      return false;
    }

    for (let x of this.graphList) {
      x.userId = this.user.id;
      x.sessionDTO = this.sessionObject;
    }
    this.featureGraphMappingService.getsavePreference(this.graphList).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.isError = false;
        this.isSuccess = true;
        this.openAlertMod(template, response.serviceResponse);

      }
    });
    this.graphList;
    this.isPrefrence = true;

  }

  uploadUpdatedIcon() {
    this.isIconName = false;
    this.isUpdateIcon = true;

    this.graphObj.textImageIconType = "Select";
    this.graphObj.iconName = null;
  }

  isDefaultEnable() {
    if (this.isDefault) {
      this.getGraphDetailByApp(this.viewGraphObj.applicationId, this.viewGraphObj.subFeatureId);
    }
    else {
      this.getDataByUserIdandSubFandApp(this.viewGraphObj);
      this.isSetPreferenceButtonEnable = true;
    }
  }

  showSelectChildGraphs(pointName: any) {
    this.pointName = pointName;
    this.pointGraphs = [];
    this.selectAllPointGraphs = false;

    this.graphObj.pointName = pointName;
    // console.log("this.graphObj : ", this.graphObj);

    this.graphObj.sessionDTO = this.sessionObject;
    this.featureGraphMappingService.getPointGraphsByApplicationID(this.graphObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.pointGraphList = response.serviceResponse;
        console.log("this.pointGraphList : ", this.pointGraphList);
        if(this.allPointGraphs.size != 0){
          this.allPointGraphs.forEach((value: Graph[], key: string) => {    
            if (key == pointName) {
              this.pointGraphList = value;
            }
          });
        }
        this.childModalRef = this.modalService.show(this.childModalTemplate, { class: 'modal-xl modal-dialog-centered', backdrop: 'static', keyboard: false });
        setTimeout(() => { this.setSelectAllPointGraphs() }, 1000);
      } else {
        alert(response.serviceResponse);
      }
    });
  }

  updatePointChild(event: any, graph: any) {
    console.log("checked ? : ", event.target.checked);
    console.log("graph : ", graph);

    this.pointGraphList.forEach(element => {
      if (element.id == graph.id) {
        if (event.target.checked) {
          element.pointGraph = true;
        } else {
          element.pointGraph = false;
        }
      }
    });

    setTimeout(() => { this.setSelectAllPointGraphs() }, 1000);
  }

  setSelectAllPointGraphs() {
    console.log("-- in setSelectAllPointGraphs")
    let count = 0;
    this.pointGraphList.forEach(element => {
      if (element.pointGraph) {
        ++count;
      } else {
        count;
      }
    });

    console.log("Check count ", count);

    if (this.pointGraphList.length == count) {
      this.selectAllPointGraphs = true;
    } else {
      this.selectAllPointGraphs = false;
    }
  }

  updateAllPointGraphs(event: any) {

    this.pointGraphList.forEach(element => {
      if (event.target.checked) {
        element.pointGraph = true;
      } else {
        element.pointGraph = false;
      }
    });
  }

  setPointGraphs() {

    /* 
      when clicked on set 
      --> check entry with same pointName is already there if yes then replace graphList
      --> else, Add new Entry for new pointName
    */

    if (this.allPointGraphs.size != 0) {
      let found = false;

      this.allPointGraphs.forEach((value: Graph[], key: string) => {
        console.log("pointName -- ", this.pointName);
        console.log("pointName key -- ", key);
        console.log("pointGraphs -- ", value);

        if (key == this.pointName) {
          this.allPointGraphs.set(key, this.pointGraphList);
          return found = true;
        }
      });

      if (!found) {
        this.allPointGraphs.set(this.pointName, this.pointGraphList);
      }
    } else {
      this.allPointGraphs.set(this.pointName, this.pointGraphList);
    }

    console.log("Updated allPointGraphs -- ", this.allPointGraphs);
    if(this.childModalRef) {
      this.childModalRef.hide();
    }
  }

  updateTableHeader() {
    this.hideHeaderFrontLayer();
    if (!this.graphObj.modifiedHeaders) {
      this.graphObj.modifiedHeaders = null;
    }
    else {

    }
    let modifiedHeaders = JSON.parse(this.graphObj.modifiedHeaders);
    let mHeader = $("#modifyHeaderID").text();
    if (!modifiedHeaders) {
      modifiedHeaders = {};
    }
    modifiedHeaders[mHeader] = this.modifiedHeaderName;
    this.graphObj.modifiedHeaders = JSON.stringify(modifiedHeaders);
    this.getTableGraph(this.alertTemplate);
  }

  addInputField() {
    this.graphObj.groupGraphWidgetList.push({});
  }

  removeInputField(groupGraph) {
    this.graphObj.groupGraphWidgetList.forEach((value, index) => {
      if (value.nodeGraphId == groupGraph.nodeGraphId)
        this.graphObj.groupGraphWidgetList.splice(index, 1);
    });
  }

  checkValidationGroupGraphs(graphIndex: number, groupGraph: any) {
    let isIndexCheckDisabled = true;
    if ((graphIndex + 1) == this.graphObj.groupGraphWidgetList.length && groupGraph.nodeGraphId) {
      isIndexCheckDisabled = false;
    }
    else {
      isIndexCheckDisabled = true;
    }
    return isIndexCheckDisabled;
  }

  setEncryption(value) {
    var key = CryptoJS.enc.Utf8.parse("IjfgGhpOiLjbrtJf");
    var iv = CryptoJS.enc.Utf8.parse("pOiJlKmmHgFvdStf");
    var encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(value.toString()), key, {
      keySize: 128 / 8,
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return encrypted.toString();
  }

  setDecryption(value) {
    var key = CryptoJS.enc.Utf8.parse("IjfgGhpOiLjbrtJf");
    var iv = CryptoJS.enc.Utf8.parse("pOiJlKmmHgFvdStf");
    // var decrypted = CryptoJS.AES.decrypt(CryptoJS.enc.Utf8.parse(value.toString()), key,{
    //     keySize: 128 / 8,
    //     iv: iv,
    //     mode: CryptoJS.mode.CBC,
    //     padding: CryptoJS.pad.Pkcs7
    // });

    // return decrypted.toString();
    var decrypted = CryptoJS.AES.decrypt(value, key, {
      keySize: 128 / 8,
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);



  }

  /* Graph Border */
  updateBorder(event: any, borderType: any) {

    if (event.target.checked) {
      // alert(borderType + " checked");

      if (this.graphBorders.length != 0) {
        /* remove element if already exist */
        this.graphBorders.forEach(element => {
          if (element == borderType) {
            this.graphBorders.splice(this.graphBorders.indexOf(borderType), 1);
          }
        });

        this.graphBorders.push(borderType);
      } else {
        this.graphBorders.push(borderType);
      }
    } else {
      // alert(borderType + " unchecked");
      if (this.graphBorders.length != 0) {
        this.graphBorders.forEach(element => {
          if (element == borderType) {
            this.graphBorders.splice(this.graphBorders.indexOf(borderType), 1);
          }
        });
      }
    }

    // console.log("Updated border List : ", this.graphBorders);
  }

  ngOnDestroy() {
      sessionStorage.setItem("isEditGraph","false");
      sessionStorage.removeItem("editGraphId");
      sessionStorage.setItem("onPageExitTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
      this.isEditGraph = "false";
      this.loggerService.logMyInfo(this.sessionObject, '/graph');
  }

  goToDashboard() {
    this.isEditGraph = "false";
    sessionStorage.setItem("isEditGraph", "false");
    sessionStorage.setItem("isRouteFromFeature", "true");
    // this.appComponenet.setFocus('dashboard'); // removed - method does not exist in V2 AppComponent
    this.router.navigate(['/tab-panel']
      , { queryParams: { appID: this.editFromDashboardAppId } });
  }

  getGraphByChartId(graph) {
    let graphResp: Graph = new Graph();
    graph.sessionDTO = this.sessionObject;
    this.featureGraphMappingService.getGraphByChartId(graph).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        graphResp = response.serviceResponse;
        this.editFromDashboardSubFId = graphResp.subFeatureId;
        this.editFromDashboardAppId = graphResp.applicationId;
        this.viewGraphObj.subFeatureId = graphResp.subFeatureId;
        this.viewGraphObj.applicationId = graphResp.applicationId;
        this.graphObj.subFeatureId = graphResp.subFeatureId;
        this.datasourceId = graphResp.datasourceId;
        this.showEditForm(graphResp);
      } else {
        alert("Graph Not Found");
      }
    });
  }
    
  updateTextValueHeader() {
    this.hideTextValueHeaderFrontLayer();
    if (!this.graphObj.modifiedHeaders) {
      this.graphObj.modifiedHeaders = null;
    }
    let modifiedHeaders = JSON.parse(this.graphObj.modifiedHeaders);
    let mHeader = $("#modifyTextValueHeader").text();
    if (!modifiedHeaders) {
      modifiedHeaders = {};
    }
    if (modifiedHeaders != null && modifiedHeaders != undefined && Object.keys(modifiedHeaders).length > 0) {
      let flag1 = true;
      let tempkey: any;
      let finalkey: any;
      while (flag1) {
        tempkey = Object.keys(modifiedHeaders).find(key => modifiedHeaders[key] === mHeader);
        finalkey = mHeader
        mHeader = tempkey;
        if (mHeader == undefined) {
          flag1 = false;
          modifiedHeaders[finalkey] = this.modifiedTextValueHeaderName;
        }
      }
    }
    else {
      modifiedHeaders[mHeader] = this.modifiedTextValueHeaderName;
    }
    this.graphObj.modifiedHeaders = JSON.stringify(modifiedHeaders);
    if (this.graphObj.chartType == 'Gauge') {
      this.getGaugeGraph(this.alertTemplate);
    }
    else if (this.graphObj.chartType == 'Gauge Meter') {
      this.getGaugeGraph(this.alertTemplate);
    }
    else if (this.graphObj.chartType == 'Text Value' || this.graphObj.chartType == 'Text Value - Circle') {
      this.getSingleValuedGraph(this.alertTemplate);
    }
  }

  hideTextValueHeaderFrontLayer() {
    document.getElementById('key_mask').style.visibility = 'hidden';
    document.getElementById('key_mask_frontlayer').style.visibility = 'hidden';
    $("#modifyTextValueHeaderInput").val();
    $("#modifyTextValueHeader").html();
  }

  showTextValueHeaderUpdate(key: any) {
    document.getElementById('key_mask').style.visibility = 'visible';
    document.getElementById('key_mask_frontlayer').style.visibility = 'visible';
    $("#modifyTextValueHeader").html(key.textContent);
    $("#modifyTextValueHeaderInput").val(key.textContent);
  }

  copyTableText(copyButtonId: any) {
    let tableDataItem = this.idAndValueMap.get(copyButtonId);
    let tempText = document.createElement('input');
    tempText.setAttribute('type', 'text');
    tempText.setAttribute('visibilty', 'false');
    tempText.value = tableDataItem;
    document.body.appendChild(tempText);
    tempText.select();
    document.execCommand('copy');
    document.body.removeChild(tempText);
  }
  
  clearAliasName(){
    this.aliasName="";
  }

  updateAliasName() {
    this.hideFrontLayer();
    let aliasnameObj = {};
    if (!this.graphObj.alias_name) {
      this.graphObj.alias_name = null;
    }
    aliasnameObj = JSON.parse(this.graphObj.alias_name);
    let legendNmae = $("#aliasNameID").text();
    if (!aliasnameObj) {
      aliasnameObj = {};
    }
    aliasnameObj[legendNmae] = this.aliasName;
    this.graphObj.alias_name = JSON.stringify(aliasnameObj);
    if (this.graphInputObj.chartType == "Line" || this.graphInputObj.chartType == "Bar"
      || this.graphInputObj.chartType == "Column" || this.graphInputObj.chartType == "TopN") {
      this.getLineGraph(this.alertTemplate);
    }
  }

  toggleCreateRequestBody(event) {
    if (event.target.checked) {
      this.graphObj.createRequestBody = true;
    } else {
      this.graphObj.createRequestBody = false;
    }
  }

  getAllDatasourceList() {
    this.allDatasourceList = [];
    this.datasourceService.getAllDatasourceList(this.sessionObject).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.allDatasourceList = response.serviceResponse;
      }
    });
  }

  getfieldByDatasource(template: TemplateRef<any>) {
    let datasourceObj: datasourceDetails = new datasourceDetails();
    let listOFfieldsList: [] = [];
    for (let x of this.allDatasourceList) {
      if (x.id == this.datasourceId) {
        datasourceObj.id = this.datasourceId;
      }
    }
    this.resetQuery();
    this.resetRequestBody();
    datasourceObj.sessionDTO= this.sessionObject;
    this.datasourceService.getfieldByDatasource(datasourceObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.datasourceId = datasourceObj.id;
        listOFfieldsList = response.serviceResponse;
        for (let x of listOFfieldsList) {
          if (listOFfieldsList.indexOf(x) == 0) {
            this.fieldtermsList = x;
          } else if (listOFfieldsList.indexOf(x) == 1) {
            this.fieldMetricList = x;
          } else if (listOFfieldsList.indexOf(x) == 2) {
            this.fielddateHistogramList = x;
          }
        }
      } else {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(template, response.serviceResponse);

      }
    });
  }

  resetQuery() {
    this.fieldtermsList = [];
    this.fieldMetricList = [];
    this.fielddateHistogramList = [];
  }

  resetRequestBody() {
    this.queryObjList = [];
    this.datasourceId = "";
    let queryObj = new Query();
    let metricTemp = new Metric();
    metricTemp.metricType = "Select";
    metricTemp.metricField = "Select";
    metricTemp.isQueryMetricNotSelected = true;
    metricTemp.bucketScriptValue = ""
    metricTemp.metricBucketScriptList = [];
    metricTemp.previousSelectedMetricField = "Select";
    metricTemp.derivateField = "Select";
    metricTemp.derivateUnit = "";
    queryObj.queryMetricList.push(metricTemp);
    queryObj.rawDataSize = 500;
    queryObj.isQueryRawData = false;
    queryObj.derivativeFieldList = [];
    this.queryMetricTypeChanged(queryObj, metricTemp, 0);
    let queryGroupByObj = new QueryGroupBy();
    queryGroupByObj.groupBy = "Select";
    queryGroupByObj.termsField = "Select";
    queryGroupByObj.termsOrder = "Top";
    queryGroupByObj.termsSize = 10;
    queryGroupByObj.dateHistogramField = "Select";
    queryGroupByObj.termsMinDocCount = 1;
    queryGroupByObj.dateHistogramMinDocCount = 1;
    queryGroupByObj.interval = "10s";
    queryObj.queryGroupByList.push(queryGroupByObj);
    this.queryObjList.push(queryObj);
  }

  addQueryObj() {
    let queryObj = new Query();
    let metricTemp = new Metric();
    metricTemp.metricType = "Select";
    metricTemp.metricField = "Select";
    queryObj.queryMetricList.push(metricTemp);
    queryObj.rawDataSize = 500;
    queryObj.dataSourceId = this.datasourceId;
    let queryGroupByObj: any;
    queryGroupByObj = new QueryGroupBy();
    queryGroupByObj.groupBy = "Select";
    queryGroupByObj.termsField = "Select";
    queryGroupByObj.termsOrder = "Top";
    queryGroupByObj.termsSize = 10;
    queryGroupByObj.dateHistogramField = "Select";
    queryGroupByObj.termsMinDocCount = 1;
    queryGroupByObj.dateHistogramMinDocCount = 1;
    queryGroupByObj.interval = "10s";
    queryObj.queryGroupByList.push(queryGroupByObj);
    this.queryObjList.push(queryObj);
  }

  removeQueryObj(alertTemplate: TemplateRef<any>, queryObj: Query) {
    this.queryObjList.forEach((value, index) => {
      if (value == queryObj) {
        this.queryObjList.splice(index, 1);
      }
    });
  }

  queryMetricTypeFocused(metricObj: Metric) {
    metricObj.previousSelectedMetricType = metricObj.metricType;
  }

  queryMetricTypeChanged(queryObj: Query, metricObj: Metric, q) {
    metricObj.metricNo = q + 1;
    queryObj.queryMetricList.forEach((value, index) => {
      if (value == metricObj) {
        if (metricObj.metricType == "RawData") {
          queryObj.isQueryRawData = true;
          queryObj.queryMetricList = [];
          let metric = new Metric();
          metric.metricType = "RawData";
          queryObj.rawDataSize = 500;
          queryObj.queryMetricList.push(metric);
        } else {
          queryObj.isQueryRawData = false;
          if (metricObj.metricType != "Select" && metricObj.previousSelectedMetricType != "Select") {
            let queryMetricListLength = queryObj.queryMetricList.length;
            let tempDerivativeField;
            let tempDerivativeField2;
            let m = 0;
            if (metricObj.metricType == "Count") {
              tempDerivativeField2 = "Count"
            } else if (metricObj.metricType == "Derivative") {
              for (let a = 0; a < queryMetricListLength; a++) {
                if (metricObj.derivateField == "Count") {
                  tempDerivativeField2 = "Count";
                  break;
                } else if (metricObj.derivateField == "Derivative " + (a + 1)) {
                  tempDerivativeField2 = "Derivative " + (a + 1);
                  break;
                } else if (metricObj.derivateField == queryObj.queryMetricList[a].metricType + " " + queryObj.queryMetricList[a].metricField) {
                  tempDerivativeField2 = "Derivative " + (a + 1);
                  break;
                } else if (metricObj.derivateField == undefined || metricObj.derivateField == "Select") {
                  let y = 0;
                  for (let x = 0; x < queryMetricListLength; x++) {
                    if (queryObj.queryMetricList[x].metricType == "Derivative") {
                      y++;
                    }
                  }
                  tempDerivativeField2 = "Derivative " + y;
                  break;
                }
              }
            } else if (metricObj.metricType == "BucketScript") {
              tempDerivativeField2 = "BucketScript"
            } else {
              tempDerivativeField2 = metricObj.metricType + " " + metricObj.metricField;
            }
            for (let j = 0; j < queryMetricListLength; j++) {
              if (metricObj.previousSelectedMetricType == "Count") {
                queryObj.derivativeFieldList[queryObj.derivativeFieldList.indexOf("Count")] = tempDerivativeField2;
                break;
              } else if (metricObj.previousSelectedMetricType == "Derivative") {
                for (let i = 0; i < queryMetricListLength; i++) {
                  if (metricObj.derivateField == "Count") {
                    tempDerivativeField = "Count";
                    queryObj.derivativeFieldList[queryObj.derivativeFieldList.indexOf(tempDerivativeField)] = tempDerivativeField2;
                    m++;
                    break;
                  } else if (metricObj.derivateField == "Derivative " + (i + 1)) {
                    tempDerivativeField = "Derivative " + (i + 1);
                    queryObj.derivativeFieldList[queryObj.derivativeFieldList.indexOf(tempDerivativeField)] = tempDerivativeField2;
                    m++;
                    break;
                  } else if (metricObj.derivateField == queryObj.queryMetricList[i].metricType + " " + queryObj.queryMetricList[i].metricField) {
                    tempDerivativeField = "Derivative " + (i + 1);
                    queryObj.derivativeFieldList[queryObj.derivativeFieldList.indexOf(tempDerivativeField)] = tempDerivativeField2;
                    m++;
                    break;
                  }
                }
              } else if (metricObj.previousSelectedMetricType == "BucketScript") {
                queryObj.derivativeFieldList[queryObj.derivativeFieldList.indexOf("BucketScript")] = tempDerivativeField2;
                break;
              }
              else {
                if (metricObj.previousSelectedMetricType + " " + metricObj.metricField == queryObj.queryMetricList[j].previousSelectedMetricType + " " + queryObj.queryMetricList[j].metricField) {
                  tempDerivativeField = queryObj.queryMetricList[j].previousSelectedMetricType + " " + queryObj.queryMetricList[j].metricField;
                  queryObj.derivativeFieldList[queryObj.derivativeFieldList.indexOf(tempDerivativeField)] = tempDerivativeField2;
                  break;
                }
              }
              if (m > 0) {
                break;
              }
            }
            // this.pushQueryMetric(queryObj, metricObj);
          } else if (metricObj.previousSelectedMetricType == "Select") {
            if (metricObj.metricType == "BucketScript") {
              // this.addBucketScriptVariable(metricObj);
              queryObj.derivativeFieldList.push("BucketScript");
            } else {
              this.pushQueryMetric(queryObj, metricObj);
            }
          }
        }
      }
    });
  }

  pushQueryMetric(queryObj: Query, metricObj: Metric) {
    if (metricObj.metricType == "Count") {
      queryObj.derivativeFieldList.push("Count");
    } else if (metricObj.metricType != "Count" && metricObj.metricType != "Derivative" && metricObj.metricType != "BucketScript") {
      if (metricObj.metricField != "Select") {
        let tempDerivativeField = metricObj.metricType + " " + metricObj.metricField;
        queryObj.derivativeFieldList.push(tempDerivativeField);
      }
    }
    else if (metricObj.metricType == "Derivative") {
      let queryMetricListLength = queryObj.queryMetricList.length;
      let derCounter = 0;
      for (let j = 0; j < queryMetricListLength; j++) {
        if (queryObj.queryMetricList[j].metricType == "Derivative" && queryObj.queryMetricList[j].derivateField != "Select" && queryObj.queryMetricList[j].derivateField != null && queryObj.queryMetricList[j].derivateField != undefined) {
          derCounter++;
        }
      }
      if (metricObj.metricType != "Select" && metricObj.metricType == "Derivative" && metricObj.derivateField != undefined && metricObj.derivateField != null && metricObj.derivateField != "Select") {
        let tempDerivativeField = metricObj.metricType + " " + (derCounter);
        if (!queryObj.derivativeFieldList.includes(tempDerivativeField)) {
          queryObj.derivativeFieldList.push(metricObj.metricType + " " + (derCounter));
        }
        let derivateField = metricObj.derivateField;
        for (let j = 0; j < queryMetricListLength; j++) {
          if (queryObj.queryMetricList[j].metricType != "Count" && queryObj.queryMetricList[j].metricType != "Derivative") {
            if (queryObj.queryMetricList[j].metricType + " " + queryObj.queryMetricList[j].metricField == derivateField) {
              metricObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
              break;
            }
          }
          else if (queryObj.queryMetricList[j].metricType == "Count") {
            if (queryObj.queryMetricList[j].metricType == derivateField) {
              metricObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
              break;
            }
          }
          else if (queryObj.queryMetricList[j].metricType == "Derivative") {
            let m = 0;
            for (let i = 0; i < queryMetricListLength; i++) {
              if ("Derivative " + i == derivateField) {
                metricObj.derivativeMetricIndexNo = (queryObj.queryMetricList[j].metricNo + (i - 1));
                m++;
                break;
              }
            }
            if (m > 0) {
              break;
            }
          }
        }
      }
    }
    else if (metricObj.metricType == "BucketScript") {
      queryObj.derivativeFieldList.push("BucketScript");
    }
  }

  addMetric(queryObj: Query, metricObj: Metric, q) {
    this.addDerivateFieldInList(queryObj, metricObj);
    let metric = new Metric();
    metric.metricType = "Select";
    metric.metricField = "Select";
    metric.metricNo = q + 1;
    this.addBucketScriptVariable(metric)
    queryObj.queryMetricList.push(metric);
  }

  removeMetric(queryObj: Query, metric: Metric) {
    queryObj.queryMetricList.forEach((value, index) => {
      if (value == metric) {
        this.removeDerivativeFieldFromList(queryObj, metric)
        queryObj.queryMetricList.splice(index, 1);
      }
    });
  }

  metricFieldFoused(metricObj: Metric) {
    metricObj.previousSelectedMetricField = metricObj.metricField;
  }

  metricFieldChanged(queryObj: Query, metricObj: Metric) {
    let queryDerivateListLength = queryObj.derivativeFieldList.length;
    let queryMetricListLength = queryObj.queryMetricList.length;
    if (metricObj.metricField != "Select" && metricObj.previousSelectedMetricField != "Select") {
      let oldDerivateField = metricObj.metricType + " " + metricObj.previousSelectedMetricField;
      let m = 0;
      for (let j = 0; j < queryDerivateListLength; j++) {
        if (m < 1) {
          if (queryObj.derivativeFieldList[j] == oldDerivateField) {
            queryObj.derivativeFieldList[j] = metricObj.metricType + " " + metricObj.metricField;
            m++;
          }
        }
      }
      for (let i = 0; i < queryMetricListLength; i++) {
        if (queryObj.queryMetricList[i].derivateField == oldDerivateField) {
          queryObj.queryMetricList[i].derivateField = metricObj.metricType + " " + metricObj.metricField;
          m++;
        }
      }
    }
    else if (metricObj.metricType != "Select" && metricObj.previousSelectedMetricField == "Select" && metricObj.derivateField != "Select" && metricObj.derivateField != "BucketScript" && (queryObj.derivativeFieldList.includes(metricObj.metricType + " Select"))) {
      let tempDerivativeField = metricObj.metricType + " Select";
      let tempDerivativeField2 = metricObj.metricType + " " + metricObj.metricField;
      queryObj.derivativeFieldList[queryObj.derivativeFieldList.indexOf(tempDerivativeField)] = tempDerivativeField2;
    }
    else if (metricObj.metricType != "Select" && metricObj.previousSelectedMetricType == "Count" && metricObj.previousSelectedMetricField == "Select") {
      let tempDerivativeField = metricObj.metricType + " Select";
      let tempDerivativeField2 = metricObj.metricType + " " + metricObj.metricField;
      queryObj.derivativeFieldList[queryObj.derivativeFieldList.indexOf(tempDerivativeField)] = tempDerivativeField2;
    }
    else {
      this.addDerivateFieldInList(queryObj, metricObj);
    }
  }

  addDerivateFieldInList(queryObj: Query, metricObj: Metric) {
    let queryMetricListLength = queryObj.queryMetricList.length;
    let derCounter = 0;
    for (let j = 0; j < queryMetricListLength; j++) {
      if (queryObj.queryMetricList[j].metricType == "Derivative" && queryObj.queryMetricList[j].derivateField != "Select" && queryObj.queryMetricList[j].derivateField != null && queryObj.queryMetricList[j].derivateField != undefined) {
        derCounter++;
      }
    }
    if (metricObj.metricType != "Select" && metricObj.metricType != "Count" && metricObj.metricType != "Derivative" && metricObj.metricField != "Select") {
      let tempDerivativeField = metricObj.metricType + " " + metricObj.metricField;
      if (!queryObj.derivativeFieldList.includes(tempDerivativeField)) {
        queryObj.derivativeFieldList.push(tempDerivativeField);
      }
    }
    else if (metricObj.metricType != "Select" && metricObj.metricType == "Count") {
      if (!queryObj.derivativeFieldList.includes("Count")) {
        queryObj.derivativeFieldList.push("Count");
      }
    }
    else if (metricObj.metricType != "Select" && metricObj.metricType == "Derivative" && metricObj.derivateField != undefined && metricObj.derivateField != null && metricObj.derivateField != "Select") {
      let tempDerivativeField = metricObj.metricType + " " + (derCounter);
      if (!queryObj.derivativeFieldList.includes(tempDerivativeField)) {
        queryObj.derivativeFieldList.push(metricObj.metricType + " " + (derCounter));
      }
      let derivateField = metricObj.derivateField;
      for (let j = 0; j < queryMetricListLength; j++) {
        if (queryObj.queryMetricList[j].metricType != "Count" && queryObj.queryMetricList[j].metricType != "Derivative") {
          if (queryObj.queryMetricList[j].metricType + " " + queryObj.queryMetricList[j].metricField == derivateField) {
            metricObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
            break;
          }
        }
        else if (queryObj.queryMetricList[j].metricType == "Count") {
          if (queryObj.queryMetricList[j].metricType == derivateField) {
            metricObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
            break;
          }
        }
        else if (queryObj.queryMetricList[j].metricType == "BucketScript") {
          if (queryObj.queryMetricList[j].metricType == derivateField) {
            metricObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
            break;
          }
        }
        else if (queryObj.queryMetricList[j].metricType == "Derivative") {
          let m = 0;
          for (let i = 0; i < queryMetricListLength; i++) {
            if ("Derivative " + i == derivateField) {
              metricObj.derivativeMetricIndexNo = (queryObj.queryMetricList[j].metricNo + (i - 1));
              m++;
              break;
            } else if (queryObj.queryMetricList[i].derivateField == "BucketScript") {
              metricObj.derivativeMetricIndexNo = (queryObj.queryMetricList[j].metricNo + (i - 1));
              m++;
              break;
            }
          }
          if (m > 0) {
            break;
          }
        }
      }
    }
  }

  removeDerivativeFieldFromList(queryObj: Query, metricObj: Metric) {
    let queryMetricListLength = queryObj.queryMetricList.length;
    let tempDerivativeField;
    let m = 0;
    for (let j = 0; j < queryMetricListLength; j++) {
      if (metricObj.metricType == "Count") {
        queryObj.derivativeFieldList.splice(queryObj.derivativeFieldList.indexOf("Count"), 1);
        break;
      } else if (metricObj.metricType == "Derivative") {
        for (let i = 0; i < queryMetricListLength; i++) {
          if (metricObj.derivateField == "Count") {
            tempDerivativeField = "Count";
            queryObj.derivativeFieldList.splice(queryObj.derivativeFieldList.indexOf(tempDerivativeField), 1);
            m++;
            break;
          } else if (metricObj.derivateField == "Derivative " + (i + 1)) {
            tempDerivativeField = "Derivative " + (i + 1);
            queryObj.derivativeFieldList.splice(queryObj.derivativeFieldList.indexOf(tempDerivativeField), 1);
            m++;
            break;
          } else if (metricObj.derivateField == queryObj.queryMetricList[i].metricType + " " + queryObj.queryMetricList[i].metricField) {
            tempDerivativeField = metricObj.metricType + " " + metricObj.metricField;
            queryObj.derivativeFieldList.splice(queryObj.derivativeFieldList.indexOf(tempDerivativeField), 1);
            m++;
            break;
          }
        }
      } else {
        if (metricObj.metricType + " " + metricObj.metricField == queryObj.queryMetricList[j].metricType + " " + queryObj.queryMetricList[j].metricField) {
          tempDerivativeField = queryObj.queryMetricList[j].metricType + " " + queryObj.queryMetricList[j].metricField;
          queryObj.derivativeFieldList.splice(queryObj.derivativeFieldList.indexOf(tempDerivativeField), 1);
          break;
        }
      }
      if (m > 0) {
        break;
      }
    }
  }

  addThenBy(queryObj: Query) {
    let queryGroupByObj = new QueryGroupBy()
    queryGroupByObj.groupBy = "Select";
    queryGroupByObj.termsField = "Select";
    queryGroupByObj.termsOrder = "Top";
    queryGroupByObj.dateHistogramField = "Select";
    queryGroupByObj.termsMinDocCount = 1;
    queryGroupByObj.termsSize = 10;
    queryGroupByObj.dateHistogramMinDocCount = 1;
    queryGroupByObj.interval = "10s";
    queryObj.queryGroupByList.push(queryGroupByObj);
  }

  removeThenBy(queryGroupByObj, queryObj) {
    queryObj.queryGroupByList.forEach((value, index) => {
      if (value == queryGroupByObj) {
        queryObj.queryGroupByList.splice(index, 1);
      }
    });
  }

  queryGroupByChanged(queryGroupByObj) {
    if (queryGroupByObj.groupBy == "Select") {
      queryGroupByObj.isTerms = false;
      queryGroupByObj.isFilters = false;
      queryGroupByObj.isDateHistogram = false;
    } else if (queryGroupByObj.groupBy == "Terms") {
      queryGroupByObj.isTerms = true;
      queryGroupByObj.isFilters = false;
      queryGroupByObj.isDateHistogram = false;
    } else if (queryGroupByObj.groupBy == "Filters") {
      queryGroupByObj.isTerms = false;
      queryGroupByObj.isFilters = true;
      queryGroupByObj.isDateHistogram = false;
    } else if (queryGroupByObj.groupBy == "DateHistogram") {
      queryGroupByObj.isTerms = false;
      queryGroupByObj.isFilters = false;
      queryGroupByObj.isDateHistogram = true;
    }
  }

  addBucketScriptVariable(metricObj: Metric) {
    let bucketScriptLength = metricObj.metricBucketScriptList.length;
    let bucketObj = new BucketScript();
    bucketObj.bucketScriptVariable = "var" + (bucketScriptLength + 1);
    bucketObj.bucketScriptField = "";
    metricObj.metricBucketScriptList.push(bucketObj);
  }

  removeBucketScriptVariable(metricObj: Metric, bucketScriptObj: BucketScript) {
    metricObj.metricBucketScriptList.forEach((value, index) => {
      if (value == bucketScriptObj) {
        metricObj.metricBucketScriptList.splice(index, 1);
      }
    });
  }

  bucketScriptFieldChanged(queryObj: Query, metricObj: Metric, bucketObj: BucketScript) {
    let queryMetricListLength = queryObj.queryMetricList.length;
    let bucketScriptListLength = metricObj.metricBucketScriptList.length;
    for (let i = 0; i < bucketScriptListLength; i++) {
      if (metricObj.metricBucketScriptList[i] == bucketObj) {
        let bucketScriptFieldTemp = metricObj.metricBucketScriptList[i].bucketScriptField;
        for (let j = 0; j < queryMetricListLength; j++) {
          if (queryObj.queryMetricList[j].metricType != "Count" && queryObj.queryMetricList[j].metricType != "Derivative") {
            if (queryObj.queryMetricList[j].metricType + " " + queryObj.queryMetricList[j].metricField == bucketScriptFieldTemp) {
              bucketObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
              break;
            }
          }
          else if (queryObj.queryMetricList[j].metricType == "Count") {
            if (queryObj.queryMetricList[j].metricType == bucketScriptFieldTemp) {
              bucketObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
              break;
            }
          }
          else if (queryObj.queryMetricList[j].metricType == "BucketScript") {
            if (queryObj.queryMetricList[j].metricType == bucketScriptFieldTemp) {
              bucketObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
              break;
            }
          }
          else if (queryObj.queryMetricList[j].metricType == "Derivative") {
            let m = 0;
            for (let i = 0; i < queryMetricListLength; i++) {
              if ("Derivative " + i == bucketScriptFieldTemp) {
                bucketObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
                m++;
                break;
              }
            }
            if (m > 0) {
              break;
            }
          }
        }
      }
    }
  }

  validateRequestBody(template: TemplateRef<any>, queryObjList: Query[]) {
    let j = 0;
    for (let queryObject of queryObjList) {
      j++;
      if (!queryObject.isQueryRawData) {
        for (let metricObj of queryObject.queryMetricList) {
          if (metricObj.metricType == "Select" || metricObj.metricType == null || metricObj.metricType == undefined) {
            this.isError = true;
            this.isSuccess = false;
            this.openAlertMod(template, "Kindly Select a Metric Type for Metric " + j + " !!");
            return false;
          }
          if (metricObj.metricType != "Select" && metricObj.metricType != "Count" && metricObj.metricType != "Derivative" && metricObj.metricType != "BucketScript") {
            if (metricObj.metricField == "Select" || metricObj.metricField == null || metricObj.metricField == undefined) {
              this.isError = true;
              this.isSuccess = false;
              this.openAlertMod(template, "Kindly Select a Metric field of Query " + j + " !!");
              return false;
            }
          }
          else if (metricObj.metricType != "Select" && metricObj.metricType == "Derivative") {
            if (metricObj.derivateField == "Select" || metricObj.derivateField == null || metricObj.derivateField == undefined) {
              this.isError = true;
              this.isSuccess = false;
              this.openAlertMod(template, "Kindly Select a Derivative field of Query " + j + " !!");
              return false;
            }
          }
          else if (metricObj.metricType != "Select" && metricObj.metricType == "BucketScript") {
            for (let bucketObj of metricObj.metricBucketScriptList) {
              if (bucketObj.bucketScriptVariable == "" || bucketObj.bucketScriptVariable == null || bucketObj.bucketScriptVariable == undefined) {
                this.isError = true;
                this.isSuccess = false;
                this.openAlertMod(template, "Kindly Provide a Bucket Script Variable of Query " + j + " !!");
                return false;
              }
              else if (bucketObj.bucketScriptField == "Select" || bucketObj.bucketScriptField == null || bucketObj.bucketScriptField == undefined) {
                this.isError = true;
                this.isSuccess = false;
                this.openAlertMod(template, "Kindly Select a Bucket Script Field of Query " + j + " !!");
                return false;
              }
            }
            if (metricObj.bucketScriptValue == "" || metricObj.bucketScriptValue == null || metricObj.bucketScriptValue == undefined) {
              this.isError = true;
              this.isSuccess = false;
              this.openAlertMod(template, "Kindly Provide a Bucket Script Value of Query " + j + " !!");
              return false;
            }
          }
          for (let queryGroupBy of queryObject.queryGroupByList) {
            if (queryGroupBy.isTerms) {
              if (queryGroupBy.termsField == "Select" || queryGroupBy.termsField == null || queryGroupBy.termsField == undefined) {
                this.isError = true;
                this.isSuccess = false;
                this.openAlertMod(template, "Kindly Select a Field for Terms of Query " + j + " !!");
                return false;
              }
            } else if (queryGroupBy.isFilters) {
              if (queryGroupBy.filtersQuery == "" || queryGroupBy.filtersQuery == null || queryGroupBy.filtersQuery == undefined) {
                this.isError = true;
                this.isSuccess = false;
                this.openAlertMod(template, "Kindly Provide Filter query for Query " + j + " !!");
                return false;
              }
            } else if (queryGroupBy.isDateHistogram) {
              if (queryGroupBy.dateHistogramField == "Select" || queryGroupBy.dateHistogramField == null || queryGroupBy.dateHistogramField == undefined) {
                this.isError = true;
                this.isSuccess = false;
                this.openAlertMod(template, "Kindly Select a Field for Date Histogram of Query " + j + " !!");
                return false;
              }
            }
          }
        }
      } else {
        if (/\s/g.test(queryObject.rawDataSize) || queryObject.rawDataSize == null || queryObject.rawDataSize == undefined || queryObject.rawDataSize == "") {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(template, "Kindly Provide Valid Raw Data Size !!");
          return false;
        }
      }
    }
  }

  refreshRequestBody(template: TemplateRef<any>, queryObjList: Query[]) {
    if (this.datasourceId == null || this.datasourceId == undefined || this.datasourceId == "Select") {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(template, "Kindly Select a Datasource !!");
      return false;
    }
    let datasource = new datasourceDetails();
    for (let x of this.allDatasourceList) {
      if (x.id == this.datasourceId) {
        datasource = x;
        break;
      }
    }
    this.validateRequestBody(template, queryObjList);
    this.reCreateRequestBody(queryObjList);
    let requestBodyAndURL = this.requestBodyService.refreshRequestBody(this.queryObjList, datasource);
    this.graphObj.query = requestBodyAndURL[1];
    this.graphObj.requestBody = requestBodyAndURL[0];
  }

  reCreateRequestBody(queryDetailsList: Query[]) {
    queryDetailsList.forEach((queryObj, queryObjIndex) => {
      let queryMetricListLength = queryObj.queryMetricList.length;
      queryObj.queryMetricList.forEach((metricObj, metricObjIndex) => {
        let derivateField = metricObj.derivateField;
        let bucketScriptListLength = metricObj.metricBucketScriptList.length;
        metricObj.metricNo = metricObjIndex + 1;
        for (let j = 0; j < queryMetricListLength; j++) {
          if (queryObj.queryMetricList[j].metricType != "Count" && queryObj.queryMetricList[j].metricType != "Derivative") {
            if (queryObj.queryMetricList[j].metricType + " " + queryObj.queryMetricList[j].metricField == derivateField) {
              metricObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
              break;
            }
          }
          else if (queryObj.queryMetricList[j].metricType == "Count") {
            if (queryObj.queryMetricList[j].metricType == derivateField) {
              metricObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
              break;
            }
          }
          else if (queryObj.queryMetricList[j].metricType == "BucketScript") {
            if (queryObj.queryMetricList[j].metricType == derivateField) {
              metricObj.derivativeMetricIndexNo = queryObj.queryMetricList[j].metricNo;
              break;
            }
          }
          else if (queryObj.queryMetricList[j].metricType == "Derivative") {
            let m = 0;
            for (let i = 0; i < queryMetricListLength; i++) {
              if ("Derivative " + i == derivateField) {
                metricObj.derivativeMetricIndexNo = (queryObj.queryMetricList[j].metricNo + (i - 1));
                m++;
                break;
              } else if (queryObj.queryMetricList[i].derivateField == "BucketScript") {
                metricObj.derivativeMetricIndexNo = i;
                m++;
                break;
              }
            }
            if (m > 0) {
              break;
            }
          }
        }
      });
      queryObj.queryMetricList.forEach((metricObj, metricObjIndex) => {
        let bucketScriptListLength = metricObj.metricBucketScriptList.length;
        for (let i = 0; i < bucketScriptListLength; i++) {
          let bucketScriptFieldTemp = metricObj.metricBucketScriptList[i].bucketScriptField;
          for (let k = 0; k < queryMetricListLength; k++) {
            if (queryObj.queryMetricList[k].metricType != "Count" && queryObj.queryMetricList[k].metricType != "Derivative") {
              if (queryObj.queryMetricList[k].metricType + " " + queryObj.queryMetricList[k].metricField == bucketScriptFieldTemp) {
                metricObj.metricBucketScriptList[i].derivativeMetricIndexNo = queryObj.queryMetricList[k].metricNo;
                break;
              }
            }
            else if (queryObj.queryMetricList[k].metricType == "Count") {
              if (queryObj.queryMetricList[k].metricType == bucketScriptFieldTemp) {
                metricObj.metricBucketScriptList[i].derivativeMetricIndexNo = queryObj.queryMetricList[k].metricNo;
                break;
              }
            }
            else if (queryObj.queryMetricList[k].metricType == "BucketScript") {
              if (queryObj.queryMetricList[k].metricType == bucketScriptFieldTemp) {
                metricObj.metricBucketScriptList[i].derivativeMetricIndexNo = queryObj.queryMetricList[k].metricNo;
                break;
              }
            }
            else if (queryObj.queryMetricList[k].metricType == "Derivative") {
              let m = 0;
              for (let l = 0; l < queryMetricListLength; l++) {
                if (queryObj.queryMetricList[l].metricType == "Count" && bucketScriptFieldTemp == "Count") {
                  metricObj.metricBucketScriptList[i].derivativeMetricIndexNo = queryObj.queryMetricList[l].metricNo;
                  m++;
                  break;
                }
                else if (queryObj.queryMetricList[l].metricType == "BucketScript" && bucketScriptFieldTemp == "BucketScript") {
                  metricObj.metricBucketScriptList[i].derivativeMetricIndexNo = queryObj.queryMetricList[l].metricNo;
                  m++;
                  break;
                }
                else if (bucketScriptFieldTemp.includes("Derivative ")) {
                  let k = 0;
                  let a = 0;
                  for (let y = 0; y < queryMetricListLength; y++) {
                    k++;
                    if (queryObj.queryMetricList[y].metricType == "Derivative") {
                      a++;
                      if (bucketScriptFieldTemp == "Derivative " + a) {
                        metricObj.metricBucketScriptList[i].derivativeMetricIndexNo = k;
                        m++;
                        break;
                      }
                    }
                  }
                }
                else if (bucketScriptFieldTemp == queryObj.queryMetricList[l].metricType + " " + queryObj.queryMetricList[l].metricField) {
                  metricObj.metricBucketScriptList[i].derivativeMetricIndexNo = queryObj.queryMetricList[k].metricNo;
                  m++;
                  break;
                }
              }
              if (m > 0) {
                break;
              }
            }
          }
        }
      });
    });
  }

  checkForNumber(event, fontSize) {
    var pattern = new RegExp(/^(. *[^0-9]|)(1000|[1-9]\d{0,2})([^0-9]. *|)$/,);
    var result = pattern.test(fontSize);
    if (result) {
      return true;
    }
    else {
      event.preventDefault();
      return false;
    }
  }

  showTimeInHeaderChanged(event?: any) {
    this.graphObj.customDateOrCurrentDateInHeader = false;
  }

  toggleCustomDateOrCurrentDateInHeader(event) {
    if (event.target.checked) {
      this.graphObj.customDateOrCurrentDateInHeader = true;
    } else {
      this.graphObj.customDateOrCurrentDateInHeader = false;
    }
  }

}


