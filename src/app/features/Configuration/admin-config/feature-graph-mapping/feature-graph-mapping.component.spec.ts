import { HttpClientModule } from '@angular/common/http';
import { TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BsModalService, ModalModule } from 'ngx-bootstrap/modal';
import { NgxPaginationModule } from 'ngx-pagination';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { BarGraphService } from 'src/app/appServices/bargraph.service';
import { DashboardService } from 'src/app/appServices/dashboard.service';
import { DummyGraphService } from 'src/app/appServices/dummy-graph.service';
import { ExcelService } from 'src/app/appServices/excel.service';
import { FeatureGraphMappingService } from 'src/app/appServices/feature-graph-mapping.service';
import { FunnelChartService } from 'src/app/appServices/funnel-chart-service';
import { GuagechartService } from 'src/app/appServices/guage-chart-service';
import { HighchartsService } from 'src/app/appServices/highchart.service';
import { PiechartService } from 'src/app/appServices/piechart.service';
import { SessionService } from 'src/app/appServices/session.service';
import { SingleValueService } from 'src/app/appServices/single-value.service';
import { StackedBarGraphService } from 'src/app/appServices/stacked-bar-graph.service';
import { TableChartService } from 'src/app/appServices/table-chart.service';
import { TopNGraphService } from 'src/app/appServices/top-n-graph.service';
import { Graph } from 'src/app/models/feature-graph-mapping';

import { FeatureGraphMappingComponent } from './feature-graph-mapping.component';

