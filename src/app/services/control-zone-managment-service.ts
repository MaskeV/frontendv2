import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ControlZoneManagmentService {

  private baseURL: string = environment.baseUrl;
  // private baseURL: string = 'http://localhost:12008';

  private _controlZoneEnabled$ = new BehaviorSubject<boolean>(true);
  readonly controlZoneEnabled$ = this._controlZoneEnabled$.asObservable();

  private _selectedZone$ = new BehaviorSubject<any>(null);
  selectedZone$ = this._selectedZone$.asObservable();

  private activeComponentSubject = new BehaviorSubject<string | null>(null);
  public activeComponent$ = this.activeComponentSubject.asObservable();

  constructor(private http: HttpClient) { }

  setControlZoneEnabled(enabled: boolean): void {
    this._controlZoneEnabled$.next(enabled);
  }

  isControlZoneEnabled(): boolean {
    return this._controlZoneEnabled$.getValue();
  }

  getAllControlZones(user: User): Observable<any> {
    return this.http.post(
      `${this.baseURL}/application/api/controlZone/getAllControlZones`,
      user
    );
  }

  setSelectedZone(zone: any): void {
      if (zone) {
          sessionStorage.setItem('controlZoneId', zone.id.toString());
      } else {
          sessionStorage.removeItem('controlZoneId');
      }

      this._selectedZone$.next(zone);
  }

  getSelectedZone(): Observable<any> {
    return this._selectedZone$.asObservable();
  }

  getSelectedZoneSnapshot(): any {
    return this._selectedZone$.getValue();
  }

  setActiveComponent(componentId: string): void {
    this.activeComponentSubject.next(componentId);
  }
}