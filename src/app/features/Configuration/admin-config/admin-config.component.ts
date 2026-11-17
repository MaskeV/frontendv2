import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';

import { Session } from '../../../models/session';
import { DecoderService } from '../../../services/decoder.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { AppComponent } from '../../../app.component';
import { LoggerService } from '../../../services/logger.service';
import { User } from '../../../models/user';

import { RoleComponent } from './role/role.component';
import { UserComponent } from './user/user.component';
import { ApplicationIpMappingComponent } from './application-ip-mapping/application-ip-mapping.component';
import { ApplicationIpMappingNewComponent } from './application-ip-mapping-new/application-ip-mapping-new.component';
import { FeaturesComponent } from './features/features.component';

import { AdminConfigCrudMap } from '../../../models/AdminConfigCrudMap';

@Component({
  selector: 'app-admin-config',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    RoleComponent,
    UserComponent,
    ApplicationIpMappingComponent,
    ApplicationIpMappingNewComponent,
    FeaturesComponent,
  ],
  templateUrl: './admin-config.component.html',
  styleUrl: './admin-config.component.css'
})
export class AdminConfigComponent implements OnInit {

  activeTab: string = '';
  currentUser: User | null = null;
  userTypeCrudMapList: AdminConfigCrudMap = {};
  sessionObject: Session = new Session();
  isSidebarCollapsed = false;

  constructor(
    private decoderService: DecoderService,
    private authService: AuthenticationService,
    public appComponenet: AppComponent,
    private loggerService: LoggerService,
    private router: Router
  ) {
    this.authService.currentUser.subscribe(x => this.currentUser = x);
  }

  async ngOnInit(): Promise<void> {
    if (!this.currentUser) return;

    const decodedCrudData = await this.decoderService.decodeObject(
      this.currentUser['crudData']
    );

    this.userTypeCrudMapList = (decodedCrudData?.['Admin-Config'] ?? {}) as AdminConfigCrudMap;

    this.sessionObject.featureName = 'Configuration';
    this.sessionObject.menu = 'Admin Config';
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    this.resolveActiveTab();

    const visibleTabs = Object.keys(this.userTypeCrudMapList).filter(
      key => this.userTypeCrudMapList?.[key]?.tabVisibility === 'true'
    );

    // console.log('Decoded Admin-Config RBAC:', this.userTypeCrudMapList);

    console.log(
      'Visible Tabs For Current User:',
      visibleTabs
    );

    sessionStorage.setItem(
      'userTypeCrudMapList',
      JSON.stringify(this.userTypeCrudMapList)
    );
  }
  private resolveActiveTab(): void {
    if (this.userTypeCrudMapList?.user?.tabVisibility === 'true') {
      this.activeTab = 'userTab';
    } else if (this.userTypeCrudMapList?.role?.tabVisibility === 'true') {
      this.activeTab = 'roleTab';
    } else if (this.userTypeCrudMapList?.applicationIpMapping?.tabVisibility === 'true') {
      this.activeTab = 'appIpTab';
    }
  }

  isVisible(key: string): boolean {
    return this.userTypeCrudMapList?.[key]?.tabVisibility === 'true';
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}