describe('FeatureGraphMappingComponent', () => {
  let component: FeatureGraphMappingComponent;
  let fixture: ComponentFixture<FeatureGraphMappingComponent>;
  let sessionService: SessionService;
  let template: TemplateRef<any>;
  let service: FeatureGraphMappingService;
  let dashBService: DashboardService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        ModalModule.forRoot(),
        RouterModule.forRoot([{ path: "", component: FeatureGraphMappingComponent }]),
        ReactiveFormsModule,
        FormsModule,
        ToastrModule.forRoot(),
        NgxPaginationModule
      ],
      declarations: [FeatureGraphMappingComponent],
      providers: [
        BsModalService,
        ExcelService,
        DummyGraphService,
        HighchartsService,
        BarGraphService,
        PiechartService,
        GuagechartService,
        FunnelChartService,
        SingleValueService,
        TableChartService,
        TopNGraphService,
        StackedBarGraphService, AppComponent, ToastrService],
    })
      .compileComponents();
    sessionService = TestBed.inject(SessionService);
    service = TestBed.inject(FeatureGraphMappingService);
    dashBService = TestBed.inject(DashboardService);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FeatureGraphMappingComponent);
    spyOn(sessionService, 'setSessionProperty').and.returnValue(of(""));
    sessionStorage.setItem('currentUser', '{}');
    sessionStorage.setItem('userTypeCrudMapList', '{"result":true, "count":42,"featureGraphMapping":""}');
    component = fixture.componentInstance;
    spyOn(component, 'getApplicationByUserId');
    spyOn(component, 'getAllFeatureByFeatureType');
    spyOn(component, 'getAllGraphs');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('showForm() works', () => {

    component.showForm();
    expect(component.isForm).toBeTrue();
    expect(component.isTable).toBeFalse();
    expect(component.isEditGraphBtn).toBeFalse();

  });

  it('showAllGraphList() works', () => {

    component.showAllGraphList();
    expect(component.isForm).toBeFalse();
    expect(component.isTable).toBeTrue();
    expect(component.isEditGraphBtn).toBeFalse();

  });

  it('showAddGraph() works', () => {

    component.showAddGraph();
    expect(component.isAddGraphBtn).toBeFalse();
    expect(component.isEditGraphBtn).toBeFalse();

  });

  it('showEditForm() works', () => {
    let graph = {};
    spyOn(component, 'getAllSubFeaturesByApplication')
    component.showEditForm(graph);
    expect(component.isForm).toBeTrue();
    expect(component.isTable).toBeFalse();
    expect(component.isEditGraphBtn).toBeTrue();
    expect(component.getAllSubFeaturesByApplication);

  });

  it('submitFeatureGraphMap() works', () => {
    component.graphObj.chartName = "chartName";
    component.graphObj.chartTitle = "chartTitle";
    component.graphObj.chartId = "12";
    component.graphObj.chartType = 'pie';
    component.graphObj.applicationId = "86";
    component.graphObj.subFeatureId = "1";
    component.graphObj.dataSource = "datasource";
    component.graphObj.unit = "unit";
    component.graphObj.query = "query";

    let graph: any = { serviceResponse: 'Graph Created', serviceStatus: 'Success' };
    spyOn(service, 'createGraphFeatureMap').and.callFake(() => {
      return of(graph);
    });
    component.submitFeatureGraphMap(template);
    expect(component.isSuccess).toBeTrue();
    console.log(component.alertMessage);
  });

  it('updateFeatureGraphMap() works', () => {
    component.graphObj.chartName = "chartName";
    component.graphObj.chartTitle = "chartTitle";
    component.graphObj.chartId = "12";
    component.graphObj.chartType = 'pie';
    component.graphObj.applicationId = "86";
    component.graphObj.subFeatureId = "1";
    component.graphObj.dataSource = "datasource";
    component.graphObj.unit = "unit";
    component.graphObj.query = "query";

    let graph: any = { serviceResponse: 'Graph Updated', serviceStatus: 'Success' };
    spyOn(service, 'updateGraphFeatureMap').and.callFake(() => {
      return of(graph);
    });
    component.updateFeatureGraphMap(template);
    expect(component.isSuccess).toBeTrue();
    console.log(component.alertMessage);
  });

  it('deleteGraph() works', () => {
    let graph: any = { serviceResponse: 'Graph Deleted', serviceStatus: 'Success' };
    spyOn(service, 'deleteGraph').and.callFake(() => {
      return of(graph);
    });
    component.deleteGraph(template);
    expect(component.isSuccess).toBeTrue();
    console.log(component.alertMessage);
  });



  it('validateGraphName() :opens error modal', () => {
    let value = "@@@";
    component.validateGraphName(value, template);
    expect(component.isError).toBeTrue();

  })

  it('validateGraphTitle() :opens error modal', () => {
    let value = "@@@";
    component.validateGraphTitle(value, template);
    expect(component.isError).toBeTrue();

  })

  it('validateGraphId() :opens error modal', () => {
    let value = "@@@";
    component.validateGraphId(value, template);
    expect(component.isError).toBeTrue();

  })


  it('getLineGraph() works', () => {
    component.graphObj.chartName = "chartName";
    component.graphObj.chartTitle = "chartTitle";
    component.graphObj.chartId = "12";
    component.graphObj.chartType = 'Line';
    component.graphObj.applicationId = "86";
    component.graphObj.subFeatureId = "1";
    component.graphObj.dataSource = "datasource";
    component.graphObj.unit = "unit";
    component.graphObj.query = "query";
    let dummyElement = document.createElement('div');
    let childElement = document.createElement('div');
    dummyElement.appendChild(childElement);
    // dummyElement.id = "test";
    document.getElementById = jasmine.createSpy('HTML Element').withArgs('test').and.returnValue(dummyElement).withArgs('child').and.returnValue(childElement);
    // let graph: any = { serviceResponse: 'Graph Updated', serviceStatus: 'Success' };
    spyOn(dashBService, 'visualizeGraph').and.callFake(() => {
      return of({ serviceResponse: 'Line Graph', serviceStatus: 'Success' });
    });
    component.getLineGraph(template);
    // expect(component.isSuccess).toBeTrue();
    // console.log(component.alertMessage);
  });

});
