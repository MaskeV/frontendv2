import { Component, OnInit } from '@angular/core';
import { ApiUserService } from '../../../../services/api-user.service';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ApmosysSrgComponent } from './apmosys-srg/apmosys-srg.component';
import { SrgLogsComponent } from './srg-logs/srg-logs.component';
import { ApiMonitoringComponent } from './api-monitoring/api-monitoring.component';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-tab-panel',
    imports: [
        CommonModule,
        NgbModule,
        ApmosysSrgComponent,
        SrgLogsComponent,
        ApiMonitoringComponent
    ],
    templateUrl: './tab-panel.component.html',
    styleUrl: './tab-panel.component.css'
})
export class TabPanelComponent implements OnInit {

  showAPIMonitoringTab = false;
  activeTabId = '1';

  constructor(private userService: ApiUserService,) { }
  
  ngOnInit(): void {
    this.showAPIMonitoringTab = this.userService.hasFeature('API Monitoring');
  }

}
