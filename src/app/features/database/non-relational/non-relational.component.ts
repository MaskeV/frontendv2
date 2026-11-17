import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MongoService } from '../../../services/mongo.service';
import { DateService } from '../../../services/date.service';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ApplicationService } from '../../../services/application.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { LoggerService } from '../../../services/logger.service';
import { User } from '../../../models/user';
import { Session } from '../../../models/session';

@Component({
  selector: 'app-non-relational',
  imports: [CommonModule],
  templateUrl: './non-relational.component.html',
  styleUrl: './non-relational.component.css'
})
export class NonRelationalComponent implements OnInit, OnDestroy {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: any;
  endTime!: any;

  currentUser: User | null = null;
  sessionObject: Session = new Session();

  databases: any[] = [];
  filteredDatabases: any[] = [];
  featureType: string = 'Non-Relational';

  constructor(
    private router: Router,
    private mongoService: MongoService,
    private dateService: DateService,
    private applicationService: ApplicationService,
    private authService: AuthenticationService,
    private loggerService: LoggerService
  ) { }

  private _prepareUserForServiceCall(): void {
    if (!this.currentUser) return;
    this.currentUser.sessionDTO = this.sessionObject;
    this.sessionObject.featureName = 'NON-RELATIONAL';
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
  }

  ngOnInit(): void {
    const appId = sessionStorage.getItem("databaseServiceId");

    this.dateService.date$.pipe(takeUntil(this.destroy$)).subscribe(dates => {
      this.startTime = dates.startdateTime ? this.formatDate(dates.startdateTime) : null;
      this.endTime = dates.enddateTime ? this.formatDate(dates.enddateTime) : null;
      if (this.databases.length > 0) {
        this.getNonRelationalDbData();
      }
    });

    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      if (!user) return;

      this._prepareUserForServiceCall();
      sessionStorage.setItem('featureType', this.featureType);
      const featureName = this.featureType;

      this.applicationService.getFullApplicationData(
        user.userId,
        featureName,
        this.sessionObject,
        undefined,
        Number(appId)
      ).subscribe({
        next: (res) => {
          console.log("Full Application Data:", res);
          if (res?.serviceStatus === 'Success') {
            const apps = res.serviceResponse?.applications || [];
            this.databases = apps.map((app: any) => ({
              applicationName: app.applicationName,
              applicationTechnology: app.applicationTechnology,
              applicationType: app.applicationType,
              health: { status: null, uptimeSeconds: null }  // populated later if uptime API exists
            }));
            this.filteredDatabases = [...this.databases];
            if (this.databases.length > 0) {
              this.getNonRelationalDbData();
            }
          } else {
            this.databases = [];
            this.filteredDatabases = [];
          }
        },
        error: (err) => {
          console.error("API Error:", err);
          this.databases = [];
          this.filteredDatabases = [];
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    sessionStorage.removeItem('featureType');
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  loadData(): void {
    this.getNonRelationalDbData();
  }

  getNonRelationalDbData(): void {
    const applicationNames = this.databases.map(db => db.applicationName);
    if (applicationNames.length === 0 || !this.startTime || !this.endTime) return;

    this.mongoService
      .getNonRelationalDbData(applicationNames, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        console.log("NON-RELATIONAL DB DATA: ", response);

        const results = response.databases || [];
        this.databases = this.databases.map(db => {
          const match = results.find((r: any) => r.applicationName === db.applicationName);
          
          return {
            ...db,
            health: match ? match.health : { status: 'DOWN', uptimeSeconds: null }
          };
        });
        this.filteredDatabases = [...this.databases];
      });
  }

  convertSeconds(seconds: number): string {
    if (!seconds || seconds <= 0) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  }

  onSearch(event: any): void {
    const searchTerm = event.target.value.toLowerCase().trim();
    if (!searchTerm) {
      this.filteredDatabases = [...this.databases];
      return;
    }
    this.filteredDatabases = this.databases.filter(db => {
      const formattedDb = {
        applicationName: db.applicationName,
        status: db.health?.status,
        uptimeFormatted: this.convertSeconds(db.health?.uptimeSeconds)
      };
      return Object.values(formattedDb)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm);
    });
  }

  getImagePath(tech: string | undefined | null, appType: string | undefined | null, appName?: string | undefined | null): string {
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    const n = appName ? appName.trim().toLowerCase() : '';
    
    let name = '';
    
    if (n && n.includes('::')) {
      name = n.split('::')[0];
    } else {
      name = t || a || 'undefined';
    }
    
    if (name.includes('elastic')) {
      name = 'elasticsearch';
    } else if (name.includes('mongo')) {
      name = 'mongo';
    }
    
    return `assets/images/${name}.png`;
  }

  goToDb(id: string, appTechnology?: string): void {
    sessionStorage.setItem("databaseServiceId", id);
    const encodedDatabase = btoa(id) + ".1";
    sessionStorage.setItem("encodedDatabaseServiceId", encodedDatabase);

    const tech = appTechnology ? appTechnology.trim().toLowerCase() : '';
    const n = id ? id.trim().toLowerCase() : '';
    
    let routeName = '';
    
    if (n && n.includes('::')) {
      routeName = n.split('::')[0];
    } else {
      routeName = tech || 'mongo';
    }

    if (routeName.includes('elastic')) {
      routeName = 'elasticsearch';
    } else if (routeName.includes('mongo')) {
      routeName = 'mongo';
    } else if (!routeName) {
      routeName = 'mongo';
    }

    this.router.navigate([`/database/non-relational/${routeName}Cluster`], { queryParams: { from: 'infra' } });
  }

}
