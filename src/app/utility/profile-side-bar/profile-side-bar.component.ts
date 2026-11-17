import { Component, OnInit, AfterViewInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { DecoderService } from '../../services/decoder.service';
import { User } from '../../models/user';
import { Session } from '../../models/session';
import moment from 'moment';
import { AuthenticationService } from '../../services/authentication.service';
import { first } from 'rxjs/operators';
import { CommonModule } from '@angular/common';


@Component({
    selector: 'app-profile-side-bar',
    imports: [CommonModule],
    templateUrl: './profile-side-bar.component.html',
    styleUrls: ['./profile-side-bar.component.css']
})
export class ProfileSideBarComponent implements OnInit {

  selectedTheme = 'default';

  user: User =  new User();
  lastLogin: string | null = null;
  frst: string | undefined;
  isOpen = false;
  sessionObject: Session = new Session();
    myInterval: any;
  logoutTime: any;
  currentUser!: User | null;
  dashboardList: any;
  trendDashbaordList: any;

    @Input() isSidebarCollapsed: boolean = false; // Receive from parent


  constructor(
    private router: Router,
    private decoderService: DecoderService,
    private authService: AuthenticationService
  ) {
    this.authService.currentUser.subscribe(x => this.currentUser = x);
  }

  ngOnInit(): void {
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
      this.user = this.decoderService.decryptJson(JSON.parse(currentUser));
      this.frst = this.user?.fullName?.[0]?.toUpperCase();
    }
    this.lastLogin = sessionStorage.getItem('lastLogin');

  }

  // ngAfterViewInit(): void {
  //   const navbar = document.querySelector('.navbar');
  //   const sidebar = document.querySelector('.sidebar') as HTMLElement;
  //   if (navbar && sidebar) {
  //     const navbarHeight = navbar.clientHeight;
  //     sidebar.style.top = `${navbarHeight}px`;
  //     sidebar.style.height = `calc(65% - ${navbarHeight}px)`;
  //   }
  // }

  toggleSidebar(): void {
    this.isOpen = !this.isOpen;
  }

  closeSidebar(): void {
    this.isOpen = false;
  }

  goToLicensePage(): void {
    this.router.navigate(['/license']);
    this.closeSidebar();
  }

  // user: User = new User();

  userLogout() {
    let user = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.user['userName'] = user?.userId;
    this.user.token = user?.token;
    this.sessionObject.userId = user?.userId;
    // this.updateTheme();
    clearInterval(this.myInterval);
    this.sessionObject.apiCalled = "/user/api/userLogout()";
    this.logoutTime = moment(new Date()).format("DD-MM-YYYY HH:mm:ss");
    this.sessionObject.logoutTime = this.logoutTime;
    this.user.sessionDTO = this.sessionObject
    this.authService.logout(this.user).pipe(first()).subscribe((response: User) => {

      if (response['serviceStatus'] == 'Success') {
        this.currentUser = null;
        sessionStorage.clear();
        // sessionStorage.removeItem('currentUser');
        // sessionStorage.removeItem('token');
        // sessionStorage.removeItem('role');
        // sessionStorage.removeItem('username');
        // sessionStorage.removeItem('lastLogin');
        // sessionStorage.removeItem('themeColour');
        // sessionStorage.removeItem('currentSFID');
        // localStorage.removeItem('currentmenupage');
        // sessionStorage.removeItem('isRouteFromFeature');
        // sessionStorage.removeItem('loginCounter');
        // sessionStorage.removeItem('loginEnable');
        // sessionStorage.removeItem('serviceIdForInfra');
        this.dashboardList = null
        this.trendDashbaordList = null;
        this.deleteCookie();
        location.replace('/login');
        console.log("userLogout()");

      }
      // this.loggerService.logMyInfo(this.sessionObject);
      sessionStorage.removeItem('apiCalled');
      sessionStorage.removeItem('loginTime');
      sessionStorage.removeItem('logoutTime');
      sessionStorage.removeItem('viewingApplicationName');
      sessionStorage.removeItem('viewingIndexPattern');
      sessionStorage.removeItem('viewEndTime');
      sessionStorage.removeItem('viewStartTime');
      sessionStorage.removeItem('onPageNavigateTime');
      sessionStorage.removeItem('onPageExitTime');
      sessionStorage.removeItem('previousViewingApplication');
      sessionStorage.removeItem('previousViewingSubF');
      sessionStorage.removeItem('sessionId');
    });
  }

  public deleteCookie() {
    //alert("delete cookie called 1")
    // document.cookie = 'grafana_session=; path=/; domain=http://localhost:3000; expires=' + new Date(0).toUTCString();
    // alert("delete cookie called 2")
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

  }

}
