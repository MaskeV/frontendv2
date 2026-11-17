import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { CommonModule } from "@angular/common";
import { Subject, takeUntil } from "rxjs";
import { FormsModule } from "@angular/forms";
import { ObjectFilterPipe } from "../../../../pipes/object-filter.pipe";
import { PaginatePipe } from "../../../../pipes/paginate.pipe";
import { Query } from "../../../../models/software-metering/Query";
import { QueryPlatform } from "../../../../models/enums/QueryPlatform";
import { Host } from "../../../../models/software-metering/Host";
import { RunQuery } from "../../../../models/software-metering/RunQuery";
import { SwMeteringQueryService } from "../../../../services/sw-metering-query.service";
import { ServiceResponse } from "../../../../models/common/ServiceResponse";
import { ResponseStatus } from "../../../../models/enums/ResponseStatus";

@Component({
    selector: "app-query-tab-component",
    imports: [CommonModule, FormsModule, ObjectFilterPipe, PaginatePipe],
    templateUrl: "./query-tab-component.html",
    styleUrl: "./query-tab-component.css"
})
export class QueryTabComponent implements OnInit, OnDestroy,OnChanges {

  @Input() zoneId: number | null = null;  
  @Input() groupId: number | null = null;
  
  ngOnChanges(changes: SimpleChanges): void {
      if(this.executeQueryTab && this.selectedHost==null){
        this.loadAllHosts();
      }
  }
  // Common
  private destroy$ = new Subject<void>();
  searchTextForQuery: string = "";
  searchTextForHost: string = "";
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  inputPage: number = 1;
  // For this component
  query_list: Query[] = [];
  platform: QueryPlatform = QueryPlatform.ALL;
  selectedQuery: Query = new Query();
  executeQueryTab: boolean = false;
  // ExecuteQueryTab
  hostList: Host[] = [];
  selectedHost: Host | undefined | null;
  runQueryObj: RunQuery = new RunQuery();
  runQueryResult: any[] = [];
  runQueryResultHeader: string[] = [];
  executingQuery: boolean = false;
  customQuery: Query = new Query();
  isCustomQuery: boolean = false;

  constructor(
    private queryService: SwMeteringQueryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.LoadQueries(this.platform);
    this.customQuery.name = "New Query";
    this.customQuery.description =
      "Run custom queries across any connected host to retrieve system information on-demand.";
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  LoadQueries(platform: string) {
    this.query_list = [];
    this.resetPagination(this.query_list);
    this.queryService.getQueriesByPlatform(platform).subscribe(
      (response: ServiceResponse<any>) => {
        if (response.serviceStatus == ResponseStatus.SUCCESS) {
          this.query_list = response.serviceResponse;
          this.resetPagination(this.query_list);
        } else {
          this.showError("Failed to load data. Please try again.");
        }
      },
      (err) => {
        this.showError("Failed to load data. Please try again.");
      }
    );
  }
  selectQuery(query: Query) {
    this.selectedQuery = query;
    this.executeQueryTab = true;
    this.loadAllHosts();
  }

  loadAllHosts() {
    this.hostList = [];
    this.resetPagination(this.hostList);

    if (this.zoneId !== null && this.groupId !== null) {   
      this.queryService.getAllHosts(this.zoneId, this.groupId).subscribe(
        (response: ServiceResponse<any>) => {
          if (response.serviceStatus == ResponseStatus.SUCCESS) {
            this.hostList = response.serviceResponse;
            this.resetPagination(this.hostList);
          } else {
            this.showError("Failed to load data. Please try again.");
          }
        },
        (err) => {
          this.showError("Failed to load data. Please try again.");
        }
      );
    }
  }

  selectHost(host: Host) {
    this.selectedHost = host;
  }

  runQuery() {
    this.resetQueryResult();
    if (this.selectedHost?.status == "Offline") {
      this.showError("Live details are unavailable for offline hosts.");
      return;
    }
    if (this.isCustomQuery && !this.selectedQuery.query) {
      this.showError(
        "Query cannot be empty. Please provide a valid query to proceed."
      );
      return;
    }
    this.executingQuery = true;
    this.destroy$.next();
    this.runQueryObj.hostId = this.selectedHost?.hostId;
    this.runQueryObj.queryId = this.selectedQuery?.id;
    this.runQueryObj.query = this.selectedQuery.query;
    this.queryService
      .runQueryOnHost(this.runQueryObj)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (response: ServiceResponse<any>) => {
          this.executingQuery = false;
          if (response.serviceStatus == ResponseStatus.SUCCESS) {
            const runQueryResponse = response.serviceResponse;
            if (runQueryResponse.error != null) {
              this.showError(runQueryResponse.error);
            } else {
              this.runQueryResult =
                runQueryResponse.data != null ? runQueryResponse.data : [];
              this.resetPagination(this.runQueryResult);
              if (this.runQueryResult.length > 0) {
                this.runQueryResultHeader = Object.keys(this.runQueryResult[0]);
              } else {
                this.runQueryResultHeader = [];
                this.showError("No data found !!");
              }
            }
          } else {
            this.showError(response.serviceResponse);
          }
        },
        (err) => {
          this.executingQuery = false;
          this.showError("Failed to load data. Please try again.");
        }
      );
  }
  goBack() {
    this.executeQueryTab = false;
    this.searchTextForQuery = "";
    this.LoadQueries(this.platform);
  }

  openCustomQueryPage() {
    this.selectedQuery = this.customQuery;
    this.selectedQuery.query = "";
    this.executeQueryTab = true;
    this.isCustomQuery = true;
    this.loadAllHosts();
  }

  showError(error: any) {
    this.snackBar.open(error, "Dismiss", {
      duration: 4000,
      panelClass: ["snackbar-error"],
    });
  }

  clearSelectedHost() {
    this.selectedHost = null;
    this.loadAllHosts();
    this.resetQueryResult();
  }

  resetQueryResult() {
    this.executingQuery = false;
    this.runQueryObj = new RunQuery();
    this.runQueryResultHeader = [];
    this.runQueryResult = [];
    this.destroy$.next();
  }

  resetExecuteQueryPage() {
    this.hostList = [];
    this.selectedHost = null;
    this.isCustomQuery = false;
    this.searchTextForHost = "";
    this.resetQueryResult();
  }

  resetPagination(resultArray: any[]) {
    this.currentPage = 1;
    this.totalPages = 1;
    this.inputPage = 1;
    if (resultArray && resultArray.length > 0 && this.pageSize > 0) {
      this.totalPages = Math.ceil(resultArray.length / this.pageSize);
    }
  }

  resetCurrentPage(data: any[], searchText: string, keys: string[]) {
    this.resetPagination(this.filter(data, searchText, keys));
  }

  filter(items: any[], searchText: string, keys: string[]): any[] {
    if (!items || !searchText || !keys || keys.length === 0) {
      return items;
    }

    const lowerSearch = searchText.toLowerCase();

    return items.filter((item) =>
      keys.some((key) => {
        const value = item[key];
        return value && value.toString().toLowerCase().includes(lowerSearch);
      })
    );
  }
  goToPage() {
    let page = Number(this.inputPage);
    if (isNaN(page) || page < 1) page = 1;
    else if (page > this.totalPages) page = this.totalPages;

    this.currentPage = page;
    this.inputPage = page;
  }
}
