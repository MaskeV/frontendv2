import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, Event as RouterEvent, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './features/login/login.component';
import { NavBarComponent } from './features/nav-bar/nav-bar.component';
import { LoaderService } from './services/loader.service';
import { LoaderComponent } from './features/loader/loader.component';
import { User } from './models/user';
import { DecoderService } from './services/decoder.service';
import { AuthenticationUser } from './models/authenticationUser';
import { first, interval, Subscription } from 'rxjs';
import { Session } from './models/session';
import { AuthenticationService } from './services/authentication.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AlertService } from './services/alert.service';
import Swal from 'sweetalert2'
// import { BsModalService } from 'ngx-bootstrap/modal';
import { fromEvent, merge, timer } from 'rxjs';
import { debounceTime, mapTo, switchMap, tap } from 'rxjs/operators';
import moment from 'moment';
import { LoggerService } from './services/logger.service';
import { FaqBotComponent } from "./features/faq-bot/faq-bot.component";


export let browserRefresh = false;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, LoginComponent, NavBarComponent, LoaderComponent, MatSnackBarModule, FaqBotComponent],
  // providers:[BsModalService],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'netraa';
  showNavBar = false;
  subscription: Subscription;
  user: User = new User();
  currentUser!: User | null;
  sessionObject: Session = new Session();
  logoutTime: any;
  dashboardList: any;
  trendDashbaordList: any;
  myInterval: any;
  interval: any;
  alertFlag: any;
  notificationActive = false;
  sessionTimeoutSubscription!: Subscription;
  idleState = '';
  timedOut = false;
  sessionTimer = 0;
  storedTheme: any = sessionStorage.getItem('themeColour');
  constructor(
    private router: Router,
    private loaderService: LoaderService,
    private decoderService: DecoderService,
    private authService: AuthenticationService,
    private loggerService: LoggerService
  ) {
    this.authService.currentUser.subscribe(x => this.currentUser = x);
    this.subscription = router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        browserRefresh = !router.navigated;
      }
    });
  }

  ngOnInit(): void {
    this.router.events.subscribe((event: RouterEvent) => {
      if (event instanceof NavigationEnd) {
        if (window.location.hash) {
          if (!this.authService.isLoggedIn()) {
            location.replace('/login');
          } else {
            location.replace('/404-page-not-found');
          }
          return;
        }
        this.showNavBar = event.urlAfterRedirects.split('?')[0] !== '/login';
      }
    });
    this.authService.currentUser.subscribe(x => this.currentUser = x);
    this.user = this.currentUser ?? new User();
    this.interval = interval(10000).subscribe(() => {
      if (this.currentUser) {
        this.checkUserSession();
        if (this.notificationActive) {
          this.alertFlag = true;
        } else {
          this.alertFlag = false;
        }
      } else {
        this.interval.unsubscribe();
      }
    });

    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    this.authService
      .getSessionTimeoutTimer(this.sessionObject)
      .pipe(first())
      .subscribe(response => {
        if (response.serviceResponse) {
          this.sessionTimer = Number.parseInt(response.serviceResponse);
          console.log("this.sessionTimer -------------------", this.sessionTimer);

          if (this.sessionTimer !== 0) {
            this.setupSessionTimeout(this.sessionTimer * 60); // seconds
          }
        }
      });

  }

  checkUserSession() {
    console.log("called checkUserSession()");

    let user = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    let authenticationUser = new AuthenticationUser();
    if (user) {
      authenticationUser.userName = user.userId;
      authenticationUser.token = user.token;
    }
    this.sessionObject.featureName = "Home";
    authenticationUser.sessionDTO = this.sessionObject;
    this.authService.checkUserSession(authenticationUser).pipe(first()).subscribe((response) => {
      if (!response || !response['serviceResponse']) {
        if (this.router.url.includes('resource-mapping')) {
          return;
        }
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('lastLogin');
        sessionStorage.removeItem('themeColour');
        sessionStorage.removeItem('userTypeCrudMapList');
        sessionStorage.removeItem('currentSFID');
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
        sessionStorage.removeItem('isRouteFromFeature');
        this.dashboardList = null
        this.trendDashbaordList = null;
        this.deleteCookie();
        clearInterval(this.myInterval);
        if (!this.router.url.includes('resource-mapping')) {
          location.replace('/login');
        }
        console.log("called checkUserSession()");
        // location.reload();
      }
    });
  }

  public deleteCookie() {

    document.cookie.split(";").forEach(function (c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

  }
  setupSessionTimeout(timeoutSeconds: number) {
    const activityEvents$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'mousedown'),
      fromEvent(document, 'keypress'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'scroll')
    );

    this.sessionTimeoutSubscription = activityEvents$
      .pipe(
        tap(() => {
          this.idleState = 'User is active';
        }),
        debounceTime(500), // avoid too many resets
        switchMap(() =>
          timer(timeoutSeconds * 1000).pipe(
            tap(() => {
              this.idleState = "You've gone idle!";
              this.onIdleStart();
            })
          )
        )
      )
      .subscribe();

    console.log('Session timeout monitoring started:', timeoutSeconds, 'seconds');
  }


  onIdleStart() {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    this.idleState = "You've gone idle!";
    console.log(this.idleState);

    let countdownSeconds = 15;
    let timerInterval: any;

    Swal.fire({
      title: 'Session Expiring Soon',
      html: `You will be logged out in <b>${countdownSeconds}</b> seconds.`,
      timer: countdownSeconds * 1000,
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false,

      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: 'Stay Logged In',
      cancelButtonText: 'Logout Now',

      confirmButtonColor: '#28a745',
      cancelButtonColor: '#dc3545',

      didOpen: () => {
        const b = Swal.getPopup()?.querySelector("b");
        if (b) {
          timerInterval = setInterval(() => {
            const remaining = Math.ceil(Swal.getTimerLeft()! / 1000);
            b.textContent = remaining.toString();
          }, 1000);
        }
      },
      willClose: () => {
        clearInterval(timerInterval);
      }
    }).then((result) => {
      if (result.isConfirmed) {
        console.log("User chose to stay logged in.");
        this.idleState = 'User is active again';
        this.timedOut = false;

        this.sessionTimeoutSubscription?.unsubscribe();
        this.setupSessionTimeout(this.sessionTimer * 60);
        return;
      }

      if (result.dismiss === Swal.DismissReason.timer) {
        console.log("Session expired due to inactivity");
        this.idleState = 'Timed out!';
        this.timedOut = true;
        this.userLogout();
      }

      if (result.dismiss === Swal.DismissReason.cancel) {
        console.log("User chose to log out now.");
        this.userLogout();
      }
    });
  }

  userLogout() {
    this.sessionTimeoutSubscription?.unsubscribe();

    let user = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.user['userName'] = user?.userId;
    this.user.token = user?.token;
    this.sessionObject.userId = user?.userId;
    clearInterval(this.myInterval);
    this.sessionObject.apiCalled = "/user/api/userLogout()";
    this.logoutTime = moment(new Date()).format("DD-MM-YYYY HH:mm:ss");
    this.sessionObject.logoutTime = this.logoutTime;
    this.user.sessionDTO = this.sessionObject
    this.authService.logout(this.user).pipe(first()).subscribe((response: User) => {

      if (response['serviceStatus'] == 'Success') {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('lastLogin');
        sessionStorage.removeItem('themeColour');
        sessionStorage.removeItem('currentSFID');
        localStorage.removeItem('currentmenupage');
        sessionStorage.removeItem('isRouteFromFeature');
        sessionStorage.removeItem('loginCounter');
        sessionStorage.removeItem('loginEnable');
        this.dashboardList = null
        this.trendDashbaordList = null;
        this.deleteCookie();
        this.sessionTimeoutSubscription.unsubscribe();
        if (!this.router.url.includes('resource-mapping')) {
          location.replace('/login');
        }
      }
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
      sessionStorage.removeItem('SelectedServiceId');
      sessionStorage.removeItem('encodedEntityIDForServices');
      sessionStorage.removeItem('ApplicationId');
      sessionStorage.removeItem('sessionId');
    });
  }

  public setCookie(name: string, value: string, expireDays: number, path: string = '') {
    const d: Date = new Date();
    d.setTime(d.getTime() + expireDays * 24 * 60 * 60 * 1000);
    const expires = `expires=${d.toUTCString()}`;
    const cpath = path ? `; path=${path}` : '';
    document.cookie = `${name}=${value}; ${expires}${cpath}; SameSite=Strict; Secure`;
  }

  public getCookie() {
    let name = "access-token";
    let ca: Array<string> = document.cookie.split(';');
    let cookieName = name + "=";
    let c: string;

    for (let i: number = 0; i < ca.length; i += 1) {
      if (ca[i].indexOf(name, 0) > -1) {
        c = ca[i].substring(cookieName.length + 0, ca[i].length);
        return c;
      }
    }
    return null;
  }


}