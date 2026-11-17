import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { FormsModule } from '@angular/forms';
import { SortPipe } from '../../../../pipes/sort.pipe';
import { ObjectFilterPipe } from '../../../../pipes/object-filter.pipe';
import { PaginatePipe } from '../../../../pipes/paginate.pipe';
import { NumericDataPipe } from '../../../../pipes/numeric-data.pipe';
import { ShortNumberPipe } from '../../../../pipes/short-number.pipe';
import { CommonModule } from '@angular/common';
import { ElasticsearchService } from '../../../../services/elasticsearch.service';

@Component({
  selector: 'app-elasticsearch-cluster',
  imports: [CommonModule, FormsModule, SortPipe, ObjectFilterPipe, PaginatePipe, NumericDataPipe, ShortNumberPipe],
  templateUrl: './elasticsearch-cluster.component.html',
  styleUrl: './elasticsearch-cluster.component.css'
})
export class ElasticsearchClusterComponent implements OnInit, OnDestroy {
  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: any;
  endTime!: any;

  selectedElasticService: any;
  decodedSelectedElasticService: any;

  nodeData: any[] = [];
  indexData: any[] = [];
  
  totalKpis: any = {};
  
  // Pagination & Search for Nodes
  searchNodeText = '';
  sortNodeColumn = '';
  sortNodeDirection: 'asc' | 'desc' | 'none' = 'none';
  nodeCurrentPage = 1;
  nodePageSize = 10;
  nodeTotalPages = 1;
  nodeInputPage = 1;
  nodeTotalItems = 0;
  isNodeLoading = false;
  
  // Pagination & Search for Indices
  searchIndexText = '';
  sortIndexColumn = '';
  sortIndexDirection: 'asc' | 'desc' | 'none' = 'none';
  indexCurrentPage = 1;
  indexPageSize = 10;
  indexTotalPages = 1;
  indexInputPage = 1;
  indexTotalItems = 0;
  isIndexLoading = false;
  
  skeletonRows = Array(5).fill(0);

  constructor(
    private router: Router,
    private elasticsearchService: ElasticsearchService,
    private dateService: DateService
  ) { }

  ngOnInit(): void {
    this.selectedElasticService = sessionStorage.getItem("encodedDatabaseServiceId");
    this.decodedSelectedElasticService = sessionStorage.getItem("databaseServiceId");
    this.dateService.setActiveComponent('ElasticsearchClusterComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ElasticsearchClusterComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.loadData();
      });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  loadData(): void {
    this.getClusterTotalKpis();
    this.getClusterNodes();
    this.getClusterIndices();
  }

  getClusterTotalKpis(): void {
    this.elasticsearchService.getClusterTotalKpis(this.selectedElasticService, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.totalKpis = response || {};
      });
  }

  getClusterNodes(): void {
    this.isNodeLoading = true;
    this.elasticsearchService.getClusterNodes(this.selectedElasticService, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.nodeData = response || [];
        this.nodeTotalItems = this.nodeData.length;
        this.nodeTotalPages = Math.ceil(this.nodeTotalItems / this.nodePageSize);
        this.isNodeLoading = false;
      });
  }

  getClusterIndices(): void {
    this.isIndexLoading = true;
    this.elasticsearchService.getClusterIndices(this.selectedElasticService, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.indexData = (response || []).map((name: string) => ({ name }));
        this.indexTotalItems = this.indexData.length;
        this.indexTotalPages = Math.ceil(this.indexTotalItems / this.indexPageSize);
        this.isIndexLoading = false;
      });
  }

  // Node Pagination Methods
  nodeNextPage() {
    if (this.nodeCurrentPage < this.nodeTotalPages) {
      this.nodeCurrentPage++;
      this.nodeInputPage = this.nodeCurrentPage;
    }
  }

  nodePreviousPage() {
    if (this.nodeCurrentPage > 1) {
      this.nodeCurrentPage--;
      this.nodeInputPage = this.nodeCurrentPage;
    }
  }

  nodeGoToPage() {
    if (this.nodeInputPage >= 1 && this.nodeInputPage <= this.nodeTotalPages) {
      this.nodeCurrentPage = this.nodeInputPage;
    } else {
      this.nodeInputPage = this.nodeCurrentPage;
    }
  }

  resetNodeCurrentPage(data: any[], searchText: string, fields: string[]) {
    this.nodeCurrentPage = 1;
    this.nodeInputPage = 1;
    const filtered = new ObjectFilterPipe().transform(data, searchText, fields);
    this.nodeTotalItems = filtered.length;
    this.nodeTotalPages = Math.ceil(this.nodeTotalItems / this.nodePageSize);
  }

  sortNodeData(column: string) {
    if (this.sortNodeColumn === column) {
      this.sortNodeDirection = this.sortNodeDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortNodeColumn = column;
      this.sortNodeDirection = 'asc';
    }
  }

  // Index Pagination Methods
  indexNextPage() {
    if (this.indexCurrentPage < this.indexTotalPages) {
      this.indexCurrentPage++;
      this.indexInputPage = this.indexCurrentPage;
    }
  }

  indexPreviousPage() {
    if (this.indexCurrentPage > 1) {
      this.indexCurrentPage--;
      this.indexInputPage = this.indexCurrentPage;
    }
  }

  indexGoToPage() {
    if (this.indexInputPage >= 1 && this.indexInputPage <= this.indexTotalPages) {
      this.indexCurrentPage = this.indexInputPage;
    } else {
      this.indexInputPage = this.indexCurrentPage;
    }
  }

  resetIndexCurrentPage(data: any[], searchText: string, fields: string[]) {
    this.indexCurrentPage = 1;
    this.indexInputPage = 1;
    const filtered = new ObjectFilterPipe().transform(data, searchText, fields);
    this.indexTotalItems = filtered.length;
    this.indexTotalPages = Math.ceil(this.indexTotalItems / this.indexPageSize);
  }

  sortIndexData(column: string) {
    if (this.sortIndexColumn === column) {
      this.sortIndexDirection = this.sortIndexDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortIndexColumn = column;
      this.sortIndexDirection = 'asc';
    }
  }

  // ROUTERS
  goToNonRelational() {
    this.router.navigate(['/database/non-relational'], { queryParams: { from: 'database' } });
  }

  goToNode(instance: string) {
    sessionStorage.setItem("databaseInstanceId", instance);
    const encodedDatabaseInstance = btoa(instance);
    sessionStorage.setItem('encodedDatabaseInstanceId', encodedDatabaseInstance);
    this.router.navigate(['/database/non-relational/elasticsearchCluster/elasticsearchNode'], { queryParams: { from: 'database' } });
  }

  goToIndex(indexName: string) {
    sessionStorage.setItem("databaseInstanceId", indexName);
    const encodedDatabaseInstance = btoa(indexName);
    sessionStorage.setItem('encodedDatabaseInstanceId', encodedDatabaseInstance);
    this.router.navigate(['/database/non-relational/elasticsearchCluster/elasticsearchIndex'], { queryParams: { from: 'database' } });
  }

  getImagePath(): string {
    return 'assets/images/Elastic Search.png';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.datesubscription) {
      this.datesubscription.unsubscribe();
    }
  }
}
