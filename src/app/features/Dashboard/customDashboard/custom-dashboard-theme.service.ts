import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomDashboardThemeService {
  private _dark = new BehaviorSubject<boolean>(false);
  isDark$ = this._dark.asObservable();

  get isDark() { return this._dark.value; }

  toggle() { this._dark.next(!this._dark.value); }

  setDark(val: boolean) { this._dark.next(val); }
}