import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { DateService } from "../../../../services/date.service";
import { filter, Subject, Subscription, switchMap, takeUntil } from "rxjs";
import { RedisService } from "../../../../services/redis.service";
import { CommonModule } from "@angular/common";
import { User } from "../../../../models/user";
import { DatabaseService } from "../../../../services/database-api.service";
import { AuthenticationService } from "../../../../services/authentication.service";
import { FormsModule } from "@angular/forms";
import { Session } from "../../../../models/session";
import { LoggerService } from "../../../../services/logger.service";
import { ApplicationService } from "../../../../services/application.service";
import { data } from "jquery";

@Component({
    selector: "app-redis-list",
    imports: [RouterModule, CommonModule, FormsModule],
    templateUrl: "./redis-list.component.html",
    styleUrl: "./redis-list.component.css"
})


export class RedisListComponent implements OnInit, OnDestroy {
  // subscription!: Subscription;
  user: User = new User();
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();
  private subscription: Subscription = new Subscription();
  private datesubscription: Subscription = new Subscription();
  datemodel: any;
  startTime!: number;
  endTime!: number;
  filteredProcessList: any[] = [];
  metricsData: any[] = [];
  allMetricsData: any[] = [];
  currentPage = 1;
  itemsPerPage = 25;
  totalPages = 0;
  pagedProcessList: any[] = [];
  processList: any[] = [];
  searchQuery = "";
  sessionObject: Session = new Session();
  apiResponse: any;
  serviceResponseList: any;
  featureType: string = "REDIS";
  appTypeMap = new Map<string, any>();


  constructor(
    private router: Router,
    private dateService: DateService,
    private redisService: RedisService,
    private authService: AuthenticationService,
    private databaseService: DatabaseService,
    private loggerService: LoggerService,
    private applicationService: ApplicationService
  ) { }

  ngOnInit(): void {

    this.dateService.setActiveComponent("RedisListComponent");
    this.featureType = sessionStorage.getItem('featureType') || 'REDIS';
    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter((activeComponent) => activeComponent === "RedisListComponent"),
        switchMap(() => this.dateService.date$)
      )
      .subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.authService.currentUser
          .pipe(takeUntil(this.destroy$))
          .subscribe((user) => {
            this.currentUser = user;
            if (user) {
              this.loadData();

            }
          });
        this.filteredProcessList = Object.keys(this.processList);
        this.calculatePagination();

      });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

  gotoRedisDetails(key: any) {
    sessionStorage.setItem("redis", key.name);
    console.log("Key: ", key);
    sessionStorage.setItem('redisId', key.appId);
    this.router.navigate(["/redis/details"]);
  }

  loadData() {
    // this.getRedisLists();
    this.getFullApplicationData();
  }

  getFullApplicationData(): void {
    if (this.currentUser) {
      this.user = this.currentUser;
    }

    this.user.sessionDTO = this.sessionObject;
    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    this.applicationService.getFullApplicationData(this.user.userId, this.featureType, this.user.sessionDTO)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appData: any) => {
          if (!appData || appData.serviceStatus?.toUpperCase() !== 'SUCCESS') {
            console.error("Failed to load host applications:", appData);
            return;
          }

          const applications = appData.serviceResponse?.applications;
          const appNameList = applications.map((app: any) => app.applicationName);

          if (!Array.isArray(applications) || applications.length === 0) {
            console.error("No applications found:", appData);
            return;
          }

          const appMap = new Map<number, any>();
          applications.forEach((app: any) => {
            appMap.set(app.applicationId, app);
          });

          this.serviceResponseList = appData.serviceResponse.applications;

          // this.filteredHostName = [...this.serviceHosts];
          // this.pagedHostName = [...this.serviceHosts];
          // this.calculatePagination();

          this.redisService.getRedisListsAPI(this.startTime, this.endTime, appNameList).pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (metricsList: any[]) => {
                if (!Array.isArray(metricsList)) {
                  return;
                }

                const metricsMap = new Map<string, any>();

                metricsList.forEach((item: any) => {
                  const appName = Object.keys(item)[0];
                  metricsMap.set(appName, item[appName]);
                });

                this.serviceResponseList = this.serviceResponseList.map((app: any) => {
                  const metrics = metricsMap.get(app.applicationName) || {};

                  return {
                    name: app.applicationName,
                    appId: app.applicationId,
                    technology: app.applicationType,
                    appType: app.applicationTechnology,
                    meter_redis_connected_clients: metrics.meter_redis_connected_clients,
                    meter_redis_db_keys: metrics.meter_redis_db_keys,
                    meter_redis_uptime: metrics.meter_redis_uptime
                  };
                });

                this.metricsData = this.serviceResponseList;
                this.allMetricsData = [...this.serviceResponseList];
              },
              error: (err: any) => {
                console.error("Failed to load redis data:", err);
              }
            });
        },
        error: (err: any) => {
          console.error("Failed to load host data:", err);
        }
      });
  }

