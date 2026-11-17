import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MysqlComponent } from './mysql.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ServiceIdService } from '../../../../services/service-id.service';

describe('MysqlComponent', () => {
  let component: MysqlComponent;
  let fixture: ComponentFixture<MysqlComponent>;
  let router: Router;
  let serviceIdService: ServiceIdService;

  beforeEach(async () => {
    const mockUser = {
      userId: 'testUserId',
    };
    sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
    await TestBed.configureTestingModule({
      imports: [MysqlComponent, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ServiceIdService, useValue: { setServiceId: jest.fn(), getEncodedServiceId: jest.fn().mockReturnValue('encodedId') } }
      ],
      schemas: [NO_ERRORS_SCHEMA] // ignore child components
    })
      .compileComponents();

    fixture = TestBed.createComponent(MysqlComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    serviceIdService = TestBed.inject(ServiceIdService);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clean up mock after each test to avoid side effects
    sessionStorage.removeItem('currentUser');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the database tab header', () => {
    const tabLink = fixture.debugElement.query(By.css('ul.nav-tabs li.nav-item a.nav-link.active'));
    expect(tabLink).toBeTruthy();
    expect(tabLink.nativeElement.textContent).toContain('Relational Database');
  });

  it('should render the breadcrumb container', () => {
    const breadcrumb = fixture.debugElement.query(By.css('nav[aria-label="breadcrumb"]'));
    expect(breadcrumb).toBeTruthy();
  });

  it('should filter and paginate data correctly', () => {
    component.fullServiceData = [
      { name: 'db1', status: 'running', cpu: 10, memoryUsage: 50, memory: '1GB', tx: 5, rx: 5, started: 1 },
      { name: 'db2', status: 'stopped', cpu: 20, memoryUsage: 30, memory: '512MB', tx: 2, rx: 3, started: 2 }
    ];
    component.searchText = 'db1';
    component.sortParam = 'name';
    component.sortDirection = 'asc';
    component.itemsPerPage = 10;
    component.currentPage = 1;
    component.updateDisplayData();
    expect(component.pagedServiceData.length).toBe(1);
    expect(component.pagedServiceData[0].name).toBe('db1');
  });

  it('should toggle sort direction when sorting by same column', () => {
    component.sortParam = 'name';
    component.sortDirection = 'asc';
    component.sortBy('name');
    expect(component.sortDirection).toBe('desc');
  });

  it('should set service ID and navigate for MYSQL', () => {
    component.setServiceId('db1', 'MYSQL');
    expect(serviceIdService.setServiceId).toHaveBeenCalledWith('db1');
    expect(sessionStorage.getItem('databaseServiceId')).toBe('db1');
    expect(router.navigate).toHaveBeenCalledWith(['/database/service']);
  });

  it('should return correct image path', () => {
    expect(component.getImagePath('MYSQL')).toContain('mysql.png');
    expect(component.getImagePath('MSSQL')).toContain('mssql.png');
    expect(component.getImagePath('ORACLE')).toContain('oracle.png');
    expect(component.getImagePath('unknown')).toContain('undefined.png');
  });

  it('should fallback image on error', () => {
    const event = { target: { src: '' } } as any;
    component.onImageError(event);
    expect(event.target.src).toContain('undefined.png');
  });

  it('should paginate correctly', () => {
    component.fullServiceData = [
      { name: 'db1', status: '', cpu: 0, memoryUsage: 0, memory: '', tx: 0, rx: 0, started: 0 },
      { name: 'db2', status: '', cpu: 0, memoryUsage: 0, memory: '', tx: 0, rx: 0, started: 0 },
      { name: 'db3', status: '', cpu: 0, memoryUsage: 0, memory: '', tx: 0, rx: 0, started: 0 }
    ];
    component.itemsPerPage = 1;
    component.totalPages = 3;
    component.currentPage = 2;
    component.previousPage();
    expect(component.currentPage).toBe(1);
    component.nextPage();
    expect(component.currentPage).toBe(2);
    component.goToPage(3);
    expect(component.currentPage).toBe(3);
  });

  it('should show "No data to display" when fullServiceData is empty', () => {
    component.fullServiceData = [];
    fixture.detectChanges();
    const noDataEl = fixture.debugElement.query(By.css('div.d-flex.align-items-center p.text-muted'));
    expect(noDataEl).toBeTruthy();
    expect(noDataEl.nativeElement.textContent).toContain('No data to display.');
  });

  it('should NOT show "No data to display" when fullServiceData has items', () => {
    component.fullServiceData = [{ name: 'DB1' }];
    fixture.detectChanges();
    const noDataEl = fixture.debugElement.query(By.css('ng-template + div p.text-muted'));
    expect(noDataEl).toBeNull();
  });

});
