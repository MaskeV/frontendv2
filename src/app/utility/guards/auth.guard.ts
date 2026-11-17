import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../../services/authentication.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private authService: AuthenticationService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {

    const currentUser = this.authService.currentUserValue;

    if (this.authService.isLoggedIn()) {
      if (route.data?.['roles'] && !route.data['roles'].includes(currentUser?.role)) {
        return this.router.createUrlTree(['/']);
      }
      return true;
    } else {
      if (route.routeConfig?.path === '**') {
        return this.router.createUrlTree(['/login']);
      }
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url }});
    }
  }
}