// getRedisLists() {
//   this.redisService
//     .getRedisListsAPI(this.startTime, this.endTime, this.serviceResponseList)
//     .subscribe({
//       next: (data: any[]) => {
//         const metricsMap = new Map<string, any>();

//         // Normalize API response
//         if (Array.isArray(data)) {
//           data.forEach(item => {
//             const key = Object.keys(item)[0];
//             if (key) {
//               metricsMap.set(key, item[key]); // <-- IMPORTANT FIX
//             }
//           });
//         }

//         const mergedData: any[] = [];

//         if (this.serviceResponseList?.length) {
//           this.serviceResponseList.forEach((appName: string) => {
//             const metrics = metricsMap.get(appName);  

//             const appDetails = this.appTypeMap.get(appName) || { technology: '', type: this.featureType };
//             mergedData.push({
//               name: appName,
//               applicationTechnology: appDetails.technology,
//               applicationType: appDetails.type,
//               meter_redis_connected_clients: metrics?.meter_redis_connected_clients ?? 0,
//               meter_redis_db_keys: metrics?.meter_redis_db_keys ?? 0,
//               meter_redis_uptime: metrics?.meter_redis_uptime ?? 0
//             });
//           });
//         } else {
//           // fallback if no service list
//           metricsMap.forEach((value, key) => {
//             mergedData.push({
//               name: key,
//               applicationType: 'REDIS',
//               ...value
//             });
//           });
//         }

//         this.metricsData = mergedData;
//         this.allMetricsData = [...mergedData];
//       },

//       error: (err: any) => {
//         const defaultData: any[] = [];

//         if (this.serviceResponseList?.length) {
//           this.serviceResponseList.forEach((appName: string) => {
//             const appDetails = this.appTypeMap.get(appName) || { technology: '', type:this.featureType};
//             defaultData.push({
//               name: appName,
//               applicationTechnology: appDetails.technology,
//               applicationType: appDetails.type,
//               meter_redis_connected_clients: 0,
//               meter_redis_db_keys: 0,
//               meter_redis_uptime: 0
//             });
//           });
//         }

//         this.metricsData = defaultData;
//         this.allMetricsData = [...defaultData];

//         console.error("Failed to load Redis lists:", err);
//       }
//     });
// }

  onSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.metricsData = [...this.allMetricsData];
      return;
    }

    this.metricsData = this.allMetricsData.filter(item => {
      return item.name.toLowerCase().includes(query);
    });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "");
    return parseInt(date);
  }

  getImagePath(tech: string | undefined | null, appType: string | undefined | null): string {
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    return 'assets/images/' + (t || a || 'undefined') + '.png';
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/img/technologies/UNDEFINED.png';
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(
      this.filteredProcessList.length / this.itemsPerPage
    );
    this.pagedProcessList = this.filteredProcessList.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );
  }

  formatUptime(seconds: number): string {
    if (!seconds || seconds < 0) return "0m";

    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;

    return result.trim();
  }


  // initializeComponent(): void {
  //   this._prepareUserForServiceCall();

  //   this.applicationService
  //     .getFullApplicationData(this.user.userId, this.featureType, this.user.sessionDTO)
  //     .subscribe({
  //       next: (response: any) => {
  //         if (response && response.serviceStatus?.toUpperCase() === 'SUCCESS') {
  //           this.apiResponse = response;
  //           const apps = response.serviceResponse.applications || [];
  //           this.appTypeMap = new Map<string, any>();
  //           apps.forEach((app: any) => {
  //             this.appTypeMap.set(app.applicationName, {
  //               technology: app.applicationTechnology,
  //               type: app.applicationType
  //             });
  //           });
  //           this.serviceResponseList = apps.map((app: any) => app.applicationName);
  //           this.loadData();
  //         } else {
  //           this.apiResponse = response || {
  //             serviceResponse: [],
  //             serviceStatus: "Failed",
  //             serviceError: "Empty response"
  //           };
  //           this.serviceResponseList = [];
  //         }
  //       },
  //       error: (err) => {
  //         console.error("Failed to load app/ip list:", err);
  //         this.apiResponse = {
  //           serviceResponse: [],
  //           serviceStatus: "Failed",
  //           serviceError: "API error"
  //         };
  //         this.serviceResponseList = [];
  //         this.loadData();
  //       }
  //     });
  // }



  private _prepareUserForServiceCall(): void {
    if (!this.currentUser) {
      console.error("No current user");
      return;
    }
    this.user = this.currentUser;
    this.user.sessionDTO = this.sessionObject;
    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split("?")[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem("loginTime");
    this.sessionObject.sessionId = sessionStorage.getItem("sessionId");
    this.sessionObject.browserName =
      this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion =
      this.loggerService.getBrowserNameAndVersion().version;
  }
}
